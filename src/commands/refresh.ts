import * as vscode from 'vscode';
import { PostgreSQLTreeDataProvider } from "../tree/treeProvider";
import { INode } from "../tree/INode";

export function getRefreshCommand(tree) {
  return async function run(treeNode: INode) {
    tree.refresh(treeNode);
  }
}
