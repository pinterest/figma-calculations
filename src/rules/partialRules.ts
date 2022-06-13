/* eslint-disable no-undef */

import jp from "jsonpath";
import {
  FigmaStyleType,
  FigmaTeamStyle,
  PropertyCheck,
  StyleBucket,
} from "../models/figma";

import {
  LintCheckName,
  LintCheck,
  MatchLevel,
  LintSuggestion,
} from "../models/stats";
import { isExactStyleMatch } from "./isExactStyleMatch";

export function handleCountsIncrement(
  name: string,
  matchLevel: MatchLevel,

  counts: any
) {
  const countKey = matchLevel.toLowerCase() + "/" + name.toLowerCase();

  if (!counts[countKey]) counts[countKey] = 0;

  counts[countKey] += 1;
}

export function generateStyleBucket(styles: FigmaTeamStyle[]): StyleBucket {
  // create hashmap of styles by styleType
  const styleBuckets: StyleBucket = {};

  for (const style of styles) {
    if (!styleBuckets[style.style_type]) {
      styleBuckets[style.style_type] = {};
    }

    styleBuckets[style.style_type][style.key] = style;
  }
  return styleBuckets;
}

/**
 * Check if a Node Type overlaps
 * @param types
 * @param node
 * @returns
 */
export function isNodeOfTypeAndVisible(types: string[], node: SceneNode) {
  return types.includes(node.type);
}

/**
 * Check if any sub properties overlap and amtch
 * @param checkName
 * @param styles
 * @param propertiesToCheck
 * @param targetNode
 * @returns
 */
function getPartialStyleMatches(
  checkName: LintCheckName,
  stylesBucket: StyleBucket,
  styleType: FigmaStyleType,
  propertiesToCheck: PropertyCheck[],
  targetNode: SceneNode
): LintCheck {
  const suggestions: LintSuggestion[] = [];
  const styles = stylesBucket[styleType];

  for (const property of propertiesToCheck) {
    // do work here to check individual property matches
    const targetValue = jp.value(targetNode, property.nodePath);

    if (!targetValue) continue;

    // check against all of styles, and that field in a style

    for (const styleId of Object.keys(styles)) {
      const styleNode = styles[styleId];

      const styleValue = jp.value(styleNode.nodeDetails, property.stylePath);

      // skip it
      if (!styleValue) continue;
      // sometimes it may not be a string, and is a figma partial
      if (typeof styleValue === "string") {
        if (property.matchType == "exact") {
          if (targetValue == styleValue) {
            suggestions.push({
              message: `Possible Gestalt ${
                property.name || checkName
              } match with name: ${styleNode.name}`,
              styleKey: styleNode.key,
            });
          }
        } else {
          if (targetValue.includes(styleValue)) {
            suggestions.push({
              message: `Possible Gestalt ${
                property.name || checkName
              } match with name: ${styleNode.name}`,
              styleKey: styleNode.key,
            });
          }
        }
      }

      if (typeof styleValue === "number") {
        if (property.matchType == "exact") {
          if (targetValue == styleValue) {
            suggestions.push({
              message: `Possible Gestalt ${
                property.name || checkName
              } match with name: ${styleNode.name}`,
              styleKey: styleNode.key,
            });
          }
        } else {
          // handle partial rgb matching with close vicinity...
        }
      }
    }
  }
  if (suggestions.length === 0) {
    return { checkName, matchLevel: "None", suggestions: [] };
  }

  return { checkName, matchLevel: "Partial", suggestions };
}

/**
 * Run through all partial matches, and make exceptions depending on rules
 */
export const runSimilarityChecks = (
  styleBucket: StyleBucket,
  targetNode: SceneNode
): LintCheck[] => {
  function checkTextFillMatch(
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

    if (exactMatch)
      return {
        checkName,
        matchLevel: "Full",
        suggestions: [],
        exactMatch: { key: exactMatch.key },
      };

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

  function checkFillStyleMatch(
    styleBucket: StyleBucket,
    targetNode: SceneNode
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
      targetNode
    );

    return { checkName, matchLevel, suggestions };
  }

  function checkStrokeStyleMatch(
    styleBucket: StyleBucket,
    targetNode: SceneNode
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
      targetNode
    );

    return { checkName, matchLevel, suggestions };
  }

  const checks: ((
    styleBucket: StyleBucket,
    targetNode: SceneNode
  ) => LintCheck)[] = [
    checkTextFillMatch,
    checkStrokeStyleMatch,
    checkFillStyleMatch,
  ];

  const results = [];
  for (const check of checks) {
    const lintCheck = check(styleBucket, targetNode);

    results.push(lintCheck);
  }

  return results;
};
