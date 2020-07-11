import { PostgreSQLTreeDataProvider } from "../tree/treeProvider";

export function getRefreshCommand(tree: PostgreSQLTreeDataProvider) {
  return async function run() {
    tree.refresh();
  }
}
