import * as theia from '@theia/plugin';
import { randomBytes } from 'crypto';
import { Pool, QueryResult, FieldDef } from 'pg';
import * as Cursor from 'pg-cursor';

interface FieldInfo extends FieldDef {
  // tabulator needs data as a dict, which won't play well with multiple
  // columns of the same name. So we have a dict of indexes to fake an array
  index: string;
};

export interface QueryResults extends QueryResult {
  fields: FieldInfo[];
};

interface Panels {
  [id: string]: PanelWithResult,
}

interface PanelWithResult {
  err: any,
  fullResults: QueryResults
}

export function getRunQueryAndDisplayResults(pool: Pool) {

  // The "save" button that appears with results is a bit faffy to maintain due to the order
  // that multiple panels fire their change events when tabbling between. And it's still not
  // perfect because it appears in too many places in the UI
  var numActive: number = 0;
  var activeResults: QueryResults = undefined;
  var getActiveResults = () => [activeResults];
  var panelResults: Panels = {};

  function createPanel(title: string, onDidDispose: () => void) {
    var isActive = false;
    const panelId = randomBytes(16).toString('hex');

    const panel = theia.window.createWebviewPanel(
      'theia-postgres.results',
      'Results: ' + title, {
      area: theia.WebviewPanelTargetArea.Bottom,
    }, {
      enableScripts: true
    });

    panelResults[panelId] = {
      err: null,
      fullResults: {
        fields: [],
        rows: [],
        command: null,
        rowCount: null,
        oid: null
      }
    }

    panel.onDidChangeViewState(({ webviewPanel }) => {
      var changed = webviewPanel.active !== isActive;
      if (!changed) return;

      isActive = webviewPanel.active;
      numActive = numActive + (webviewPanel.active ? 1 : -1);
      if (webviewPanel.active) {
        activeResults = panelResults[panelId].fullResults;
      }
      theia.commands.executeCommand('setContext', 'theiaPostgresResultFocus', numActive > 0);
    });

    panel.webview.onDidReceiveMessage(
      message => {
        if (panelResults[panelId].err) {
          postError(panel, panelResults[panelId].err);
        } else {
          postResults(panel, panelResults[panelId].fullResults, panelResults[panelId].fullResults);
        }
      }
    );

    panel.webview.html = panelHtml(panelId);

    panel.onDidDispose(() => {
      onDidDispose();
      delete panelResults[panelId];
    });
    return { panelId, panel };
  }

  function recordError(panelId: string, panel: theia.WebviewPanel, err) {
    panelResults[panelId].err = err;
    postError(panel, err);
  }

  function postError(panel, err) {
    panel.webview.postMessage({
      'command': 'ERROR',
      'summary': err.message,
      'results': null
    });
  }

  function recordResults(panelId: string, panel: theia.WebviewPanel, results: QueryResults) {
    panelResults[panelId].fullResults = {
      ...results,
      rows: panelResults[panelId].fullResults.rows.concat(results.rows),
    };
    postResults(panel, panelResults[panelId].fullResults, results);
  }

  function postResults(panel: theia.WebviewPanel, fullResults: QueryResults, results: QueryResults) {
    panel.webview.postMessage({
      'command': fullResults.command,
      'summary': summary(fullResults),
      'results': results
    });
  }

  theia.window.registerWebviewPanelSerializer('theia-postgres.results', new (class implements theia.WebviewPanelSerializer {
    async deserializeWebviewPanel(webviewPanel: theia.WebviewPanel, state: any) {
      webviewPanel.webview.html = (state.panelId in panelResults) ? panelHtml(state.panelId) : '<p>The query must be re-run to see its results</p>';
    }
  }));

  async function runQueryAndDisplayResults(sql: string, uri: theia.Uri, title: string) {
    const client = await pool.connect();

    try {
      var cursor = client.query(new Cursor(sql, [], { text: sql, rowMode: 'array' }));
    } catch (err) {
      theia.window.showErrorMessage(err.message);
      return;
    }

    function onEnd() {
      cursor.close(() => {
        client.release();
      });
    }

    var disposed = false;
    const { panelId, panel } = createPanel(title, () => { disposed = true });

    function fetchRows() {
      // Intermediate WebSockets proxies can have a limit on message size
      // For very wide results this might still be too big, so potentially
      // need something more robust. Note that results are doubly JSON encoded
      cursor.read(1000, (err, rows) => {
        if (disposed) {
          onEnd();
          return
        }

        if (err) {
          recordError(panelId, panel, err);
          onEnd();
          return;
        }

        const results = {
          ...cursor._result,
          rows: rows.map((row) => {
            var obj = {};
            row.forEach((val, index) => {
              obj[index] = formatFieldValue(cursor._result.fields[index], val);
            });
            return obj;
          }),
          fields: cursor._result.fields.map<FieldInfo>((field, index) => {
            return {
              ...field,
              index: '' + index
            };
          })
        };
        recordResults(panelId, panel, results);

        if (rows.length) process.nextTick(fetchRows);
        else onEnd();
      });
    }

    fetchRows();
  }

  return { runQueryAndDisplayResults: runQueryAndDisplayResults, getActiveResults: getActiveResults };
}

