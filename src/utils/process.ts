import { FigmaTeamComponent, FigmaTeamStyle } from "../models/figma";
import { AggregateCounts, LintCheckName, ProcessedNode } from "../models/stats";
import FigmaDocumentParser from "../parser";
import {
  generateComponentMap,
  generateStyleBucket,
  runSimilarityChecks,
} from "../rules";
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

export function getProcessedNodes(
  rootNode: BaseNode,
  components: FigmaTeamComponent[],
  allStyles: FigmaTeamStyle[],
  onProcessNode?: (node: ProcessedNode) => void
) {
  // create a map of the team components by name
  const componentMap = generateComponentMap(components);

  const styleBuckets = generateStyleBucket(allStyles);

  let totalNodes = 0;

  const processedNodes: ProcessedNode[] = [];

  let libraryNodes: SceneNode[] = [];

  let nodesToSkip: string[] = [];
  let allHiddenNodes: string[] = [];

  const addToProcessedNodes = (node: ProcessedNode) => {
    if (onProcessNode) {
      onProcessNode(node);
    }

    processedNodes.push(node);
  };

  FigmaDocumentParser.FindAll(rootNode, (node: SceneNode) => {
    // returns array of nodes that are in a hidden layer tree

    if (node.visible === false) {
      const hiddenNodes = getHiddenNodes(node).map((node) => node.id);
      allHiddenNodes = allHiddenNodes.concat(hiddenNodes);
      return false;
    }

    // if the node is hidden, then don't include it in our counts
    if (allHiddenNodes.includes(node.id)) {
      return false;
    }

    totalNodes += 1;

    // exclude any instance nodes
    if (nodesToSkip.includes(node.id)) {
      return false;
    }

    // get all the sublayers of an instance that's part of a library, and skip it
    if (node.type === "INSTANCE" && componentMap[node.name]) {
      totalNodes -= 1;

      addToProcessedNodes({
        id: node.id,
        name: node.name,
        type: node.type,
        lintChecks: [],
        belongsToLibraryComponent: true,
        similarComponents: [],
      });

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

      return false;
    }

    const result = runSimilarityChecks(styleBuckets, node);

    addToProcessedNodes({
      id: node.id,
      name: node.name,
      type: node.type,
      lintChecks: result,
      belongsToLibraryComponent: false,
      similarComponents: [],
    });

    return true;
  });

  // throw in the subnodes of the instance nodes
  for (const node of libraryNodes) {
    addToProcessedNodes({
      id: node.id,
      name: node.name,
      type: node.type,
      lintChecks: [],
      belongsToLibraryComponent: true,
      similarComponents: [],
    });
  }

  return { processedNodes, libraryNodes, totalNodes, allHiddenNodes };
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
