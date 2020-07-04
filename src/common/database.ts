import * as fs from 'fs';
import * as vscode from 'vscode';
import * as path from 'path';
import { Pool, Client, types, ClientConfig } from 'pg';
import { IConnectionConfig } from "./IConnectionConfig";
import { OutputChannel } from './outputChannel';

export interface FieldInfo {
  columnID: number;
  dataTypeID: number;
  dataTypeModifier: number;
  dataTypeSize: number;
  format: string;
  name: string;
  tableID: number;
  display_type?: string;
};

export interface QueryResults {
  rowCount: number;
  command: string;
  rows?: any[];
  fields?: FieldInfo[];
  flaggedForDeletion?: boolean;
  message?: string;
};

export interface TypeResult {
  oid: number;
  typname: string;
  display_type?: string;
};

export interface TypeResults {
  rowCount: number;
  command: string;
  rows?: TypeResult[];
  fields?: FieldInfo[];
}

export class PgClient extends Client {
  pg_version: number;

  constructor(config?: string | ClientConfig) {
    super(config);
  }
}

export class Database {

  // could probably be simplified, essentially matches Postgres' built-in algorithm without the char pointers
  static getQuotedIdent(name: string): string {
    let result = '"';
    for (let i = 0; i < name.length; i++) {
      if (name.charAt(i) === '"')
        result += name.charAt(i);
      result += name.charAt(i);
    }
    return result + '"';
  }

  public static async createConnection(connectionConfig: IConnectionConfig, dbname?: string): Promise<PgClient> {
    const connectionOptions: any = Object.assign({}, connectionConfig);
    connectionOptions.database = dbname ? dbname : connectionConfig.database;

    let client = new PgClient(connectionOptions);
    await client.connect();
    const versionRes = await client.query(`SELECT current_setting('server_version_num') as ver_num;`);
    /*
    return res.rows.map<ColumnNode>(column => {
      return new ColumnNode(this.connection, this.table, column);
    });
    */
    let versionNumber = parseInt(versionRes.rows[0].ver_num);
    client.pg_version = versionNumber;
    return client;
  }

  public static async runQuery(sql: string, editor: vscode.TextEditor, connectionConfig: IConnectionConfig) {
    let uri = editor.document.uri.toString();
    let title = path.basename(editor.document.fileName);
    let resultsUri = vscode.Uri.parse('postgres-results://' + uri);

    let connection: PgClient = null;
    try {
      connection = await Database.createConnection(connectionConfig);
      const typeNamesQuery = `select oid, format_type(oid, typtypmod) as display_type, typname from pg_type`;
      const types: TypeResults = await connection.query(typeNamesQuery);
      const res: QueryResults | QueryResults[] = await connection.query({ text: sql, rowMode: 'array' });
      const results: QueryResults[] = Array.isArray(res) ? res : [res];

      results.forEach((result) => {
        result.fields.forEach((field) => {
          let type = types.rows.find((t) => t.oid === field.dataTypeID);
          if (type) {
            field.format = type.typname;
            field.display_type = type.display_type;
          }
        });
      });
      await OutputChannel.displayResults(resultsUri, 'Results: ' + title, results);
      vscode.window.showTextDocument(editor.document, editor.viewColumn);
    } catch (err) {
      OutputChannel.appendLine(err);
      vscode.window.showErrorMessage(err.message);
      // vscode.window.showErrorMessage(err.message, "Show Console").then((button) => {
      //   if (button === 'Show Console') {
      //     OutputChannel.show();
      //   }
      // });
    } finally {
      if (connection)
        await connection.end();
    }
  }
}
