import { FigmaLocalVariable, FigmaLocalVariables } from "../../../models/figma";
import { SpacingVariable } from "../../../models/stats";
import { CORNER_RADII, getVariableFromSubscribedId } from "../../../utils/variables";

export const isExactVariableMatch = (
  variableType: "FILL" | "ROUNDING" | "SPACING" | "STROKE",
  variables: FigmaLocalVariables,
  targetNode: BaseNode
): FigmaLocalVariable | undefined => {
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
          const variable = getVariableFromSubscribedId(variables, variableSubscribedId);

          // const figmaLoadedVariable = await figma.variables.getVariableByIdAsync(variableId);
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
          const variable = getVariableFromSubscribedId(variables, variableSubscribedId);

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
        // Non-Rectangle nodes (e.g. Polygon, Star) can have a single cornerRadius bound variable
        // NOTE: boundVariables.cornerRadius isn't documented or in the Figma typings currently, so using any
        const variableSubscribedId = (targetNode as any).boundVariables?.cornerRadius?.id;

        if (variableSubscribedId) {
          const variable = getVariableFromSubscribedId(variables, variableSubscribedId);
          if (variable && (variable.scopes.includes("CORNER_RADIUS") || variable.scopes.includes("ALL_SCOPES"))) {
            return variable;
          }
        }

        // Otherwise, check all the corner radius bound variables, if they exist
        const matchingVariables: FigmaLocalVariable[] = [];
        CORNER_RADII.forEach((radii) => {
          const variableSubscribedId = (targetNode as RectangleNode).boundVariables?.[radii]?.id;

          if (variableSubscribedId) {
            const variable = getVariableFromSubscribedId(variables, variableSubscribedId);

            if (variable && (variable.scopes.includes("CORNER_RADIUS") || variable.scopes.includes("ALL_SCOPES"))) {
              matchingVariables.push(variable);
            }
          }
        });

        // If they all match, return the first one I guess?
        // :TODO: Do callers use this returned variable key?
        if (matchingVariables.length === 4) return matchingVariables[0];
      }
      break;

    case "SPACING":
      {
        const node = targetNode as FrameNode | InstanceNode;

        const matchingVariables: FigmaLocalVariable[] = [];
        (
          [
            "counterAxisSpacing",
            "itemSpacing",
            "paddingBottom",
            "paddingLeft",
            "paddingRight",
            "paddingTop",
          ] as SpacingVariable[]
        ).forEach((spacing) => {
          const variableSubscribedId = node.boundVariables?.[spacing]?.id;

          if (variableSubscribedId) {
            const variable = getVariableFromSubscribedId(variables, variableSubscribedId);

            if (variable && (variable.scopes.includes("GAP") || variable.scopes.includes("ALL_SCOPES"))) {
              matchingVariables.push(variable);
            }
          }
        });

        // If they all match, return the first one I guess?
        // Also match if there are only 5 bound variables with counterAxisSpacing unbound if the
        // node is not a WRAP layout, because counterAxisSpacing is only used when Direction = WRAP
        // :TODO: Do callers use this returned variable key?
        if (
          matchingVariables.length === 6 ||
          (matchingVariables.length === 5 &&
            node.layoutWrap !== "WRAP" &&
            node.boundVariables?.["counterAxisSpacing"]?.id === undefined)
        )
          return matchingVariables[0];
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
