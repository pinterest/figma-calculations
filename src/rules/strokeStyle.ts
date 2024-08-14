import { StyleBucket } from "../models/figma";
import { LintCheck, LintSuggestion } from "../models/stats";

import {
  getStyleLookupDefinitions,
  hasValidStrokeToMatch,
  isNodeOfTypeAndVisible,
  LintCheckOptions,
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

  // Don't do style processing if a stroke color variable is in-use
  const colorVariables = jp.query(
    targetNode,
    "$.strokes[*].boundVariables.color"
  );
  if (colorVariables.length > 0)
    return { checkName, matchLevel: "Skip", suggestions: [] };

  if (!hasValidStrokeToMatch(targetNode as MinimalStrokesMixin))
    return { checkName, matchLevel: "Skip", suggestions: [] };

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
    const strokeProps = getStyleLookupDefinitions("STROKE");

    if (strokeProps) {
      const [r, g, b, a] = strokeProps.map((prop) => {
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
            type: "Style",
            message: `Color Override Exists in Library for hex ${hex}`,
            styleKey,
            name: hex,
            description: "Direct hex color mapping override",
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
