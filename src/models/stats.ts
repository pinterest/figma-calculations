import { FigmaPartialFile } from "./figma";

export type ProcessedPageBreakdown = {
  [teamName: string]: {
    [projectName: string]: {
      pages: ProcessedPercents[];
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

export type LintCheckName = "Text-Style" | "Fill-Style" | "Stroke-Fill-Style";

export type MatchLevel = "None" | "Partial" | "Full" | "Skip";
export type LintSuggestion = {
  message: string;
  styleKey: string;
};

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
};
