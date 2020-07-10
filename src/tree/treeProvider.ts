import * as theia from '@theia/plugin';
import { INode } from './INode';
import { Pool } from 'pg';
import { SchemaNode } from './schemaNode';

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