import { FigmaLocalVariables } from "../models/figma";
import { LintCheck, LintCheckName } from "../models/stats";

import {
  LintCheckOptions,
  hasValidRoundingToMatch,
  isNodeOfTypeAndVisible,
} from ".";
import { isExactVariableMatch } from "./utils/variables/exact";
import getVariableLookupMatches from "./utils/variables/lookup";

export default function checkRoundingVariableMatch(
  variables: FigmaLocalVariables,
  targetNode: BaseNode,
  opts?: LintCheckOptions
): LintCheck {
  const checkName: LintCheckName = "Rounding-Variable";

  // Check if correct Node Type
  // REST API uses "REGULAR_POLYGON" but Figma uses "POLYGON"
  if (
    !isNodeOfTypeAndVisible(
      ["INSTANCE", "POLYGON", "REGULAR_POLYGON", "RECTANGLE", "STAR", "VECTOR"],
      targetNode
    )
  )
    return { checkName, matchLevel: "Skip", suggestions: [] };

  if (!hasValidRoundingToMatch(targetNode as CornerMixin))
    return { checkName, matchLevel: "Skip", suggestions: [] };

  // check if variable is exact match
  const exactMatch = isExactVariableMatch("ROUNDING", variables, targetNode);

  if (exactMatch)
    return {
      checkName,
      matchLevel: "Full",
      suggestions: [],
      exactMatch: { key: exactMatch.key },
    };

  // Variable matching
  if (opts?.roundingToVariableMap) {
    const { matchLevel, suggestions } = getVariableLookupMatches(
      checkName,
      {}, // opts.hexColorToVariableMap not used in this check
      opts.roundingToVariableMap,
      {}, // opts.spacingToVariableMap not used in this check
      "ROUNDING",
      targetNode
    );

    return { checkName, matchLevel, suggestions };
  }

  return { checkName, matchLevel: "None", suggestions: [] };
}
