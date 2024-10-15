import { StyleBucket } from "../models/figma";
import { LintCheck, LintCheckName } from "../models/stats";

import { isNodeOfTypeAndVisible, LintCheckOptions } from ".";
import { isExactStyleMatch } from "./utils/styles/exact";
import getStyleLookupMatches from "./utils/styles/lookup";

export default function checkTextMatch(
  styleBucket: StyleBucket,
  targetNode: BaseNode,
  opts?: LintCheckOptions
): LintCheck {
  const checkName: LintCheckName = "Text-Style";
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

  if (opts?.styleLookupMap) {
    const { matchLevel, suggestions } = getStyleLookupMatches(
      checkName,
      opts.styleLookupMap,
      "TEXT",
      targetNode
    );

    return { checkName, matchLevel, suggestions };
  }

  return { checkName, matchLevel: "None", suggestions: [] };
}
