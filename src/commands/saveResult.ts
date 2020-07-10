import * as fs from 'fs';
import * as theia from '@theia/plugin';
import * as csv from 'csv-stringify';
import { QueryResults } from "../common/database";

interface SaveTableQuickPickItem extends theia.QuickPickItem {
  readonly index: number;
}

export function getSaveResultCommand(getActiveResults: () => QueryResults[]) {
  return async function run(uri: theia.Uri) {
    let results = getActiveResults();
    if (!results) {
      theia.window.showWarningMessage('Unable to save data - dataset not found');
      return;
    }

    let resultIndex = 0;
    if (results.length > 1) {
      let tables: SaveTableQuickPickItem[] = [];
      for (let i = 1; i <= results.length; i++) {
        tables.push({
          label: 'Table ' + i.toString(),
          index: i - 1
        });
      }

      let selected = await theia.window.showQuickPick(tables, {});
      if (!selected) return;
      resultIndex = selected.index;
    }

    if (results[resultIndex].rowCount < 1) {
      theia.window.showWarningMessage('Unable to save data - table has no data');
      return;
    }

    let formats = ['csv', 'json'];
    let selFormat = await theia.window.showQuickPick(formats, {});
    if (!selFormat) return;

    let fileData: string;
    if (selFormat === 'json') {
      let data = transformResult(results[resultIndex]);
      fileData = JSON.stringify(data, null, 2);
    } else if (selFormat === 'csv') {
      let columns: any = {};
      results[resultIndex].fields.forEach(field => {
        columns[field.name] = field.name
      });

      fileData = await new Promise<string>((resolve) => {
        csv(results[resultIndex].rows, {
          header: true,
          columns: columns,
          formatters: {
            bool: (value: boolean): string => {
              return value ? 'true' : 'false';
            }
          }
        }, (err, output: string) => {
          if (err) { resolve(''); return; }
          resolve(output);
        });
      });
    }

    var index = 1;
    const getPath = () => `/home/theia/untitled-${index}.${selFormat}`
    while (fs.existsSync(getPath())) {
      ++index;
    }
    fs.writeFileSync(getPath(), fileData, 'utf8');
    await theia.window.showTextDocument(await theia.workspace.openTextDocument(getPath()));
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