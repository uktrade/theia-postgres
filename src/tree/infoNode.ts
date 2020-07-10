import * as path from 'path';
import * as vscode from 'vscode';
import { INode } from './INode';

export class InfoNode implements INode {
  constructor(private readonly label: string) { }

  public getTreeItem(): vscode.TreeItem {
    return {
      label: this.label.toString(),
      collapsibleState: vscode.TreeItemCollapsibleState.None,
      contextValue: 'theia-postgres.tree.error',
      iconPath: {
        light: '/hostedPlugin/dit_theia_postgres/resources/light/error.svg',
        dark: '/hostedPlugin/dit_theia_postgres/resources/dark/error.svg'
      }
    };
  }
  public getChildren(): INode[] { return []; }
}