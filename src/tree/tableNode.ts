import * as path from 'path';
import { INode } from "./INode";
import { Pool, Client } from 'pg';
import { TreeItem, TreeItemCollapsibleState } from "vscode";
import { Database } from '../common/database';
import { InfoNode } from './infoNode';
import { ColumnNode } from './columnNode';
import { Global } from '../common/global';
import { QueryResult } from 'pg';
import { SqlQueryManager } from '../queries';

export class TableNode implements INode {

  constructor(public readonly pool: Pool
            , public readonly table: string
            , public readonly is_table: boolean
            , public readonly schema: string)
  {}

  public getTreeItem(): TreeItem {
    return {
      label: this.table,
      collapsibleState: TreeItemCollapsibleState.Collapsed,
      contextValue: 'vscode-postgres.tree.table',
      iconPath: {
        light: path.join(__dirname, `../../resources/light/${this.is_table ? 'table' : 'view'}.svg`),
        dark: path.join(__dirname, `../../resources/dark/${this.is_table ? 'table' : 'view'}.svg`)
      }
    };
  }

  public async getChildren(): Promise<INode[]> {
    const sql = `SELECT
        a.attname as column_name,
        format_type(a.atttypid, a.atttypmod) as data_type,
        coalesce(primaryIndex.indisprimary, false) as primary_key,
        CASE
          WHEN fk.constraint_name IS NULL THEN NULL
          ELSE json_build_object(
            'constraint', fk.constraint_name,
            'catalog', fk.fk_catalog,
            'schema', fk.fk_schema,
            'table', fk.fk_table,
            'column', fk.fk_column
          )
        END as foreign_key
      FROM
        pg_attribute a
        LEFT JOIN pg_index primaryIndex ON primaryIndex.indrelid = a.attrelid AND a.attnum = ANY(primaryIndex.indkey) AND primaryIndex.indisprimary = true
        LEFT JOIN (
          SELECT tc.constraint_name, kcu.column_name,
            ccu.table_catalog as fk_catalog,
            ccu.table_schema as fk_schema,
            ccu.table_name as fk_table,
            ccu.column_name as fk_column
          FROM
            information_schema.key_column_usage kcu
            INNER JOIN information_schema.table_constraints tc ON (
              tc.constraint_name = kcu.constraint_name AND
              tc.table_catalog = kcu.table_catalog AND
              tc.table_schema = kcu.table_schema AND
              tc.table_name = kcu.table_name
            )
            INNER JOIN information_schema.constraint_column_usage ccu ON (
              ccu.constraint_catalog = tc.constraint_catalog AND
              ccu.constraint_schema = tc.constraint_schema AND
              ccu.constraint_name = tc.constraint_name
            )
          WHERE
            kcu.table_schema = $2 AND
            kcu.table_name = $3 AND
            tc.constraint_type = 'FOREIGN KEY'
        ) as fk ON fk.column_name = a.attname
      WHERE
        a.attrelid = $1::regclass AND
        a.attnum > 0 AND
        NOT a.attisdropped AND
        has_column_privilege($1, a.attname, 'SELECT, INSERT, UPDATE, REFERENCES')
      ORDER BY a.attnum;`

    try {
      return (await this.pool.query(sql, [
        Client.prototype.escapeIdentifier(this.schema) + '.' + Client.prototype.escapeIdentifier(this.table),
        this.schema,
        this.table
      ])).rows.map<ColumnNode>(column => {
        return new ColumnNode(column);
      });
    } catch(err) {
      return [new InfoNode(err)];
    }
  }
}