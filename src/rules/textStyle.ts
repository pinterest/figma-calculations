import { StyleBucket } from "../models/figma";
import { LintCheck } from "../models/stats";

import { isNodeOfTypeAndVisible } from ".";
import { isExactStyleMatch } from "./utils/exact";
import getPartialStyleMatches from "./utils/partial";

export default function checkTextMatch(
  styleBucket: StyleBucket,
  targetNode: BaseNode
): LintCheck {
  const checkName = "Text-Style";
  // console.log(targetNode);
  // check if correct Node Type
  if (!isNodeOfTypeAndVisible(["TEXT"], targetNode))
    return { checkName, matchLevel: "Skip", suggestions: [] };

  // check if style is exact match
  const exactMatch = isExactStyleMatch("TEXT", styleBucket, targetNode);

  if (exactMatch) {
    return {
      checkName,
      matchLevel: "Full",
      suggestions: [],
      exactMatch: { key: exactMatch.key },
    };
  }

  const { matchLevel, suggestions } = getPartialStyleMatches(
    checkName,
    styleBucket,
    "TEXT",
    [
      {
        stylePath: "$.style.fontFamily",
        nodePath: "$.style.fontFamily",
        figmaPath: "$.fontName.family",
        matchType: "exact",
        removeSpaces: true,
      },
      {
        stylePath: "$.style.fontSize",
        nodePath: "$.style.fontSize",
        figmaPath: "$.fontSize",
        matchType: "exact",
      },
      {
        stylePath: "$.style.fontPostScriptName",
        nodePath: "$.style.fontPostScriptName",
        figmaPath: "$.fontName.style",
        matchType: "includes",
      },
    ],
    targetNode,
    { union: true }
  );

  return { checkName, matchLevel, suggestions };
}
