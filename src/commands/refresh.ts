import { PostgreSQLTreeDataProvider } from "../tree/treeProvider";
import { INode } from "../tree/INode";

export function getRefreshCommand(tree: PostgreSQLTreeDataProvider) {
  return async function run(treeNode: INode) {
    tree.refresh();
  }
}
