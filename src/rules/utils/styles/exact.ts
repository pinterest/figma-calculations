import {
  FigmaStyleType,
  FigmaTeamStyle,
  StyleBucket,
} from "../../../models/figma";

export const isExactStyleMatch = (
  styleType: FigmaStyleType | "STROKE",
  styleBucket: StyleBucket,
  targetNode: BaseNode
): FigmaTeamStyle | undefined => {
  // way the styles are represented varies based on runtime
  if (typeof figma !== "undefined") {
    return isExactStyleMatchInFigma(styleType, styleBucket, targetNode);
  } else {
    return isExactStyleMatchFromCloud(styleType, styleBucket, targetNode);
  }
};

function isExactStyleMatchInFigma(
  styleType: FigmaStyleType | "STROKE",
  styleBucket: StyleBucket,
  targetNode: BaseNode
): FigmaTeamStyle | undefined {
  let styleId: string | string[] | symbol | undefined;

  // Determine the styleId based on the styleType
  switch (styleType) {
    case "FILL":
      styleId = (targetNode as RectangleNode).fillStyleId;
      break;

    case "STROKE":
      styleId = (targetNode as RectangleNode).strokeStyleId;
      styleType = "FILL"; // Figma styles don't differentiate STROKE as a style_type
      break;

    case "TEXT":
      styleId = (targetNode as TextNode)
        .getStyledTextSegments(["textStyleId"])
        .map((segment) => segment.textStyleId);
      break;
  }

  const styles = styleBucket[styleType];

  // Check if the style(s) exist in our map
  if (styleId && styleId !== figma.mixed) {
    // Extract the key from the style node ID
    const getStyleKey = (id: string) => id?.split(":")[1]?.split(",")[0];

    // Single style ID
    if (typeof styleId === "string") {
      const styleKey = getStyleKey(styleId);
      return styles[styleKey];
    }

    // Multiple style IDs are possible for text node character ranges
    else if (Array.isArray(styleId)) {
      // Make sure all ids match an existing style
      const allStylesExist = styleId.every((id) => {
        const styleKey = getStyleKey(id);
        return styleKey !== "" && styles[styleKey];
      });

      if (allStylesExist) {
        // :TODO: Not sure if the returned style key is being used by callers,
        // and if we should possibly return the full style array here
        // maybe we should really be returning a boolean from this function
        return styles[getStyleKey(styleId[0])];
      }
    }
  }

  return undefined;
}

function isExactStyleMatchFromCloud(
  styleType: FigmaStyleType | "STROKE",
  styleBucket: StyleBucket,
  targetNode: BaseNode
): FigmaTeamStyle | undefined {
  if (!(targetNode as any).styles) {
    return undefined;
  }

  let styleKey: string | undefined;

  // Determine the styleId based on the styleType
  switch (styleType) {
    case "FILL":
      styleKey = (targetNode as any).styles["fill"];
      break;

    case "STROKE":
      // Figma styles don't differentiate STROKE as a style_type
      styleType = "FILL";
      styleKey = (targetNode as any).styles["stroke"];
      break;

    case "TEXT":
      /**
       * Note: The REST API doesn't provide the level of detail we need to detect multiple range library style ids in a text node.
       *
       * In node.styles["text"] we only get the first style id that is used.
       *
       * We can additionally ask for "characterStyleOverrides" and a "styleOverrideTable" to map those character positions,
       * ...but it just includes the actual text properties (font family, fontSize, etc) and no indication of an associated shared Style ID.
       * ref: https://www.figma.com/developers/api#node-types
       *
       * It is a known issue and has an open request:
       * https://forum.figma.com/t/bug-text-style-overrides-inherited-from-shared-styles-are-impossible-to-read/77947
       *
       * The result here is that we can only detect the first style id used in the text node, and if that is an exact match
       * to a library style then we might be reporting a false positive if there is other non-style text used in the node.
       */
      styleKey = (targetNode as any).styles["text"];
      break;
  }

  return styleKey ? styleBucket[styleType]?.[styleKey] : undefined;
}
