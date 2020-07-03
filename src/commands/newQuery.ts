import * as fs from 'fs';
import BaseCommand from "../common/baseCommand";
import * as vscode from 'vscode';
import { IConnection } from "../common/IConnection";
import { EditorState } from "../common/editorState";

'use strict';

export class newQueryCommand extends BaseCommand {
  async run(treeNode: any) {
    // Probably a bit of a race condition if multiple calls at the same time
    // but the user would have to be very quick
    var index = 1;
    const path = () => `/home/theia/untitled-${index}.sql`
    while (fs.existsSync(path())) {
      ++index;
    }

    const location = vscode.Uri.parse('untitled:' + path());
    const textDocument = await vscode.workspace.openTextDocument(location);
    await vscode.window.showTextDocument(textDocument);
    if (treeNode && treeNode.connection)
      EditorState.connection = treeNode.connection;
  }
}
