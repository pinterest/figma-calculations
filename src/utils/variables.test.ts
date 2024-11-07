import {
  createHexColorToVariableMap,
  createRoundingToVariableMap,
  createSpacingToVariableMap,
  createVariableMapVariable,
  createVariableModeNameMap,
  getCollectionVariables,
  getModeValues,
  isVariableAlias,
  resolveVariableValue,
  rgbaToHex,
} from "./variables";
import { FigmaLocalVariableCollections, FigmaLocalVariables } from "../models/figma";
import variablesImported from "../../tests/__mocks__/variables.mock.json";
import variableCollectionsImported from "../../tests/__mocks__/variableCollections.mock.json";

const variables = variablesImported as FigmaLocalVariables;
const variableCollections = variableCollectionsImported as FigmaLocalVariableCollections;

describe("rgbaToHex", () => {
  test("Converts color RGBA object to hex string", () => {
    const rgba: RGBA = {
      r: 0.8862745098039215,
      g: 0.07058823529411765,
      b: 0.06666666666666667,
      a: 1,
    };
    expect(rgbaToHex(rgba)).toBe("#E21211FF");
  });

  test("Converts white RGBA object to hex string", () => {
    const rgba: RGBA = {
      r: 1,
      g: 1,
      b: 1,
      a: 1,
    };
    expect(rgbaToHex(rgba)).toBe("#FFFFFFFF");
  });

  test("Converts black RGBA object to hex string", () => {
    const rgba: RGBA = {
      r: 0,
      g: 0,
      b: 0,
      a: 1,
    };
    expect(rgbaToHex(rgba)).toBe("#000000FF");
  });

  test("Converts half opacity RGBA object to hex string", () => {
    const rgba: RGBA = {
      r: 0,
      g: 0,
      b: 0,
      a: 0.5,
    };
    expect(rgbaToHex(rgba)).toBe("#00000080");
  });
});

describe("isVariableAlias", () => {
  test("Returns true if value is a VariableAlias", () => {
    const variable = variables["VariableID:265:2997"].valuesByMode["265:0"];
    expect(isVariableAlias(variable)).toBe(true);
  });

  test("Returns false if value is not a VariableAlias", () => {
    const variable = variables["VariableID:7410:248"].valuesByMode["7410:0"];
    expect(isVariableAlias(variable)).toBe(false);
  });
});

describe("getCollectionVariables", () => {
  test("Returns a list of variable ids in the collections", () => {
    const variableCollectionIds = [
      "VariableCollectionId:265:2989",
      "VariableCollectionId:701:7994",
      "VariableCollectionId:733:939",
    ];
    const variableIds = getCollectionVariables(variableCollectionIds, variableCollections);

    expect(variableIds).toEqual(["VariableID:265:2997", "VariableID:701:7996", "VariableID:7410:308"]);
  });
});

describe("resolveVariableValue", () => {
  test("Resolves a variable value", () => {
    const variableId = "VariableID:265:2997";
    const modeId = "265:1";
    const value = resolveVariableValue(variableId, modeId, variables, "COLOR");

    expect(value).toEqual({ r: 0, g: 0, b: 0, a: 1 });
  });
});

describe("createVariableModeNameMap", () => {
  test("Creates a map of variable mode names", () => {
    const map = createVariableModeNameMap(variableCollections);

    expect(map).toEqual({
      "265:0": "Light",
      "265:1": "Dark",
      "7410:2": "Default",
      "7410:3": "Default",
    });
  });
});

describe("createVariableMapVariable", () => {
  test("Creates a map of variable values", () => {
    const variableId = "VariableID:265:2997";
    const modeId = "265:1";
    const variableModeNameMap = createVariableModeNameMap(variableCollections);

    const variableMap = createVariableMapVariable(
      variableId,
      modeId,
      variableModeNameMap,
      variables,
      variableCollections
    );

    expect(variableMap).toBeDefined();
    expect(variableMap).toEqual({
      name: "sema/color/background/default",
      description: "",
      variableId: "VariableID:265:2997",
      variableKey: "b5210392296e696d0a8bb2f92aea2b1c3f4bfdb6",
      variableCollectionId: "VariableCollectionId:265:2989",
      variableCollectionKey: "4946b0f5dc6bdc872b0bc1ad0ad5e7f0a348e0ad",
      variableCollectionName: "Colors",
      variableCollectionDefaultModeId: "265:0",
      modeId: "265:1",
      modeName: "Dark",
      scopes: ["FRAME_FILL", "SHAPE_FILL"],
    });
  });
});

