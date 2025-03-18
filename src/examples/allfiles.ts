import * as dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import { FigmaCalculator } from "../index";

import { ProcessedPage } from "../models/stats";

const figmaCalculator = new FigmaCalculator();

const STYLE_TEAM_ID = process.env.FIGMA_STYLE_TEAM_ID || "";
const TEAM_IDS = process.env.FIGMA_TEAM_IDS?.split(",").filter(Boolean) || [];

const FIGMA_TOKEN = process.env.FIGMA_API_TOKEN || "";

// Flag to control whether to only process ready-for-dev sections
const onlyTrackReadyForDev = true;

// used to fetch styles and components
figmaCalculator.setAPIToken(FIGMA_TOKEN);

const doWork = async () => {
  // optional: if not in figma plugin environment, load a file with this
  const { files } = await figmaCalculator.getFilesForTeams(TEAM_IDS, 2, false);

  console.log("Total File Count:", files.length);

  // load up any style libraries
  const comps = await figmaCalculator.loadComponents(STYLE_TEAM_ID);
  const styles = await figmaCalculator.loadStyles(STYLE_TEAM_ID);

  const compsj = JSON.stringify(comps, null, 2);
  const stylesj = JSON.stringify(styles, null, 2);
  fs.writeFileSync("./comps.json", compsj);
  fs.writeFileSync("./styles.json", stylesj);

  const allPages: ProcessedPage[] = [];
  let totalReadyForDevSections = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    let fileReadyForDevSections = 0;

    try {
      await figmaCalculator.fetchCloudDocument(file.key);
    } catch (ex) {
      console.log(`Failed to fetch ${file.key}`);
      continue;
    }

    console.log(`Processing file ${i + 1} of ${files.length}`);

    // run through all of the pages and process them
    if (onlyTrackReadyForDev) {
      for (const page of figmaCalculator.getAllPages()) {
        const readyForDevNodes = page.children?.filter((node: BaseNode) =>
          (node as any).devStatus?.type === 'READY_FOR_DEV'
        ) || [];

        fileReadyForDevSections += readyForDevNodes.length;

        if (readyForDevNodes.length > 0) {
          console.log(`Found ${readyForDevNodes.length} ready for dev nodes in page "${page.name}"`);
        }

        for (const node of readyForDevNodes) {
          console.log('Ready for dev node:', {
            type: node.type,
            name: node.name,
            id: node.id,
            devStatus: (node as any).devStatus,
            description: (node as any).devStatus?.description
          });
          const processedNodes = figmaCalculator.processTree(node);
          const pageDetails: ProcessedPage = {
            file,
            pageAggregates: processedNodes.aggregateCounts,
            pageName: page.name,
          };
          allPages.push(pageDetails);
        }
      }
    } else {
      for (const page of figmaCalculator.getAllPages()) {
        console.log('Processing entire page');
        const processedNodes = figmaCalculator.processTree(page);
        const pageDetails: ProcessedPage = {
          file,
          pageAggregates: processedNodes.aggregateCounts,
          pageName: page.name,
        };
        allPages.push(pageDetails);
      }
    }

    if (onlyTrackReadyForDev) {
      console.log(`File "${file.name} (${file.key})" has ${fileReadyForDevSections} ready for dev sections and frames`);
      totalReadyForDevSections += fileReadyForDevSections;
    }
  }

  if (onlyTrackReadyForDev) {
    console.log(`\nTotal ready for dev sections across all files: ${totalReadyForDevSections}`);
  }

  // write all pages to disk in case something goes wrong, so we don't have to reload everything again
  const allPagesJson = JSON.stringify(allPages, null, 2);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `./all-pages-${onlyTrackReadyForDev ? 'ready-for-dev' : 'all'}-${timestamp}.json`;
  fs.writeFileSync(fileName, allPagesJson);

  const teamBreakdown = figmaCalculator.getBreakDownByTeams(allPages);
  const teamBreakdownJson = JSON.stringify(teamBreakdown, null, 2);
  const teamBreakdownFileName = `./team-breakdown-${onlyTrackReadyForDev ? 'ready-for-dev' : 'all'}-${timestamp}.json`;
  fs.writeFileSync(teamBreakdownFileName, teamBreakdownJson);
  console.log("Team Breakdown:", JSON.stringify(teamBreakdown, null, 2));
};

doWork();
