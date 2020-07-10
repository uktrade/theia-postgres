import * as path from 'path';
import * as theia from '@theia/plugin';
import { Pool } from 'pg';
import { INode } from "./INode";
import { TableNode } from "./tableNode";
import { InfoNode } from "./infoNode";

export class SchemaNode implements INode {

  constructor(private readonly pool: Pool, private readonly schemaName: string) { }

  public getTreeItem(): theia.TreeItem {
    return {
      label: this.schemaName,
      collapsibleState: theia.TreeItemCollapsibleState.Collapsed,
      contextValue: 'theia-postgres.tree.schema',
      iconPath: {
        light: '/hostedPlugin/dit_theia_postgres/resources/light/schema.svg',
        dark: '/hostedPlugin/dit_theia_postgres/resources/dark/schema.svg'
      }
    };
  }

  public async getChildren(): Promise<INode[]> {
    try {
      return (await this.pool.query(`
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
        return new TableNode(this.pool, table.name, table.is_table, table.schema);
      });
    } catch (err) {
      return [new InfoNode(err)];
    }
  }
}