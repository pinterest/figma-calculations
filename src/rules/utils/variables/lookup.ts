import { FigmaLocalVariables } from "../../../models/figma";
import { LintCheckName, LintCheck, LintSuggestionVariable } from "../../../models/stats";

import {
  calculateResolvedVariableModesMap,
  CORNER_RADII,
  FigmaVariableMapVariable,
  getVariableFromSubscribedId,
  HexColorToFigmaVariableMap,
  rgbaToHex,
  RoundingToFigmaVariableMap,
  SpacingToFigmaVariableMap,
} from "../../../utils/variables";

export default function getVariableLookupMatches(
  checkName: LintCheckName,
  hexColorToVariableMap: HexColorToFigmaVariableMap,
  roundingToVariableMap: RoundingToFigmaVariableMap,
  spacingToVariableMap: SpacingToFigmaVariableMap,
  variables: FigmaLocalVariables,
  variableType: "FILL" | "ROUNDING" | "SPACING" | "STROKE",
  targetNode: BaseNode
): LintCheck {
  const suggestions: LintSuggestionVariable[] = [];
  let variableMatches: FigmaVariableMapVariable[] | undefined;
  let hexColor: string | undefined;

  function addSuggestions(
    variableMatches: FigmaVariableMapVariable[],
    resolvedVariableModesMap: Map<string, string>,
    additionalProps: any = {}
  ): void {
    // Filter down the list of variables to those that either match the current resolvedVariableMode
    // for the node, if it exists, otherwise use the collection's default mode
    variableMatches = variableMatches.filter((v) => {
      const modeToMatch = resolvedVariableModesMap.get(v.variableCollectionKey) || v.variableCollectionDefaultModeId;

      return v.modeId === modeToMatch;
    });

    for (const v of variableMatches) {
      const suggestion: LintSuggestionVariable = {
        type: "Variable",
        message: `Possible Gestalt ${checkName} match with name: ${v.name}`,
        name: v.name,
        description: v.description,
        variableId: v.variableId,
        variableKey: v.variableKey,
        variableCollectionId: v.variableCollectionId,
        variableCollectionKey: v.variableCollectionKey,
        variableCollectionName: v.variableCollectionName,
        modeId: v.modeId,
        modeName: v.modeName,
        scopes: v.scopes,
      };

      // Add any additional properties to the suggestion
      Object.assign(suggestion, additionalProps);

      suggestions.push(suggestion);
    }
  }

  switch (variableType) {
    case "FILL":
    case "STROKE":
      {
        let paints: readonly Paint[] | typeof figma.mixed | undefined;

        if (variableType === "FILL") paints = (targetNode as MinimalFillsMixin).fills;
        else if (variableType === "STROKE") paints = (targetNode as MinimalStrokesMixin).strokes;

        // Paints in the Figma plugin could be figma.mixed, but in the Figma Cloud file figma.mixed
        // isn't available.. so use isArray to make sure it isn't figma.mixed (which is a unique symbol type)
        if (paints && Array.isArray(paints) && paints.length > 0 && paints[0].type === "SOLID") {
          const paint = paints[0];

          if (paint.visible === false) {
            return { checkName, matchLevel: "Skip", suggestions: [] };
          }

          // Figma plugin nodes use RBA + opacity, Figma Cloud file nodes use RGBA
          const rgba = {
            ...paint.color,
            a: ((paint.color as RGBA).a || paint.opacity) ?? 1,
          };

          hexColor = rgbaToHex(rgba);
          variableMatches = hexColorToVariableMap[hexColor];

          if (variableMatches) {
            const resolvedVariableModesMap = calculateResolvedVariableModesMap(targetNode);
            addSuggestions(variableMatches, resolvedVariableModesMap, { hexColor });
          }
        }
      }
      break;

    case "ROUNDING":
      {
        // Offer rounding suggestions for nodes that have a single, non-figma.mixed cornerRadius
        // and support individual corner radii suggestions
        //
        // Plugin API: "bottomLeftRadius", "bottomRightRadius", "topLeftRadius", "topRightRadius"
        // REST API: Has four values in the "rectangleCornerRadii" array, as defined by:
        // > Array of length 4 of the radius of each corner of the frame, starting in the top left and proceeding clockwise
        //

        // Calculate the node resolvedVariableModesMap once so we can reuse it for all matching
        const resolvedVariableModesMap = calculateResolvedVariableModesMap(targetNode);

        const { cornerRadius } = targetNode as CornerMixin;

        if (cornerRadius && typeof cornerRadius === "number") {
          variableMatches = roundingToVariableMap[cornerRadius];
          if (variableMatches) {
            addSuggestions(variableMatches, resolvedVariableModesMap, { corner: "all", cornerValue: cornerRadius });
          }
        } else {
          CORNER_RADII.forEach((radii, index) => {
            const variableSubscribedId = (targetNode as RectangleNode).boundVariables?.[radii]?.id;

            const variable = variableSubscribedId
              ? getVariableFromSubscribedId(variables, variableSubscribedId)
              : undefined;

            if (variable) {
              // If the variable is bound, and it exists, we don't need suggestions for this radii
              // console.log("Variable found for radii:", radii, variable);
            } else {
              // Plugin uses named properties, REST API uses an array of values in rectangleCornerRadii
              const radiiValue =
                (targetNode as RectangleNode)[radii] ?? (targetNode as any).rectangleCornerRadii?.[index];

              const matchesForThisRadii = roundingToVariableMap[radiiValue];

              if (matchesForThisRadii) {
                addSuggestions(matchesForThisRadii, resolvedVariableModesMap, {
                  corner: radii,
                  cornerValue: radiiValue,
                });
              }
            }
          });
        }
      }
      break;

    case "SPACING":
      // :TODO: Figure out if we want to support spacing suggestions, which would mean needing to separately check and return:
      // "itemSpacing", "counterAxisSpacing", "paddingBottom", "paddingLeft", "paddingRight", "paddingTop"
      break;

    default: {
      // Make sure all variable types are handled
      const _unreachable: never = variableType;
      throw new Error(`Unhandled variableType: ${_unreachable}`);
    }
  }

  if (suggestions.length === 0) {
    return { checkName, matchLevel: "None", suggestions: [] };
  }

  return { checkName, matchLevel: "Partial", suggestions };
}
