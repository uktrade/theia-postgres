import * as path from 'path';
import * as vscode from 'vscode';
import { LanguageClient, ServerOptions, TransportKind, LanguageClientOptions } from 'vscode-languageclient';
import { ExtensionContext } from 'vscode';
import { IConnectionConfig } from '../common/IConnectionConfig';

export async function setupPostgresLanguageClient(context: ExtensionContext, connectionConfig: IConnectionConfig) {
  const serverModule = context.asAbsolutePath(path.join('lib', 'language', 'server.js'));
  const debugOptions = { execArgv: ['--nolazy', '--debug=6005', '--inspect'] };

  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions }
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { language: 'postgres', scheme: 'file' },
      { language: 'postgres', scheme: 'untitled' }
    ]
  };

  const client = new LanguageClient('postgres', 'PostgreSQL Service', serverOptions, clientOptions);
  context.subscriptions.push(client.start());
  await client.onReady();
  client.sendRequest('set_connection', { connectionConfig });
}
