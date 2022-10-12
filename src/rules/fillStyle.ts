import jp, { nodes } from "jsonpath";

import { StyleBucket } from "../models/figma";
import { LintCheck, LintSuggestion } from "../models/stats";

import { isNodeOfTypeAndVisible, LintCheckOptions } from ".";
import { isExactStyleMatch } from "./utils/exact";
import getPartialStyleMatches from "./utils/partial";
import rgbToHex from "../utils/rgbToHex";

export default function checkFillStyleMatch(
  styleBucket: StyleBucket,
  targetNode: BaseNode,
  opts?: LintCheckOptions
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

  if (opts?.hexStyleMap) {
    const { hexStyleMap } = opts;

    const fillRGB = ["r", "g", "b"].map(
      (letter): number => jp.query(targetNode, `$.fills[0].color.${letter}`)[0]
    );

    const suggestions: LintSuggestion[] = [];

    // get the hex code
    const hex = rgbToHex(fillRGB[0], fillRGB[1], fillRGB[2]);
    if (hexStyleMap[hex]) {
      const styleKeys = hexStyleMap[hex];
      const styleKey =
        targetNode.type === "TEXT" ? styleKeys.text : styleKeys.fill;
      if (styleKey) {
        suggestions.push({
          message: `Similar Color Exists in Library with hex ${hex}`,
          styleKey,
        });
      }
    }

    return { matchLevel: "Partial", checkName, suggestions };
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
    targetNode,
    { union: true }
  );

  return { checkName, matchLevel, suggestions };
}
