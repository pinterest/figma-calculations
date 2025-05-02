import dayjs from "dayjs";

import { FigmaPartialFile } from "../models/figma";

import { FigmaAPIHelper } from "../webapi";
import wait from "./wait";

// Project IDs to exclude due to permission issues
const EXCLUDED_PROJECTS = process.env.FIGMA_EXCLUDED_PROJECT_IDS?.split(",").filter(Boolean) || [];

/**
 * Get all the figma file metadata across entire organization for given teams
 * @param teamIds - the team ids to load files from
 * @param numWeeksAgo - how many weeks ago to start the search, defaults to 2
 * @returns
 */
export async function getFigmaPagesForTeam(
  teamIds: string[],
  numWeeksAgo: number = 2,
  useVersionHistory?: boolean
): Promise<{
  files: FigmaPartialFile[];
  counts: { total: number; recentlyModified: number };
}> {
  const projectDetails = await FigmaAPIHelper.getTeamProjects(teamIds);

  const files: FigmaPartialFile[] = [];
  for (const team of projectDetails) {
    for (const proj of team.projects) {
      // Skip excluded projects
      if (EXCLUDED_PROJECTS.includes(proj.id)) {
        console.log(`Skipping project ${proj.id} (${proj.name || "unknown"}) due to known permission issues`);
        continue;
      }

      try {
        const newFiles = await FigmaAPIHelper.getProjectFiles(proj.id);
        for (const file of newFiles) {
          // merge the team and project names onto the file metadata
          files.push(
            Object.assign(file, { teamName: team.name, projectName: proj.name })
          );
        }
      } catch (error: any) {
        console.error(`Error fetching files for project ${proj.id}: ${error.message || error}`);
        // Continue with the next project instead of crashing
      }
    }
  }

  // a fallback prop, the figma API is inaccurate to get the last modified time
  if (useVersionHistory) {
    let numFiles = 1;

    // we need to add a timeout
    for (const file of files) {
      numFiles += 1;

      // only files after July are impacted
      if (dayjs(file.last_modified).isBefore(dayjs().subtract(6, "months"))) {
        continue;
      }

      if (numFiles % 120 === 0) {
        await wait(60000);
      }

      try {
        //console.debug(`Fetching file ${numFiles} of ${files.length}`);
        let versions = await FigmaAPIHelper.getFileHistory(file.key);

        versions = versions.filter((v) => v.user.handle !== "Figma System");

        // sort with the version created time
        // use that as the latest version
        versions.sort((a, b) =>
          dayjs(a.created_at).isBefore(dayjs(b.created_at)) ? 1 : -1
        );

        if (versions.length > 0) {
          const latestDate = versions[0].created_at;
          // use the last file version date
          file.last_modified = latestDate;
        }
      } catch (error: any) {
        console.error(`Error fetching version history for file ${file.key}: ${error.message || error}`);
        // Continue with the next file
      }
    }
  }

  const filteredFiles = files.filter((file) => {
    const day = dayjs(file.last_modified);
    if (day.isAfter(dayjs().subtract(numWeeksAgo, "week"))) {
      return true;
    }
    return false;
  });

  return {
    files: filteredFiles,
    counts: {
      total: files.length,
      recentlyModified: filteredFiles.length,
    },
  };
}
