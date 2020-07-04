import * as path from 'path';
import { IConnectionConfig } from "../common/IConnectionConfig";
import { INode } from "./INode";
import { TreeItem, TreeItemCollapsibleState } from "vscode";
import { Database } from "../common/database";
import { TableNode } from "./tableNode";
import { InfoNode } from "./infoNode";
import { Global } from '../common/global';

export class SchemaNode implements INode {

  constructor(private readonly connectionConfig: IConnectionConfig, private readonly schemaName: string) {}
  
  public getTreeItem(): TreeItem {
    return {
      label: this.schemaName,
      collapsibleState: TreeItemCollapsibleState.Collapsed,
      contextValue: 'vscode-postgres.tree.schema',
      command: {
        title: 'select-database',
        command: 'vscode-postgres.setActiveConnection',
        arguments: [ this.connectionConfig ]
      },
      iconPath: {
        light: path.join(__dirname, '../../resources/light/schema.svg'),
        dark: path.join(__dirname, '../../resources/dark/schema.svg')
      }
    };
  }

  public async getChildren(): Promise<INode[]> {
    const connection = await Database.createConnection(this.connectionConfig);

    try {
      return (await connection.query(`
        SELECT
            tablename as name,
            true as is_table,
            schemaname AS schema
          FROM pg_tables
          WHERE
            schemaname = $1
            AND has_table_privilege(quote_ident(schemaname) || '.' || quote_ident(tablename), 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER') = true
        UNION ALL
        SELECT
            viewname as name,
            false as is_table,
            schemaname AS schema
          FROM pg_views
          WHERE
            schemaname = $1
            AND has_table_privilege(quote_ident(schemaname) || '.' || quote_ident(viewname), 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER') = true
        ORDER BY name;`, [this.schemaName])).rows.map<TableNode>(table => {
          return new TableNode(this.connectionConfig, table.name, table.is_table, table.schema);
        });
    } catch(err) {
      return [new InfoNode(err)];
    } finally {
      await connection.end();
    }
  }
}