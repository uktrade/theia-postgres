import * as vscode from 'vscode';
import { PostgreSQLTreeDataProvider } from "../tree/treeProvider";
import { TableNode } from "../tree/tableNode";
import { Database } from "../common/database";

export function getSelectTopCommand() {
  return async function run(treeNode: TableNode) {
    // prompt for count
    const countInput: string = await vscode.window.showInputBox({ prompt: "Select how many?", placeHolder: "limit" });
    if (!countInput) return;

    const count: number = parseInt(countInput);
    if (Number.isNaN(count)) {
      vscode.window.showErrorMessage('Invalid quantity for selection - should be a number');
      return;
    }

    const sql = `SELECT * FROM ${treeNode.getQuotedTableName()} LIMIT ${count};`
    const textDocument = await vscode.workspace.openTextDocument({content: sql, language: 'postgres'});
    await vscode.window.showTextDocument(textDocument);
    return Database.runQuery(sql, vscode.window.activeTextEditor, treeNode.connection);
  }
}
