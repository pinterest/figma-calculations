import {
  LintCheckName,
  LintCheck,
  LintSuggestion,
} from "../../../models/stats";
import {
  HexColorToFigmaVariableMap,
  rgbaToHex,
} from "../../../utils/variables";

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

    if (paint.visible === false) {
      return { checkName, matchLevel: "Skip", suggestions: [] };
    }

    // Figma plugin nodes use RBA + opacity, Figma Cloud file nodes use RGBA
    const rgba = {
      ...paint.color,
      a: ((paint.color as RGBA).a || paint.opacity) ?? 1,
    };

    const hexColor = rgbaToHex(rgba);
    let variables = hexColorToVariableMap[hexColor];

    if (variables) {
      // Filter out variables that don't match the resolvedVariableModes for the node
      //
      // The Plugin API ResolvedVariableModes property is an array of values in the form:
      // {VariableCollectionId:4946b0f5dc6bdc872b0bc1ad0ad5e7f0a348e0ad/3979:69: "265:0"}
      //
      // ref: https://www.figma.com/plugin-docs/api/properties/nodes-resolvedvariablemodes/
      //
      // :TODO: REST API doesn't have resolvedVariableModes, only explicitVariableModesMap,
      // We'd need to walk up the tree and calculate it ourselves if we want to use it in the REST API
      const { resolvedVariableModes } = targetNode as SceneNode;
      if (resolvedVariableModes && Object.keys(resolvedVariableModes).length > 0) {
        const resolvedVariableModesMap = new Map(
          Object.entries(resolvedVariableModes).map(([key, value]) => {
            const resolvedVariableCollectionKey = key.match(/:(.+)\//)?.[1];
            return [resolvedVariableCollectionKey, value];
          })
        );

        variables = variables.filter(
          (v) =>
            resolvedVariableModesMap.get(v.variableCollectionKey) === v.modeId
        );
      }

      for (const v of variables) {
        suggestions.push({
          type: "Variable",
          message: `Possible Gestalt ${checkName} match with name: ${v.name}`,
          name: v.name,
          hexColor,
          description: v.description,
          variableId: v.variableId,
          variableKey: v.variableKey,
          variableCollectionId: v.variableCollectionId,
          variableCollectionKey: v.variableCollectionKey,
          variableCollectionName: v.variableCollectionName,
          modeId: v.modeId,
          modeName: v.modeName,
          scopes: v.scopes,
        });
      }
    }
  }

  if (suggestions.length === 0) {
    return { checkName, matchLevel: "None", suggestions: [] };
  }

  return { checkName, matchLevel: "Partial", suggestions };
}
