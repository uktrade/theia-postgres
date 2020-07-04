import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import PostgreSQLLanguageClient from './language/client';
import { PostgreSQLTreeDataProvider } from './tree/treeProvider';
import { Global } from './common/global';
import { ResultsManager } from './resultsview/resultsManager';

import { IConnectionConfig } from "./common/IConnectionConfig";
import { Pool } from 'pg';

import { getNewQueryCommand } from './commands/newQuery';
import { getRefreshCommand } from './commands/refresh';
import { getRunCommand } from './commands/runQuery';
import { getSaveResultCommand } from './commands/saveResult';
import { getSelectTopCommand } from './commands/selectTop';

export async function activate(context: vscode.ExtensionContext) {
  let languageClient: PostgreSQLLanguageClient = new PostgreSQLLanguageClient(context);
  Global.context = context;

  Global.ResultManager = new ResultsManager();
  context.subscriptions.push(Global.ResultManager);

  const credentials = process.env['DATABASE_DSN__datasets_1'];
  const connectionConfig: IConnectionConfig = {
    label: 'datasets',
    host: credentials.match(/host=([a-z0-9_\-\.]+)/)[1],
    user: credentials.match(/user=([a-z0-9_]+)/)[1],
    port: parseInt(credentials.match(/port=(\d+)/)[1]),
    ssl: credentials.match(/sslmode=([a-z\-]+)/)[1] == 'require',
    database: credentials.match(/dbname=([a-z0-9_\-]+)/)[1],
    password: credentials.match(/password=([a-zA-Z0-9_]+)/)[1]
  };
  const pool = new Pool(connectionConfig);

  const tree = new PostgreSQLTreeDataProvider(pool);
  context.subscriptions.push(vscode.window.registerTreeDataProvider('postgres', tree));

  context.subscriptions.push(vscode.commands.registerCommand('vscode-postgres.newQuery', getNewQueryCommand()));
  context.subscriptions.push(vscode.commands.registerCommand('vscode-postgres.refresh', getRefreshCommand(tree)));
  context.subscriptions.push(vscode.commands.registerCommand('vscode-postgres.runQuery', getRunCommand(pool)));
  context.subscriptions.push(vscode.commands.registerCommand('vscode-postgres.saveResult', getSaveResultCommand()));
  context.subscriptions.push(vscode.commands.registerCommand('vscode-postgres.selectTop', getSelectTopCommand()));

  vscode.window.onDidChangeActiveTextEditor((e: vscode.TextEditor) => {
    languageClient.setConnection(connectionConfig);
  });
}

export function deactivate() {
}
