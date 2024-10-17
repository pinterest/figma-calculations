import { FigmaLocalVariableCollections, FigmaLocalVariables } from "../models/figma";

export type FigmaVariableMapVariable = {
  name: string;
  description: string;
  variableId: string;
  variableKey: string;
  variableCollectionId: string;
  variableCollectionKey: string;
  variableCollectionName: string;
  variableCollectionDefaultModeId: string;
  modeId: string;
  modeName: string;
  scopes: VariableScope[];
};

export type HexColorToFigmaVariableMap = Record<
  string,
  FigmaVariableMapVariable[]
>;

export type RoundingToFigmaVariableMap = Record<
  number,
  FigmaVariableMapVariable[]
>;

// Allow strictNullChecks to properly detect null filtering using a filter()
const nonNullable = <T>(value: T): value is NonNullable<T> => {
  return Boolean(value);
}

// A type guard to narrow down the type to be a Figma VariableAlias type
export const isVariableAlias = (value: VariableValue): value is VariableAlias => {
  return (value as VariableAlias).type === "VARIABLE_ALIAS" && (value as VariableAlias).id !== undefined;
};

// A type guard to narrow down the type to be a Figma RGBA type
export const isRGBA = (value: VariableValue): value is RGBA => {
  return (
    (value as RGBA).r !== undefined &&
    (value as RGBA).g !== undefined &&
    (value as RGBA).b !== undefined &&
    (value as RGBA).a !== undefined
  );
};

// Helper function to convert a RGBA object to a CSS hex string in the form of #RRGGBBAA
export const rgbaToHex = (rgba: RGBA): string => {
  const r = Math.round(rgba.r * 255);
  const g = Math.round(rgba.g * 255);
  const b = Math.round(rgba.b * 255);
  const a = Math.round(rgba.a * 255);

  const rgbaValue = ((r << 24) | (g << 16) | (b << 8) | a) >>> 0;
  return `#${rgbaValue.toString(16).padStart(8, "0")}`.toUpperCase();
};

// Given a list of variable collection ids, return a list of variable ids in those collections
export const getCollectionVariables = (
  variableCollectionIds: string[],
  variableCollections: FigmaLocalVariableCollections,
): string[] => {
  return variableCollectionIds
    .map((collectionId) => {
      return variableCollections[collectionId].variableIds;
    })
    .flat();
};

// #region Color Variables

// Take a variable key and mode id and return the hex color value, recursively resolving any variable aliases
const resolveHexValue = (variableId: string, modeId: string, variables: FigmaLocalVariables): string | null => {
  const variable = variables[variableId];
  if (!variable) {
    console.log("WARNING: No value found for the matching mode:", variableId, modeId);
    return null;
  }

  let variableValue: VariableValue = variable.valuesByMode[modeId];

  // Fallback to the first mode value for the case where the referenced mode is not found
  if (!variableValue) variableValue = Object.values(variable.valuesByMode)[0];

  if (!variableValue) {
    console.log("ERROR: Unable to find a value for any mode:", variableId);
    return null;
  }

  // Recursively resolve the value if it's a reference to another variable
  if (isVariableAlias(variableValue)) return resolveHexValue(variableValue.id, modeId, variables);

  if (isRGBA(variableValue)) return rgbaToHex(variableValue);

  console.log("ERROR: The variable's value is not a VariableAlias or RGBA object");
  return null;
};

// Get the hex values for all of a variable's modes
// ex: { variableId: "123", modeId: "456", hexValue: "#FFFFFF" }
const getModeHexValues = (
  variableId: string,
  variables: FigmaLocalVariables,
): Array<{
  variableId: string;
  modeId: string;
  hexValue: string | null;
}> | null => {
  const variable = variables[variableId];

  // Only include "COLOR" type variables that are not hidden from publishing and are not remote
  if (!variable || variable.resolvedType !== "COLOR" || variable.hiddenFromPublishing || variable.remote) return null;

  return Object.keys(variable.valuesByMode).map((modeId) => {
    const hexValue = resolveHexValue(variableId, modeId, variables);
    return { variableId, modeId, hexValue };
  });
};

