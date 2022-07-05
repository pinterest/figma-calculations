export interface FigmaSharedNode {
  key: string;
  file_key: string;
  node_id: string;
  thumbnail_url: string;
  name: string;
  description: string;
  updated_at: string;
  created_at: string;
  containing_frame: {
    name: string;
    nodeId?: string;
    pageName?: string;
  };
}

export type StyleBucket = { [key: string]: { [id: string]: FigmaTeamStyle } };

export type ComponentBucket = {
  [name: string]: FigmaTeamComponent & { variants: { [key: string]: string } };
};

export type PropertyCheck = {
  name?: string;
  nodePath: string;
  stylePath: string;
  matchType: "exact" | "includes";
};

export interface FigmaTeamComponent extends FigmaSharedNode {
  user: { id: string; handle: string; img_url: string };
}

export type FigmaStyleType = "FILL" | "TEXT" | "EFFECT" | "GRID";
export interface FigmaTeamStyle extends FigmaSharedNode {
  style_type: FigmaStyleType;
  nodeDetails: any;
}

export interface FigmaProjectDetails {
  name: string;
  projects: FigmaProject[];
}

export interface FigmaProject {
  name: string;
  id: string;
}
export interface FigmaPartialFile {
  projectName?: string;
  teamName?: string;
  key: string;
  name: string;
  thumbnail_url: string;
  last_modified: string;
}

export interface FigmaFile {
  name: string;
  role: string;
  lastModified: string;
  editorType: string;
  thumbnailUrl: string;
  version: string;
  document: DocumentNode;
  components: Map<string, ComponentNode>;
  componentSets: Map<string, ComponentNode>;
  schemaVersion: 0;
  styles: { [style_node_id: string]: FigmaTeamStyle };
  mainFileKey: string;
}

export interface FigmaVersion {
  id: string;
  created_at: string;
  label: string;
  description: string;
  user: {
    id: string;
    handle: string;
    img_url: string;
  };
}
