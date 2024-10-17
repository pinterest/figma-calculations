import { FigmaLocalVariable, FigmaLocalVariables } from "../../../models/figma";
import { RadiusVariable } from "../../../models/stats";

export const isExactVariableMatch = (
  variableType: "FILL" | "ROUNDING" | "STROKE",
  variables: FigmaLocalVariables,
  targetNode: BaseNode
): FigmaLocalVariable | undefined => {
  // Extract the variable key from a subscribed_id string in the format:
  // VariableID:2eba2a28539ae56f55778b021a50ecafea5bb4eb/6719:357
  function getVariableFromSubscribedId(subscribedId: string) {
    const match = subscribedId.match(/VariableID:(\w+)\//);
    const variableKey = match?.[1] ?? undefined;

    return (
      variableKey && Object.values(variables).find((v) => v.key === variableKey)
    );
  }

  switch (variableType) {
    case "FILL":
      {
        // boundVariables reference the subscribed_id of the variable in the format:
        // VariableID:2eba2a28539ae56f55778b021a50ecafea5bb4eb/6719:357
        //
        // From the Figma REST API docs:
        // Published variables have two ids: an id that is assigned in the file where it is created (id),
        // and an id that is used by subscribing files (subscribed_id). The id and key are stable over
        // the lifetime of the variable. The subscribed_id changes every time the variable is modified
        // and published. The same is true for variable collections.
        //
        const variableSubscribedId = (targetNode as RectangleNode)
          .boundVariables?.fills?.[0].id;

        if (variableSubscribedId) {
          const variable = getVariableFromSubscribedId(variableSubscribedId);

          // const figmaLoadedVariable = figma.variables.getVariableById(variableId);
          // console.log("Got figma loaded variable:", figmaLoadedVariable);

          if (
            variable &&
            (variable.scopes.includes("SHAPE_FILL") ||
              variable.scopes.includes("FRAME_FILL") ||
              variable.scopes.includes("TEXT_FILL") ||
              variable.scopes.includes("ALL_SCOPES"))
          ) {
            return variable;
          }
        }
      }
      break;

    case "STROKE":
      {
        const variableSubscribedId = (targetNode as RectangleNode)
          .boundVariables?.strokes?.[0].id;

        if (variableSubscribedId) {
          const variable = getVariableFromSubscribedId(variableSubscribedId);

          if (
            variable &&
            (variable.scopes.includes("STROKE_COLOR") ||
              variable.scopes.includes("ALL_SCOPES"))
          ) {
            return variable;
          }
        }
      }
      break;

    case "ROUNDING":
      {
        const matchingVariables: FigmaLocalVariable[] = [];

        // Check all the corner radius bound variables, if they exist
        (
          [
            "bottomLeftRadius",
            "bottomRightRadius",
            "topLeftRadius",
            "topRightRadius",
          ] as RadiusVariable[]
        ).forEach((radius) => {
          const variableSubscribedId = (targetNode as RectangleNode)
            .boundVariables?.[radius]?.id;

          if (variableSubscribedId) {
            const variable = getVariableFromSubscribedId(variableSubscribedId);

            if (variable && variable.scopes.includes("CORNER_RADIUS")) {
              matchingVariables.push(variable);
            }
          }
        });

        // If they all match, return the first one
        // :TODO: Do callers use this returned variable key?
        return matchingVariables.length === 4
          ? matchingVariables[0]
          : undefined;
      }

      break;

    default: {
      // Make sure all variable types are handled
      const _unreachable: never = variableType;
      throw new Error(`Unhandled variableType: ${_unreachable}`);
    }
  }

  return undefined;
};
