import { StyleBucket } from "../models/figma";
import { LintCheck } from "../models/stats";

import { isNodeOfTypeAndVisible } from ".";
import { isExactStyleMatch } from "./utils/exact";

export default function checkStrokeStyleMatch(
  styleBucket: StyleBucket,
  targetNode: BaseNode
): LintCheck {
  // decrement the count, or increment depending on what we find
  const checkName = "Stroke-Fill-Style";
  if (!isNodeOfTypeAndVisible(["RECTANGLE", "ELLISPE"], targetNode))
    return { checkName, matchLevel: "Skip", suggestions: [] };

  // if a stroke doesn't exist in the first place, it's a skip
  if ((targetNode as RectangleNode).strokes.length === 0) {
    return { checkName, matchLevel: "Skip", suggestions: [] };
  }

  // check if style is exact match
  const exactMatch = isExactStyleMatch("STROKE", styleBucket, targetNode);

  if (exactMatch)
    return {
      checkName,
      matchLevel: "Full",
      suggestions: [],
      exactMatch: { key: exactMatch.key },
    };

  /* 
  const { matchLevel, suggestions } = getPartialStyleMatches(
    checkName,
    styleBucket,
    "FILL",
    [
      {
        stylePath: "$.fills[0].color.r",
        nodePath: "$.strokes[0].color.r",
        matchType: "exact",
      },
      {
        stylePath: "$.fills[0].color.g",
        nodePath: "$.strokes[0].color.g",
        matchType: "exact",
      },
      {
        stylePath: "$.fills[0].color.b",
        nodePath: "$.strokes[0].color.b",
        matchType: "exact",
      },
      {
        stylePath: "$.fills[0].opacity",
        nodePath: "$.strokes[0].opacity",
        matchType: "exact",
      },
    ],
    targetNode,
    { union: true }
  );*/

  return { checkName, matchLevel: "None", suggestions: [] };
}
