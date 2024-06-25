import { StyleBucket } from "../models/figma";
import { LintCheck, LintSuggestion } from "../models/stats";

import {
  getStyleLookupDefinitions,
  isNodeOfTypeAndVisible,
  LintCheckOptions
} from ".";
import { isExactStyleMatch } from "./utils/styles/exact";
import getStyleLookupMatches from "./utils/styles/lookup";
import { figmaRGBToHex } from "../utils/rgbToHex";
import jp from "jsonpath";

export default function checkStrokeStyleMatch(
  styleBucket: StyleBucket,
  targetNode: BaseNode,
  opts?: LintCheckOptions
): LintCheck {
  const checkName = "Stroke-Fill-Style";

  // check if correct Node Type
  if (
    !isNodeOfTypeAndVisible(
      ["ELLIPSE", "INSTANCE", "POLYGON", "RECTANGLE", "STAR", "TEXT", "VECTOR"],
      targetNode
    )
  )
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

  // :TODO: Temp workaround until we properly support variable linting, fixing, and compliance calculations
  // Ignore the node if any color variables are in-use
  const colorVariables = jp.query(targetNode, "$.strokes[*].boundVariables.color");
  if (colorVariables.length > 0) {
    return { checkName, matchLevel: "Skip", suggestions: [] };
  }

  if (opts?.hexStyleMap) {
    const { hexStyleMap } = opts;
    const strokeProps = getStyleLookupDefinitions("STROKE");

    if (strokeProps) {
      const [r, g, b, a] = strokeProps.map(prop => {
        const pathToUse =
          typeof figma === "undefined"
            ? prop.nodePath
            : prop.figmaPath || prop.nodePath;

        return jp.query(targetNode, pathToUse)[0];
      });

      // get the hex code
      const hex = figmaRGBToHex({ r, g, b, a }).toUpperCase();

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
