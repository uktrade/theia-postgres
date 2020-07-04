import * as vscode from 'vscode';
import { INode } from './INode';
import { Constants } from '../common/constants';
import { Global } from '../common/global';
import { IConnectionConfig } from '../common/IConnectionConfig';
import { SchemaNode } from './schemaNode';
import { Database } from '../common/database';

export class PostgreSQLTreeDataProvider implements vscode.TreeDataProvider<INode> {

  public _onDidChangeTreeData: vscode.EventEmitter<INode> = new vscode.EventEmitter<INode>();
  public readonly onDidChangeTreeData: vscode.Event<INode> = this._onDidChangeTreeData.event;

  constructor(public connectionConfig: IConnectionConfig) {}

  public refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  public getTreeItem(element: INode): Promise<vscode.TreeItem> | vscode.TreeItem {
    return element.getTreeItem();
  }

  public async getChildren(element?: INode): Promise<INode[]> {
    if (element) {
      return element.getChildren();
    }

    const connection_postgres = await Database.createConnection(this.connectionConfig, 'postgres');

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
      await connection_postgres.end()
    }

    if (!databases.length) return [];
    const connection = await Database.createConnection(this.connectionConfig, databases[0]);

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
        return new SchemaNode(this.connectionConfig, schema.name);
      });
    } finally {
      await connection.end();
    }
  }
}