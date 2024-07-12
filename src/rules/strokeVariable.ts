import { FigmaLocalVariables } from "../models/figma";
import { LintCheck } from "../models/stats";

import { LintCheckOptions, isNodeOfTypeAndVisible } from ".";
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

  // Don't do variable processing if a stroke style in-use
  if (
    (targetNode as MinimalStrokesMixin).strokeStyleId ||
    (targetNode as any).styles?.stroke
  )
    return { checkName, matchLevel: "Skip", suggestions: [] };

  // If a stroke doesn't exist in the first place, it's a skip
  // also skip if any strokes are hidden
  const strokes = (targetNode as MinimalStrokesMixin).strokes;
  if (
    (strokes && !Array.isArray(strokes)) ||
    strokes.length === 0 ||
    strokes.some((f) => f.visible === false)
  )
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
