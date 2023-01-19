import { FigmaCalculator } from "..";
import { FigmaTeamComponent, FigmaTeamStyle } from "../models/figma";
import {
  AdoptionCalculationOptions,
  AggregateCounts,
  LintCheckName,
  ProcessedNode,
} from "../models/stats";
import FigmaDocumentParser from "../parser";
import {
  generateStyleBucket,
  generateStyleLookup,
  LintCheckOptions,
  runSimilarityChecks,
} from "../rules";
import { makePercent } from "./percent";

export type ProcessedNodeOptions = {
  onProcessNode?: (node: ProcessedNode) => void;
} & LintCheckOptions;

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
  opts?: ProcessedNodeOptions
) {
  const styleBuckets = generateStyleBucket(allStyles);
  const styleLookupMap = generateStyleLookup(styleBuckets);

  const processedNodes: ProcessedNode[] = [];

  const addToProcessedNodes = (node: ProcessedNode) => {
    if (opts?.onProcessNode) {
      opts.onProcessNode(node);
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

  // also process the library nodes
  for (const nodeId of Object.keys(libraryNodes)) {
    const baseInstanceComponent = {
      name: libraryNodes[nodeId].name,
      type: "INSTANCE",
      lintChecks: [],
      belongsToLibraryComponent: true,
      similarComponents: [],
    };

    // add the top-level node
    addToProcessedNodes({
      id: nodeId,
      ...baseInstanceComponent,
    });

    // add all the individual library nodes
    const { layers } = libraryNodes[nodeId];
    for (const layerNodeId of layers) {
      addToProcessedNodes({
        id: layerNodeId,
        ...baseInstanceComponent,
      });
    }
  }

  // run lint checks on the remaning nodes
  for (const node of nonLibraryNodes) {
    const result = runSimilarityChecks(styleBuckets, node, {
      styleLookupMap,
      ...opts,
    });

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
  aggregates: AggregateCounts[],
  opts?: { includePartials: boolean }
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

      if (opts && opts.includePartials) {
        allTotals.totalFullMatch += results.partial;
      }
      allTotals.totalNodes += results.partial + results.full + results.none;
    }
  }

  return {
    checkName,
    full: makePercent(allTotals.totalFullMatch / allTotals.totalNodes),
    partial: makePercent(allTotals.totalPartialMatch / allTotals.totalNodes),
  };
}