describe("getModeValues", () => {
  test("Returns a list of mode values", () => {
    const variableId = "VariableID:265:2997";
    const values = getModeValues(variableId, variables, "COLOR");

    expect(values).toEqual([
      {
        variableId: "VariableID:265:2997",
        modeId: "265:0",
        value: {
          r: 1,
          g: 1,
          b: 1,
          a: 1,
        },
      },
      {
        variableId: "VariableID:265:2997",
        modeId: "265:1",
        value: {
          r: 0,
          g: 0,
          b: 0,
          a: 1,
        },
      },
    ]);
  });
});

describe("createHexColorToVariableMap", () => {
  test("Creates a map of hex colors to variables", () => {
    const colorVariableIds = getCollectionVariables(["VariableCollectionId:265:2989"], variableCollections);
    const map = createHexColorToVariableMap(colorVariableIds, variables, variableCollections);

    expect(map).toBeDefined();
    expect(map).toEqual({
      "#FFFFFFFF": [
        {
          name: "sema/color/background/default",
          description: "",
          variableId: "VariableID:265:2997",
          variableKey: "b5210392296e696d0a8bb2f92aea2b1c3f4bfdb6",
          variableCollectionId: "VariableCollectionId:265:2989",
          variableCollectionKey: "4946b0f5dc6bdc872b0bc1ad0ad5e7f0a348e0ad",
          variableCollectionName: "Colors",
          variableCollectionDefaultModeId: "265:0",
          modeId: "265:0",
          modeName: "Light",
          scopes: ["FRAME_FILL", "SHAPE_FILL"],
        },
      ],
      "#000000FF": [
        {
          name: "sema/color/background/default",
          description: "",
          variableId: "VariableID:265:2997",
          variableKey: "b5210392296e696d0a8bb2f92aea2b1c3f4bfdb6",
          variableCollectionId: "VariableCollectionId:265:2989",
          variableCollectionKey: "4946b0f5dc6bdc872b0bc1ad0ad5e7f0a348e0ad",
          variableCollectionName: "Colors",
          variableCollectionDefaultModeId: "265:0",
          modeId: "265:1",
          modeName: "Dark",
          scopes: ["FRAME_FILL", "SHAPE_FILL"],
        },
      ],
    });
  });

  test("Creates a map of rounding values to variables", () => {
    const roundingVariableIds = getCollectionVariables(["VariableCollectionId:701:7994"], variableCollections);
    const map = createRoundingToVariableMap(roundingVariableIds, variables, variableCollections);

    expect(map).toBeDefined();
    expect(map).toEqual({
      "4": [
        {
          name: "sema/rounding/100",
          description: "",
          variableId: "VariableID:701:7996",
          variableKey: "96b13ef45e11ceadb81ba0281b9e876c2b14d3dd",
          variableCollectionId: "VariableCollectionId:701:7994",
          variableCollectionKey: "454579e84c4e3d565bcc0262f5a81e28942222c8",
          variableCollectionName: "Rounding",
          variableCollectionDefaultModeId: "7410:2",
          modeId: "7410:2",
          modeName: "Default",
          scopes: ["CORNER_RADIUS"],
        },
      ],
    });
  });

  test("Creates a map of spacing values to variables", () => {
    const spacingVariableIds = getCollectionVariables(["VariableCollectionId:733:939"], variableCollections);
    const map = createSpacingToVariableMap(spacingVariableIds, variables, variableCollections);

    expect(map).toBeDefined();
    expect(map).toEqual({
      "1": [
        {
          name: "sema/space/25",
          description: "",
          variableId: "VariableID:7410:308",
          variableKey: "514b51e50626e605fc9d07668d22492e53c671dd",
          variableCollectionId: "VariableCollectionId:733:939",
          variableCollectionKey: "4e5f6934a1d3c0f5a8c815351342ff630b0bc069",
          variableCollectionName: "Spacing",
          variableCollectionDefaultModeId: "7410:3",
          modeId: "7410:3",
          modeName: "Default",
          scopes: ["WIDTH_HEIGHT", "GAP"],
        },
      ],
    });
  });
});
