// Types for the Figma REST API, since they don't yet publish a schema for it:
// https://forum.figma.com/t/where-can-i-find-the-rest-api-schema/1194

export interface FigmaSharedNode {
  key: string;
  file_key: string;
  node_id: string;
  thumbnail_url?: string;
  name: string;
  description: string;
  updated_at: string;
  created_at: string;
}

export type HexStyleMap = {
  [hexColor: string]: { text?: string; fill?: string };
};

export type StyleBucket = { [key: string]: { [id: string]: FigmaTeamStyle } };
export type StyleLookupMap = {
  [key: string]: { [id: string]: FigmaTeamStyle[] };
};

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

export interface FigmaTeamUser {
  id: string;
  handle: string;
  img_url: string;
}

export interface FigmaTeamComponent extends FigmaSharedNode {
  user?: FigmaTeamUser;
  containing_frame: {
    name: string;
    nodeId?: string;
    backgroundColorString?: string;
    pageId?: string;
    pageName?: string;
  };
}

export type FigmaStyleType = "FILL" | "TEXT" | "EFFECT" | "GRID";
export interface FigmaTeamStyle extends FigmaSharedNode {
  style_type: FigmaStyleType;
  sort_position: string;
  user?: FigmaTeamUser;
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

export interface FigmaImages {
  err?: string,
  images: Record<string, string>, // Image ID -> Image URL
  status?: number
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

// Variables
interface FigmaVariableBase {
  readonly id: string
  readonly key: string
  name: string
  readonly variableCollectionId: string
  readonly resolvedType: VariableResolvedDataType
}

export interface FigmaLocalVariable extends FigmaVariableBase {
  description: string
  hiddenFromPublishing: boolean
  readonly remote: boolean
  readonly valuesByMode: {
    [modeId: string]: VariableValue
  }
  scopes: Array<VariableScope>
  readonly codeSyntax: {
    [platform in CodeSyntaxPlatform]?: string
  }
}

export interface FigmaPublishedVariable extends FigmaVariableBase {
  subscribed_id: string
  readonly updatedAt: string;
}

// Variable Collections
interface FigmaVariableCollectionBase {
  readonly id: string
  readonly key: string
  name: string
}

export interface FigmaLocalVariableCollection extends FigmaVariableCollectionBase {
  hiddenFromPublishing: boolean
  readonly remote: boolean
  readonly modes: Array<{
    modeId: string
    name: string
  }>
  readonly defaultModeId: string
  readonly variableIds: string[]
}

export interface FigmaPublishedVariableCollection extends FigmaVariableCollectionBase {
  subscribed_id: string
  readonly updatedAt: string;
}
