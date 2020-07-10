import * as path from 'path';
import * as theia from '@theia/plugin';
import { Pool } from 'pg';

export function getRunCommand(pool: Pool, runQueryAndDisplayResults: (sql: string, pool: Pool, uri: theia.Uri, title: string) => void) {
  return async function run() {
    if (!theia.window.activeTextEditor || !theia.window.activeTextEditor.document) {
      theia.window.showWarningMessage('No SQL file selected');
      return;
    }

    const editor = theia.window.activeTextEditor;
    const selectionToTrim = editor.selection.isEmpty ? undefined : editor.selection;
    if (editor.document.getText(selectionToTrim).trim().length === 0) {
      theia.window.showWarningMessage('No SQL found to run');
      return;
    }

    const sql = editor.document.getText(selectionToTrim);
    const title = path.basename(editor.document.fileName);

    return runQueryAndDisplayResults(sql, pool, editor.document.uri, title);
  }
}
