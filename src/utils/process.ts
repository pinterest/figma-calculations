import { FigmaCalculator } from "..";
import {
  FigmaLocalVariableCollections,
  FigmaLocalVariables,
  FigmaTeamComponent,
  FigmaTeamStyle,
} from "../models/figma";
import { AggregateCounts, LintCheckName, ProcessedNode } from "../models/stats";
import FigmaDocumentParser from "../parser";
import {
  generateStyleBucket,
  generateStyleLookup,
  LintCheckOptions,
  runSimilarityChecks,
} from "../rules";
import { makePercent } from "./percent";
import {
  HexColorToFigmaVariableMap,
  RoundingToFigmaVariableMap,
  createHexColorToVariableMap,
  createRoundingToVariableMap,
  getCollectionVariables,
} from "./variables";

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
  colorVariableCollectionIds: string[],
  roundingVariableCollectionIds: string[],
  variables: FigmaLocalVariables,
  variableCollections: FigmaLocalVariableCollections,
  opts?: ProcessedNodeOptions
) {
  const styleBuckets = generateStyleBucket(allStyles);
  const styleLookupMap = generateStyleLookup(styleBuckets);

  // Grab the variables from specific color variable collection(s)
  let colorVariableIds: string[] = [];
  let hexColorToVariableMap: HexColorToFigmaVariableMap = {};
  if (
    colorVariableCollectionIds.length > 0 &&
    variables &&
    Object.keys(variables).length > 0 &&
    variableCollections &&
    Object.keys(variableCollections).length > 0
  ) {
    colorVariableIds = getCollectionVariables(
      colorVariableCollectionIds,
      variableCollections
    );
    hexColorToVariableMap = createHexColorToVariableMap(
      colorVariableIds,
      variables,
      variableCollections
    );
  }

  // Grab the variables from specific rounding variable collection(s)
  let roundingVariableIds: string[] = [];
  let roundingToVariableMap: RoundingToFigmaVariableMap = {};
  if (
    roundingVariableCollectionIds.length > 0 &&
    variables &&
    Object.keys(variables).length > 0 &&
    variableCollections &&
    Object.keys(variableCollections).length > 0
  ) {
    roundingVariableIds = getCollectionVariables(
      roundingVariableCollectionIds,
      variableCollections
    );
    roundingToVariableMap = createRoundingToVariableMap(
      roundingVariableIds,
      variables,
      variableCollections
    );
  }

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
      isRootComponentNode: true,
      ...baseInstanceComponent,
    });

    // add all the individual library nodes
    const { layers } = libraryNodes[nodeId];
    for (const layerNodeId of layers) {
      addToProcessedNodes({
        id: layerNodeId,
        isRootComponentNode: false,
        ...baseInstanceComponent,
      });
    }
  }

  // run lint checks on the remaining nodes
  for (const node of nonLibraryNodes) {
    const result = runSimilarityChecks(styleBuckets, variables, node, {
      ...opts,
      styleLookupMap,
      hexColorToVariableMap,
      roundingToVariableMap,
    });

    addToProcessedNodes({
      id: node.id,
      name: node.name,
      type: node.type,
      lintChecks: result,
      belongsToLibraryComponent: false,
      isRootComponentNode: false,
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
