import * as theia from '@theia/plugin';

export interface INode {
  getTreeItem(): Promise<theia.TreeItem> | theia.TreeItem;
  getChildren(): Promise<INode[]> | INode[];
}