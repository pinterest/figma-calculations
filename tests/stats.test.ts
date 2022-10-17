import { FigmaCalculator, FigmaTeamStyle } from "../src";
import { AggregateCounts } from "../src/models/stats";
import fs from "fs";
import { FIGMA_TOKEN } from "../src/examples/token";
import {
  generateStyleBucket,
  generateStyleLookup,
  getStyleLookupDefinitions,
  getStyleLookupKey,
} from "../src/rules";

jest.setTimeout(300000);

const HexStyleMap = {
  "#FFFFFF": {
    text: "24671a3f7ba8e6a760861f9501b53fa3e1b18c40", // Text & Icons/Dark-mode/Default - Mochimalist-white-0'
    fill: "9ce3e95c3065d6bd3b2086553d4e94e5e29cf82e", // Baseline/Light-mode/UI Background - Mochimalist-white-0
  },
  "#000000": {
    text: "869796997aa6adc4336df44e903c5ce8787cbbf3", // Text & Icons/Light-mode/Default - Cosmicore-gray-900
    fill: "774cae09471c39640f80ed5b59f2804859709ad9", // Baseline/Dark-mode/UI Background - Cosmicore-gray-900
  },
};

const TEST_FILE = "XZe09gY6eNSg4rZHkN8RP2"; // "xSpy5UYEhvte0j3i7E2Hnd" ;
const TEAM_ID = "626524232805730321";
const TEAM_IDS = [
  "1040347261379002788",
  "969820474577737549",
  "888190986662740847",
  "758073086094656143",
  "626524232805730321",
  "784245363616834937",
  "763841153159625143",
  "763841187386191288",
  "763841216024165817",
  "708383139233476090",
  "851831158188134404",
];

const TOTAL_PAGES = 12;
let figmaCalculator: FigmaCalculator;

let styles: FigmaTeamStyle[] = [];
describe("Do Test File Cases Pass?", () => {
  beforeAll(async () => {
    figmaCalculator = new FigmaCalculator();
    figmaCalculator.setAPIToken(FIGMA_TOKEN);
    const file = await figmaCalculator.fetchCloudDocument(TEST_FILE);
    const components = await figmaCalculator.loadComponents(TEAM_ID);
    styles = await figmaCalculator.loadStyles(TEAM_ID);

    fs.writeFileSync("../comps.json", JSON.stringify(components));
  });

  it("less than a 1000 files a week", async () => {
    const { files } = await figmaCalculator.getFilesForTeams(TEAM_IDS, 2);
    expect(files.length).toBeLessThan(1000);
  });

  it("loads the document", async () => {
    const pages = figmaCalculator.getAllPages();

    expect(pages.length).toBe(TOTAL_PAGES);
  });

  it("Pass iOS and Web Handoff 100%", () => {
    const frameResults: { [pageName: string]: AggregateCounts[] } = {};
    for (const page of figmaCalculator.getAllPages()) {
      const frameNodes = FigmaCalculator.FindChildren(
        page,
        (node) => node.type === "FRAME"
      );

      frameResults[page.name] = [];

      for (const node of frameNodes) {
        const processedNodes = figmaCalculator.processTree(node, {
          onProcessNode: (node) => {
            /*
              Debug function to see output of runs
              if (page.name === "iOS Handoff 100%") {
                console.log(node);
              }
            */
          },
        });

        frameResults[page.name].push(processedNodes.aggregateCounts);
      }
    }

    expect(
      figmaCalculator.getAdoptionPercent(frameResults["Web Handoff 100%"], {
        includeMatchingText: true,
      })
    ).toBe(100);

    expect(
      figmaCalculator.getAdoptionPercent(frameResults["iOS Handoff 100%"], {
        includeMatchingText: true,
      })
    ).toBe(100);
  });

  it("Pass Hidden File Test to be 100%", () => {
    const frameResults: { [pageName: string]: AggregateCounts[] } = {};
    for (const page of figmaCalculator.getAllPages()) {
      const frameNodes = FigmaCalculator.FindChildren(
        page,
        (node) => node.type === "FRAME"
      );

      frameResults[page.name] = [];

      for (const node of frameNodes) {
        const processedNodes = figmaCalculator.processTree(node);
        frameResults[page.name].push(processedNodes.aggregateCounts);
      }
    }

    expect(
      figmaCalculator.getAdoptionPercent(
        frameResults["Hidden Layer Handoff 100%"],
        {
          includeMatchingText: true,
        }
      )
    ).toBe(100);
  });

  it("Pass iOS and Text Lint 100%", () => {
    const frameResults: { [pageName: string]: AggregateCounts[] } = {};
    for (const page of figmaCalculator.getAllPages()) {
      const frameNodes = FigmaCalculator.FindChildren(
        page,
        (node) => node.type === "FRAME"
      );

      frameResults[page.name] = [];

      for (const node of frameNodes) {
        const processedNodes = figmaCalculator.processTree(node);
        frameResults[page.name].push(processedNodes.aggregateCounts);
      }
    }

    expect(
      figmaCalculator.getTextStylePercentage(frameResults["Web Handoff 100%"])
        .full
    ).toBe(100);

    expect(
      figmaCalculator.getTextStylePercentage(frameResults["iOS Handoff 100%"])
        .full
    ).toBe(100);
  });

  it("Provides 3 Lint Fixes", () => {
    const frameResults: { [pageName: string]: AggregateCounts[] } = {};
    const styleLookupMap = generateStyleLookup(generateStyleBucket(styles));
    for (const page of figmaCalculator.getAllPages()) {
      if (page.name === "Partial Text Test") {
        FigmaCalculator.FindAll(page, (node) => {
          if (node.type === "TEXT") {
            const results = figmaCalculator.getLintResults(node, {
              styleLookupMap,
            });
            if (node.name.includes("Android")) {
              for (const result of results) {
                if (result.checkName === "Text-Style") {
                  expect(result.suggestions.length).toBe(1);
                }
              }
            }
            if (node.name.includes("iOS")) {
              for (const result of results) {
                if (result.checkName === "Text-Style") {
                  // iOS Returns 2 beacuse we can't distinguish between Web or iOS style from Figma, so take both
                  expect(result.suggestions.length).toBe(3);
                }
              }
            }
            if (node.name.includes("Web")) {
              for (const result of results) {
                if (result.checkName === "Text-Style") {
                  expect(result.suggestions.length).toBe(2);
                }
              }
            }
          }

          return false;
        });
      }
    }
  });

  it("Provides 3 Partial Matches with Hex Style Map", () => {
    let partialFixes = 0;
    const styleLookupMap = generateStyleLookup(generateStyleBucket(styles));

    for (const page of figmaCalculator.getAllPages()) {
      if (page.name === "Partial Fill Style Test") {
        FigmaCalculator.FindAll(page, (node) => {
          const results = figmaCalculator.getLintResults(node, {
            hexStyleMap: HexStyleMap,
            styleLookupMap,
          });

          for (const result of results) {
            if (
              result.checkName === "Fill-Style" &&
              result.matchLevel === "Partial"
            ) {
              partialFixes += 1;
            }
          }
          return false;
        });
      }
    }
    expect(partialFixes).toBe(3);
  });
});
