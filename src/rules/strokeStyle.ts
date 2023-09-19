import { StyleBucket } from "../models/figma";
import { LintCheck, LintSuggestion } from "../models/stats";

import { isNodeOfTypeAndVisible, LintCheckOptions } from ".";
import { isExactStyleMatch } from "./utils/exact";
import getStyleLookupMatches from "./utils/lookup";
import { figmaRGBToHex } from "../utils/rgbToHex";
import jp from "jsonpath";

export default function checkStrokeStyleMatch(
  styleBucket: StyleBucket,
  targetNode: BaseNode,
  opts?: LintCheckOptions
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

  if (opts?.hexStyleMap) {
    const { hexStyleMap } = opts;

    const fillRGB = ["r", "g", "b"].map(
      (letter): number => jp.query(targetNode, `$.strokes[0].color.${letter}`)[0]
    );

    // get the hex code
    const hex = figmaRGBToHex({ r: fillRGB[0], g: fillRGB[1], b: fillRGB[2] }).toUpperCase();

    const suggestions: LintSuggestion[] = [];

    if (hexStyleMap[hex]) {
      const styleKeys = hexStyleMap[hex];
      const styleKey =
        targetNode.type === "TEXT" ? styleKeys.text : styleKeys.fill;
      if (styleKey) {
        suggestions.push({
          message: `Color Override Exists in Library for hex ${hex}`,
          styleKey,
        });
      }
      return { matchLevel: "Partial", checkName, suggestions };
    }
  }

  if (opts?.styleLookupMap) {
    const { matchLevel, suggestions } = getStyleLookupMatches(
      checkName,
      opts.styleLookupMap,
      "STROKE",
      targetNode
    );

    return { checkName, matchLevel, suggestions };
  }

  return { checkName, matchLevel: "None", suggestions: [] };
}
