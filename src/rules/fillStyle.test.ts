import checkFillStyleMatch from './fillStyle';
import { generateStyleBucket, generateStyleLookup } from "../rules";
import { FigmaTeamStyle, StyleBucket, StyleLookupMap } from '../models/figma';
import { HexStyleMap } from "@tests/__mocks__/hexStyles.mock";
import { FIGMA_STYLES } from "@tests/__mocks__/figmaStyles.mock";

let styleBucket: StyleBucket;
let styleLookupMap: StyleLookupMap;

beforeAll(() => {
  // The fillStyle and strokeStyle tests expects getStyleLookupKey() to detect it is
  // in the Figma PluginAPI context by checking that the typeof figma is not undefined.
  // So we'll mock that in global space so it sees something.
  //
  // @ts-ignore: Mocking a global
  global.figma = {
    apiVersion: '1.0.0'
  };

  styleBucket = generateStyleBucket(
    FIGMA_STYLES as unknown as FigmaTeamStyle[]
  );

  styleLookupMap = generateStyleLookup(styleBucket);
});

afterAll(() => {
  // @ts-ignore: UnMocking a global
  delete global.figma;
});

const testNodes: any[] = [
  // Non-matching fills
  {
    id: "0:100",
    type: 'RECTANGLE',
    name: "Test Rectangle w/ non-matching fills",
    visible: true,
    opacity: 1, // Opacity of the _layer_. Should NOT be used to match for linting
    fills: [
      {
        "type": "SOLID",
        "visible": true,
        "opacity": 0.5,
        "blendMode": "NORMAL",
        "color": {
          "r": 0.8509804010391235,
          "g": 0.8509804010391235,
          "b": 0.8509804010391235
        }
      },
      // We only match against first fills/strokes, so this should be ignored
      {
        "type": "SOLID",
        "visible": true,
        "opacity": 1,
        "blendMode": "NORMAL",
        "color": {
          "r": 0,
          "g": 0,
          "b": 0
        }
      }
    ],
    strokes: []
  },

  {
    id: "0:101",
    type: 'RECTANGLE',
    name: "Test Rectangle: Black fill w/ 100% opacity",
    visible: true,
    opacity: 1, // Opacity of the _layer_. Should NOT be used to match for linting
    fills: [
      {
        "type": "SOLID",
        "visible": true,
        "opacity": 1,
        "blendMode": "NORMAL",
        "color": {
          "r": 0,
          "g": 0,
          "b": 0
        }
      }
    ]
  },

  {
    id: "0:102",
    type: 'RECTANGLE',
    name: "Test Rectangle: Black fill w/ 0% opacity",
    visible: true,
    opacity: 1, // Opacity of the _layer_. Should NOT be used to match for linting
    fills: [
      {
        "type": "SOLID",
        "visible": true,
        "opacity": 0,
        "blendMode": "NORMAL",
        "color": {
          "r": 0,
          "g": 0,
          "b": 0
        }
      }
    ]
  },

  {
    id: "0:103",
    type: 'RECTANGLE',
    name: "Test Rectangle: Pinterest Brand Red background fill",
    visible: true,
    opacity: 1, // Opacity of the _layer_. Should NOT be used to match for linting
    fills: [
      {
        "type": "SOLID",
        "visible": true,
        "opacity": 1,
        "blendMode": "NORMAL",
        "color": {
          "r": 0.9019607901573181,
          "g": 0,
          "b": 0.13725490868091583
        }
      }
    ]
  },
];

const resultsTypes = {
  "noFillMatches": { checkName: 'Fill-Style', matchLevel: 'None', suggestions: [] },
  "hexStyleBlackMatch": {
    "checkName": "Fill-Style",
    "matchLevel": "Partial",
    "suggestions": [
      {
        "message": "Color Override Exists in Library for hex #000000",
        "styleKey": "774cae09471c39640f80ed5b59f2804859709ad9",
      },
    ],
  },
  "styleBrandColorkMatch": {
    "checkName": "Fill-Style",
    "matchLevel": "Partial",
    "suggestions": [
      {
        "message": "Possible Gestalt Fill-Style match with name: Icon/Light-mode/$color-text-icon-brand-primary",
        "styleKey": "3204b5a3bbe854cf4787cc2d8a4077a2074e6122",
      },
    ],
  }
};

describe('fillStyle rules', () => {
  test('Finds no matches for a non-matching node', () => {
    const testNode = testNodes.find(n => n.name === "Test Rectangle w/ non-matching fills");

    const results = checkFillStyleMatch(
      styleBucket,
      testNode,
      {
        hexStyleMap: HexStyleMap,
        styleLookupMap
      });

    expect(results).toStrictEqual(resultsTypes.noFillMatches);
  });

  test('Finds hex style match for #000000 w/ 100% opacity', () => {
    const testNode = testNodes.find(n => n.name === "Test Rectangle: Black fill w/ 100% opacity");

    const results = checkFillStyleMatch(
      styleBucket,
      testNode,
      {
        hexStyleMap: HexStyleMap,
        styleLookupMap
      });

    expect(results).toStrictEqual(resultsTypes.hexStyleBlackMatch);
  });

  // GESTALT-6915: Plugin linting incorrectly replaces 0% opacity fills with 100% opacity styles
  test('[GESTALT-6915] Does not match hex style #000000 when layer has 0% opacity', () => {
    const testNode = testNodes.find(n => n.name === "Test Rectangle: Black fill w/ 0% opacity");

    const results = checkFillStyleMatch(
      styleBucket,
      testNode,
      {
        hexStyleMap: HexStyleMap,
        styleLookupMap
      });

    expect(results).toStrictEqual(resultsTypes.noFillMatches);
  });

  test('Matches node w/ Pinterest Brand color to correct style', () => {
    const testNode = testNodes.find(n => n.name === "Test Rectangle: Pinterest Brand Red background fill");

    const results = checkFillStyleMatch(
      styleBucket,
      testNode,
      {
        hexStyleMap: HexStyleMap,
        styleLookupMap
      });

    expect(results).toStrictEqual(resultsTypes.styleBrandColorkMatch);
  });
});
