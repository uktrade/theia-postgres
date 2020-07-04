import * as fs from 'fs';
import * as vscode from 'vscode';

export function getNewQueryCommand() {
  return async function run(treeNode: any) {
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
  }
}
