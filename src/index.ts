import {
  FigmaFile,
  FigmaLocalVariable,
  FigmaLocalVariableCollection,
  FigmaLocalVariableCollections,
  FigmaLocalVariables,
  FigmaPublishedVariable,
  FigmaPublishedVariableCollection,
  FigmaTeamComponent,
  FigmaTeamStyle,
  StyleBucket,
} from "./models/figma";
import {
  AdoptionCalculationOptions,
  AggregateCounts,
  AggregateCountsCompliance,
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
  generateStyleLookup,
  LintCheckOptions,
  runSimilarityChecks,
} from "./rules";
import LintCleaner from "./rules/cleaners";

import { makePercent } from "./utils/percent";
import {
  getLintCheckPercent,
  getProcessedNodes,
  ProcessedNodeOptions,
} from "./utils/process";
import { getFigmaPagesForTeam } from "./utils/teams";
import {
  createHexColorToVariableMap,
  createRoundingToVariableMap,
  createSpacingToVariableMap,
  getCollectionVariables,
} from "./utils/variables";
import { FigmaAPIHelper } from "./webapi";

// exporting the types to reuse
export * from "./models/stats";
export * from "./models/figma";
export * from "./rules/cleaners";
export * from "./utils/variables";

export class FigmaCalculator extends FigmaDocumentParser {
  components: FigmaTeamComponent[] = [];
  allStyles: FigmaTeamStyle[] = [];
  localVariables: FigmaLocalVariables = {};
  localVariableCollections: FigmaLocalVariableCollections = {};
  publishedVariables: FigmaLocalVariables = {};
  publishedVariableCollections: FigmaLocalVariableCollections = {};

  // :TODO: Also stash loaded local and published variables when loaded

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
   * @param teamId - the team id to load styles from
   */
  async loadStyles(teamId: string): Promise<FigmaTeamStyle[]> {
    if (!this.apiToken) throw new Error("No Figma API token provided");
    this.allStyles = await FigmaAPIHelper.getTeamStyles(teamId);
    return this.allStyles;
  }

  /**
   * Load the local variables from the given file
   * @param fileKey - the file id to load variables from
   */
  async loadLocalVariables(fileKey: string): Promise<{
    variables: Record<string, FigmaLocalVariable>;
    variableCollections: Record<string, FigmaLocalVariableCollection>;
  }> {
    const localVariables = await FigmaAPIHelper.getFileLocalVariables(fileKey);

    // Merge the variables and variable collections with any previously loaded ones
    Object.assign(this.localVariables, localVariables.variables);
    Object.assign(
      this.localVariableCollections,
      localVariables.variableCollections
    );

    return localVariables;
  }

  /**
   * Load the published variables from the given file
   * @param fileKey - the file id to load variables from
   */
  async loadPublishedVariables(fileKey: string): Promise<{
    variables: Record<string, FigmaPublishedVariable>;
    variableCollections: Record<string, FigmaPublishedVariableCollection>;
  }> {
    const publishedVariables = await FigmaAPIHelper.getFilePublishedVariables(
      fileKey
    );

    // Merge the variables and variable collections with any previously loaded ones
    Object.assign(this.publishedVariables, publishedVariables.variables);
    Object.assign(
      this.publishedVariableCollections,
      publishedVariables.variableCollections
    );

    return publishedVariables;
  }

  static generateStyleBucket = generateStyleBucket;
  static generateStyleLookup = generateStyleLookup;

  static generateComponentMap = generateComponentMap;

