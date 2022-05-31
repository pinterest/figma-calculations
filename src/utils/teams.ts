import dayjs from "dayjs";

import { FigmaPartialFile } from "../models/figma";

import { FigmaAPIHelper } from "../webapi";
import { getLintCheckPercent } from "./process";

/**
 * Get all the figma file metadata across entire organization for given teams
 * @param teamIds - the team ids to load files from
 * @param numWeeksAgo - how many weeks ago to start the search, defaults to 2
 * @returns
 */
export async function getFigmaPagesForTeam(
  teamIds: string[],
  numWeeksAgo: number = 2
): Promise<{
  files: FigmaPartialFile[];
  counts: { total: number; recentlyModified: number };
}> {
  const projectDetails = await FigmaAPIHelper.getTeamProjects(teamIds);

  const files: FigmaPartialFile[] = [];
  for (const team of projectDetails) {
    for (const proj of team.projects) {
      const newFiles = await FigmaAPIHelper.getProjectFiles(proj.id);
      for (const file of newFiles) {
        // merge the team and project names onto the file metadata
        files.push({ ...file, teamName: team.name, projectName: proj.name });
      }
    }
  }

  let fileCount = 1;
  for (const file of files) {
    try {
      const day = dayjs(file.last_modified);
      // files
      if (day.isAfter(dayjs().subtract(numWeeksAgo, "week"))) {
        fileCount++;
      }
    } catch (ex) {
      console.log(ex);
    }
  }

  return {
    files,
    counts: {
      total: files.length,
      recentlyModified: fileCount,
    },
  };
}
