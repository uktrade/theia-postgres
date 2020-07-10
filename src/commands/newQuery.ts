import * as fs from 'fs';
import * as theia from '@theia/plugin';

export function getNewQueryCommand() {
  return async function run(treeNode: any) {
    // Probably a bit of a race condition if multiple calls at the same time
    // but the user would have to be very quick
    var index = 1;
    const getPath = () => `/home/theia/untitled-${index}.sql`
    while (fs.existsSync(getPath())) {
      ++index;
    }

    fs.writeFileSync(getPath(), '', 'utf8')
    await theia.window.showTextDocument(await theia.workspace.openTextDocument(getPath()));
  }
}
