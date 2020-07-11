import * as theia from '@theia/plugin';
import { setupPostgresLanguageClient } from './language/client';
import { PostgreSQLTreeDataProvider } from './tree';
import { generateResultsHtml } from './resultsview/common';
import { getRunQueryAndDisplayResults, QueryResults } from './database';

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
    ssl: credentials.match(/sslmode=([a-z\-]+)/)![1] == 'require',
    database: credentials.match(/dbname=([a-z0-9_\-]+)/)![1],
    password: credentials.match(/password=([a-zA-Z0-9_]+)/)![1]
  };
  const pool = new Pool(connectionConfig);

  const tree = new PostgreSQLTreeDataProvider(pool);
  context.subscriptions.push(theia.window.registerTreeDataProvider('postgres', tree));

  // The "save" button that appears with results is a bit faffy to maintain due to the order
  // that multiple panels fire their change events when tabbling between.
  var numActive: number = 0;
  var activeResults: QueryResults[];
  function onChangeActive(isActive: boolean, results: QueryResults[]) {
    numActive = numActive + (isActive ? 1 : -1);
    if (isActive) {
      activeResults = results;
    }
    theia.commands.executeCommand('setContext', 'theiaPostgresResultFocus', numActive > 0);
  }
  const runQueryAndDisplayResults = getRunQueryAndDisplayResults(onChangeActive);

  // The "state" of the WebView is simply the HTML of the body. Doesn't allow to save after
  // a refresh of the page, but KISS for now
  theia.window.registerWebviewPanelSerializer('theia-postgres.results', new (class implements theia.WebviewPanelSerializer {
    async deserializeWebviewPanel(webviewPanel: theia.WebviewPanel, state: any) {
      webviewPanel.webview.html = generateResultsHtml(state.body);
    }
  }));

  context.subscriptions.push(theia.commands.registerCommand('theia-postgres.newQuery', getNewQueryCommand()));
  context.subscriptions.push(theia.commands.registerCommand('theia-postgres.refresh', getRefreshCommand(tree)));
  context.subscriptions.push(theia.commands.registerCommand('theia-postgres.runQuery', getRunCommand(pool, runQueryAndDisplayResults)));
  context.subscriptions.push(theia.commands.registerCommand('theia-postgres.saveResult', getSaveResultCommand(() => activeResults)));
  context.subscriptions.push(theia.commands.registerCommand('theia-postgres.selectTop', getSelectTopCommand(runQueryAndDisplayResults)));

  await setupPostgresLanguageClient(context, connectionConfig);
}

export function stop() {
}
