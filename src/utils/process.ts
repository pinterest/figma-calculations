import { FigmaTeamComponent, FigmaTeamStyle } from "../models/figma";
import { AggregateCounts, LintCheckName, ProcessedNode } from "../models/stats";
import FigmaDocumentParser from "../parser";
import { generateStyleBucket, runSimilarityChecks } from "../rules";
import { makePercent } from "./percent";

// returns array of nodes that are in a hidden layer tree
export const getHiddenNodes = (
  topLevelHiddenNode: GroupNode | any
): SceneNode[] => {
  const childrenNodes = FigmaDocumentParser.FindAll(
    topLevelHiddenNode,
    (node) => true
  );
  return [topLevelHiddenNode].concat(childrenNodes);
};

export type ProcessedNodeAggregate = {
  isLastElement: boolean;
  numLibraryNodes: number;
  numTotalNodes: number;
  numHiddenNodes: number;
};

export function* getProcessedNodes(
  rootNode: BaseNode,
  components: FigmaTeamComponent[],
  allStyles: FigmaTeamStyle[]
): Generator<ProcessedNode | ProcessedNodeAggregate> {
  const targetInstanceNodes: { [key: string]: FigmaTeamComponent } = {};
  for (const comp of components as FigmaTeamComponent[]) {
    // use the containing frame name instead if it's a variant
    // Usually, these look like "name": "Count=5"
    // Hopefully we don't explicitly export components with an = signs in the name
    if (comp.name.includes("=")) {
      targetInstanceNodes[comp.containing_frame.name] = comp;
    } else {
      targetInstanceNodes[comp.name] = comp;
    }
  }

  const styleBuckets = generateStyleBucket(allStyles);

  let numTotalNodes = 0;

  let libraryNodes: SceneNode[] = [];

  let nodesToSkip: string[] = [];
  let allHiddenNodes: string[] = [];

  // iterate through generator
  // iterate through all the nodes
  for (const node of FigmaDocumentParser.ForEach(rootNode)) {
    if (!node) continue;
    if (node.visible === false) {
      const hiddenNodes = getHiddenNodes(node).map((node) => node.id);
      allHiddenNodes = allHiddenNodes.concat(hiddenNodes);
      continue;
    }

    // if the node is hidden, then don't include it in our counts
    if (allHiddenNodes.includes(node.id)) {
      continue;
    }

    numTotalNodes += 1;

    // exclude any instance nodes
    if (nodesToSkip.includes(node.id)) {
      continue;
    }

    // get all the sublayers of an instance that's part of a library, and skip it
    if (node.type === "INSTANCE" && targetInstanceNodes[node.name]) {
      numTotalNodes -= 1;

      yield {
        id: node.id,
        name: node.name,
        type: node.type,
        lintChecks: [],
        belongsToLibraryComponent: true,
        similarComponents: [],
      };

      const subNodes = FigmaDocumentParser.FindAll(node, () => true);

      nodesToSkip = subNodes.map((n) => n.id);

      const hiddenSubNodes = subNodes
        .filter((node) => node.visible === false)
        .map((node) => getHiddenNodes(node))
        .flat();

      const allHiddenNodesMap: { [key: string]: string } = {};

      for (const node of hiddenSubNodes) {
        allHiddenNodesMap[node.id] = "";
      }

      // anything that's not hidden is visible
      const visibleNodes = subNodes.filter(
        (node) => !(node.id in allHiddenNodesMap)
      );

      // all of the visible sub nodes of an instance node
      libraryNodes = libraryNodes.concat(visibleNodes);

      continue;
    }

    const result = runSimilarityChecks(styleBuckets, node);

    yield {
      id: node.id,
      name: node.name,
      type: node.type,
      lintChecks: result,
      belongsToLibraryComponent: false,
      similarComponents: [],
    };
  }

  // throw in the subnodes of the instance nodes
  for (const node of libraryNodes) {
    yield {
      id: node.id,
      name: node.name,
      type: node.type,
      lintChecks: [],
      belongsToLibraryComponent: true,
      similarComponents: [],
    };
  }

  yield {
    isLastElement: true,
    numTotalNodes,
    numLibraryNodes: libraryNodes.length,
    numHiddenNodes: allHiddenNodes.length,
  };
}

export function getLintCheckPercent(
  checkName: LintCheckName,
  aggregates: AggregateCounts[]
) {
  const allTotals = {
    totalNodes: 0,
    totalFullMatch: 0,
    totalPartialMatch: 0,
  };

  for (const count of aggregates) {
    const { checks } = count;

    if (checks[checkName]) {
      const results = checks[checkName]!;
      allTotals.totalFullMatch += results.full;
      allTotals.totalPartialMatch += results.partial;
      allTotals.totalNodes += results.partial + results.full + results.none;
    }
  }

  return {
    checkName,
    full: makePercent(allTotals.totalFullMatch / allTotals.totalNodes),
    partial: makePercent(allTotals.totalPartialMatch / allTotals.totalNodes),
  };
}
