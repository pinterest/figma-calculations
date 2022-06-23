import { FigmaTeamComponent, FigmaTeamStyle } from "./models/figma";
import {
  AggregateCounts,
  LintCheckPercent,
  ProcessedNode,
  ProcessedNodeTree,
  ProcessedPage,
  ProcessedPageBreakdown,
  ProcessedPercents,
  ProcessedProjectBreakdown,
  ProcessedTeamBreakdown,
  TeamPages,
} from "./models/stats";
import FigmaDocumentParser from "./parser";

import { makePercent } from "./utils/percent";
import { getLintCheckPercent, getProcessedNodes } from "./utils/process";
import { getFigmaPagesForTeam } from "./utils/teams";
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
    const { document, styles } = await FigmaAPIHelper.getFile(fileKey);

    // look at the children and fix the styles to use the actual style key instead of node key
    FigmaCalculator.FindAll(document, (node) => {
      const cloudNode = node as any;
      if (!cloudNode.styles) return false;
      for (const key in cloudNode.styles) {
        const styleNodeId: string = cloudNode.styles[key];

        if (cloudNode.styles[key]) {
          // replace the style node id with the actual style key returned in the styles map
          cloudNode.styles[key] = styles[styleNodeId]?.key;
        }
      }
      return false;
    });

    this.setDocumentNode(document);

    if (!this.getDocumentNode()) {
      throw new Error("No document node or file key provided");
    }
  }

  getFilesForTeams = getFigmaPagesForTeam;

  /**
   * Load all of the components from the library
   * @param teamId - the team to load components from
   * @param {filterPrefixes} - an array of strings to throw out the components by
   */
  async loadComponents(
    teamId: string,
    opts?: { filterPrefixes: string[] }
  ): Promise<FigmaTeamComponent[]> {
    if (!this.apiToken) throw new Error("No Figma API token provided");
    const teamComponents = await FigmaAPIHelper.getTeamComponents(teamId);

    // variants live here
    const teamComponentSets = await FigmaAPIHelper.getTeamComponentSets(teamId);

    this.components = teamComponents.concat(teamComponentSets);

    // throw out components that begin with a certain prefix
    if (opts && opts.filterPrefixes) {
      this.components = this.components.filter((comp) => {
        // use the containing frame name instead if it's a variant
        // Usually, these look like "name": "Count=5"
        // Assuming we don't explicitly export components with an = signs in the name
        if (comp.name.includes("=")) {
          return opts.filterPrefixes.some((prefix) =>
            comp.containing_frame.name
              .toLowerCase()
              .startsWith(prefix.toLowerCase())
          );
        } else {
          return opts.filterPrefixes.some((prefix) =>
            comp.name.toLowerCase().startsWith(prefix.toLowerCase())
          );
        }
      });
    }

    return this.components;
  }

  /**
   * Load all of the valid styles from your library
   *@param teamId - the team id to load styles from
   */
  async loadStyles(teamId: string): Promise<FigmaTeamStyle[]> {
    if (!this.apiToken) throw new Error("No Figma API token provided");
    this.allStyles = await FigmaAPIHelper.getTeamStyles(teamId);
    return this.allStyles;
  }

  /**
   * Looks through a given Figma tree and the checks and processes each of the nodes as individuals. Note: Hidden Nodes are thrown out
   * @param rootNode - Can pass any Figma Node with children
   * @param useEmitter - Streams the results of the process to the emitter in intervals
   */
  processTree(
    rootNode: BaseNode,
    components?: FigmaTeamComponent[],
    allStyles?: FigmaTeamStyle[],
    onProcessNode?: (node: ProcessedNode) => void
  ): ProcessedNodeTree {
    const { allHiddenNodes, libraryNodes, totalNodes, processedNodes } =
      getProcessedNodes(
        rootNode,
        components || this.components,
        allStyles || this.allStyles,
        onProcessNode
      );

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
    };
  }

  getAdoptionPercent(
    aggregates: AggregateCounts[],
    opts?: { includeMatchingText: boolean }
  ) {
    const allTotals = {
      totalNodesOnPage: 0,
      totalNodesInLibrary: 0,
      totalMatchingText: 0,
    };

    for (const counts of aggregates) {
      const { totalNodes, libraryNodes, checks } = counts;

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

  /**
   * Get the percents of text style usage in files
   * @param processedNodes - array of nodes that have been processed
   */
  getTextStylePercentage(processedNodes: AggregateCounts[]): LintCheckPercent {
    return getLintCheckPercent("Text-Style", processedNodes);
  }

  /**
   * Get the percents of fill style usage in files
   * @param processedNodes - array of nodes that have been processed
   */
  getFillStylePercent(processedNodes: AggregateCounts[]): LintCheckPercent {
    return getLintCheckPercent("Fill-Style", processedNodes);
  }

  /**
   * Get a breakdown of adoption percentages by team and project and how they rollup
   * @param allPages - a set of page details and figma file details with processed nodes
   */
  getBreakDownByTeams(pages: ProcessedPage[]): {
    projects: ProcessedProjectBreakdown;
    teams: ProcessedTeamBreakdown;
    pages: ProcessedPageBreakdown;
    totals: ProcessedPercents;
  } {
    try {
      const teams: TeamPages = {};
      // build our team pages data structure which organizes into buckets
      for (const page of pages) {
        const projectName = page.file.projectName || "no-project";
        const teamName = page.file.teamName || "no-team";
        if (!teams[teamName]) {
          teams[teamName] = {};
        }

        if (!teams[teamName][projectName]) {
          teams[teamName][projectName] = { pages: [] };
        }

        teams[teamName][projectName].pages.push(page);
      }

      let allProcessedNodes: AggregateCounts[] = [];

      const processedPageStats: ProcessedPageBreakdown = {};
      const processedProjectStats: ProcessedProjectBreakdown = {};
      const processedTeamStats: ProcessedTeamBreakdown = {};

      for (const team of Object.keys(teams)) {
        const projects = Object.keys(teams[team]);

        let teamProcessedNodes: AggregateCounts[] = [];

        for (const project of projects) {
          const { pages } = teams[team][project];

          const allProjectProcessedNodes = pages.map(
            (page) => page.pageAggregates
          );

          // initialize the project and page stats structure
          if (!processedPageStats[team]) {
            processedPageStats[team] = {};
            processedProjectStats[team] = {};
          }

          // set the page stats
          processedPageStats[team][project] = {
            pages: pages.map((page) => {
              return {
                adoptionPercent: this.getAdoptionPercent([page.pageAggregates]),
                lintPercentages: {
                  "Text-Style": this.getTextStylePercentage([
                    page.pageAggregates,
                  ]),
                  "Fill-Style": this.getFillStylePercent([page.pageAggregates]),
                },
              };
            }),
          };

          //  rollup the adoption percentages to project level stats
          processedProjectStats[team][project] = {
            adoptionPercent: this.getAdoptionPercent(allProjectProcessedNodes),
            lintPercentages: {
              "Text-Style": this.getTextStylePercentage(
                allProjectProcessedNodes
              ),
              "Fill-Style": this.getFillStylePercent(allProjectProcessedNodes),
            },
          };

          teamProcessedNodes = teamProcessedNodes.concat(
            allProjectProcessedNodes
          );
        }

        // rollup the adoption percentages to the team level stats
        processedTeamStats[team] = {
          adoptionPercent: this.getAdoptionPercent(teamProcessedNodes),
          lintPercentages: {
            "Text-Style": this.getTextStylePercentage(teamProcessedNodes),
            "Fill-Style": this.getFillStylePercent(teamProcessedNodes),
          },
        };
        allProcessedNodes = allProcessedNodes.concat(teamProcessedNodes);
      }

      // calculate a final adoption score with all of the nodes
      const totals: ProcessedPercents = {
        adoptionPercent: this.getAdoptionPercent(allProcessedNodes),
        lintPercentages: {
          "Text-Style": this.getTextStylePercentage(allProcessedNodes),
          "Fill-Style": this.getFillStylePercent(allProcessedNodes),
        },
      };

      return {
        totals,
        teams: processedTeamStats,
        projects: processedProjectStats,
        pages: processedPageStats,
      };
    } catch (ex) {
      throw ex;
    }
  }
}
