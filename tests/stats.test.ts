import { FigmaCalculator } from "../src";
import { ProcessedNodeTree } from "../src/models/stats";

import { FIGMA_TOKEN } from "./token";

jest.setTimeout(300000);

// download the file

// download the components

// run the test cases
// check if expected percent is the same

// check if number of processed nodes is what we expect them to be

const TEST_FILE = "XZe09gY6eNSg4rZHkN8RP2";
const TEAM_ID = "626524232805730321";

const FakeFileData = {
  key: TEST_FILE,
  name: "Handoff TEST",
  thumbnail_url: "blah",
  last_modified: "blah",
};

const TOTAL_PAGES = 9;
let figmaCalculator: FigmaCalculator;

describe("Do Test File Cases Pass?", () => {
  beforeAll(async () => {
    figmaCalculator = new FigmaCalculator();
    figmaCalculator.setAPIToken(FIGMA_TOKEN);
    await figmaCalculator.fetchCloudDocument(TEST_FILE);
  });

  it("loads the document", async () => {
    const pages = figmaCalculator.getAllPages();
    expect(pages.length).toBe(TOTAL_PAGES);
  });

  it("Pass iOS and Web 100%", async () => {
    // only needed in a non-figma environment

    await figmaCalculator.loadComponents(TEAM_ID);
    await figmaCalculator.loadStyles(TEAM_ID);

    const frameResults: { [pageName: string]: ProcessedNodeTree[] } = {};
    for (const page of figmaCalculator.getAllPages()) {
      const frameNodes = FigmaCalculator.FindChildren(
        page,
        (node) => node.type === "FRAME"
      );

      frameResults[page.name] = [];

      for (const node of frameNodes) {
        const processedNodes = figmaCalculator.processTree(node);

        frameResults[page.name].push(processedNodes);
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

  it("Pass iOS and Web Handoff Text 100%", () => {
    const frameResults: { [pageName: string]: ProcessedNodeTree[] } = {};
    for (const page of figmaCalculator.getAllPages()) {
      const frameNodes = FigmaCalculator.FindChildren(
        page,
        (node) => node.type === "FRAME"
      );

      frameResults[page.name] = [];

      for (const node of frameNodes) {
        const processedNodes = figmaCalculator.processTree(node);

        frameResults[page.name].push(processedNodes);
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
    const frameResults: { [pageName: string]: ProcessedNodeTree[] } = {};
    for (const page of figmaCalculator.getAllPages()) {
      const frameNodes = FigmaCalculator.FindChildren(
        page,
        (node) => node.type === "FRAME"
      );

      frameResults[page.name] = [];

      for (const node of frameNodes) {
        const processedNodes = figmaCalculator.processTree(node);

        frameResults[page.name].push(processedNodes);
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
    const frameResults: { [pageName: string]: ProcessedNodeTree[] } = {};
    for (const page of figmaCalculator.getAllPages()) {
      const frameNodes = FigmaCalculator.FindChildren(
        page,
        (node) => node.type === "FRAME"
      );

      frameResults[page.name] = [];

      for (const node of frameNodes) {
        const processedNodes = figmaCalculator.processTree(node);

        frameResults[page.name].push(processedNodes);
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
});
