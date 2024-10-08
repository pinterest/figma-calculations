import { FigmaLocalVariables } from "../models/figma";
import { LintCheck } from "../models/stats";

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
  const checkName = "Stroke-Fill-Variable";

  // Check if correct Node Type
  if (
    !isNodeOfTypeAndVisible(
      ["ELLIPSE", "INSTANCE", "POLYGON", "RECTANGLE", "STAR", "TEXT", "VECTOR"],
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
      "STROKE",
      targetNode
    );

    return { checkName, matchLevel, suggestions };
  }

  return { checkName, matchLevel: "None", suggestions: [] };
}
