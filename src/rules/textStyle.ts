import { StyleBucket } from "../models/figma";
import { LintCheck } from "../models/stats";

import { isNodeOfTypeAndVisible } from ".";
import { isExactStyleMatch } from "./utils/exact";
import getPartialStyleMatches from "./utils/partial";

export default function checkTextMatch(
  styleBucket: StyleBucket,
  targetNode: SceneNode
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
        matchType: "exact",
      },
      {
        stylePath: "$.style.fontScriptName",
        nodePath: "$.style.fontPostScriptName",
        matchType: "includes",
      },
    ],
    targetNode
  );

  return { checkName, matchLevel, suggestions };
}
