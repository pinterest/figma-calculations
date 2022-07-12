import { FigmaCalculator } from "..";
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

export function getProcessedNodes(
  rootNode: BaseNode,
  components: FigmaTeamComponent[],
  allStyles: FigmaTeamStyle[],
  onProcessNode?: (node: ProcessedNode) => void
) {
  const styleBuckets = generateStyleBucket(allStyles);

  const processedNodes: ProcessedNode[] = [];

  const addToProcessedNodes = (node: ProcessedNode) => {
    if (onProcessNode) {
      onProcessNode(node);
    }

    processedNodes.push(node);
  };

  // find all the nodes in the document
  const allNodes = FigmaDocumentParser.FindAll(rootNode, (n) => true);

  // toss any hidden nodes, get the counts
  const { nonHiddenNodes, numHiddenLayers } =
    FigmaCalculator.filterHiddenNodes(allNodes);

  // toss any library nodes from the list
  const { nonLibraryNodes, numLibraryNodes, libraryNodes } =
    FigmaCalculator.filterLibraryNodes(nonHiddenNodes, {
      components,
    });

  console.log(libraryNodes);
  // run lint checks on the remaning nodes
  for (const node of nonLibraryNodes) {
    const result = runSimilarityChecks(styleBuckets, node);

    addToProcessedNodes({
      id: node.id,
      name: node.name,
      type: node.type,
      lintChecks: result,
      belongsToLibraryComponent: false,
      similarComponents: [],
    });
  }

  return {
    processedNodes,
    totalNodes: allNodes.length,
    libraryNodes: numLibraryNodes,
    allHiddenNodes: numHiddenLayers,
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
    const { checks, hiddenNodes } = count;

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
