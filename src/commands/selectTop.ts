import * as fs from 'fs';
import * as path from 'path';
import * as theia from '@theia/plugin';
import { TableNode } from "../tree";
import { Client } from 'pg';


export function getSelectTopCommand(runQueryAndDisplayResults) {
  return async function run(treeNode: TableNode) {
    const countInput: string = await theia.window.showInputBox({ prompt: "Select how many?", placeHolder: "limit" });
    if (!countInput) return;

    const count: number = parseInt(countInput);
    if (Number.isNaN(count)) {
      theia.window.showErrorMessage('Invalid quantity for selection - should be a number');
      return;
    }

    const quotedSchema = Client.prototype.escapeIdentifier(treeNode.schema);
    const quotedTable = Client.prototype.escapeIdentifier(treeNode.table);
    const quoted = `${quotedSchema}.${quotedTable}`;
    const sql = `SELECT * FROM ${quoted} LIMIT ${count};`

    var index = 1;
    const getPath = () => `/home/theia/untitled-${index}.sql`
    while (fs.existsSync(getPath())) {
      ++index;
    }
    fs.writeFileSync(getPath(), sql, 'utf8');

    const textDocument = await theia.workspace.openTextDocument(getPath());
    await theia.window.showTextDocument(textDocument);

    const title = path.basename(textDocument.fileName);
    return runQueryAndDisplayResults(sql, treeNode.pool, textDocument.uri, title);
  }
}
