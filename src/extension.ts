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
import { Database, PgClient } from "./common/database";

export async function activate(context: vscode.ExtensionContext) {
  let languageClient: PostgreSQLLanguageClient = new PostgreSQLLanguageClient(context);
  let treeProvider: PostgreSQLTreeDataProvider = PostgreSQLTreeDataProvider.getInstance(context);
  Global.context = context;

  try {
    let commandPath = context.asAbsolutePath(path.join('out', 'commands'));
    let files = fs.readdirSync(commandPath);
    for (const file of files) {
      if (path.extname(file) === '.map') continue;
      let baseName = path.basename(file, '.js');
      let className = baseName + 'Command';

      let commandClass = require(`./commands/${baseName}`);
      new commandClass[className](context);
    }
  }
  catch (err) {
    console.error('Command loading error:', err);
  }

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

  context.subscriptions.push(vscode.commands.registerCommand('vscode-postgres.runQuery', getRunCommand(connections[id])));

  vscode.window.onDidChangeActiveTextEditor((e: vscode.TextEditor) => {
    languageClient.setConnection(connections[id]);
  });

  await tree.context.globalState.update(Constants.GlobalStateKey, connections);
  tree.refresh();
}

// this method is called when your extension is deactivated
export function deactivate() {
}

function getRunCommand(connection) {
  return async function run() {
    if (!vscode.window.activeTextEditor && !vscode.window.activeTextEditor.document) {
      vscode.window.showWarningMessage('No SQL file selected');
      return;
    }

    const editor = vscode.window.activeTextEditor;
    let querySelection = null;

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
      }
    }

    const selectionToTrim = editor.selection.isEmpty ? undefined : editor.selection;
    if (editor.document.getText(selectionToTrim).trim().length === 0) {
      vscode.window.showWarningMessage('No SQL found to run');
      return;
    }

    const sql = editor.document.getText(selectionToTrim);
    return Database.runQuery(sql, editor, connection);
  }
}
