import * as theia from '@theia/plugin';
import { setupPostgresLanguageClient } from './language/client';
import { PostgreSQLTreeDataProvider } from './tree';
import { getRunQueryAndDisplayResults } from './results';

import { IConnectionConfig } from "./types";
import { Pool } from 'pg';

import { getNewQueryCommand } from './commands/newQuery';
import { getRefreshCommand } from './commands/refresh';
import { getRunCommand } from './commands/runQuery';
import { getSaveResultCommand } from './commands/saveResult';
import { getSelectTopCommand } from './commands/selectTop';

export async function start(context: theia.PluginContext) {
  const credentials = process.env['DATABASE_DSN__datasets_1']!;
  const connectionConfig: IConnectionConfig = {
    label: 'datasets',
    host: credentials.match(/host=([a-z0-9_\-\.]+)/)![1],
    user: credentials.match(/user=([a-z0-9_]+)/)![1],
    port: parseInt(credentials.match(/port=(\d+)/)![1]),
    ssl: credentials.match(/sslmode=([a-z\-]+)/)![1] == 'require' ? {
      rejectUnauthorized: false
    } : false,
    database: credentials.match(/dbname=([a-z0-9_\-]+)/)![1],
    password: credentials.match(/password=([a-zA-Z0-9_]+)/)![1],
  };
  const pool = new Pool(connectionConfig);

  const tree = new PostgreSQLTreeDataProvider(pool);
  context.subscriptions.push(theia.window.registerTreeDataProvider('postgres', tree));

  const { runQueryAndDisplayResults, getActiveResults } = getRunQueryAndDisplayResults(pool);
  context.subscriptions.push(theia.commands.registerCommand('theia-postgres.newQuery', getNewQueryCommand()));
  context.subscriptions.push(theia.commands.registerCommand('theia-postgres.refresh', getRefreshCommand(tree)));
  context.subscriptions.push(theia.commands.registerCommand('theia-postgres.runQuery', getRunCommand(runQueryAndDisplayResults)));
  context.subscriptions.push(theia.commands.registerCommand('theia-postgres.saveResult', getSaveResultCommand(getActiveResults)));
  context.subscriptions.push(theia.commands.registerCommand('theia-postgres.selectTop', getSelectTopCommand(runQueryAndDisplayResults)));

  await setupPostgresLanguageClient(context, connectionConfig);
}

export function stop() {
}
