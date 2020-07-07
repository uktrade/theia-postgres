import { randomBytes } from 'crypto';
import { QueryResults, FieldInfo } from '../common/database';

export function generateResultsHtml(resultsBody: string) {
  const nonce = randomBytes(16).toString('base64');
  return `<!DOCTYPE html>
  <html>
    <head>
      <meta http-equiv="Content-type" content="text/html;charset=UTF-8">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'">
      ${getStyles(nonce)}
      <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        window.addEventListener('DOMContentLoaded', (event) => {
          vscode.setState({'body': document.body.innerHTML});
        });
      </script>
    </head>
    <body class="vscode-body">
      ${resultsBody}
    </body>
  </html>`;
}

function getStyles(nonce: string) {
  return `<style nonce="${nonce}">
    body {
      margin: 0;
      padding: 0;
    }

    pre.vscode-postgres-result {
      margin: 5px;
    }

    .field-type {
      font-size: smaller;
    }
    
    table {
      border-collapse: collapse;
    }
    
    th, td {
      border-width: 1px;
      border-style: solid;
      border-color: var(--vscode-panel-border);
      padding: 3px 5px;
    }
    
    .timestamptz-field { white-space: nowrap; }

    .result-divider {
      padding: 0;
      border: none;
      border-top: medium double var(--vscode-panel-border);
    }
  </style>`;
}

export function getResultsBody(results: QueryResults[]): string {
  let html = '', first = true;
  for (const result of results) {
    if (!first)
      html += '<hr class="result-divider" />'
    switch (result.command) {
      case 'INSERT': html += generateInsertResults(result); break;
      case 'UPDATE': html += generateUpdateResults(result); break;
      case 'CREATE': html += generateCreateResults(result); break;
      case 'DELETE': html += generateDeleteResults(result); break;
      case 'EXPLAIN': html += generateExplainResult(result); break;
      case 'SELECT': html += generateSelectResult(result); break;
      default:
        html += generateGenericResult(result);
        break;
    }
    first = false;
  }
  return html;
}

function generateInsertResults(result: QueryResults): string {
  let html = getRowCountResult(result.rowCount, 'inserted', 'insert');
  if (result.fields && result.fields.length && result.rows && result.rows.length)
    html += generateSelectTableResult(result);
  return html;
}

function generateUpdateResults(result: QueryResults): string {
  let html = getRowCountResult(result.rowCount, 'updated', 'update');
  if (result.fields && result.fields.length && result.rows && result.rows.length)
    html += generateSelectTableResult(result);
  return html;
}

function generateCreateResults(result: QueryResults): string {
  return getRowCountResult(result.rowCount, 'created', 'create');
}

function generateDeleteResults(result: QueryResults): string {
  let html = getRowCountResult(result.rowCount, 'deleted', 'delete');
  if (result.fields && result.fields.length && result.rows && result.rows.length)
    html += generateSelectTableResult(result);
  return html;
}

function getRowCountResult(rowCount: number, text: string, preClass: string): string {
  let rowOrRows = rowCount === 1 ? 'row' : 'rows';
  return `<pre class="vscode-postgres-result vscode-postgres-result-${preClass}">${rowCount} ${rowOrRows} ${text}</pre>`;
}

function generateExplainResult(result: QueryResults): string {
  return `<pre class="vscode-postgres-result vscode-postgres-result-explain">${result.rows.join("\n")}</pre>`;
}

function generateGenericResult(result: QueryResults): string {
  return `<pre class="vscode-postgres-result vscode-postgres-result-generic">${JSON.stringify(result)}</pre>`;
}

function generateSelectResult(result: QueryResults): string {
  return getRowCountResult(result.rowCount, 'returned', 'select') + generateSelectTableResult(result);
}

function generateSelectTableResult(result: QueryResults): string {
  return `<table><thead><tr><th></th>` +
    result.fields.map((field) => {
      return `<th><div class="field-name">${field.name}</div><div class="field-type">${field.display_type}</div></th>`;
    }).join() +
    `</tr></thead><tbody>` +
    result.rows.map((row, rowIndex) => {
      return `<tr><th class="row-header">${++rowIndex}</th>` + result.fields.map((field, idx) => {
        const formatted = formatFieldValue(field, row[idx]);
        return `<td class="${field.format}-field">${formatted ? formatted : ''}</td>`;
      }).join() + `</tr>`;
    }).join() + `</tbody></table>`;
}

function formatFieldValue(field: FieldInfo, value: any): string | undefined {
  if (value === null) return `<i>null</i>`;
  if (typeof value === typeof undefined) return '';

  let canTruncate: boolean = false;
  switch (field.format) {
    case 'interval':
      value = formatInterval(value); break;
    case 'json':
    case 'jsonb':
    case 'point':
    case 'circle':
      value = JSON.stringify(value);
    case 'timestamptz': value = value.toJSON().toString(); break;
    case 'text': canTruncate = true; break;
    default:
      value = value.toString();
  }
  let formatted = htmlEntities(value);
  if (canTruncate) {
    if (formatted && formatted.length > 150)
      formatted = formatted.substring(0, 148) + '&hellip;';
  }
  return formatted;
}

function htmlEntities(str: string): string | undefined {
  if (typeof str !== 'string') return str;
  return str ? str.replace(/[\u00A0-\u9999<>\&"']/gim, (i) => `&#${i.charCodeAt(0)};`) : undefined;
}

// #region "Format Interval"
function formatInterval(value: any): string {
  let keys: string[] = ['years', 'months', 'days', 'hours', 'minutes', 'seconds', 'milliseconds'];
  let is_negative = false;
  for (let key of keys) {
    if (!value.hasOwnProperty(key))
      value[key] = 0;
    else if (value[key] < 0) {
      is_negative = true;
      value[key] = Math.abs(value[key]);
    }
  }

  return formatIntervalISO(value, is_negative);
}

function formatIntervalISO(value: any, is_negative: boolean): string {
  //{"days":4107,"hours":5,"minutes":56,"seconds":17,"milliseconds":681}
  let iso = 'P';
  if (value.years) iso += value.years.toString() + 'Y';
  if (value.months) iso += value.months.toString() + 'M';
  if (value.days) iso += value.days.toString() + 'D';

  if (iso === 'P' || (value.hours || value.minutes || value.seconds))
    iso += 'T';

  if (value.hours) iso += value.hours.toString() + 'H';
  if (value.minutes) iso += value.minutes.toString() + 'M';

  if (!value.hasOwnProperty('seconds')) value.seconds = 0;
  if (value.milliseconds) value.seconds += (value.milliseconds / 1000);

  if (value.seconds) iso += value.seconds.toString() + 'S';
  if (iso === 'PT') iso += '0S';
  return (is_negative ? '-' : '') + iso;
}
