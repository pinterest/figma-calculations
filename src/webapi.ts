const BASE_URL = "https://api.figma.com/v1";

import axios from "axios";

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
      const resp = await axios.get<FigmaTeamProjectsResponse>(`${BASE_URL}/teams/${teamId}/projects`, {
        headers: {
          "X-FIGMA-TOKEN": FigmaAPIHelper.API_TOKEN,
        },
      });
      const data = resp.data;
      if (!data.err && data.projects) {
        projects = projects.concat(data);
      }
    }
    return projects;
  }

  static async getProjectFiles(projectId: string): Promise<FigmaPartialFile[]> {
    let files: FigmaPartialFile[] = [];
    const resp = await axios.get(`${BASE_URL}/projects/${projectId}/files`, {
      headers: {
        "X-FIGMA-TOKEN": FigmaAPIHelper.API_TOKEN,
      },
    });
    const data = resp.data as any;
    if (!data.error && data.files) {
      files = files.concat(data.files as FigmaPartialFile[]);
    }
    return files;
  }

  static async getFile(fileKey: string): Promise<FigmaFile> {
    const resp = await axios.get(`${BASE_URL}/files/${fileKey}`, {
      headers: {
        "X-FIGMA-TOKEN": FigmaAPIHelper.API_TOKEN,
      },
    });
    const data = resp.data as FigmaFile;
    return data;
  }

  static async getImages(
    fileKey: string,
    imageIds: string[],
    format: 'jpg' | 'png' | 'svg' | 'pdf'
  ): Promise<FigmaImages> {
    const resp = await axios.get(`${BASE_URL}/images/${fileKey}?format=${format}&ids=${imageIds.join(',')}`, {
      headers: {
        "X-FIGMA-TOKEN": FigmaAPIHelper.API_TOKEN,
      },
    });
    const data = resp.data as FigmaImages;
    return data;
  }

  static async getFileHistory(fileKey: string): Promise<FigmaVersion[]> {
    const resp = await axios.get(`${BASE_URL}/files/${fileKey}/versions`, {
      headers: {
        "X-FIGMA-TOKEN": FigmaAPIHelper.API_TOKEN,
      },
    });
    const data = resp.data.versions as FigmaVersion[];
    return data;
  }

  static async getTeamComponentSets(
    teamId: string
  ): Promise<FigmaTeamComponent[]> {
    let components: FigmaTeamComponent[] = [];

    let nextCursor = undefined;

    do {
      const resp = await axios.get(
        `${BASE_URL}/teams/${teamId}/component_sets`,
        {
          headers: {
            "X-FIGMA-TOKEN": FigmaAPIHelper.API_TOKEN,
          },
          params: {
            after: nextCursor,
            page_size: 10000,
          },
        }
      );

      const data = resp.data as any;
      const metadata = data.meta;

      nextCursor = metadata.cursor?.after;

      if (!data.error && metadata.component_sets) {
        components = components.concat(
          metadata.component_sets as FigmaTeamComponent[]
        );
      }
    } while (nextCursor);

    return components;
  }

  static async getTeamComponents(
    teamId: string
  ): Promise<FigmaTeamComponent[]> {
    let components: FigmaTeamComponent[] = [];

    let nextCursor = undefined;

    do {
      const resp = await axios.get(`${BASE_URL}/teams/${teamId}/components`, {
        headers: {
          "X-FIGMA-TOKEN": FigmaAPIHelper.API_TOKEN,
        },
        params: {
          after: nextCursor,
          page_size: 10000,
        },
      });

      const data = resp.data as any;
      const metadata = data.meta;

      nextCursor = metadata.cursor?.after;

      if (!data.error && metadata.components) {
        components = components.concat(
          metadata.components as FigmaTeamComponent[]
        );
      }
    } while (nextCursor);

    return components;
  }

  static async getTeamStyles(teamId: string): Promise<FigmaTeamStyle[]> {
    let styles: FigmaTeamStyle[] = [];

    let nextCursor = undefined;

    do {
      const resp = await axios.get(`${BASE_URL}/teams/${teamId}/styles`, {
        headers: {
          "X-FIGMA-TOKEN": FigmaAPIHelper.API_TOKEN,
        },
        params: {
          after: nextCursor,
          page_size: 10000,
        },
      });

      const data = resp.data as any;
      const metadata = data.meta;

      nextCursor = metadata.cursor?.after;

      if (!data.error && metadata.styles) {
        styles = styles.concat(metadata.styles as FigmaTeamStyle[]);
      }
    } while (nextCursor);

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
      const resp = await axios.get(`${BASE_URL}/files/${fileId}/components`, {
        headers: {
          "X-FIGMA-TOKEN": FigmaAPIHelper.API_TOKEN,
        },
      });
      const data = resp.data as any;
      if (!data.error && data.meta.components) {
        components = components.concat(
          data.meta.components as FigmaTeamComponent[]
        );
      }
    }
    return components;
  }

  static async getFileComponentSets(fileKeys: string[]): Promise<FigmaTeamComponent[]> {
    let componentSets: FigmaTeamComponent[] = [];
    for (const fileId of fileKeys) {
      const resp = await axios.get(`${BASE_URL}/files/${fileId}/component_sets`, {
        headers: {
          "X-FIGMA-TOKEN": FigmaAPIHelper.API_TOKEN,
        },
      });
      const data = resp.data as any;
      if (!data.error && data.meta.component_sets) {
        componentSets = componentSets.concat(
          data.meta.component_sets as FigmaTeamComponent[]
        );
      }
    }
    return componentSets;
  }

  static async getFileStyles(fileKeys: string[]): Promise<FigmaTeamStyle[]> {
    let styles: FigmaTeamStyle[] = [];
    for (const fileId of fileKeys) {
      const resp = await axios.get<FigmaFileStylesResponse>(`${BASE_URL}/files/${fileId}/styles`, {
        headers: {
          "X-FIGMA-TOKEN": FigmaAPIHelper.API_TOKEN,
        },
      });
      const data = resp.data;
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
    const resp = await axios.get<FigmaVariablesLocalResponse>(`${BASE_URL}/files/${fileKey}/variables/local`, {
      headers: {
        "X-FIGMA-TOKEN": FigmaAPIHelper.API_TOKEN,
      },
    });

    return {
      variables: resp.data.meta?.variables,
      variableCollections: resp.data.meta?.variableCollections,
    }
  }

  static async getFilePublishedVariables(fileKey: string): Promise<{
    variables: Record<string, FigmaPublishedVariable>;
    variableCollections: Record<string, FigmaPublishedVariableCollection>;
  }> {
    const resp = await axios.get<FigmaVariablesPublishedResponse>(`${BASE_URL}/files/${fileKey}/variables/published`, {
      headers: {
        "X-FIGMA-TOKEN": FigmaAPIHelper.API_TOKEN,
      },
    });

    return {
      variables: resp.data.meta?.variables,
      variableCollections: resp.data.meta?.variableCollections,
    }
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
      axios.get(`${BASE_URL}/files/${fileKey}/nodes`, {
        headers: {
          "X-FIGMA-TOKEN": FigmaAPIHelper.API_TOKEN,
        },
        params: {
          ids: chunk.join(","),
          depth: 1, // This method is only used to populate styles currently, and those don't have children
        },
      })
    );

    // Await all requests and merge the nodes objects
    const responses = await Promise.all(requests);
    let mergedNodes: { [key: string]: any } = {};
    responses.forEach(resp => {
      const data = resp.data as { nodes: { [key: string]: any } };
      mergedNodes = { ...mergedNodes, ...data.nodes };
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
