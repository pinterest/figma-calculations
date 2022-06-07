import { FigmaStyleType, StyleBucket } from "../models/figma";

export const isExactStyleMatch = (
  styleType: FigmaStyleType | "STROKE",
  styleBucket: StyleBucket,
  targetNode: SceneNode
) => {
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
  targetNode: SceneNode
) {
  let styleId: string | symbol = "";
  // check corresponding Id props to verify exact matches
  if (styleType === "FILL") {
    styleId = (targetNode as RectangleNode).fillStyleId;
  }

  if (styleType === "STROKE") {
    // some hacky stuff because Figma doesn't differentiate into a Fill Style
    styleId = (targetNode as RectangleNode).strokeStyleId;
    styleType = "FILL";
  }

  if (styleType === "TEXT") {
    styleId = (targetNode as TextNode).textStyleId;
  }

  const styles = styleBucket[styleType];

  // check if the style exists in our map, else check property by property
  if (styleId && styleId !== figma.mixed) {
    if (typeof styleId === "string") {
      // get the key from the style ID
      const styleKey = styleId.split(":")[1]?.split(",")[0];

      const existingStyle = styles[styleKey];
      if (existingStyle) {
        return existingStyle;
      }
    }
  }

  return undefined;
}

function isExactStyleMatchFromCloud(
  styleType: FigmaStyleType | "STROKE",
  styleBucket: StyleBucket,
  targetNode: SceneNode
) {
  if (!(targetNode as any).styles) {
    return false;
  }
  let styleId: string | symbol = "";
  // check corresponding Id props to verify exact matches
  if (styleType === "FILL") {
    styleId = (targetNode as any).styles["fill"];
  }

  // may be error prone because fill style could correspond to fill rather than stroke
  if (styleType === "STROKE") {
    // some hacky stuff because Figma doesn't differentiate stroke as a Fill Style
    styleId = (targetNode as any).styles["fill"];
    styleType = "FILL";
  }

  if (styleType === "TEXT") {
    styleId = (targetNode as any).styles["text"];
  }

  // if a predefined style exists it's an exact match
  if (styleId) {
    if (typeof styleId === "string") {
      if (styleBucket[styleType][styleId]) {
        // get the key from the style ID
        return styleBucket[styleType][styleId];
      }
    }
  }

  return false;
}
