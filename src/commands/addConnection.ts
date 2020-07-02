import BaseCommand from "../common/baseCommand";
import * as vscode from 'vscode';
import { PostgreSQLTreeDataProvider } from "../tree/treeProvider";
import { IConnection } from "../common/IConnection";
import { Constants } from "../common/constants";
import * as uuidv1 from "uuid/v1";
import { Global } from "../common/global";
import { Database, PgClient } from "../common/database";

'use strict';

export class addConnectionCommand extends BaseCommand {

  readonly TITLE: string = 'Add Database Connection';
  readonly TotalSteps: number = 7;

  async run() {
    const credentials = process.env['DATABASE_DSN__datasets_1'];
    const user = credentials.match(/user=([a-z0-9_]+)/)[1];
    const password = credentials.match(/password=([a-zA-Z0-9_]+)/)[1];
    const port = parseInt(credentials.match(/port=(\d+)/)[1]);
    const dbname = credentials.match(/dbname=([a-z0-9_\-]+)/)[1];
    const host = credentials.match(/host=([a-z0-9_\-\.]+)/)[1];

    const tree = PostgreSQLTreeDataProvider.getInstance();

    let connections = tree.context.globalState.get<{ [key: string]: IConnection }>(Constants.GlobalStateKey);
    if (!connections) connections = {};

    const id = uuidv1();
    connections[id] = {
      label: 'datasets',
      host: host,
      user: user,
      port: port,
      ssl: true,
      database: dbname,
      password: password
    };

    await tree.context.globalState.update(Constants.GlobalStateKey, connections);
    tree.refresh();
  }
}
