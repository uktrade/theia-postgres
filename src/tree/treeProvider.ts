import * as vscode from 'vscode';
import { INode } from './INode';
import { Constants } from '../common/constants';
import { Global } from '../common/global';
import { IConnection } from '../common/IConnection';
import { SchemaNode } from './schemaNode';
import { Database } from '../common/database';

export class PostgreSQLTreeDataProvider implements vscode.TreeDataProvider<INode> {

  public _onDidChangeTreeData: vscode.EventEmitter<INode> = new vscode.EventEmitter<INode>();
  public readonly onDidChangeTreeData: vscode.Event<INode> = this._onDidChangeTreeData.event;
  private static _instance: PostgreSQLTreeDataProvider = null;

  constructor(public context: vscode.ExtensionContext){ this.refresh(); }

  public static getInstance(context?: vscode.ExtensionContext): PostgreSQLTreeDataProvider {
    if (context && !this._instance) {
      this._instance = new PostgreSQLTreeDataProvider(context);
      context.subscriptions.push(vscode.window.registerTreeDataProvider("postgres", this._instance));
    }
    return this._instance;
  }
  
  public refresh(element?: INode): void {
    this._onDidChangeTreeData.fire(element);
  }

  public getTreeItem(element: INode): Promise<vscode.TreeItem> | vscode.TreeItem {
    return element.getTreeItem();
  }

  public getChildren(element?: INode): Promise<INode[]> | INode[] {
    if (!element) {
      return this.getSchemaNodes();
    }
    return element.getChildren();
  }

  private async getSchemaNodes(): Promise<INode[]> {
    const connections = this.context.globalState.get<{[key: string]: IConnection}>(Constants.GlobalStateKey);
    if (!connections) return [];

    // We only support one connection, and one database on that connection
    const ConnectionNodes = [];
    const id = Object.keys(connections)[0];

    const connection_obj: IConnection = Object.assign({}, connections[id]);
    const connection_postgres = await Database.createConnection(connection_obj, 'postgres');

    try {
      var databases = (await connection_postgres.query(`
        SELECT datname
        FROM pg_database
        WHERE
          datistemplate = false
          AND has_database_privilege(datname, 'TEMP, CONNECT') = true
        ORDER BY datname;`
      )).rows.map<string>(database => {
        return database.datname;
      });
    } finally {
      connection_postgres.end()
    }

    if (!databases.length) return [];
    const connection = await Database.createConnection(connection_obj, databases[0]);

    try {
      return (await connection.query(`
        SELECT nspname AS name
        FROM pg_namespace
        WHERE
          nspname NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
          AND nspname NOT LIKE 'pg_temp_%'
          AND nspname NOT LIKE 'pg_toast_temp_%'
          AND has_schema_privilege(oid, 'CREATE, USAGE')
        ORDER BY nspname;`
      )).rows.map<SchemaNode>(schema => {
        return new SchemaNode(connection_obj, schema.name);
      });
    } finally {
      connection.end();
    }
  }
}