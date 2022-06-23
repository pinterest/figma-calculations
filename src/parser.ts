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
   * Runs on a set of matching nodes
   * @param node - Can pass any Figma Node with children
   * @returns
   */
  static *ForEach(
    node: any,
    _isFirstElement = true
  ): Generator<SceneNode | undefined> {
    // skip the first element in the sequence and only focus on the children
    if (!_isFirstElement) {
      yield node;
    } else {
      yield undefined;
    }
    let children = (node as GroupNode).children;
    if (children) {
      for (let child of children) {
        yield* this.ForEach(child, false);
      }
    }
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

  findAll = FigmaDocumentParser.FindAll;
  findChildren = FigmaDocumentParser.FindChildren;
}
