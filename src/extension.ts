import * as theia from '@theia/plugin';
import { setupPostgresLanguageClient } from './language/client';
import { PostgreSQLTreeDataProvider } from './tree';
import { getRunQueryAndDisplayResults } from './results';

import { Pool } from 'pg';

import { getNewQueryCommand } from './commands/newQuery';
import { getRefreshCommand } from './commands/refresh';
import { getRunCommand } from './commands/runQuery';
import { getSaveResultCommand } from './commands/saveResult';
import { getSelectTopCommand } from './commands/selectTop';

export async function start(context: theia.PluginContext) {
  const credentials = process.env['DATABASE_DSN__datasets_1']!;
  const pool = new Pool();

  const tree = new PostgreSQLTreeDataProvider(pool);
  context.subscriptions.push(theia.window.registerTreeDataProvider('postgres', tree));

  const { runQueryAndDisplayResults, getActiveResults } = getRunQueryAndDisplayResults(pool);
  context.subscriptions.push(theia.commands.registerCommand('theia-postgres.newQuery', getNewQueryCommand()));
  context.subscriptions.push(theia.commands.registerCommand('theia-postgres.refresh', getRefreshCommand(tree)));
  context.subscriptions.push(theia.commands.registerCommand('theia-postgres.runQuery', getRunCommand(runQueryAndDisplayResults)));
  context.subscriptions.push(theia.commands.registerCommand('theia-postgres.saveResult', getSaveResultCommand(getActiveResults)));
  context.subscriptions.push(theia.commands.registerCommand('theia-postgres.selectTop', getSelectTopCommand(runQueryAndDisplayResults)));

  await setupPostgresLanguageClient(context);
}

export function stop() {
}
