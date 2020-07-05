import * as vscode from 'vscode';
import { Constants } from './constants';

export class Global {
  public static context: vscode.ExtensionContext = null;

  public static get Configuration(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration(Constants.ExtensionId);
  }
}
