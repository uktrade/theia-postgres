import * as path from 'path';
import * as vscode from 'vscode';
import { LanguageClient, ServerOptions, TransportKind, LanguageClientOptions } from 'vscode-languageclient';
import { ExtensionContext } from 'vscode';
import { IConnectionConfig } from '../common/IConnectionConfig';

export default class PostgreSQLLanguageClient {

  public client: LanguageClient;

  constructor(context: ExtensionContext) {
    let serverModule = context.asAbsolutePath(path.join('out', 'language', 'server.js'));
    let debugOptions = { execArgv: ['--nolazy', '--debug=6005', '--inspect'] };

    let serverOptions: ServerOptions = {
      run: { module: serverModule, transport: TransportKind.ipc },
      debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions }
    };

    let clientOptions: LanguageClientOptions = {
      documentSelector: [
        { language: 'postgres', scheme: 'file' },
        { language: 'postgres', scheme: 'untitled' }
      ]
    };

    this.client = new LanguageClient('postgres', 'PostgreSQL Service', serverOptions, clientOptions);
    let disposable = this.client.start();
    context.subscriptions.push(disposable);
  }

  setConnection(connectionConfig: IConnectionConfig) {
    if (!vscode.window.activeTextEditor) return;
    this.client.sendRequest('set_connection', {connectionConfig});
  }
}
