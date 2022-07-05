const BASE_URL = "https://api.figma.com/v1";

import axios from "axios";

import {
  FigmaFile,
  FigmaPartialFile,
  FigmaSharedNode,
  FigmaTeamComponent,
  FigmaTeamStyle,
  FigmaProjectDetails,
  FigmaVersion,
} from "./models/figma";

/**
 * Static class used to call the REST API
 */
export class FigmaAPIHelper {
  static API_TOKEN: string;

  static setToken(token: string) {
    FigmaAPIHelper.API_TOKEN = token;
  }

  static async getTeamProjects(
    teamIds: string[]
  ): Promise<FigmaProjectDetails[]> {
    let projects: FigmaProjectDetails[] = [];
    for (const teamId of teamIds) {
      const resp = await axios.get(`${BASE_URL}/teams/${teamId}/projects`, {
        headers: {
          "X-FIGMA-TOKEN": FigmaAPIHelper.API_TOKEN,
        },
      });
      const data = resp.data as any;
      if (!data.error && data.projects) {
        projects = projects.concat(data as FigmaProjectDetails[]);
      }
    }
    return projects;
  }

  static async getProjectFiles(projectId: string) {
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
    let styles: FigmaSharedNode[] = [];

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
        styles = styles.concat(metadata.styles as FigmaSharedNode[]);
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

  static async getFileComponents(fileKeys: string[]) {
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

  static async getFileStyles(fileKeys: string[]) {
    let styles: FigmaSharedNode[] = [];
    for (const fileId of fileKeys) {
      const resp = await axios.get(`${BASE_URL}/files/${fileId}/styles`, {
        headers: {
          "X-FIGMA-TOKEN": FigmaAPIHelper.API_TOKEN,
        },
      });
      const data = resp.data as any;
      if (!data.error && data.meta.styles) {
        styles = styles.concat(data.meta.styles as FigmaSharedNode[]);
      }
    }

    const extendedStyles: FigmaTeamStyle[] = [];

    // since styles can come from different files, sort the ids into the right fileId/nodeId buckets
    const { fileBuckets, nodeIdMap } = this.createFileBuckets(styles);

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

  static async getNodeDetails(fileKey: string, nodeIds: string[]) {
    const resp = await axios.get(`${BASE_URL}/files/${fileKey}/nodes`, {
      headers: {
        "X-FIGMA-TOKEN": FigmaAPIHelper.API_TOKEN,
      },
      params: {
        ids: nodeIds.join(","),
      },
    });
    const data = resp.data as { nodes: { [key: string]: any } };

    return data;
  }

  /**
   * Breaks a list of styles into a relevant file key with styles so we can lookup by file
   */
  static createFileBuckets(sharedNodes: FigmaSharedNode[]) {
    const fileBuckets: { [key: string]: string[] } = {};
    const nodeIdMap: { [id: string]: FigmaSharedNode } = {};
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