  /**
   *
   * @param rootNode
   * @param opts
   * @returns ProcessedNode
   */
  getLintResults(
    node: BaseNode,
    opts: {
      styles?: FigmaTeamStyle[];
      styleBucket?: StyleBucket;
      colorVariableCollectionIds?: string[];
      roundingVariableCollectionIds?: string[];
      spacingVariableCollectionIds?: string[];
      variables?: FigmaLocalVariables;
      variableCollections?: FigmaLocalVariableCollections;
    } & LintCheckOptions = {}
  ): LintCheck[] {
    // Fallback to things we might already have loaded
    const {
      styles = this.allStyles,
      variables = this.localVariables,
      variableCollections = this.localVariableCollections,
      colorVariableCollectionIds = [],
      roundingVariableCollectionIds = [],
      spacingVariableCollectionIds = [],
    } = opts;

    let { hexColorToVariableMap, roundingToVariableMap, spacingToVariableMap } = opts;

    const styleBucket =
      opts?.styleBucket || FigmaCalculator.generateStyleBucket(styles);

    if (!styleBucket)
      throw new Error(
        "No style bucket, or array of styles provided to generate lint results"
      );

    if (
      variables &&
      Object.keys(variables).length > 0 &&
      variableCollections &&
      Object.keys(variableCollections).length > 0
    ) {
      // Create a map of hex colors to variables, if not passed
      if (!hexColorToVariableMap && colorVariableCollectionIds.length > 0) {
        const colorVariableIds = getCollectionVariables(
          colorVariableCollectionIds,
          variableCollections
        );
        hexColorToVariableMap = createHexColorToVariableMap(
          colorVariableIds,
          variables,
          variableCollections
        );
      }

      // Create a map of rounding values to variables, if not passed
      if (!roundingToVariableMap && roundingVariableCollectionIds.length > 0) {
        const roundingVariableIds = getCollectionVariables(
          roundingVariableCollectionIds,
          variableCollections
        );
        roundingToVariableMap = createRoundingToVariableMap(
          roundingVariableIds,
          variables,
          variableCollections
        );
      }

      // Create a map of spacing values to variables, if not passed
      if (!spacingToVariableMap && spacingVariableCollectionIds.length > 0) {
        const spacingVariableIds = getCollectionVariables(
          spacingVariableCollectionIds,
          variableCollections
        );
        spacingToVariableMap = createSpacingToVariableMap(
          spacingVariableIds,
          variables,
          variableCollections
        );
      }
    }

    return runSimilarityChecks(styleBucket, variables, node, {
      ...opts,
      hexColorToVariableMap,
      roundingToVariableMap,
      spacingToVariableMap,
    });
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

    // we do our filtering on the second run because the order of nodes is unknown,
    // and a child may appear before the parent
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

  static filterIgnoredComponentNodes(
    nodes: BaseNode[],
    ignoredComponentKeys: string[]
  ): {
    ignoredParentInstanceIds: string[];
    nonIgnoredNodes: BaseNode[];
    numIgnoredLayers: number;
  } {
    let allIgnoredNodes: string[] = [];
    const ignoredParentInstanceIds: string[] = [];

    nodes.forEach((node) => {
      if (node.type === "INSTANCE" && !allIgnoredNodes.includes(node.id)) {
        // REST API has componentId, Plugin API uses mainComponent.key
        const componentKey =
          (node as any).componentId || node.mainComponent?.key;

        if (componentKey && ignoredComponentKeys.includes(componentKey)) {
          ignoredParentInstanceIds.push(node.id);
          // add all of the children as ignored nodes
          const subNodes = FigmaDocumentParser.FindAll(node, () => true);
          allIgnoredNodes.push(node.id);
          subNodes.forEach((n) => allIgnoredNodes.push(n.id));
        }
      }
    });

    // we do our filtering on the second run because the order of nodes is unknown,
    // and a child may appear before the parent
    const nonIgnoredNodes = nodes.filter((n) => {
      // if the node is ignored, then toss it out
      if (allIgnoredNodes.includes(n.id)) {
        return false;
      }
      return true;
    });

    return {
      ignoredParentInstanceIds,
      nonIgnoredNodes,
      numIgnoredLayers: allIgnoredNodes.length,
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
    libraryNodes: {
      [nodeId: string]: { layers: string[]; name: string };
    };
    nonLibraryNodes: BaseNode[];
    numLibraryNodes: number;
  } {
    // run through the page
    if (!opts?.components)
      throw new Error("No components provided to filter out library nodes");

    const componentMap = generateComponentMap(opts?.components);

    let allLibraryNodes: {
      [nodeId: string]: { layers: string[]; name: string };
    } = {};

    const filteredLibraryNodes: string[] = [];

    // get the component's real name
    // check if a component has a mainComponent?
    const isLibraryComponent = (instanceNode: any) => {
      // if it's a web file, then check the componentId else the mainComponent property to get the key
      const componentKey =
        instanceNode.componentId || instanceNode.mainComponent?.key;

      if (!componentKey) {
        return false;
      }

      if (componentMap[componentKey]) return true;

      return false;
    };

    nodes.forEach((node) => {
      if (node.type === "INSTANCE" && isLibraryComponent(node)) {
        allLibraryNodes[node.id] = { layers: [], name: node.name };

        // note: this introduces hidden nodes as well (e.g. nodes that were not in the original set of nodes), hence the second pass
        const subNodes = FigmaDocumentParser.FindAll(node, () => true);
        subNodes.forEach((n) => allLibraryNodes[node.id].layers.push(n.id));
      }
    });

    const nonLibraryNodes = nodes.filter((n) => {
      for (const key in allLibraryNodes) {
        if (key === n.id || allLibraryNodes[key].layers.includes(n.id)) {
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
    opts: {
      components?: FigmaTeamComponent[];
      allStyles?: FigmaTeamStyle[];
      colorVariableCollectionIds?: string[];
      roundingVariableCollectionIds?: string[];
      spacingVariableCollectionIds?: string[];
      variables?: FigmaLocalVariables;
      variableCollections?: FigmaLocalVariableCollections;
    } & ProcessedNodeOptions = {}
  ): ProcessedNodeTree {
    // Fallback to things we might already have loaded
    const {
      components = this.components,
      allStyles = this.allStyles,
      colorVariableCollectionIds = [],
      roundingVariableCollectionIds = [],
      spacingVariableCollectionIds = [],
      variables = this.localVariables,
      variableCollections = this.localVariableCollections,
      ...processedNodeOpts // The rest, ala ProcessedNodeOptions
    } = opts;

    const {
      allHiddenNodes,
      allIgnoredNodes,
      libraryNodes,
      totalNodes,
      processedNodes,
    } = getProcessedNodes(
      rootNode,
      components,
      allStyles,
      colorVariableCollectionIds,
      roundingVariableCollectionIds,
      spacingVariableCollectionIds,
      variables,
      variableCollections,
      processedNodeOpts
    );

    // Calculate aggregates and compliance
    const aggregates = this.calculateAggregatesCompliance(
      allHiddenNodes,
      allIgnoredNodes,
      libraryNodes,
      totalNodes,
      processedNodes
    );

    return {
      parentNode: {
        id: rootNode.id,
        name: rootNode.name,
      },
      aggregateCounts: aggregates,
    };
  }

  calculateAggregatesCompliance(
    allHiddenNodes: number,
    allIgnoredNodes: number,
    libraryNodes: number,
    totalNodes: number,
    processedNodes: ProcessedNode[]
  ): AggregateCounts {
    const compliance: AggregateCountsCompliance = {
      fills: {
        attached: 0,
        detached: 0,
        none: 0,
      },
      rounding: {
        attached: 0,
        detached: 0,
        none: 0,
      },
      spacing: {
        attached: 0,
        detached: 0,
        none: 0,
      },
      strokes: {
        attached: 0,
        detached: 0,
        none: 0,
      },
      text: {
        attached: 0,
        detached: 0,
        none: 0,
      },
    };

    const aggregates: AggregateCounts = {
      totalNodes,
      hiddenNodes: allHiddenNodes,
      ignoredNodes: allIgnoredNodes,
      libraryNodes,
      checks: {},
      compliance,
    };

    // loop through the array and calculate the lint check totals

    for (const node of processedNodes) {
      // Init/reset the Style/Variable bitwise boolean counter helpers
      const counters = {
        fills: {
          full: 0,
          partial: 0,
          none: 0,
        },
        rounding: {
          full: 0,
          partial: 0,
          none: 0,
        },
        spacing: {
          full: 0,
          partial: 0,
          none: 0,
        },
        strokes: {
          full: 0,
          partial: 0,
          none: 0,
        },
        text: {
          full: 0,
          partial: 0,
          none: 0,
        },
      };

      for (const check of node.lintChecks) {
        const { checkName, matchLevel } = check;

        if (!aggregates.checks[checkName]) {
          aggregates.checks[checkName] = {
            full: 0,
            partial: 0,
            skip: 0,
            none: 0,
          };
        }

        switch (matchLevel) {
          case "Full":
            {
              aggregates.checks[checkName]!.full += 1;
              if (checkName === "Fill-Style" || checkName === "Fill-Variable")
                counters.fills.full++;
              else if (checkName === "Rounding-Variable")
                counters.rounding.full++;
              else if (checkName === "Spacing-Variable")
                counters.spacing.full++;
              else if (
                checkName === "Stroke-Fill-Style" ||
                checkName === "Stroke-Fill-Variable"
              )
                counters.strokes.full++;
              else if (checkName === "Text-Style") counters.text.full++;
            }
            break;

          case "Partial":
            {
              aggregates.checks[checkName]!.partial += 1;
              if (checkName === "Fill-Style" || checkName === "Fill-Variable")
                counters.fills.partial++;
              else if (checkName === "Rounding-Variable")
                counters.rounding.partial++;
              else if (checkName === "Spacing-Variable")
                counters.spacing.partial++;
              else if (
                checkName === "Stroke-Fill-Style" ||
                checkName === "Stroke-Fill-Variable"
              )
                counters.strokes.partial++;
              else if (checkName === "Text-Style") counters.text.partial++;
            }
            break;

          case "None":
            {
              aggregates.checks[checkName]!.none += 1;
              if (checkName === "Fill-Style" || checkName === "Fill-Variable")
                counters.fills.none++;
              else if (checkName === "Rounding-Variable")
                counters.rounding.none++;
              else if (checkName === "Spacing-Variable")
                counters.spacing.none++;
              else if (
                checkName === "Stroke-Fill-Style" ||
                checkName === "Stroke-Fill-Variable"
              )
                counters.strokes.none++;
              else if (checkName === "Text-Style") counters.text.none++;
            }
            break;

          case "Skip": {
            aggregates.checks[checkName]!.skip += 1;
          }
        }
      }

      // Attached means either using a style or a variable exact match (full)
      // Bitwise boolean OR to increment if either is true
      compliance.fills.attached += counters.fills.full > 0 ? 1 : 0;
      compliance.strokes.attached += counters.strokes.full > 0 ? 1 : 0;

      // Detached means either a matching style or variable was found, but not used (partial)
      // Relies on the fact that we don't try to find a variable suggestion if an exact style match was found, and vice versa
      // Bitwise boolean OR
      compliance.fills.detached += counters.fills.partial > 0 ? 1 : 0;
      compliance.strokes.detached += counters.strokes.partial > 0 ? 1 : 0;

      // None (outside of system) means neither a matching style or variable was found (none)
      // Bitwise boolean AND to increment if both are true
      compliance.fills.none += counters.fills.none === 2 ? 1 : 0;
      compliance.strokes.none += counters.strokes.none === 2 ? 1 : 0;

      // There isn't Rounding style support, so pass thru
      compliance.rounding.attached += counters.rounding.full;
      compliance.rounding.detached += counters.rounding.partial;
      compliance.rounding.none += counters.rounding.none;

      // There isn't Spacing style support, so pass thru
      compliance.spacing.attached += counters.spacing.full;
      compliance.spacing.detached += counters.spacing.partial;
      compliance.spacing.none += counters.spacing.none;

      // We don't have Text variable support (yet), so pass thru
      compliance.text.attached += counters.text.full;
      compliance.text.detached += counters.text.partial;
      compliance.text.none += counters.text.none;
    }

    aggregates.compliance = compliance;

    return aggregates;
  }

  getAdoptionPercent(
    aggregates: AggregateCounts[],
    opts?: AdoptionCalculationOptions
  ) {
    const allTotals = {
      totalNodesOnPage: 0,
      totalNodesInLibrary: 0,
      totalMatchingText: 0,
    };

    for (const counts of aggregates) {
      const { totalNodes, libraryNodes, hiddenNodes, ignoredNodes, checks } =
        counts;

      allTotals.totalNodesOnPage += totalNodes - hiddenNodes - ignoredNodes;
      allTotals.totalNodesInLibrary += libraryNodes;

      if (checks["Text-Style"] && opts && opts.includeMatchingText) {
        allTotals.totalMatchingText += checks["Text-Style"].full;
      }

      if (checks["Text-Style"] && opts && opts.includePartialText) {
        allTotals.totalMatchingText += checks["Text-Style"].partial;
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
  getTextStylePercentage(
    processedNodes: AggregateCounts[],
    opts?: AdoptionCalculationOptions
  ): LintCheckPercent {
    return getLintCheckPercent("Text-Style", processedNodes, {
      includePartials: opts?.includePartialText || false,
    });
  }

  /**
   * Get the percents of fill style usage in files
   * @param processedNodes - array of nodes that have been processed
   */
  getFillStylePercent(
    processedNodes: AggregateCounts[],
    opts?: AdoptionCalculationOptions
  ): LintCheckPercent {
    return getLintCheckPercent("Fill-Style", processedNodes, {
      includePartials: opts?.includePartialFills || false,
    });
  }

  /**
   * Get the percents of fill variable usage in files
   * @param processedNodes - array of nodes that have been processed
   */
  getFillVariablePercent(
    processedNodes: AggregateCounts[],
    opts?: AdoptionCalculationOptions
  ): LintCheckPercent {
    return getLintCheckPercent("Fill-Variable", processedNodes, {
      includePartials: opts?.includePartialVariables || false,
    });
  }

  /**
   * Get the percents of stroke fill variable usage in files
   * @param processedNodes - array of nodes that have been processed
   */
  getStrokeFillVariablePercent(
    processedNodes: AggregateCounts[],
    opts?: AdoptionCalculationOptions
  ): LintCheckPercent {
    return getLintCheckPercent("Stroke-Fill-Variable", processedNodes, {
      includePartials: opts?.includePartialVariables || false,
    });
  }

  /**
   * Get a breakdown of adoption percentages by team and project and how they rollup
   * @param allPages - a set of page details and figma file details with processed nodes
   */
  getBreakDownByTeams(
    pages: ProcessedPage[],
    opts?: AdoptionCalculationOptions
  ): {
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
                name: page.pageName,
                key: page.file.key,
                last_modified: page.file.last_modified,
                adoptionPercent: this.getAdoptionPercent(
                  [page.pageAggregates],
                  opts
                ),
                lintPercentages: {
                  "Text-Style": this.getTextStylePercentage(
                    [page.pageAggregates],
                    opts
                  ),
                  "Fill-Variable": this.getFillVariablePercent(
                    [page.pageAggregates],
                    opts
                  ),
                  "Stroke-Fill-Variable": this.getStrokeFillVariablePercent(
                    [page.pageAggregates],
                    opts
                  ),
                },
              };
            }),
          };

          //  rollup the adoption percentages to project level stats
          processedProjectStats[team][project] = {
            adoptionPercent: this.getAdoptionPercent(
              allProjectProcessedNodes,
              opts
            ),
            lintPercentages: {
              "Text-Style": this.getTextStylePercentage(
                allProjectProcessedNodes,
                opts
              ),
              "Fill-Variable": this.getFillVariablePercent(
                allProjectProcessedNodes,
                opts
              ),
              "Stroke-Fill-Variable": this.getStrokeFillVariablePercent(
                allProjectProcessedNodes,
                opts
              ),
            },
          };

          teamProcessedNodes = teamProcessedNodes.concat(
            allProjectProcessedNodes
          );
        }

        // rollup the adoption percentages to the team level stats
        processedTeamStats[team] = {
          adoptionPercent: this.getAdoptionPercent(teamProcessedNodes, opts),
          lintPercentages: {
            "Text-Style": this.getTextStylePercentage(teamProcessedNodes, opts),
            "Fill-Variable": this.getFillVariablePercent(teamProcessedNodes, opts),
            "Stroke-Fill-Variable": this.getStrokeFillVariablePercent(teamProcessedNodes, opts),
          },
        };
        allProcessedNodes = allProcessedNodes.concat(teamProcessedNodes);
      }

      // calculate a final adoption score with all of the nodes
      const totals: ProcessedPercents = {
        adoptionPercent: this.getAdoptionPercent(allProcessedNodes, opts),
        lintPercentages: {
          "Text-Style": this.getTextStylePercentage(allProcessedNodes, opts),
          "Fill-Variable": this.getFillVariablePercent(allProcessedNodes, opts),
          "Stroke-Fill-Variable": this.getStrokeFillVariablePercent(allProcessedNodes, opts),
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

  /**
   * Runs a set of cleanup functions like removing unused nodes and fills to cleanup a file.
   * WARNING: Running this in a Figma Context will modify your files! Run figma.commitUndo prior
   */
  cleanupTree = LintCleaner.run;

  /**
   * Get dev resources from a file
   * @param fileKey - the file id to get dev resources from
   */
  async getDevResources(fileKey: string, nodeId?: string): Promise<any> {
    if (!this.apiToken) throw new Error("No Figma API token provided");
    return FigmaAPIHelper.getDevResources(fileKey, nodeId);
  }

  /**
   * Get a list of files that have dev resources attached
   * @param files - array of Figma files to check
   */
  async getFilesWithDevResources(files: any[]): Promise<{
    fileKey: string;
    fileName: string;
    devResources: any;
  }[]> {
    const filesWithResources = [];
    const skippedFiles = [];

    for (const file of files) {
      if (file.type === 'figjam') {
        skippedFiles.push({ name: file.name, reason: 'FigJam file' });
        continue;
      }

      try {
        const response = await this.getDevResources(file.key);
        if (response?.dev_resources && response.dev_resources.length > 0) {
          filesWithResources.push({
            fileKey: file.key,
            fileName: file.name,
            devResources: response.dev_resources
          });
        }
      } catch (ex: any) {
        if (ex.response?.status === 404) {
          skippedFiles.push({ name: file.name, reason: 'Not found or no access' });
        } else {
          console.log(`Error fetching dev resources for ${file.name} (${file.key}):`, ex.message);
        }
      }
    }

    if (skippedFiles.length > 0) {
      console.log('\nSkipped files:');
      skippedFiles.forEach(file => {
        console.log(`- ${file.name}: ${file.reason}`);
      });
    }

    return filesWithResources;
  }
}
