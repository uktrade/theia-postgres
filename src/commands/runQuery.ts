import * as path from 'path';
import * as vscode from 'vscode';
import { Pool } from 'pg';

export function getRunCommand(pool: Pool, runQueryAndDisplayResults: (sql: string, pool: Pool, uri: vscode.Uri, title: string) => void) {
  return async function run() {
    if (!vscode.window.activeTextEditor || !vscode.window.activeTextEditor.document) {
      vscode.window.showWarningMessage('No SQL file selected');
      return;
    }

    const editor = vscode.window.activeTextEditor;
    const selectionToTrim = editor.selection.isEmpty ? undefined : editor.selection;
    if (editor.document.getText(selectionToTrim).trim().length === 0) {
      vscode.window.showWarningMessage('No SQL found to run');
      return;
    }

    const sql = editor.document.getText(selectionToTrim);
    const title = path.basename(editor.document.fileName);

    return runQueryAndDisplayResults(sql, pool, editor.document.uri, title);
  }
}
