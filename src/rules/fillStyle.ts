import jp from "jsonpath";

import { StyleBucket } from "../models/figma";
import { LintCheck } from "../models/stats";

import { isNodeOfTypeAndVisible } from ".";
import { isExactStyleMatch } from "./utils/exact";
import getPartialStyleMatches from "./utils/partial";

export default function checkFillStyleMatch(
  styleBucket: StyleBucket,
  targetNode: BaseNode
): LintCheck {
  // decrement the count, or increment depending on what we find
  const checkName = "Fill-Style";
  // check if correct Node Type
  if (
    !isNodeOfTypeAndVisible(
      ["TEXT", "RECTANGLE", "ELLIPSE", "POLYGON", "INSTANCE"],
      targetNode
    )
  )
    return { checkName, matchLevel: "Skip", suggestions: [] };

  // check if style is exact match
  // check if style is exact match
  const exactMatch = isExactStyleMatch("FILL", styleBucket, targetNode);

  if (exactMatch)
    return {
      checkName,
      matchLevel: "Full",
      suggestions: [],
      exactMatch: { key: exactMatch.key },
    };

  // ignore fills if they have images
  const fillTypes = jp.query(targetNode, "$.fills[*].type");

  if (fillTypes.includes("IMAGE")) {
    // ignore the node, image fills can be weird
    return { checkName, matchLevel: "Skip", suggestions: [] };
  }

  // if no fills exists to begin with, skip it
  if (fillTypes.length === 0) {
    // ignore the node, no fill ever existed
    return { checkName, matchLevel: "Skip", suggestions: [] };
  }

  const { matchLevel, suggestions } = getPartialStyleMatches(
    checkName,
    styleBucket,
    "FILL",
    [
      {
        stylePath: "$.fills[0].color.r",
        nodePath: "$.fills[0].color.r",
        matchType: "exact",
      },
      {
        stylePath: "$.fills[0].color.g",
        nodePath: "$.fills[0].color.g",
        matchType: "exact",
      },
      {
        stylePath: "$.fills[0].color.b",
        nodePath: "$.fills[0].color.b",
        matchType: "exact",
      },
      {
        stylePath: "$.fills[0].opacity",
        nodePath: "$.fills[0].opacity",
        matchType: "exact",
      },
    ],
    targetNode
  );

  return { checkName, matchLevel, suggestions };
}
