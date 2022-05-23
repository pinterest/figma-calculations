## Figma Calculations

Figma calculations is a library that takes in a Figma file and returns a few actionable statistics to drive adoption and consistent usage of your design system.

You can use this library from either the cloud or a local Figma plugin.

If you don't want to write your own code, try it out in this [playground](Test)

### Features

- Get percent of partial and full Text, Color style matches
- Get percent of Library Adoption in a file
- Calculate Team Level Breakdown of Adoption

### Usage

```js
import { FigmaCalculator } from "figma-calculator";

const figmaCalculator = new FigmaCalculator();

// used to fetch styles and components
figmaCalculator.setAPIToken("FIGMA API TOKEN");

const doWork = async () => {
  // optional: if not in figma plugin environment, load a file with this
  await figmaCalculator.fetchCloudDocument("MY_FILE_ID");

  // load up any style libraries
  await figmaCalculator.loadComponents("TEAM ID");
  await figmaCalculator.loadStyles("TEAM ID");

  const allProcessedNodes = [];
  // run through all of the pages and process them
  for (const page of figmaCalculator.getAllPages()) {
    const processedNodes = figmaCalculator.processTree(page);

    // example: show the text linting results and suggestions
    if (check.checkName === "Text-Style" && check.matchLevel === "Partial") {
      console.log(check.suggestions);
    }

    allProcessedNodes.push(processedNodes);
  }

  // some aggregate calculations
  const totalAdoption = figmaCalculator.getAdoptionPercent(allProcessedNodes);
  const textStylePercents =
    figmaCalculator.getTextStylePercentaget(allProcessedNodes);

  // team level calculations
  const teams = [
    {
      teamName: "SDSD",
      pageName: "ABC",
      documentName: "Document 1",
      processedNodes: processedNodes,
    },
  ];

  const teamBreakdown = figmaCalculator.calculateTeamPercents(teams);
};
```

### How we calculate adoption

Read our [blog post](#) on how we calculate design adoption at Pinterest.
