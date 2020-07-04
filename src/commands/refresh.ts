import * as vscode from 'vscode';
import { PostgreSQLTreeDataProvider } from "../tree/treeProvider";
import { INode } from "../tree/INode";

export function getRefreshCommand() {
  return async function run(treeNode: INode) {
    const tree = PostgreSQLTreeDataProvider.getInstance();
    tree.refresh(treeNode);
  }
}