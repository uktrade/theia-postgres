import * as path from 'path';
import * as vscode from 'vscode';
import { Pool } from 'pg';

export function getRunCommand(pool: Pool, runQueryAndDisplayResults) {
  return async function run() {
    if (!vscode.window.activeTextEditor && !vscode.window.activeTextEditor.document) {
      vscode.window.showWarningMessage('No SQL file selected');
      return;
    }

    const editor = vscode.window.activeTextEditor;
    let querySelection = null;

    if (!editor.selection.isEmpty) {
      let selection = editor.selection;
      querySelection = {
        startLine: selection.start.line,
        startColumn: selection.start.character,
        endLine: selection.end.line,
        endColumn: selection.end.character
      }
    } else {
      querySelection = {
        startLine: 0,
        startColumn: 0,
        endLine: editor.document.lineCount
      }
    }

    const selectionToTrim = editor.selection.isEmpty ? undefined : editor.selection;
    if (editor.document.getText(selectionToTrim).trim().length === 0) {
      vscode.window.showWarningMessage('No SQL found to run');
      return;
    }

    const sql = editor.document.getText(selectionToTrim);
    const title = path.basename(editor.document.fileName);

    const resourceColumn = (vscode.window.activeTextEditor && vscode.window.activeTextEditor.viewColumn) || vscode.ViewColumn.One;

    return runQueryAndDisplayResults(sql, pool, editor.document.uri, title);
  }
}
