import { FigmaLocalVariableCollections, FigmaLocalVariables } from "../models/figma";
import variablesImported from "../../tests/__mocks__/variables.mock.json";
import variableCollectionsImported from "../../tests/__mocks__/variableCollections.mock.json";
import { createRoundingToVariableMap, getCollectionVariables } from "../utils/variables";
import checkRoundingVariableMatch from "./roundingVariable";

const variables = variablesImported as FigmaLocalVariables;
const variableCollections = variableCollectionsImported as FigmaLocalVariableCollections;

const SemanticRoundingVariableCollectionId = "VariableCollectionId:701:7994";
const roundingVariableIds = getCollectionVariables([SemanticRoundingVariableCollectionId], variableCollections);
const map = createRoundingToVariableMap(roundingVariableIds, variables, variableCollections);

const SemanticRoundingVariableCollection = variableCollections[SemanticRoundingVariableCollectionId];
const SemaRounding100 = variables["VariableID:701:7996"];
const SemaRounding200 = variables["VariableID:701:8001"];
const BoundSemaRounding = {
  100: {
    type: "VARIABLE_ALIAS",
    id: "VariableID:96b13ef45e11ceadb81ba0281b9e876c2b14d3dd/7506:70",
  },
};

const testNodes: any[] = [
  {
    id: "0:100",
    type: "RECTANGLE",
    name: "Test Rectangle",
  },
  {
    id: "0:101",
    type: "LINE",
    name: "A LINE layer, which doesn't have rounding",
  },
  // PLUGIN format
  {
    id: "0:102",
    type: "RECTANGLE",
    name: "A RECTANGLE layer with an single-value exact variable match",
    cornerRadius: 4,
    boundVariables: {
      topLeftRadius: BoundSemaRounding[100],
      topRightRadius: BoundSemaRounding[100],
      bottomLeftRadius: BoundSemaRounding[100],
      bottomRightRadius: BoundSemaRounding[100],
    },
    topLeftRadius: 4,
    topRightRadius: 4,
    bottomLeftRadius: 4,
    bottomRightRadius: 4,
  },
  {
    id: "0:103",
    type: "RECTANGLE",
    name: "A RECTANGLE layer with an single-value available variable match",
    cornerRadius: 4,
    boundVariables: {},
    topLeftRadius: 4,
    topRightRadius: 4,
    bottomLeftRadius: 4,
    bottomRightRadius: 4,
  },
  {
    id: "0:104",
    type: "RECTANGLE",
    name: "A PLUGIN RECTANGLE layer with mixed values, matching available rounding variables",
    cornerRadius: Symbol("mixed"), // figma.mixed
    boundVariables: {},
    topLeftRadius: 4,
    topRightRadius: 4,
    bottomLeftRadius: 8,
    bottomRightRadius: 8,
  },
  {
    id: "0:105",
    type: "RECTANGLE",
    name: "A PLUGIN RECTANGLE layer with mixed values, some already bound",
    cornerRadius: Symbol("mixed"), // figma.mixed
    boundVariables: {
      topLeftRadius: BoundSemaRounding[100],
      topRightRadius: BoundSemaRounding[100],
    },
    topLeftRadius: 4,
    topRightRadius: 4,
    bottomLeftRadius: 8,
    bottomRightRadius: 8,
  },
  {
    id: "0:106",
    type: "RECTANGLE",
    name: "A PLUGIN RECTANGLE with no mappable values",
    cornerRadius: Symbol("mixed"), // figma.mixed
    boundVariables: {},
    topLeftRadius: 5,
    topRightRadius: 7,
    bottomLeftRadius: 9,
    bottomRightRadius: 11,
  },
  // CLOUD format
  {
    id: "0:107",
    type: "RECTANGLE",
    name: "A CLOUD RECTANGLE layer with an single-value exact variable match",
    cornerRadius: 4,
    boundVariables: {
      topLeftRadius: BoundSemaRounding[100],
      topRightRadius: BoundSemaRounding[100],
      bottomLeftRadius: BoundSemaRounding[100],
      bottomRightRadius: BoundSemaRounding[100],
    },
    rectangleCornerRadii: [4, 4, 4, 4],
  },
  {
    id: "0:108",
    type: "RECTANGLE",
    name: "A CLOUD RECTANGLE layer with an single-value available variable match",
    cornerRadius: 4,
    boundVariables: {},
    rectangleCornerRadii: [4, 4, 4, 4],
  },
  {
    id: "0:109",
    type: "RECTANGLE",
    name: "A CLOUD RECTANGLE layer with different values, matching available rounding variables",
    boundVariables: {},
    rectangleCornerRadii: [4, 4, 8, 8],
  },
  {
    id: "0:110",
    type: "RECTANGLE",
    name: "A CLOUD RECTANGLE layer with mixed values, some already bound",
    boundVariables: {
      topLeftRadius: BoundSemaRounding[100],
      topRightRadius: BoundSemaRounding[100],
    },
    rectangleCornerRadii: [4, 4, 8, 8],
  },
  {
    id: "0:111",
    type: "RECTANGLE",
    name: "A CLOUD RECTANGLE layer with mixed values, some already bound, some not mappable",
    boundVariables: {
      topLeftRadius: BoundSemaRounding[100],
      topRightRadius:BoundSemaRounding[100],
    },
    rectangleCornerRadii: [4, 4, 8, 13],
  },
  {
    id: "0:112",
    type: "RECTANGLE",
    name: "A CLOUD RECTANGLE layer with no matching values",
    rectangleCornerRadii: [5, 7, 9, 11],
  },
];

