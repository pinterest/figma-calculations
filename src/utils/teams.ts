import dayjs from "dayjs";

import { FigmaPartialFile } from "../models/figma";

import { FigmaAPIHelper } from "../webapi";

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
        files.push(
          Object.assign(file, { teamName: team.name, projectName: proj.name })
        );
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
