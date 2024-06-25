import jp, { nodes } from "jsonpath";

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
  // decrement the count, or increment depending on what we find
  const checkName = "Fill-Style";

  // check if correct Node Type
  if (
    !isNodeOfTypeAndVisible(
      ["ELLIPSE", "INSTANCE", "POLYGON", "RECTANGLE", "STAR", "TEXT", "VECTOR"],
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

  // :TODO: Temp workaround until we properly support variable linting, fixing, and compliance calculations
  // Ignore the node if any color variables are in-use
  const colorVariables = jp.query(targetNode, "$.fills[*].boundVariables.color");
  if (colorVariables.length > 0) {
    return { checkName, matchLevel: "Skip", suggestions: [] };
  }

  if (opts?.hexStyleMap) {
    const { hexStyleMap } = opts;
    const fillProps = getStyleLookupDefinitions("FILL");

    if (fillProps) {
      const [r, g, b, a] = fillProps.map(prop => {
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