export function panelHtml(panelId: string) {
  const nonce = randomBytes(16).toString('base64');
  return `<!DOCTYPE html>
  <html>
    <head>
      <meta http-equiv="content-type" content="text/html;charset=UTF-8">
      <meta http-equiv="content-security-policy" content="default-src 'none'; script-src 'self' 'nonce-${nonce}'; style-src 'self' 'nonce-${nonce}'">
      <link href="/hostedPlugin/dit_theia_postgres/resources/tabulator_simple.css" rel="stylesheet">
      <script src="/hostedPlugin/dit_theia_postgres/resources/tabulator.min.js"></script>
      <style nonce="${nonce}">
        body,
        html {
          margin: 0;
          padding: 0;
          height: 100%;
        }
      </style>
    </head>
    <body class="vscode-body">
      <div id="results-table"></div>
      <script nonce="${nonce}">
        // Avoid multiple additions of data
        const Queue = (concurrency) => {
          var running = 0;
          const tasks = [];

          return async (task) => {
            tasks.push(task);
            if (running >= concurrency) return;

            ++running;
            while (tasks.length) {
                try {
                    await tasks.shift()();
                } catch(err) {
                    console.error(err);
                }
            }
            --running;
          }
        }
        var queue = Queue(1);
        const vscode = acquireVsCodeApi();

        var state = vscode.getState({panelId: "${panelId}"});
        if (state) {
          // If we have a state, request the server to re-send the data
          vscode.postMessage({
            command: 'restore',
          });
        } else {
          // If no state, save the state so it will be available to be restored
          vscode.setState({panelId: "${panelId}"});
        }

        var table;
        var allData = [];
        window.addEventListener('message', event => {
          queue(async () => {
            const message = event.data;

            if (message.summary) {
              var tableEl = document.getElementById('results-table');
              tableEl.innerHTML = message.summary;
              tableEl.classList.add('error');
            }

            if (message.results.fields.length) {
              // Tabulator has an addData method, but is very slow
              if (!table) {
                table = new Tabulator("#results-table", {
                  height: "100%",
                  columns: [{formatter:"rownum", align:"right", width:40}].concat(message.results.fields.map((field) => {
                    return {title:field.name, field: field.index, headerSort:false};
                  })),
                  data: []
                });
              }
              allData = allData.concat(message.results.rows);
              const renderInPosition = true;
              await table.rowManager.setData(allData, renderInPosition);
            }
          });
        });
      </script>
    </body>
  </html>`;
}

function summary(results: QueryResults): string {
  return (
    results.command === 'GRANT' ? 'Done: Access granted' :
      results.command === 'ALTER' ? 'Done: Altered' :
        results.command === 'CREATE' ? 'Done: Created' : ''
  )
}

function formatFieldValue(field: FieldInfo, value: any): number | string | Date {
  if (value === null) return value;
  if (typeof value === typeof undefined) return '';
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value;

  // Not sure what is best in the general case
  return JSON.stringify(value);
}
