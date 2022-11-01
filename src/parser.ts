/**
 * Wraps around a Figma DocumentNode to use in the cloud and plugin
 */
export default class FigmaDocumentParser {
  constructor(private document?: DocumentNode) {}

  getId() {
    return this.document!.id;
  }

  setDocumentNode(document: DocumentNode) {
    this.document = document;
  }

  protected getDocumentNode() {
    return this.document;
  }

  getAllPages(): PageNode[] {
    if (this.document && this.document.children) {
      return this.document.children as PageNode[];
    }
    return [];
  }

  /**
   * Runs and returns an array of matching nodes that pass the match function
   * @param node - Can pass any Figma Node with children
   * @param matchFunction
   * @returns
   */
  static FindAll(
    node: SceneNode | any,
    matchFunction: (child: SceneNode) => boolean
  ) {
    const matches: SceneNode[] = [];
    function recursivelyTraverse(node: any) {
      if (!node.children) return matches;

      if (node.children.length == 0) return matches;

      for (const child of node.children) {
        const match = matchFunction(child);
        if (match) matches.push(child);
        recursivelyTraverse(child);
      }
    }

    recursivelyTraverse(node);
    return matches;
  }

  getPageNode(pageId: string) {
    let pageToSearch = undefined;
    for (const page of this.document!.children) {
      if (pageId == page.id) {
        pageToSearch = page;
      }
    }

    if (!pageToSearch) throw new Error("That page does not exist!");

    return pageToSearch;
  }

  /**
   * Looks in immediate children if there are any matches
   * @param node
   * @param matchFunction
   * @returns
   */
  static FindChildren(
    node: SceneNode | any,
    matchFunction: (child: SceneNode) => boolean
  ) {
    const matches: SceneNode[] = [];
    if (!node.children) return matches;
    if (node.children.length === 0) return matches;
    for (const child of node.children) {
      const match = matchFunction(child);
      if (match) matches.push(child);
    }

    return matches;
  }

  static RemoveNode(root: BaseNode, nodeId: string) {
    // running in the figma context
    if (typeof figma !== undefined) {
      const node = figma.getNodeById(nodeId);
      if (node) {
        node.remove();
      }
    }

    function recursivelyRemove(node: any) {
      if (!node.children) return;

      if (node.children.length == 0) return;

      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];

        if (child.id == nodeId) {
          // remove the node
          (node.children as BaseNode[]).splice(i, 1);
          return;
        } else {
          recursivelyRemove(child);
        }
      }
    }

    recursivelyRemove(root);
  }

  findAll = FigmaDocumentParser.FindAll;
  findChildren = FigmaDocumentParser.FindChildren;
}
