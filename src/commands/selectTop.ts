import * as path from 'path';
import * as vscode from 'vscode';
import { TableNode } from "../tree/tableNode";
import { Client } from 'pg';


export function getSelectTopCommand(runQueryAndDisplayResults) {
  return async function run(treeNode: TableNode) {
    const countInput: string = await vscode.window.showInputBox({ prompt: "Select how many?", placeHolder: "limit" });
    if (!countInput) return;

    const count: number = parseInt(countInput);
    if (Number.isNaN(count)) {
      vscode.window.showErrorMessage('Invalid quantity for selection - should be a number');
      return;
    }

    const quotedSchema = Client.prototype.escapeIdentifier(treeNode.schema);
    const quotedTable = Client.prototype.escapeIdentifier(treeNode.table);
    const quoted = `${quotedSchema}.${quotedTable}`;
    const sql = `SELECT * FROM ${quoted} LIMIT ${count};`
    const textDocument = await vscode.workspace.openTextDocument({content: sql, language: 'postgres'});

    const title = path.basename(textDocument.fileName);
    await vscode.window.showTextDocument(textDocument);

    return runQueryAndDisplayResults(sql, treeNode.pool, textDocument.uri, title);
  }
}
