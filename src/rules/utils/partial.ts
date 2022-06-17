import jp from "jsonpath";
import { StyleBucket, FigmaStyleType, PropertyCheck } from "../../models/figma";
import { LintCheckName, LintCheck, LintSuggestion } from "../../models/stats";

/**
 * Check if any sub properties overlap and amtch
 * @param checkName
 * @param styles
 * @param propertiesToCheck
 * @param targetNode
 * @returns
 */
export default function getPartialStyleMatches(
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
