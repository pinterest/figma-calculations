import {
  LintCheckName,
  LintCheck,
  LintSuggestionVariable,
} from "../../../models/stats";
import {
  FigmaVariableMapVariable,
  HexColorToFigmaVariableMap,
  rgbaToHex,
  RoundingToFigmaVariableMap,
} from "../../../utils/variables";

export default function getVariableLookupMatches(
  checkName: LintCheckName,
  hexColorToVariableMap: HexColorToFigmaVariableMap,
  roundingToVariableMap: RoundingToFigmaVariableMap,
  variableType: "FILL" | "ROUNDING" | "STROKE",
  targetNode: BaseNode
): LintCheck {
  const suggestions: LintSuggestionVariable[] = [];
  let variables: FigmaVariableMapVariable[] | undefined;
  let hexColor: string | undefined;

  switch (variableType) {
    case "FILL":
    case "STROKE":
      {
        let paints: readonly Paint[] | typeof figma.mixed | undefined;

        if (variableType === "FILL")
          paints = (targetNode as MinimalFillsMixin).fills;
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

          if (paint.visible === false) {
            return { checkName, matchLevel: "Skip", suggestions: [] };
          }

          // Figma plugin nodes use RBA + opacity, Figma Cloud file nodes use RGBA
          const rgba = {
            ...paint.color,
            a: ((paint.color as RGBA).a || paint.opacity) ?? 1,
          };

          hexColor = rgbaToHex(rgba);
          variables = hexColorToVariableMap[hexColor];
        }
      }
      break;

    case "ROUNDING":
      // Only offer rounding suggestions for nodes that have a single, non-figma.mixed cornerRadius
      // :TODO: Figure out if we want to expanded this to support figma.mixed radius values,
      // which would mean needing to check:
      // Plugin API: "bottomLeftRadius", "bottomRightRadius", "topLeftRadius", "topRightRadius" for the Plugin API
      // REST API: "rectangleCornerRadii" array
      const cornerRadius = (targetNode as CornerMixin).cornerRadius;
      if (typeof cornerRadius === "number") {
        variables = roundingToVariableMap[cornerRadius];
      }
      break;

    default: {
      // Make sure all variable types are handled
      const _unreachable: never = variableType;
      throw new Error(`Unhandled variableType: ${_unreachable}`);
    }
  }

  if (variables) {
    // Filter out variables that don't match the resolvedVariableModes for the node
    //
    // The Plugin API resolvedVariableModes property is an array of values in the form:
    // {VariableCollectionId:4946b0f5dc6bdc872b0bc1ad0ad5e7f0a348e0ad/3979:69: "265:0"}
    //
    // ref: https://www.figma.com/plugin-docs/api/properties/nodes-resolvedvariablemodes/
    //
    // Note: The Figma REST API doesn't have resolvedVariableModes, only explicitVariableModesMap,
    // so we need to walk up the node hierarchy and calculate it ourselves if we want to use it
    // for REST API loaded files/pages.
    //
    // Also, starting in Oct 2024.. the Plugin API no longer generates the resolvedVariableModes object
    // for nodes that aren't using any variables, so either way we need to make our own by using
    // explicitVariableModes *sigh*

    let resolvedVariableModesMap = new Map<string, string>();

    // Walk up all the node parents, collecting and merging the explicitVariableModes
    // to calculate our own equivalent resolvedVariableModes... and in the form of a
    // lookup map for faster filtering
    let currentNode = targetNode as SceneNode | BaseNode | null;
    while (currentNode && currentNode.type !== "DOCUMENT") {
      const modes = currentNode.explicitVariableModes ?? {};

      for (const [key, value] of Object.entries(modes)) {
        const collectionKey = key.match(/:(.+)\//)?.[1];

        // Check if the key already exists in the map to ensure the closest parent mode takes precedence
        if (collectionKey && !resolvedVariableModesMap.has(collectionKey)) {
          resolvedVariableModesMap.set(collectionKey, value);
        }
      }

      currentNode = currentNode.parent;
    }

    // Filter down the list of variables to those that either match the current resolvedVariableMode
    // for the node, if it exists, otherwise use the collection's default mode
    variables = variables.filter((v) => {
      const modeToMatch =
        resolvedVariableModesMap.get(v.variableCollectionKey) ||
        v.variableCollectionDefaultModeId;

      return v.modeId === modeToMatch;
    });

    for (const v of variables) {
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

      // Only used for FILL and STROKE suggestions
      if (hexColor) suggestion.hexColor = hexColor;

      suggestions.push(suggestion);
    }
  }

  if (suggestions.length === 0) {
    return { checkName, matchLevel: "None", suggestions: [] };
  }

  return { checkName, matchLevel: "Partial", suggestions };
}
