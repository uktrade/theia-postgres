import * as theia from '@theia/plugin';
import { Pool, Client } from 'pg';


interface INode {
  getTreeItem(): Promise<theia.TreeItem> | theia.TreeItem;
  getChildren(): Promise<INode[]> | INode[];
}


interface IForeignKey {
  constraint: string,
  catalog: string,
  schema: string,
  table: string,
  column: string
}


interface IColumn {
  column_name: string;
  data_type: string;
  primary_key: boolean;
  foreign_key?: IForeignKey;
}


export class PostgreSQLTreeDataProvider implements theia.TreeDataProvider<INode> {

  public _onDidChangeTreeData: theia.EventEmitter<INode> = new theia.EventEmitter<INode>();
  public readonly onDidChangeTreeData: theia.Event<INode> = this._onDidChangeTreeData.event;

  constructor(public pool: Pool) { }

  public refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  public getTreeItem(element: INode): Promise<theia.TreeItem> | theia.TreeItem {
    return element.getTreeItem();
  }

  public async getChildren(element?: INode): Promise<INode[]> {
    if (element) {
      return element.getChildren();
    }

    return (await this.pool.query(`
      SELECT nspname AS name
      FROM pg_namespace
      WHERE
        nspname NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
        AND nspname NOT LIKE 'pg_temp_%'
        AND nspname NOT LIKE 'pg_toast_temp_%'
        AND has_schema_privilege(oid, 'CREATE, USAGE')
      ORDER BY nspname;`
    )).rows.map<SchemaNode>(schema => {
      return new SchemaNode(this.pool, schema.name);
    });
  }
}


class SchemaNode implements INode {

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

export class TableNode implements INode {

  constructor(
    public readonly pool: Pool,
    public readonly table: string,
    public readonly is_table: boolean,
    public readonly schema: string) { }

  public getTreeItem(): theia.TreeItem {
    return {
      label: this.table,
      collapsibleState: theia.TreeItemCollapsibleState.Collapsed,
      contextValue: 'theia-postgres.tree.table',
      iconPath: {
        light: `/hostedPlugin/dit_theia_postgres/resources/light/${this.is_table ? 'table' : 'view'}.svg`,
        dark: `/hostedPlugin/dit_theia_postgres/resources/dark/${this.is_table ? 'table' : 'view'}.svg`,
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
    } catch (err) {
      return [new InfoNode(err)];
    }
  }
}


class ColumnNode implements INode {

  constructor(private readonly column: IColumn) { }

  public async getChildren(): Promise<INode[]> { return []; }
  public getTreeItem(): theia.TreeItem {
    let icon = 'column';
    let label = `${this.column.column_name} : ${this.column.data_type}`;
    let tooltip = label;

    if (this.column.primary_key) icon = 'p-key';
    if (this.column.foreign_key) {
      icon = 'f-key';
      tooltip += '\n' + this.column.foreign_key.constraint;
      tooltip += ' -> ' + this.column.foreign_key.table + '.' + this.column.foreign_key.column;
    }

    return {
      label,
      tooltip,
      collapsibleState: theia.TreeItemCollapsibleState.None,
      contextValue: 'theia-postgres.tree.column',
      iconPath: {
        light: `/hostedPlugin/dit_theia_postgres/resources/light/${icon}.svg`,
        dark: `/hostedPlugin/dit_theia_postgres/resources/dark/${icon}.svg`
      }
    };
  }
}


class InfoNode implements INode {
  constructor(private readonly label: string) { }

  public getTreeItem(): theia.TreeItem {
    return {
      label: this.label.toString(),
      collapsibleState: theia.TreeItemCollapsibleState.None,
      contextValue: 'theia-postgres.tree.error',
      iconPath: {
        light: '/hostedPlugin/dit_theia_postgres/resources/light/error.svg',
        dark: '/hostedPlugin/dit_theia_postgres/resources/dark/error.svg'
      }
    };
  }
  public getChildren(): INode[] { return []; }
}