import jp from "jsonpath";
import {
  StyleBucket,
  FigmaStyleType,
  PropertyCheck,
  FigmaTeamStyle,
} from "../../../models/figma";
import {
  LintCheckName,
  LintCheck,
  LintSuggestion,
} from "../../../models/stats";

/**
 * Check if any sub properties overlap and match
 *
 * WARNING: DEPRECATED
 * @deprecated Replaced with getStyleLookupMatches()
 *
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
  targetNode: BaseNode,
  opts?: { union: boolean }
): LintCheck {
  const suggestions: LintSuggestion[] = [];
  const styles = stylesBucket[styleType];

  //return { checkName, matchLevel: "None", suggestions: [] };

  const checkPropertyValue = (
    property: PropertyCheck,
    styleValue: any,
    targetValue: any,
    styleNode: FigmaTeamStyle
  ): LintSuggestion | undefined => {
    if (property.removeSpaces) {
      styleValue = styleValue.split(" ").join("");
      targetValue = targetValue.split(" ").join("");
    }
    // sometimes it may not be a string, and is a figma partial
    if (typeof styleValue === "string") {
      if (property.matchType == "exact") {
        if (targetValue == styleValue) {
          return {
            type: "Style",
            message: `Possible Gestalt ${
              property.name || checkName
            } match with name: ${styleNode.name}`,
            styleKey: styleNode.key,
            name: styleNode.name,
            description: styleNode.description,
          };
        }
      } else {
        if (styleValue.includes(targetValue)) {
          return {
            type: "Style",
            message: `Possible Gestalt ${
              property.name || checkName
            } match with name: ${styleNode.name}`,
            styleKey: styleNode.key,
            name: styleNode.name,
            description: styleNode.description,
          };
        }
      }
    }

    if (typeof styleValue === "number") {
      if (property.matchType == "exact") {
        if (targetValue == styleValue) {
          return {
            type: "Style",
            message: `Possible Gestalt ${
              property.name || checkName
            } match with name: ${styleNode.name}`,
            styleKey: styleNode.key,
            name: styleNode.name,
            description: styleNode.description,
          };
        }
      } else {
        // handle partial rgb matching with close vicinity...
        return undefined;
      }
    }
    return undefined;
  };

  // check against all of styles, and that field in a style
  for (const styleId of Object.keys(styles)) {
    const styleNode = styles[styleId];

    let numPropMatches = 0;

    for (const property of propertiesToCheck) {
      const styleValue = jp.value(styleNode.nodeDetails, property.stylePath);

      // skip it
      if (styleValue === undefined || styleValue === null) continue;

      // depending on the environment read the right path from the node
      const pathToUse =
        typeof figma === "undefined"
          ? property.nodePath
          : property.figmaPath || property.nodePath;

      const targetValue = jp.value(targetNode, pathToUse);

      if (targetValue === undefined || targetValue === null) continue;

      //  console.log(pathToUse, styleValue, targetValue);

      const result = checkPropertyValue(
        property,
        styleValue,
        targetValue,
        styleNode
      );

      if (!result) continue;

      numPropMatches += 1;

      if (opts?.union) {
        // if all matches give a suggestion, then it's a union match
        if (numPropMatches === propertiesToCheck.length) {
          suggestions.push(result);
        }
      } else {
        suggestions.push(result);
      }
    }
  }

  if (suggestions.length === 0) {
    return { checkName, matchLevel: "None", suggestions: [] };
  }

  return { checkName, matchLevel: "Partial", suggestions };
}
