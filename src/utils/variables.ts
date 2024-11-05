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

export type HexColorToFigmaVariableMap = Record<string, FigmaVariableMapVariable[]>;
export type RoundingToFigmaVariableMap = Record<number, FigmaVariableMapVariable[]>;

type VariableModeValue = {
  variableId: string;
  modeId: string;
  value: VariableValue;
};

type VariableModeMap = Record<string, string>;

// Allow strictNullChecks to properly detect null filtering using a filter()
const nonNullable = <T>(value: T): value is NonNullable<T> => {
  return Boolean(value);
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
  variableCollections: FigmaLocalVariableCollections
): string[] => {
  return variableCollectionIds
    .map((collectionId) => {
      return variableCollections[collectionId].variableIds;
    })
    .flat();
};

// A type guard to narrow down the type to be a Figma VariableAlias type
export const isVariableAlias = (value: VariableValue): value is VariableAlias => {
  return (value as VariableAlias).type === "VARIABLE_ALIAS" && (value as VariableAlias).id !== undefined;
};

// Take a variable id and mode id and return the typed-checked value, recursively resolving any variable aliases
function resolveVariableValue(
  variableId: string,
  modeId: string,
  variables: FigmaLocalVariables,
  type: VariableDataType
): VariableValue | undefined {
  const variable = variables[variableId];
  if (!variable) {
    console.log("WARNING: No value found for the matching mode:", variableId, modeId);
    return undefined;
  }

  let variableValue: VariableValue | undefined = variable.valuesByMode[modeId];

  // Fallback to the first mode value for the case where the referenced mode is not found
  if (variableValue === undefined) variableValue = Object.values(variable.valuesByMode)[0];

  if (variableValue === undefined) {
    console.log("ERROR: Unable to find a value for any mode:", variableId);
    return undefined;
  }

  // Recursively resolve the value if it's a reference to another variable
  if (isVariableAlias(variableValue)) return resolveVariableValue(variableValue.id, modeId, variables, type);

  // Check if the value is the expected type
  switch (type) {
    case "BOOLEAN":
      if (typeof variableValue === "boolean") return variableValue;
      break;

    case "FLOAT":
      if (typeof variableValue === "number") return variableValue;
      break;

    case "STRING":
      if (typeof variableValue === "string") return variableValue;
      break;

    case "COLOR":
      if (
        (variableValue as RGBA).r !== undefined &&
        (variableValue as RGBA).g !== undefined &&
        (variableValue as RGBA).b !== undefined &&
        (variableValue as RGBA).a !== undefined
      )
        return variableValue as RGBA;
      break;

    case "VARIABLE_ALIAS":
    case "EXPRESSION":
    default:
      console.log("ERROR: Unhandled variable type:", type);
      return undefined;
  }

  console.log("ERROR: The variable's value is not a VariableAlias or validated type:", type);
  return undefined;
}

// Create a lookup map of mode ids to their names
const createVariableModeNameMap = (variableCollections: FigmaLocalVariableCollections): VariableModeMap => {
  return Object.values(variableCollections).reduce<Record<string, string>>((acc, { modes }) => {
    modes.forEach(({ modeId, name }) => {
      acc[modeId] = name;
    });
    return acc;
  }, {});
};

// Given a variable id and mode id, create a FigmaVariableMapVariable object
const createVariableMapVariable = (
  variableId: string,
  modeId: string,
  variableModeNameMap: VariableModeMap,
  variables: FigmaLocalVariables,
  variableCollections: FigmaLocalVariableCollections
): FigmaVariableMapVariable | undefined => {
  const variable = variables[variableId];
  if (!variable) return undefined;

  const { name, description, key, scopes, variableCollectionId } = variable;

  const variableCollection = variableCollections[variableCollectionId];
  if (!variableCollection) return undefined;

  const {
    key: variableCollectionKey,
    name: variableCollectionName,
    defaultModeId: variableCollectionDefaultModeId,
  } = variableCollection;

  const modeName = variableModeNameMap[modeId];
  if (!modeName) return undefined;

  return {
    name,
    description,
    variableId,
    variableKey: key,
    variableCollectionId,
    variableCollectionKey,
    variableCollectionName,
    variableCollectionDefaultModeId,
    modeId,
    modeName,
    scopes,
  };
};

// Resolve the values for all of a variable's modes
// ex: { variableId: "123", modeId: "456", value: 16 }
const getModeValues = (
  variableId: string,
  variables: FigmaLocalVariables,
  variableType: VariableDataType
): VariableModeValue[] | undefined => {
  const variable = variables[variableId];

  // Only include variables of variableType, that are not hidden from publishing, and are not remote
  if (!variable || variable.resolvedType !== variableType || variable.hiddenFromPublishing || variable.remote)
    return undefined;

  return Object.keys(variable.valuesByMode)
    .map((modeId) => {
      const value = resolveVariableValue(variableId, modeId, variables, variableType);

      return value !== undefined ? { variableId, modeId, value } : undefined;
    })
    .filter(nonNullable);
};

// #region Color Variables

// Group variables by their hex value
export const createHexColorToVariableMap = (
  colorVariableIds: string[],
  variables: FigmaLocalVariables,
  variableCollections: FigmaLocalVariableCollections
): HexColorToFigmaVariableMap => {
  const variableHexValues = colorVariableIds
    .map((variableId) => getModeValues(variableId, variables, "COLOR"))
    .filter(nonNullable)
    .flat()
    .map(({ variableId, modeId, value }) => ({
      variableId,
      modeId,
      value: rgbaToHex(value as RGBA), // Convert the color value to a hex string
    }));

  // Create a lookup map of mode ids to their names
  const variableModeNameMap = createVariableModeNameMap(variableCollections);

  return variableHexValues.reduce<HexColorToFigmaVariableMap>((acc, { variableId, modeId, value }) => {
    value = value as string; // Value is a hex string
    if (!acc[value]) acc[value] = [];

    const variableMapVariable = createVariableMapVariable(
      variableId,
      modeId,
      variableModeNameMap,
      variables,
      variableCollections
    );

    if (variableMapVariable) acc[value].push(variableMapVariable);

    return acc;
  }, {});
};
// #endregion Color Variables

// #region: Rounding Variables

// Group rounding variables by their radius value
export const createRoundingToVariableMap = (
  roundingVariableIds: string[],
  variables: FigmaLocalVariables,
  variableCollections: FigmaLocalVariableCollections
): RoundingToFigmaVariableMap => {
  const variableRoundingValues = roundingVariableIds
    .map((variableId) => getModeValues(variableId, variables, "FLOAT"))
    .filter(nonNullable)
    .flat();

  // Create a lookup map of mode ids to their names
  const variableModeNameMap = createVariableModeNameMap(variableCollections);

  return variableRoundingValues.reduce<RoundingToFigmaVariableMap>((acc, { variableId, modeId, value }) => {
    value = value as number; // Rounding values are numbers
    if (!acc[value]) acc[value] = [];

    const variableMapVariable = createVariableMapVariable(
      variableId,
      modeId,
      variableModeNameMap,
      variables,
      variableCollections
    );

    if (variableMapVariable) acc[value].push(variableMapVariable);

    return acc;
  }, {});
};

// #endregion: Rounding Variables
