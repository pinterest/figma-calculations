import { FigmaLocalVariables } from "../models/figma";
import { LintCheck, LintCheckName } from "../models/stats";

import {
  LintCheckOptions,
  hasValidFillToMatch,
  isNodeOfTypeAndVisible,
} from ".";
import { isExactVariableMatch } from "./utils/variables/exact";
import getVariableLookupMatches from "./utils/variables/lookup";

export default function checkFillVariableMatch(
  variables: FigmaLocalVariables,
  targetNode: BaseNode,
  opts?: LintCheckOptions
): LintCheck {
  const checkName: LintCheckName = "Fill-Variable";

  // Check if correct Node Type
  // REST API uses "REGULAR_POLYGON" but Figma uses "POLYGON"
  if (
    !isNodeOfTypeAndVisible(
      ["ELLIPSE", "INSTANCE", "POLYGON", "REGULAR_POLYGON", "RECTANGLE", "STAR", "TEXT", "VECTOR"],
      targetNode
    )
  )
    return { checkName, matchLevel: "Skip", suggestions: [] };

  // Don't do variable processing if a fill style is in-use
  if (
    (targetNode as MinimalFillsMixin).fillStyleId ||
    (targetNode as any).styles?.fill
  )
    return { checkName, matchLevel: "Skip", suggestions: [] };

  if (!hasValidFillToMatch(targetNode as MinimalFillsMixin))
    return { checkName, matchLevel: "Skip", suggestions: [] };

  // check if variable is exact match
  const exactMatch = isExactVariableMatch("FILL", variables, targetNode);

  if (exactMatch)
    return {
      checkName,
      matchLevel: "Full",
      suggestions: [],
      exactMatch: { key: exactMatch.key },
    };

  // Variable matching
  if (opts?.hexColorToVariableMap) {
    const { matchLevel, suggestions } = getVariableLookupMatches(
      checkName,
      opts.hexColorToVariableMap,
      {}, // opts.roundingToVariableMap not used in this check
      {}, // opts.spacingToVariableMap not used in this check
      variables,
      "FILL",
      targetNode
    );

    return { checkName, matchLevel, suggestions };
  }

  return { checkName, matchLevel: "None", suggestions: [] };
}
