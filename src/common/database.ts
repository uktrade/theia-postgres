import * as fs from 'fs';
import * as vscode from 'vscode';
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

export async function runQueryAndDisplayResults(sql: string, pool: Pool, uri: string, title: string) {
  let resultsUri = vscode.Uri.parse('postgres-results://' + uri);

  const typeNamesQuery = `select oid, format_type(oid, typtypmod) as display_type, typname from pg_type`;

  try {
    var types: TypeResults = await pool.query(typeNamesQuery);
    var res: QueryResults | QueryResults[] = await pool.query({text: sql, rowMode: 'array'});
  } catch (err) {
    vscode.window.showErrorMessage(err.message);
    return;
  }

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
}
