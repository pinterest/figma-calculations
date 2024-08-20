import { FigmaPartialFile } from "./figma";

export type ProcessedPageBreakdown = {
  [teamName: string]: {
    [projectName: string]: {
      pages: (ProcessedPercents & {
        key: string;
        name: string;
        last_modified: string;
      })[];
    };
  };
};

export type ProcessedProjectBreakdown = {
  [teamName: string]: {
    [projectName: string]: ProcessedPercents;
  };
};

export type ProcessedTeamBreakdown = {
  [teamName: string]: ProcessedPercents;
};

export type ProcessedPage = {
  file: FigmaPartialFile;
  pageName: string;
  pageAggregates: AggregateCounts;
};

export type ProcessedPercents = {
  adoptionPercent: number;
  lintPercentages: {
    [checkName in LintCheckName]?: LintCheckPercent;
  };
};

export type TeamPages = {
  [projectName: string]: { [teamName: string]: { pages: ProcessedPage[] } };
};

export type AdoptionCalculationOptions = {
  includeMatchingText?: boolean;
  includePartialText?: boolean;
  includePartialFills?: boolean;
};

export type LintCheckName =
  | "Text-Style"
  | "Fill-Style"
  | "Stroke-Fill-Style"
  | "Fill-Variable"
  | "Stroke-Fill-Variable";

export type MatchLevel = "None" | "Partial" | "Full" | "Skip";

type LintSuggestionBase = {
  message: string;
  name: string;
  description?: string;
  hexColor?: string;
};

export type LintSuggestionStyle = LintSuggestionBase & {
  type: "Style"
  styleKey: string;
};

export type LintSuggestionVariable = LintSuggestionBase & {
  type: "Variable";
  variableId: string;
  variableKey: string;
  variableCollectionId: string;
  variableCollectionKey: string;
  variableCollectionName: string;
  modeId: string;
  modeName: string;
  scopes: VariableScope[];
}

export type LintSuggestion = LintSuggestionStyle | LintSuggestionVariable;

export type LintCheck = {
  checkName: LintCheckName;
  matchLevel: MatchLevel;
  suggestions: LintSuggestion[];
  exactMatch?: { key: string };
};

export type ProcessedNode = {
  id: string;
  name: string;
  type: string;
  lintChecks: LintCheck[];
  belongsToLibraryComponent: boolean;
  isRootComponentNode: boolean;
  similarComponents: string[];
};

export type LintCheckPercent = {
  checkName: LintCheckName;
  full: number;
  partial: number;
};

export type AggregateCountsCompliance = {
  [key in "fills" | "strokes" | "text"]: {
    attached: number;
    detached: number;
    none: number;
  };
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
  compliance: AggregateCountsCompliance;
};

export type ProcessedNodeTree = {
  parentNode: {
    id: string;
    name: string;
  };
  aggregateCounts: AggregateCounts;
};
