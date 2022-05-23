import { FigmaTeamComponent, FigmaTeamStyle } from "./models/figma";
import {
  AggregateCounts,
  LintCheckPercent,
  ProcessedNodeTree,
} from "./models/stats";
import FigmaDocumentParser from "./parser";

import { makePercent } from "./utils/percent";
import { getLintCheckPercent, getProcessedNodes } from "./utils/process";
import { FigmaAPIHelper } from "./webapi";

export class FigmaCalculator extends FigmaDocumentParser {
  components: FigmaTeamComponent[] = [];
  allStyles: FigmaTeamStyle[] = [];
  apiToken: string = "";

  constructor() {
    super(undefined);

    // initialize the parser with the root figma node in a plugin environment
    if (typeof figma !== "undefined") {
      this.setDocumentNode(figma.root);
    }
  }

  setAPIToken(apiToken: string) {
    this.apiToken = apiToken;
    FigmaAPIHelper.setToken(apiToken);
  }

  async fetchCloudDocument(fileKey: string): Promise<void> {
    const { document } = await FigmaAPIHelper.getFile(fileKey);
    this.setDocumentNode(document);

    if (!this.getDocumentNode()) {
      throw new Error("No document node or file key provided");
    }
  }

  /**
   * Load all of the components from the library
   * @param teamId - the team to load components from
   */
  async loadComponents(teamId: string): Promise<void> {
    if (!this.apiToken) throw new Error("No Figma API token provided");
    const teamComponents = await FigmaAPIHelper.getTeamComponents(teamId);
    // variants live here
    const teamComponentSets = await FigmaAPIHelper.getTeamComponentSets(teamId);

    this.components = teamComponents.concat(teamComponentSets);
  }

  /**
   * Load all of the valid styles from your library
   *@param teamId - the team id to load styles from
   */
  async loadStyles(teamId: string): Promise<void> {
    if (!this.apiToken) throw new Error("No Figma API token provided");
    this.allStyles = await FigmaAPIHelper.getTeamStyles(teamId);
  }

  /**
   * Looks through a given Figma tree and the checks and processes each of the nodes as individuals. Note: Hidden Nodes are thrown out
   * @param rootNode - Can pass any Figma Node with children
   * @param useEmitter - Streams the results of the process to the emitter in intervals
   */
  processTree(rootNode: BaseNode): ProcessedNodeTree {
    const { allHiddenNodes, libraryNodes, totalNodes, processedNodes } =
      getProcessedNodes(rootNode, this.components, this.allStyles);

    const aggregates: AggregateCounts = {
      totalNodes,
      hiddenNodes: allHiddenNodes.length,
      libraryNodes: libraryNodes.length,
      checks: {},
    };

    // loop through the array and calculate the lint check totals

    for (const node of processedNodes) {
      for (const check of node.lintChecks) {
        if (!aggregates.checks[check.checkName]) {
          aggregates.checks[check.checkName] = {
            full: 0,
            partial: 0,
            skip: 0,
            none: 0,
          };
        }

        switch (check.matchLevel) {
          case "Full":
            {
              aggregates.checks[check.checkName]!.full += 1;
            }
            break;
          case "None":
            {
              aggregates.checks[check.checkName]!.none += 1;
            }
            break;
          case "Partial":
            {
              aggregates.checks[check.checkName]!.partial += 1;
            }
            break;
          case "Skip": {
            aggregates.checks[check.checkName]!.skip += 1;
          }
        }
      }
    }

    return {
      parentNode: {
        id: rootNode.id,
        name: rootNode.name,
      },
      aggregateCounts: aggregates,
      nodes: processedNodes,
    };
  }

  getAdoptionPercent(
    processedNodes: ProcessedNodeTree[],
    opts?: { includeMatchingText: boolean }
  ) {
    // add up all the totalNodes

    const allTotals = {
      totalNodesOnPage: 0,
      totalNodesInLibrary: 0,
      totalMatchingText: 0,
    };

    for (const tree of processedNodes) {
      const { totalNodes, libraryNodes, checks } = tree.aggregateCounts;

      allTotals.totalNodesOnPage += totalNodes;
      allTotals.totalNodesInLibrary += libraryNodes;

      if (checks["Text-Style"] && opts && opts.includeMatchingText) {
        allTotals.totalMatchingText += checks["Text-Style"].full;
      }
    }

    const adoptionPercent = makePercent(
      (allTotals.totalNodesInLibrary + allTotals.totalMatchingText) /
        allTotals.totalNodesOnPage
    );

    return adoptionPercent;
  }

  getTextStylePercentage(
    processedNodes: ProcessedNodeTree[]
  ): LintCheckPercent {
    return getLintCheckPercent("Text-Style", processedNodes);
  }

  getFillStylePercent(processedNodes: ProcessedNodeTree[]) {
    return getLintCheckPercent("Fill-Style", processedNodes);
  }

  getBreakDownByTeams(processedNodes: ProcessedNodeTree[]) {
    // do stuff
  }
}
