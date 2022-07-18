import {
  FigmaFile,
  FigmaTeamComponent,
  FigmaTeamStyle,
  StyleBucket,
} from "./models/figma";
import {
  AggregateCounts,
  LintCheck,
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
import {
  generateComponentMap,
  generateStyleBucket,
  runSimilarityChecks,
} from "./rules";

import { makePercent } from "./utils/percent";
import {
  getHiddenNodes,
  getLintCheckPercent,
  getProcessedNodes,
} from "./utils/process";
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

  /**
   * Fetches a cloud file, and also does some pre-processing to merge Figma Node and Style Keys for easier lookups
   * @param fileKey - {string}
   * @returns
   */
  async fetchCloudDocument(fileKey: string): Promise<FigmaFile> {
    const file = await FigmaAPIHelper.getFile(fileKey);
    const { document, styles, components, componentSets } = file;

    // look at the children and fix the styles to use the actual style key instead of node key
    FigmaCalculator.FindAll(document, (node) => {
      const cloudNode = node as any;

      for (const key in cloudNode.styles) {
        const styleNodeId: string = cloudNode.styles[key];

        if (cloudNode.styles[key]) {
          // replace the style node id with the actual style key returned in the styles map
          cloudNode.styles[key] = styles[styleNodeId]?.key;
        }
      }

      // to-do: replace all of the "componentIDs" with the actual component key or frame name

      if (cloudNode.componentId) {
        const componentKey =
          components[cloudNode.componentId]?.key ||
          componentSets[cloudNode.componentId]?.key;

        if (componentKey) {
          cloudNode.componentId = componentKey;
        }
      }
      return false;
    });

    this.setDocumentNode(document);

    if (!this.getDocumentNode()) {
      throw new Error("No document node or file key provided");
    }

    return file;
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

    // throw out components that begin with a certain prefix (e..g all Handoff Components)
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

  static generateStyleBucket = generateStyleBucket;

  static generateComponentMap = generateComponentMap;

  /**
   *
   * @param rootNode
   * @param opts
   * @returns ProcessedNode
   */
  getLintResults(
    node: BaseNode,
    opts?: { styles?: FigmaTeamStyle[]; styleBucket?: StyleBucket }
  ): LintCheck[] {
    let allStyles = this.allStyles || opts?.styles;

    let styleBucket =
      opts?.styleBucket || FigmaCalculator.generateStyleBucket(allStyles);

    if (!styleBucket)
      throw new Error(
        "No style bucket, or array of styles provided to generate lint results"
      );

    return runSimilarityChecks(styleBucket, node);
  }

  static filterHiddenNodes(nodes: BaseNode[]): {
    hiddenParentNodes: string[];
    nonHiddenNodes: BaseNode[];
    numHiddenLayers: number;
  } {
    let allHiddenNodes: string[] = [];
    const hiddenParentNodes: string[] = [];

    nodes.forEach((node) => {
      if (
        (node as FrameNode).visible === false &&
        !allHiddenNodes.includes(node.id)
      ) {
        hiddenParentNodes.push(node.id);
        // add all of the children as hidden nodes
        const subNodes = FigmaDocumentParser.FindAll(node, () => true);
        allHiddenNodes.push(node.id);
        subNodes.forEach((n) => allHiddenNodes.push(n.id));
      }
    });

    // we do our filtering on the second run because the order of nodes is unknown, and a child may appear before the parent
    const nonHiddenNodes = nodes.filter((n) => {
      // if the node is hidden, then toss it out
      if (allHiddenNodes.includes(n.id)) {
        return false;
      }
      return true;
    });

    return {
      hiddenParentNodes,
      nonHiddenNodes,
      numHiddenLayers: allHiddenNodes.length,
    };
  }

  /**
   *
   * @param rootNode
   * @param opts
   * @returns boolean
   * Looks at a set of node, and tosses out any nodes that belong to an instance node, and returns elements it finds
   */
  static filterLibraryNodes(
    nodes: BaseNode[],
    opts?: { components?: FigmaTeamComponent[] }
  ): {
    libraryNodes: { [nodeId: string]: string[] };
    nonLibraryNodes: BaseNode[];
    numLibraryNodes: number;
  } {
    // run through the page
    if (!opts?.components)
      throw new Error("No components provided to filter out library nodes");

    const componentMap = generateComponentMap(opts?.components);

    let allLibraryNodes: {
      [nodeId: string]: string[];
    } = {};

    const filteredLibraryNodes: string[] = [];

    // get the component's real name
    // check if a component has a mainComponent?
    const isLibraryComponent = (instanceNode: any) => {
      // if it's a web file, then check the componentId else the mainCompponent property to get the key
      const componentKey =
        instanceNode.componentId || instanceNode.mainComponent.key;

      if (!componentKey) {
        return false;
      }

      if (componentMap[componentKey]) return true;

      return false;
    };

    nodes.forEach((node) => {
      if (node.type === "INSTANCE" && isLibraryComponent(node)) {
        allLibraryNodes[node.id] = [];

        // note: this introduces hidden nodes as well (e.g. nodes that were not in the original set of nodes), hence the second pass
        const subNodes = FigmaDocumentParser.FindAll(node, () => true);
        subNodes.forEach((n) => allLibraryNodes[node.id].push(n.id));
      }
    });

    const nonLibraryNodes = nodes.filter((n) => {
      for (const key in allLibraryNodes) {
        if (key === n.id || allLibraryNodes[key].includes(n.id)) {
          filteredLibraryNodes.push(n.id);
          return false;
        }
      }

      return true;
    });

    return {
      nonLibraryNodes,
      libraryNodes: allLibraryNodes,
      numLibraryNodes: filteredLibraryNodes.length,
    };
  }

  /**
   * Looks through a given Figma tree and the checks and processes each of the nodes as individuals. Note: Hidden Nodes are thrown out
   * @param rootNode - Can pass any Figma Node with children
   * @param useEmitter - Streams the results of the process to the emitter in intervals
   */
  processTree(
    rootNode: BaseNode,
    opts?: {
      components?: FigmaTeamComponent[];
      allStyles?: FigmaTeamStyle[];
      onProcessNode?: (node: ProcessedNode) => void;
    }
  ): ProcessedNodeTree {
    const { components, allStyles, onProcessNode } = opts || {};
    const { allHiddenNodes, libraryNodes, totalNodes, processedNodes } =
      getProcessedNodes(
        rootNode,
        components || this.components,
        allStyles || this.allStyles,
        onProcessNode
      );

    const aggregates: AggregateCounts = {
      totalNodes,
      hiddenNodes: allHiddenNodes,
      libraryNodes: libraryNodes,
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
      const { totalNodes, libraryNodes, hiddenNodes, checks } = counts;

      allTotals.totalNodesOnPage += totalNodes - hiddenNodes;
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
