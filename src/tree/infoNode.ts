import * as path from 'path';
import * as vscode from 'vscode';
import { INode } from './INode';

export class InfoNode implements INode {
  constructor(private readonly label: string) { }

  public getTreeItem(): vscode.TreeItem {
    return {
      label: this.label.toString(),
      collapsibleState: vscode.TreeItemCollapsibleState.None,
      contextValue: 'vscode-postgres.tree.error',
      iconPath: {
        light: '/hostedPlugin/ckolkman_vscode_postgres/resources/light/error.svg',
        dark: '/hostedPlugin/ckolkman_vscode_postgres/resources/dark/error.svg'
      }
    };
  }
  public getChildren(): INode[] { return []; }
}