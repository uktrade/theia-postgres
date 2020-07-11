import { PostgreSQLTreeDataProvider } from "../tree";

export function getRefreshCommand(tree: PostgreSQLTreeDataProvider) {
  return async function run() {
    tree.refresh();
  }
}
