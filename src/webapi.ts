const BASE_URL = "https://api.figma.com/v1";

import {
  FigmaFile,
  FigmaImages,
  FigmaPartialFile,
  FigmaTeamComponent,
  FigmaTeamStyle,
  FigmaProjectDetails,
  FigmaVersion,
  FigmaLocalVariable,
  FigmaLocalVariableCollection,
  FigmaPublishedVariable,
  FigmaPublishedVariableCollection,
  FigmaVariablesLocalResponse,
  FigmaVariablesPublishedResponse,
  FigmaFileStylesResponse,
  FigmaTeamProjectsResponse,
} from "./models/figma";

/**
 * Helper function to make GET requests to the Figma API
 */
async function figmaGet<T>(
  path: string,
  params?: Record<string, string | number>
): Promise<T> {
  let url = `${BASE_URL}${path}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    url += `?${searchParams.toString()}`;
  }

  const resp = await fetch(url, {
    method: "GET",
    headers: {
      "X-FIGMA-TOKEN": FigmaAPIHelper.API_TOKEN,
    },
  });

  if (!resp.ok) {
    throw new Error(`Figma API error: ${resp.status} ${resp.statusText}`);
  }

  return resp.json() as Promise<T>;
}

/**
 * Static class used to call the REST API
 */
export class FigmaAPIHelper {
  static API_TOKEN: string;

  static setToken(token: string): void {
    FigmaAPIHelper.API_TOKEN = token;
  }

  static async getTeamProjects(
    teamIds: string[]
  ): Promise<FigmaProjectDetails[]> {
    let projects: FigmaProjectDetails[] = [];
    for (const teamId of teamIds) {
      const data = await figmaGet<FigmaTeamProjectsResponse>(
        `/teams/${teamId}/projects`
      );
      if (!data.err && data.projects) {
        projects = projects.concat(data);
      }
    }
    return projects;
  }

  static async getProjectFiles(projectId: string): Promise<FigmaPartialFile[]> {
    let files: FigmaPartialFile[] = [];
    const data = await figmaGet<any>(`/projects/${projectId}/files`);
    if (!data.error && data.files) {
      files = files.concat(data.files as FigmaPartialFile[]);
    }
    return files;
  }

  static async getFile(fileKey: string): Promise<FigmaFile> {
    const data = await figmaGet<FigmaFile>(`/files/${fileKey}`);
    return data;
  }

  static async getImages(
    fileKey: string,
    imageIds: string[],
    format: 'jpg' | 'png' | 'svg' | 'pdf'
  ): Promise<FigmaImages> {
    const data = await figmaGet<FigmaImages>(`/images/${fileKey}?format=${format}&ids=${imageIds.join(',')}`);
    return data;
  }

  static async getFileHistory(fileKey: string): Promise<FigmaVersion[]> {
    const data = await figmaGet<any>(`/files/${fileKey}/versions`);
    return data.versions as FigmaVersion[];
  }

  static async getTeamComponentSets(
    teamId: string
  ): Promise<FigmaTeamComponent[]> {
    let components: FigmaTeamComponent[] = [];

    let nextCursor = undefined;

    while (true) {
      const data: any = await figmaGet<any>(`/teams/${teamId}/component_sets`, {
        after: nextCursor,
        page_size: 10000,
      });

      const metadata = data.meta;

      nextCursor = metadata.cursor?.after;

      if (!data.error && metadata.component_sets) {
        components = components.concat(
          metadata.component_sets as FigmaTeamComponent[]
        );
      }

      if (!nextCursor) break;
    }

    return components;
  }

  static async getTeamComponents(
    teamId: string
  ): Promise<FigmaTeamComponent[]> {
    let components: FigmaTeamComponent[] = [];

    let nextCursor = undefined;

    while (true) {
      const data: any = await figmaGet<any>(`/teams/${teamId}/components`, {
        after: nextCursor,
        page_size: 10000,
      });

      const metadata = data.meta;

      nextCursor = metadata.cursor?.after;

      if (!data.error && metadata.components) {
        components = components.concat(
          metadata.components as FigmaTeamComponent[]
        );
      }

      if (!nextCursor) break;
    }

    return components;
  }

  static async getTeamStyles(teamId: string): Promise<FigmaTeamStyle[]> {
    let styles: FigmaTeamStyle[] = [];

    let nextCursor = undefined;

    while (true) {
      const data: any = await figmaGet<any>(`/teams/${teamId}/styles`, {
        after: nextCursor,
        page_size: 10000,
      });

      const metadata = data.meta;

      nextCursor = metadata.cursor?.after;

      if (!data.error && metadata.styles) {
        styles = styles.concat(metadata.styles as FigmaTeamStyle[]);
      }

      if (!nextCursor) break;
    }

    const extendedStyles: FigmaTeamStyle[] = [];

    // since styles can come from different files, sort the ids into the right fileId/nodeId buckets
    const { fileBuckets, nodeIdMap } = this.createFileBuckets(styles);

    // get node details from a specific file
    for (const fileKey of Object.keys(fileBuckets)) {
      const data = await this.getNodeDetails(fileKey, fileBuckets[fileKey]);
      for (const id of fileBuckets[fileKey]) {
        // text styles
        const node = nodeIdMap[id] as FigmaTeamStyle;
        node.nodeDetails = data.nodes[id].document;
        extendedStyles.push(node);
      }
    }

    return extendedStyles;
  }

  static async getFileComponents(fileKeys: string[]): Promise<FigmaTeamComponent[]> {
    let components: FigmaTeamComponent[] = [];
    for (const fileId of fileKeys) {
      const data = await figmaGet<any>(`/files/${fileId}/components`);
      if (!data.error && data.meta.components) {
        components = components.concat(data.meta.components as FigmaTeamComponent[]);
      }
    }
    return components;
  }

  static async getFileComponentSets(fileKeys: string[]): Promise<FigmaTeamComponent[]> {
    let componentSets: FigmaTeamComponent[] = [];
    for (const fileId of fileKeys) {
      const data = await figmaGet<any>(`/files/${fileId}/component_sets`);
      if (!data.error && data.meta.component_sets) {
        componentSets = componentSets.concat(data.meta.component_sets as FigmaTeamComponent[]);
      }
    }
    return componentSets;
  }

  static async getFileStyles(fileKeys: string[]): Promise<FigmaTeamStyle[]> {
    let styles: FigmaTeamStyle[] = [];
    for (const fileId of fileKeys) {
      const data = await figmaGet<FigmaFileStylesResponse>(`/files/${fileId}/styles`);
      if (!data.err && data.meta.styles) {
        styles = styles.concat(data.meta.styles);
      }
    }

    const extendedStyles: FigmaTeamStyle[] = [];

    // since styles can come from different files, sort the ids into the right fileId/nodeId buckets
    const { fileBuckets, nodeIdMap } = this.createFileBuckets(styles);

    for (const fileKey of Object.keys(fileBuckets)) {
      const data = await this.getNodeDetails(fileKey, fileBuckets[fileKey]);
      for (const id of fileBuckets[fileKey]) {
        // text styles
        const node = nodeIdMap[id];
        node.nodeDetails = data.nodes[id].document;
        extendedStyles.push(node);
      }
    }

    return extendedStyles;
  }

  static async getFileLocalVariables(fileKey: string): Promise<{
    variables: Record<string, FigmaLocalVariable>;
    variableCollections: Record<string, FigmaLocalVariableCollection>;
  }> {
    const resp = await figmaGet<FigmaVariablesLocalResponse>(
      `/files/${fileKey}/variables/local`
    );

    return {
      variables: resp.meta?.variables,
      variableCollections: resp.meta?.variableCollections,
    };
  }

  static async getFilePublishedVariables(fileKey: string): Promise<{
    variables: Record<string, FigmaPublishedVariable>;
    variableCollections: Record<string, FigmaPublishedVariableCollection>;
  }> {
    const resp = await figmaGet<FigmaVariablesPublishedResponse>(
      `/files/${fileKey}/variables/published`
    );

    return {
      variables: resp.meta?.variables,
      variableCollections: resp.meta?.variableCollections,
    };
  }

  static async getNodeDetails(fileKey: string, nodeIds: string[]) {
    // Chunk nodeIds into groups of at most 500 to avoid exceeding an undocumented API limit
    // that returns a 413 error (Request Entity Too Large) when we get up in the 900 node id range
    const chunkSize = 500;
    const chunks: string[][] = [];
    for (let i = 0; i < nodeIds.length; i += chunkSize) {
      chunks.push(nodeIds.slice(i, i + chunkSize));
    }

    // Map each chunk to a request
    const requests = chunks.map(chunk =>
      figmaGet<any>(`/files/${fileKey}/nodes`, {
        ids: chunk.join(","),
        depth: 1, // This method is only used to populate styles currently, and those don't have children
      })
    );

    // Await all requests and merge the nodes objects
    const responses = await Promise.all(requests);
    let mergedNodes: { [key: string]: any } = {};
    responses.forEach(resp => {
      mergedNodes = { ...mergedNodes, ...resp.nodes };
    });

    return { nodes: mergedNodes };
  }

  /**
   * Breaks a list of styles into a relevant file key with styles so we can lookup by file
   */
  static createFileBuckets(sharedNodes: FigmaTeamStyle[]) {
    const fileBuckets: { [key: string]: string[] } = {};
    const nodeIdMap: { [id: string]: FigmaTeamStyle } = {};
    for (const style of sharedNodes) {
      if (!fileBuckets[style.file_key]) {
        fileBuckets[style.file_key] = [];
      }
      nodeIdMap[style.node_id] = style;
      fileBuckets[style.file_key].push(style.node_id);
    }

    return { nodeIdMap, fileBuckets };
  }
}
