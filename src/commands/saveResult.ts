import * as vscode from 'vscode';
import { QuickPickItem } from "vscode";
import * as csv from 'csv-stringify';
import { QueryResults } from "../common/database";

interface SaveTableQuickPickItem extends QuickPickItem {
  readonly index: number;
}

export function getSaveResultCommand(getActiveResults: () => QueryResults[]) {
  return async function run(uri: vscode.Uri) {
    let results = getActiveResults();
    if (!results) {
      vscode.window.showWarningMessage('Unable to save data - dataset not found');
      return;
    }

    let resultIndex = 0;
    if (results.length > 1) {
      let tables: SaveTableQuickPickItem[] = [];
      for (let i = 1; i <= results.length; i++) {
        tables.push({
          label: 'Table ' + i,
          index: i - 1
        });
      }
      
      let selected = await vscode.window.showQuickPick(tables);
      if (!selected) return;
      resultIndex = selected.index;
    }

    if (results[resultIndex].rowCount < 1) {
      vscode.window.showWarningMessage('Unable to save data - table has no data');
      return;
    }

    let formats = ['json', 'csv'];
    let selFormat = await vscode.window.showQuickPick(formats);
    if (!selFormat) return;

    let fileData: string = null;
    if (selFormat === 'json') {
      let data = transformResult(results[resultIndex]);
      fileData = JSON.stringify(data, null, 2);
    } else if (selFormat === 'csv') {
      let columns = {};
      results[resultIndex].fields.forEach(field => {
        columns[field.name] = field.name
      });

      let csvError: any = false;
      fileData = await new Promise<string>((resolve) => {
        csv(results[resultIndex].rows, {
          header: true,
          columns: columns,
          formatters: {
            bool: (value: boolean):string => {
              return value ? 'true' : 'false';
            }
          }
        }, (err, output: string) => {
          if (err) { csvError = err; resolve(''); return;}
          resolve(output);
        });
      });
    }

    try {
      let doc: vscode.TextDocument = await vscode.workspace.openTextDocument({language: selFormat});
      let editor: vscode.TextEditor = await vscode.window.showTextDocument(doc, 1, false);
      let result = await editor.edit(edit => edit.insert(new vscode.Position(0, 0), fileData));
      if (!result)
        vscode.window.showErrorMessage('Error occurred opening content in editor');
    }
    catch(err) {
      vscode.window.showErrorMessage(err);
    }
  }
}

function transformResult(result: QueryResults) {
  let trxFunc = transformData.bind(null, result.fields);
  return result.rows.map(trxFunc);
}

function transformData(fields, row) {
  let newRow = {};
  let fieldCounts = {};
  fields.forEach((field, idx) => {
    if (fieldCounts.hasOwnProperty(field)) {
      fieldCounts[field.name]++;
      newRow[field.name + '_' + fieldCounts[field.name]] = row[idx];
    } else {
      fieldCounts[field.name] = 0;
      newRow[field.name] = row[idx];
    }
  });
  return newRow;
}