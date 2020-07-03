import BaseCommand from "../common/baseCommand";
import * as vscode from 'vscode';
import { IConnection } from "../common/IConnection";
import { Database } from "../common/database";
import { Constants } from "../common/constants";
import { PostgreSQLTreeDataProvider } from '../tree/treeProvider';

'use strict';

export class runQueryCommand extends BaseCommand {
  async run() {
    if (!vscode.window.activeTextEditor && !vscode.window.activeTextEditor.document) {
      vscode.window.showWarningMessage('No SQL file selected');
      return;
    }

    const tree = PostgreSQLTreeDataProvider.getInstance();
    const connections = tree.context.globalState.get<{ [key: string]: IConnection }>(Constants.GlobalStateKey);
    const connection = connections[Object.keys(connections)[0]];

    let editor = vscode.window.activeTextEditor;
    let querySelection = null;

    // Calculate the selection if we have a selection, otherwise we'll use null to indicate
    // the entire document is the selection
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
        //endColumn: editor.document.lineAt(editor.document.lineCount).range.end.
      }
    }

    // Trim down the selection. If it is empty after selecting, then we don't execute
    let selectionToTrim = editor.selection.isEmpty ? undefined : editor.selection;
    if (editor.document.getText(selectionToTrim).trim().length === 0) {
      vscode.window.showWarningMessage('No SQL found to run');
      return;
    }

    let sql = editor.document.getText(selectionToTrim);
    return Database.runQuery(sql, editor, connection);
  }
}