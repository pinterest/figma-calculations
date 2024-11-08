import { FigmaLocalVariables } from "../models/figma";
import { LintCheck, LintCheckName } from "../models/stats";

import {
  LintCheckOptions,
  hasValidSpacingToMatch,
  isNodeOfTypeAndVisible,
} from ".";
import { isExactVariableMatch } from "./utils/variables/exact";
import getVariableLookupMatches from "./utils/variables/lookup";

export default function checkSpacingVariableMatch(
  variables: FigmaLocalVariables,
  targetNode: BaseNode,
  opts?: LintCheckOptions
): LintCheck {
  const checkName: LintCheckName = "Spacing-Variable";

  // Check if correct Node Type. Only Frames and Instances can have spacing
  if (
    !isNodeOfTypeAndVisible(
      ["FRAME", "INSTANCE"],
      targetNode
    )
  )
    return { checkName, matchLevel: "Skip", suggestions: [] };

  if (!hasValidSpacingToMatch(targetNode as BaseFrameMixin))
    return { checkName, matchLevel: "Skip", suggestions: [] };

  // check if variable is exact match
  const exactMatch = isExactVariableMatch("SPACING", variables, targetNode);

  if (exactMatch)
    return {
      checkName,
      matchLevel: "Full",
      suggestions: [],
      exactMatch: { key: exactMatch.key },
    };

  // Variable matching
  if (opts?.spacingToVariableMap) {
    const { matchLevel, suggestions } = getVariableLookupMatches(
      checkName,
      {}, // opts.hexColorToVariableMap not used in this check
      {}, // opts.roundingToVariableMap not used in this check
      opts.spacingToVariableMap,
      "SPACING",
      targetNode
    );

    return { checkName, matchLevel, suggestions };
  }

  return { checkName, matchLevel: "None", suggestions: [] };
}
