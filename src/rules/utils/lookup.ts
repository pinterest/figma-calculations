import jp from "jsonpath";

import { getStyleLookupDefinitions, getStyleLookupKey } from "..";
import { FigmaStyleType, StyleLookupMap } from "../../models/figma";
import { LintCheckName, LintCheck, LintSuggestion } from "../../models/stats";

/**
 * Check if any sub properties overlap and amtch
 * @param checkName
 * @param styles
 * @param propertiesToCheck - list of names to lookup
 * @param targetNode
 * @returns
 */
export default function getStyleLookupMatches(
  checkName: LintCheckName,
  stylesLookup: StyleLookupMap,
  styleType: FigmaStyleType,
  targetNode: BaseNode
): LintCheck {
  const suggestions: LintSuggestion[] = [];

  const propsToCheck = getStyleLookupDefinitions(styleType);

  if (propsToCheck) {
    const key = getStyleLookupKey(propsToCheck, targetNode, "figmaNode");

    if (stylesLookup[styleType][key]) {
      // a list of potential styles that match
      let possibleStyles = stylesLookup[styleType][key];

      // for some of the property definitions, they might have an "includes" filter, we can further simplify the suggestions
      for (const prop of propsToCheck) {
        if (prop.matchType === "includes") {
          possibleStyles = possibleStyles.filter((style) => {
            // depending on the environment read the right path from the node
            const pathToUse =
              typeof figma === "undefined"
                ? prop.nodePath
                : prop.figmaPath || prop.nodePath;
            const targetValue = jp.value(targetNode, pathToUse);
            const styleValue = jp.value(style.nodeDetails, prop.stylePath);

            if (styleValue === undefined || styleValue === null) return false;
            if (targetValue === undefined || targetValue === null) return false;

            return styleValue.includes(targetValue);
          });
        }
      }
      for (const r of possibleStyles) {
        suggestions.push({
          message: `Possible Gestalt ${checkName} match with name: ${r.name}`,
          styleKey: r.key,
        });
      }
    }
  }

  if (suggestions.length === 0) {
    return { checkName, matchLevel: "None", suggestions: [] };
  }

  return { checkName, matchLevel: "Partial", suggestions };
}
