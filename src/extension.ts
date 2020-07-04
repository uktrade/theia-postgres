'use strict';

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import PostgreSQLLanguageClient from './language/client';
import { PostgreSQLTreeDataProvider } from './tree/treeProvider';
import { Global } from './common/global';
import { ResultsManager } from './resultsview/resultsManager';

import { IConnection } from "./common/IConnection";
import { Constants } from "./common/constants";
import * as uuidv1 from "uuid/v1";

import { getNewQueryCommand } from './commands/newQuery';
import { getRefreshCommand } from './commands/refresh';
import { getRunCommand } from './commands/runQuery';
import { getSaveResultCommand } from './commands/saveResult';
import { getSelectTopCommand } from './commands/selectTop';

export async function activate(context: vscode.ExtensionContext) {
  let languageClient: PostgreSQLLanguageClient = new PostgreSQLLanguageClient(context);
  let treeProvider: PostgreSQLTreeDataProvider = PostgreSQLTreeDataProvider.getInstance(context);
  Global.context = context;

  Global.ResultManager = new ResultsManager();
  context.subscriptions.push(Global.ResultManager);

  const tree = PostgreSQLTreeDataProvider.getInstance();
  let connections = tree.context.globalState.get<{ [key: string]: IConnection }>(Constants.GlobalStateKey);
  if (connections) return;

  connections = {};
  const credentials = process.env['DATABASE_DSN__datasets_1'];

  const id = uuidv1();
  connections[id] = {
    label: 'datasets',
    host: credentials.match(/host=([a-z0-9_\-\.]+)/)[1],
    user: credentials.match(/user=([a-z0-9_]+)/)[1],
    port: parseInt(credentials.match(/port=(\d+)/)[1]),
    ssl: credentials.match(/sslmode=([a-z\-]+)/)[1] == 'require',
    database: credentials.match(/dbname=([a-z0-9_\-]+)/)[1],
    password: credentials.match(/password=([a-zA-Z0-9_]+)/)[1]
  };

  context.subscriptions.push(vscode.commands.registerCommand('vscode-postgres.newQuery', getNewQueryCommand()));
  context.subscriptions.push(vscode.commands.registerCommand('vscode-postgres.refresh', getRefreshCommand(tree)));
  context.subscriptions.push(vscode.commands.registerCommand('vscode-postgres.runQuery', getRunCommand(connections[id])));
  context.subscriptions.push(vscode.commands.registerCommand('vscode-postgres.saveResult', getSaveResultCommand()));
  context.subscriptions.push(vscode.commands.registerCommand('vscode-postgres.selectTop', getSelectTopCommand()));

  vscode.window.onDidChangeActiveTextEditor((e: vscode.TextEditor) => {
    languageClient.setConnection(connections[id]);
  });

  await tree.context.globalState.update(Constants.GlobalStateKey, connections);
  tree.refresh();
}

// this method is called when your extension is deactivated
export function deactivate() {
}
