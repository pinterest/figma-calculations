
**Disclaimer:**
> APIs are subject to change as we continue to make progress. The source code will eventually be open-sourced.

## Figma Calculations

Figma calculations is a library that takes in a Figma file and returns a few actionable statistics to drive adoption and consistent usage of your design system.

You can use this library from either the cloud or a local Figma plugin.

If you don't want to write your own code, try it out in this [playground](https://replit.com/@RaviLingineni/figma-adoption#index.ts)

### Features

- Get percent of partial and full Text, Color style matches
- Get percent of Style Library Adoption in a file
- Calculate Team Level Breakdown of Adoption

### Usage

```js
import { FigmaCalculator } from "figma-calculator";

const figmaCalculator = new FigmaCalculator();

// used to fetch styles and components
figmaCalculator.setAPIToken("FIGMA API TOKEN");

const doWork = async () => {
  const files = await figmaCalculator.getFilesForTeams([
    "TEAM_ID_1",
    "TEAM_ID_2",
  ]);

  const allFileNodes = [];
  for (const file of files) {
    // optional: if not in figma plugin environment, load a file with this
    await figmaCalculator.fetchCloudDocument("MY_FILE_ID");

    // load up any style libraries
    await figmaCalculator.loadComponents("TEAM ID");
    await figmaCalculator.loadStyles("TEAM ID");

    const pageDetails = {
      teamName: file.teamName,
      projectName: file.projectName,
      pageName: '',
      documentName: '',
      processedNodes: [],
    };

    // run through all of the pages and process them
    for (const page of figmaCalculator.getAllPages()) {
      // recursively run through and process the notes
      const processedNodes = figmaCalculator.processTree(page);

      // log out the text linting results and suggestions
      if (check.checkName === "Text-Style" && check.matchLevel === "Partial") {
        console.log(check.suggestions);
      }

      pageDetails.pageName = file.pageName;
      pageDetails.documentName = file.docuemntName;
      pageDetails.processedNodes = processedNodes;
    }
  } 
    
  const allProcessedNodes = allFileNodes.map(
    (details) => details.processedNodes
  );

  // some aggregate calculations
  const totalAdoption = figmaCalculator.getAdoptionPercent(allProcessedNodes);
  const textStylePercents =
    figmaCalculator.getTextStylePercentaget(allProcessedNodes);
    
    
  const teamBreakdown = figmaCalculator.calculateTeamPercents(allFileNodes);
};
```

### How we calculate adoption

Read our  blog post (to-be-published) on how we calculate design adoption.
