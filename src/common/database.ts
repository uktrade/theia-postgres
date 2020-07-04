import * as fs from 'fs';
import * as vscode from 'vscode';
import * as path from 'path';
import { Pool, Client, types, ClientConfig } from 'pg';
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

export class Database {

  public static async runQuery(sql: string, editor: vscode.TextEditor, pool: Pool) {
    let uri = editor.document.uri.toString();
    let title = path.basename(editor.document.fileName);
    let resultsUri = vscode.Uri.parse('postgres-results://' + uri);

    try {
      const typeNamesQuery = `select oid, format_type(oid, typtypmod) as display_type, typname from pg_type`;
      const types: TypeResults = await pool.query(typeNamesQuery);
      const res: QueryResults | QueryResults[] = await pool.query({ text: sql, rowMode: 'array' });
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
    }
  }
}
