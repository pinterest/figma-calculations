/* eslint-disable no-undef */

import { FigmaTeamStyle, StyleBucket } from "../models/figma";

import { LintCheck } from "../models/stats";
import checkFillStyleMatch from "./fillStyle";
import checkStrokeStyleMatch from "./strokeStyle";
import checkTextMatch from "./textStyle";

/**
 * Run through all partial matches, and make exceptions depending on rules
 */
export const runSimilarityChecks = (
  styleBucket: StyleBucket,
  targetNode: SceneNode
): LintCheck[] => {
  const checks: ((
    styleBucket: StyleBucket,
    targetNode: SceneNode
  ) => LintCheck)[] = [
    checkTextMatch,
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

/**
 * Check if a Node Type overlaps
 * @param types
 * @param node
 * @returns
 */
export function isNodeOfTypeAndVisible(types: string[], node: SceneNode) {
  return types.includes(node.type);
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