// Group variables by their hex value
export const createHexColorToVariableMap = (
  colorVariableIds: string[],
  variables: FigmaLocalVariables,
  variableCollections: FigmaLocalVariableCollections,
): HexColorToFigmaVariableMap => {
  const variableHexValues = colorVariableIds
    .map((variableId) => getModeHexValues(variableId, variables))
    .filter(nonNullable)
    .flat();

  // Create a lookup map of mode ids to their names
  const variableModeNameMap = Object.values(variableCollections).reduce<Record<string, string>>((acc, { modes }) => {
    modes.forEach(({ modeId, name }) => {
      acc[modeId] = name;
    });
    return acc;
  }, {});

  return variableHexValues.reduce<HexColorToFigmaVariableMap>((acc, { hexValue, variableId, modeId }) => {
    if (hexValue) {
      if (!acc[hexValue]) acc[hexValue] = [];

      const { name, description, key, variableCollectionId } = variables[variableId];
      acc[hexValue].push({
        name,
        description,
        variableId,
        variableKey: key,
        variableCollectionId,
        variableCollectionKey: variableCollections[variableCollectionId].key,
        variableCollectionName: variableCollections[variableCollectionId].name,
        variableCollectionDefaultModeId: variableCollections[variableCollectionId].defaultModeId,
        modeId,
        modeName: variableModeNameMap[modeId],
        scopes: variables[variableId].scopes,
      });
    }

    return acc;
  }, {});
};
// #endregion Color Variables

// #region: Rounding Variables

// Take a variable key and mode id and return the numeric value, recursively resolving any variable aliases
const resolveVariableValue = (variableId: string, modeId: string, variables: FigmaLocalVariables): number | null => {
  const variable = variables[variableId];
  if (!variable) {
    console.log("WARNING: No value found for the matching mode:", variableId, modeId);
    return null;
  }

  let variableValue: VariableValue | undefined = variable.valuesByMode[modeId];

  // Fallback to the first mode value for the case where the referenced mode is not found
  if (variableValue === undefined) variableValue = Object.values(variable.valuesByMode)[0];

  if (variableValue === undefined) {
    console.log("ERROR: Unable to find a value for any mode:", variableId);
    return null;
  }

  // Recursively resolve the value if it's a reference to another variable
  if (isVariableAlias(variableValue)) return resolveVariableValue(variableValue.id, modeId, variables);

  // check if the value is a number
  if (typeof variableValue === "number") return variableValue;

  console.log("ERROR: The variable's value is not a VariableAlias or number");
  return null;
};

// Get the rounding/radius values for all of a variable's modes
// ex: { variableId: "123", modeId: "456", value: 16 }
const getModeRoundingValues = (
  variableId: string,
  variables: FigmaLocalVariables,
): Array<{
  variableId: string;
  modeId: string;
  value: number | null;
}> | null => {
  const variable = variables[variableId];

  // Only include "FLOAT" type variables that are not hidden from publishing and are not remote
  if (!variable || variable.resolvedType !== "FLOAT" || variable.hiddenFromPublishing || variable.remote) return null;

  return Object.keys(variable.valuesByMode).map((modeId) => {
    const value = resolveVariableValue(variableId, modeId, variables);
    return { variableId, modeId, value };
  });
};

// Group rounding variables by their radius
export const createRoundingToVariableMap = (
  roundingVariableIds: string[],
  variables: FigmaLocalVariables,
  variableCollections: FigmaLocalVariableCollections,
): RoundingToFigmaVariableMap => {
  const variableRoundingValues = roundingVariableIds
    .map((variableId) => getModeRoundingValues(variableId, variables))
    .filter(nonNullable)
    .flat();

  // Create a lookup map of mode ids to their names
  const variableModeNameMap = Object.values(variableCollections).reduce<Record<string, string>>((acc, { modes }) => {
    modes.forEach(({ modeId, name }) => {
      acc[modeId] = name;
    });
    return acc;
  }, {});

  return variableRoundingValues.reduce<RoundingToFigmaVariableMap>((acc, { value, variableId, modeId }) => {
    if (value !== null) {
      if (!acc[value]) acc[value] = [];

      const { name, description, key, variableCollectionId } = variables[variableId];
      acc[value].push({
        name,
        description,
        variableId,
        variableKey: key,
        variableCollectionId,
        variableCollectionKey: variableCollections[variableCollectionId].key,
        variableCollectionName: variableCollections[variableCollectionId].name,
        variableCollectionDefaultModeId: variableCollections[variableCollectionId].defaultModeId,
        modeId,
        modeName: variableModeNameMap[modeId],
        scopes: variables[variableId].scopes,
      });
    }

    return acc;
  }, {});
};
// #endregion: Rounding Variables
