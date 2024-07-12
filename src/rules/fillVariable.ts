import { FigmaLocalVariables } from "../models/figma";
import { LintCheck } from "../models/stats";

import { LintCheckOptions, isNodeOfTypeAndVisible } from ".";
import { isExactVariableMatch } from "./utils/variables/exact";
import getVariableLookupMatches from "./utils/variables/lookup";

export default function checkFillVariableMatch(
  variables: FigmaLocalVariables,
  targetNode: BaseNode,
  opts?: LintCheckOptions
): LintCheck {
  const checkName = "Fill-Variable";

  // Check if correct Node Type
  if (
    !isNodeOfTypeAndVisible(
      ["ELLIPSE", "INSTANCE", "POLYGON", "RECTANGLE", "STAR", "TEXT", "VECTOR"],
      targetNode
    )
  )
    return { checkName, matchLevel: "Skip", suggestions: [] };

  // Don't do variable processing if a fill style in-use
  if (
    (targetNode as MinimalFillsMixin).fillStyleId ||
    (targetNode as any).styles?.fill
  )
    return { checkName, matchLevel: "Skip", suggestions: [] };

  // if no fills exist to begin with, skip it
  // also skip any figma.mixed (symbol) fills (non array)
  // also skip if any fills are hidden
  // also skip any image fills
  const fills = (targetNode as MinimalFillsMixin).fills;
  if (
    !fills ||
    !Array.isArray(fills) ||
    fills.length === 0 ||
    fills.some((f) => f.visible === false) ||
    fills.some((f) => f.type === "IMAGE")
  )
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
      "FILL",
      targetNode
    );

    return { checkName, matchLevel, suggestions };
  }

  return { checkName, matchLevel: "None", suggestions: [] };
}
