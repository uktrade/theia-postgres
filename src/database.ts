import * as theia from '@theia/plugin';
import { Pool, QueryResult, FieldDef } from 'pg';
import { generateResultsHtml, getResultsBody } from './resultsview/common';

export interface FieldInfo extends FieldDef {
  display_type: string;
};

export interface QueryResults extends QueryResult {
  fields: FieldInfo[];
};

export interface TypeResult {
  oid: number;
  typname: string;
  display_type: string;
};

export interface TypeResults extends QueryResult {
  rows: TypeResult[];
}

export function getRunQueryAndDisplayResults(onChangeActive) {
  return async function runQueryAndDisplayResults(sql: string, pool: Pool, uri: theia.Uri, title: string) {
    const typeNamesQuery = `select oid, format_type(oid, typtypmod) as display_type, typname from pg_type`;

    try {
      var types: TypeResults = await pool.query(typeNamesQuery);
      var res: QueryResult | QueryResult[] = await pool.query({ text: sql, rowMode: 'array' });
    } catch (err) {
      theia.window.showErrorMessage(err.message);
      return;
    }

    const rawResults: QueryResult[] = Array.isArray(res) ? res : [res];
    const results: QueryResults[] = rawResults.map((result) => {
      return {
        ...result,
        fields: result.fields.map((field) => {
          const type = types.rows.find((t) => t.oid === field.dataTypeID);
          return {
            ...field,
            display_type: type.display_type
          };
        })
      };
    });

    const panel = theia.window.createWebviewPanel(
      'theia-postgres.results',
      'Results: ' + title, {
      area: theia.WebviewPanelTargetArea.Bottom
    }, {
      enableScripts: true
    }
    );

    var isActive = false;
    panel.onDidChangeViewState(({ webviewPanel }) => {
      var changed = webviewPanel.active !== isActive;
      isActive = webviewPanel.active;
      if (changed) onChangeActive(webviewPanel.active, results);
    });

    panel.webview.html = generateResultsHtml(getResultsBody(results));
  }
}
