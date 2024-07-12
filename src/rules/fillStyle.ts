import jp from "jsonpath";

import { StyleBucket } from "../models/figma";
import { LintCheck, LintSuggestion } from "../models/stats";

import {
  getStyleLookupDefinitions,
  isNodeOfTypeAndVisible,
  LintCheckOptions,
} from ".";
import { isExactStyleMatch } from "./utils/styles/exact";
import getStyleLookupMatches from "./utils/styles/lookup";
import { figmaRGBToHex } from "../utils/rgbToHex";

export default function checkFillStyleMatch(
  styleBucket: StyleBucket,
  targetNode: BaseNode,
  opts?: LintCheckOptions
): LintCheck {
  const checkName = "Fill-Style";

  // check if correct Node Type
  if (
    !isNodeOfTypeAndVisible(
      ["ELLIPSE", "INSTANCE", "POLYGON", "RECTANGLE", "STAR", "TEXT", "VECTOR"],
      targetNode
    )
  )
    return { checkName, matchLevel: "Skip", suggestions: [] };

  // Don't do style processing if a fill color variable is in-use
  const colorVariables = jp.query(
    targetNode,
    "$.fills[*].boundVariables.color"
  );
  if (colorVariables.length > 0)
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

  // check if style is exact match
  const exactMatch = isExactStyleMatch("FILL", styleBucket, targetNode);

  if (exactMatch)
    return {
      checkName,
      matchLevel: "Full",
      suggestions: [],
      exactMatch: { key: exactMatch.key },
    };

  if (opts?.hexStyleMap) {
    const { hexStyleMap } = opts;
    const fillProps = getStyleLookupDefinitions("FILL");

    if (fillProps) {
      const [r, g, b, a] = fillProps.map((prop) => {
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
      "FILL",
      targetNode
    );

    return { checkName, matchLevel, suggestions };
  }

  return { checkName, matchLevel: "None", suggestions: [] };
}
