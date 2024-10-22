import { FigmaLocalVariables } from "../models/figma";
import { LintCheck, LintCheckName } from "../models/stats";

import {
  LintCheckOptions,
  hasValidStrokeToMatch,
  isNodeOfTypeAndVisible,
} from ".";
import { isExactVariableMatch } from "./utils/variables/exact";
import getVariableLookupMatches from "./utils/variables/lookup";

export default function checkStrokeVariableMatch(
  variables: FigmaLocalVariables,
  targetNode: BaseNode,
  opts?: LintCheckOptions
): LintCheck {
  const checkName: LintCheckName = "Stroke-Fill-Variable";

  // Check if correct Node Type
  // REST API uses "REGULAR_POLYGON" but Figma uses "POLYGON"
  if (
    !isNodeOfTypeAndVisible(
      ["ELLIPSE", "INSTANCE", "LINE", "POLYGON", "REGULAR_POLYGON", "RECTANGLE", "STAR", "TEXT", "VECTOR"],
      targetNode
    )
  )
    return { checkName, matchLevel: "Skip", suggestions: [] };

  // Don't do variable processing if a stroke style is in-use
  if (
    (targetNode as MinimalStrokesMixin).strokeStyleId ||
    (targetNode as any).styles?.stroke
  )
    return { checkName, matchLevel: "Skip", suggestions: [] };

  if (!hasValidStrokeToMatch(targetNode as MinimalStrokesMixin))
    return { checkName, matchLevel: "Skip", suggestions: [] };

  // check if style is exact match
  const exactMatch = isExactVariableMatch("STROKE", variables, targetNode);

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
      "STROKE",
      targetNode
    );

    return { checkName, matchLevel, suggestions };
  }

  return { checkName, matchLevel: "None", suggestions: [] };
}
