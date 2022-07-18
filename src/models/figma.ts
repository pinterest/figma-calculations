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
  [key: string]: { name: string };
};

export type PropertyCheck = {
  name?: string;
  nodePath: string;
  stylePath: string;
  figmaPath?: string; // the path in a Figma File may be different than the path in the cloud document
  matchType: "exact" | "includes";
  removeSpaces?: boolean;
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
  components: { [style_node_id: string]: FigmaTeamComponent };
  componentSets: { [style_node_id: string]: FigmaTeamComponent };
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
