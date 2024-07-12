import {
  LintCheckName,
  LintCheck,
  LintSuggestion,
} from "../../../models/stats";
import { HexColorToFigmaVariableMap, rgbaToHex } from "../../../utils/variables";

export default function getVariableLookupMatches(
  checkName: LintCheckName,
  hexColorToVariableMap: HexColorToFigmaVariableMap,
  variableType: "FILL" | "STROKE",
  targetNode: BaseNode
): LintCheck {
  const suggestions: LintSuggestion[] = [];
  let paints: readonly Paint[] | typeof figma.mixed | undefined;

  if (variableType === "FILL") paints = (targetNode as MinimalFillsMixin).fills;
  else if (variableType === "STROKE")
    paints = (targetNode as MinimalStrokesMixin).strokes;

  // Paints in the Figma plugin could be figma.mixed, but in the Figma Cloud file figma.mixed
  // isn't available.. so use isArray to make sure it isn't figma.mixed (which is a unique symbol type)
  if (
    paints &&
    Array.isArray(paints) &&
    paints.length > 0 &&
    paints[0].type === "SOLID"
  ) {
    const paint = paints[0];

    if (paint.visible === false){
      return { checkName, matchLevel: "Skip", suggestions: [] };
    }

    // Figma plugin nodes use RBA + opacity, Figma Cloud file nodes use RGBA
    const rgba = {
      ...paint.color,
      a: ((paint.color as RGBA).a || paint.opacity) ?? 1,
    };

    const hexColor = rgbaToHex(rgba);
    const variables = hexColorToVariableMap[hexColor];

    if (variables) {
      for (const v of variables) {
        suggestions.push({
          message: `Possible Gestalt ${checkName} match with name: ${v.name}`,
          styleKey: v.variableId,
        });
      }
    }
  }

  if (suggestions.length === 0) {
    return { checkName, matchLevel: "None", suggestions: [] };
  }

  return { checkName, matchLevel: "Partial", suggestions };
}