// Results
const resultsTypes = {
  skip: { checkName: "Rounding-Variable", matchLevel: "Skip", suggestions: [] },
  none: { checkName: "Rounding-Variable", matchLevel: "None", suggestions: [] },
};

const variableSuggestions = {
  sema_rounding_100: {
    description: "",
    message: "Possible Gestalt Rounding-Variable match with name: sema/rounding/100",
    modeId: "7410:2",
    modeName: "Default",
    name: SemaRounding100.name,
    scopes: SemaRounding100.scopes,
    type: "Variable",
    variableCollectionId: SemanticRoundingVariableCollection.id,
    variableCollectionKey: SemanticRoundingVariableCollection.key,
    variableCollectionName: SemanticRoundingVariableCollection.name,
    variableId: SemaRounding100.id,
    variableKey: SemaRounding100.key,
  },
  sema_rounding_200: {
    description: "",
    message: "Possible Gestalt Rounding-Variable match with name: sema/rounding/200",
    modeId: "7410:2",
    modeName: "Default",
    name: SemaRounding200.name,
    scopes: SemaRounding200.scopes,
    type: "Variable",
    variableCollectionId: SemanticRoundingVariableCollection.id,
    variableCollectionKey: SemanticRoundingVariableCollection.key,
    variableCollectionName: SemanticRoundingVariableCollection.name,
    variableId: SemaRounding200.id,
    variableKey: SemaRounding200.key,
  },
};

