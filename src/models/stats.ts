export type LintCheckName = "Text-Style" | "Fill-Style" | "Stroke-Fill-Style";

export type MatchLevel = "None" | "Partial" | "Full" | "Skip";
export type LintSuggestion = { message: string; styleId: string };

export type LintCheck = {
  checkName: LintCheckName;
  matchLevel: MatchLevel;
  suggestions: LintSuggestion[];
};
export type ProcessedNode = {
  id: string;
  name: string;
  type: string;
  lintChecks: LintCheck[];
  belongsToLibraryComponent: boolean;
  similarComponents: string[];
};

export type LintCheckPercent = {
  checkName: LintCheckName;
  full: number;
  partial: number;
};

export type AggregateCounts = {
  totalNodes: number;
  hiddenNodes: number;
  libraryNodes: number;
  checks: {
    [checkName in LintCheckName]?: {
      none: number;
      partial: number;
      full: number;
      skip: number;
    };
  };
};

export type ProcessedNodeTree = {
  parentNode: {
    id: string;
    name: string;
  };
  aggregateCounts: AggregateCounts;

  nodes: ProcessedNode[];
};