describe("checkRoundingVariableMatch", () => {
  test("Skips check when no roundingToVariableMap passed", () => {
    // Pick any node
    const testNode = testNodes.find((n) => n.id === "0:100");

    const results = checkRoundingVariableMatch(variables, testNode, {});

    expect(results).toStrictEqual(resultsTypes.skip);
  });

  test("Skips check when node is not of correct type", () => {
    const testNode = testNodes.find((n) => n.id === "0:101");

    const results = checkRoundingVariableMatch(variables, testNode, {});

    expect(results).toStrictEqual(resultsTypes.skip);
  });

  test("[PLUGIN] Returns an EXACT match for single value", () => {
    const testNode = testNodes.find((n) => n.id === "0:102");

    const results = checkRoundingVariableMatch(variables, testNode, {
      roundingToVariableMap: map,
    });

    expect(results.checkName).toBe("Rounding-Variable");
    expect(results.matchLevel).toBe("Full");
    expect(results.exactMatch?.key).toBe("96b13ef45e11ceadb81ba0281b9e876c2b14d3dd");
  });

  test("[PLUGIN] Returns an PARTIAL match for a single available value", () => {
    const testNode = testNodes.find((n) => n.id === "0:103");

    const results = checkRoundingVariableMatch(variables, testNode, {
      roundingToVariableMap: map,
    });

    expect(results.checkName).toBe("Rounding-Variable");
    expect(results.matchLevel).toBe("Partial");
    expect(results.suggestions).toStrictEqual([
      {
        corner: "all",
        cornerValue: 4,
        ...variableSuggestions.sema_rounding_100,
      },
    ]);
  });

  test("[PLUGIN] Returns multiple variable matches with mixed values", () => {
    const testNode = testNodes.find((n) => n.id === "0:104");

    const results = checkRoundingVariableMatch(variables, testNode, {
      roundingToVariableMap: map,
    });

    expect(results.checkName).toBe("Rounding-Variable");
    expect(results.matchLevel).toBe("Partial");
    expect(results.suggestions).toStrictEqual([
      {
        corner: "topLeftRadius",
        cornerValue: 4,
        ...variableSuggestions.sema_rounding_100,
      },
      {
        corner: "topRightRadius",
        cornerValue: 4,
        ...variableSuggestions.sema_rounding_100,
      },
      {
        corner: "bottomRightRadius",
        cornerValue: 8,
        ...variableSuggestions.sema_rounding_200,
      },
      {
        corner: "bottomLeftRadius",
        cornerValue: 8,
        ...variableSuggestions.sema_rounding_200,
      },
    ]);
  });

  test("[PLUGIN] Returns NONE match with mixed values, some already bound", () => {
    const testNode = testNodes.find((n) => n.id === "0:105");

    const results = checkRoundingVariableMatch(variables, testNode, {
      roundingToVariableMap: map,
    });

    expect(results.checkName).toBe("Rounding-Variable");
    expect(results.matchLevel).toBe("Partial");
    expect(results.suggestions).toStrictEqual([
      {
        corner: "bottomRightRadius",
        cornerValue: 8,
        ...variableSuggestions.sema_rounding_200,
      },
      {
        corner: "bottomLeftRadius",
        cornerValue: 8,
        ...variableSuggestions.sema_rounding_200,
      },
    ]);
  });

  test("[PLUGIN] Returns NONE when no variables are mappable", () => {
    const testNode = testNodes.find((n) => n.id === "0:106");

    const results = checkRoundingVariableMatch(variables, testNode, {
      roundingToVariableMap: map,
    });

    expect(results).toStrictEqual(resultsTypes.none);
  });

  test("[CLOUD] Returns an EXACT match for single value", () => {
    const testNode = testNodes.find((n) => n.id === "0:107");

    const results = checkRoundingVariableMatch(variables, testNode, {
      roundingToVariableMap: map,
    });

    expect(results.checkName).toBe("Rounding-Variable");
    expect(results.matchLevel).toBe("Full");
    expect(results.exactMatch?.key).toBe("96b13ef45e11ceadb81ba0281b9e876c2b14d3dd");
  });

  test("[CLOUD] Returns an PARTIAL match for a single available value", () => {
    const testNode = testNodes.find((n) => n.id === "0:108");

    const results = checkRoundingVariableMatch(variables, testNode, {
      roundingToVariableMap: map,
    });

    expect(results.checkName).toBe("Rounding-Variable");
    expect(results.matchLevel).toBe("Partial");
    expect(results.suggestions).toStrictEqual([
      {
        corner: "all",
        cornerValue: 4,
        ...variableSuggestions.sema_rounding_100,
      },
    ]);
  });

  test("[CLOUD] Returns Partial matches with mixed values", () => {
    const testNode = testNodes.find((n) => n.id === "0:109");

    const results = checkRoundingVariableMatch(variables, testNode, {
      roundingToVariableMap: map,
    });

    expect(results.checkName).toBe("Rounding-Variable");
    expect(results.matchLevel).toBe("Partial");
    expect(results.suggestions).toStrictEqual([
      {
        corner: "topLeftRadius",
        cornerValue: 4,
        ...variableSuggestions.sema_rounding_100,
      },
      {
        corner: "topRightRadius",
        cornerValue: 4,
        ...variableSuggestions.sema_rounding_100,
      },
      {
        corner: "bottomRightRadius",
        cornerValue: 8,
        ...variableSuggestions.sema_rounding_200,
      },
      {
        corner: "bottomLeftRadius",
        cornerValue: 8,
        ...variableSuggestions.sema_rounding_200,
      },
    ]);
  });

  test("[CLOUD] Returns Partial matches with mixed values, some already bound", () => {
    const testNode = testNodes.find((n) => n.id === "0:110");

    const results = checkRoundingVariableMatch(variables, testNode, {
      roundingToVariableMap: map,
    });

    expect(results.checkName).toBe("Rounding-Variable");
    expect(results.matchLevel).toBe("Partial");
    expect(results.suggestions).toStrictEqual([
      {
        corner: "bottomRightRadius",
        cornerValue: 8,
        ...variableSuggestions.sema_rounding_200,
      },
      {
        corner: "bottomLeftRadius",
        cornerValue: 8,
        ...variableSuggestions.sema_rounding_200,
      },
    ]);
  });

  test("[CLOUD] Returns Partial matches with mixed values, some already bound, some not mappable", () => {
    const testNode = testNodes.find((n) => n.id === "0:111");

    const results = checkRoundingVariableMatch(variables, testNode, {
      roundingToVariableMap: map,
    });

    expect(results.checkName).toBe("Rounding-Variable");
    expect(results.matchLevel).toBe("Partial");
    expect(results.suggestions).toStrictEqual([
      {
        corner: "bottomRightRadius",
        cornerValue: 8,
        ...variableSuggestions.sema_rounding_200,
      },
    ]);
  });

  test("[CLOUD] Returns NONE when no variables are mappable", () => {
    const testNode = testNodes.find((n) => n.id === "0:112");

    const results = checkRoundingVariableMatch(variables, testNode, {
      roundingToVariableMap: map,
    });

    expect(results).toStrictEqual(resultsTypes.none);
  });
});
