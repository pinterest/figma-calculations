import {
  ComponentBucket,
  FigmaLocalVariables,
  FigmaStyleType,
  FigmaTeamComponent,
  FigmaTeamStyle,
  HexStyleMap,
  PropertyCheck,
  StyleBucket,
  StyleLookupMap,
} from "../models/figma";

import { LintCheck } from "../models/stats";
import jp from "jsonpath";
import checkFillStyleMatch from "./fillStyle";
import checkStrokeStyleMatch from "./strokeStyle";
import checkTextMatch from "./textStyle";
import {
  CORNER_RADII,
  HexColorToFigmaVariableMap,
  RoundingToFigmaVariableMap,
  SpacingToFigmaVariableMap,
} from "../utils/variables";
import checkFillVariableMatch from "./fillVariable";
import checkStrokeVariableMatch from "./strokeVariable";
import checkRoundingVariableMatch from "./roundingVariable";
import checkSpacingVariableMatch from "./spacingVariable";

/**
 * styleLookupMap - required for partial matches
 */
export type LintCheckOptions = {
  hexStyleMap?: HexStyleMap;
  styleLookupMap?: StyleLookupMap;
  hexColorToVariableMap?: HexColorToFigmaVariableMap;
  roundingToVariableMap?: RoundingToFigmaVariableMap;
  spacingToVariableMap?: SpacingToFigmaVariableMap;
};
/**
 * Run through all partial matches, and make exceptions depending on rules
 */
export const runSimilarityChecks = (
  styleBucket: StyleBucket,
  variables: FigmaLocalVariables,
  targetNode: BaseNode,
  opts?: LintCheckOptions
): LintCheck[] => {
  const styleChecks: ((
    styleBucket: StyleBucket,
    targetNode: BaseNode,
    opts?: LintCheckOptions
  ) => LintCheck)[] = [
    checkTextMatch,
    checkStrokeStyleMatch,
    checkFillStyleMatch,
  ];

  const variableChecks: ((
    variables: FigmaLocalVariables,
    targetNode: BaseNode,
    opts?: LintCheckOptions
  ) => LintCheck)[] = [
    checkFillVariableMatch,
    checkStrokeVariableMatch,
    checkRoundingVariableMatch,
    checkSpacingVariableMatch,
  ];

  const results = [];

  // Style-based checks
  for (const check of styleChecks) {
    const lintCheck = check(styleBucket, targetNode, opts);
    results.push(lintCheck);
  }

  // Variable-based checks
  for (const check of variableChecks) {
    const lintCheck = check(variables, targetNode, opts);
    results.push(lintCheck);
  }

  return results;
};

/**
 * Check if a Node Type overlaps
 * @param types
 * @param node
 * @returns
 */
export function isNodeOfTypeAndVisible(types: string[], node: BaseNode) {
  return types.includes(node.type);
}

export const hasValidFillToMatch = (node: MinimalFillsMixin) => {
  const { fills } = node;

  return (
    fills && // Must have a fills property
    Array.isArray(fills) && // Not a figma.mixed (symbol) type
    fills.length > 0 && // Has at least one fill
    !fills.some((f) => f.visible === false) && // No hidden fills
    !fills.some((f) => f.type === "IMAGE") // No image fills
  );
};

// Measurement exception note: The default 0 radius is exempt when used as a single
// cornerRadius value, or if all four corners are 0
export const hasValidRoundingToMatch = (node: CornerMixin) => {
  // Cloud files use rectangleCornerRadii when there are different values for corner radii
  const { cornerRadius, rectangleCornerRadii } = node as any;

  // If there is a cornerRadius property...
  if (cornerRadius !== undefined) {
    if (
      typeof cornerRadius === "number" && // and it's a number
      cornerRadius !== 0 // and it's not the default 0 value corner radius value, which is exempt
    )
      return true;

    // and it's not a number... ala figma.mixed (Plugin API only)
    if (typeof cornerRadius !== "number") {
      // Valid for matching when all individual corner radii are defined, and any of the
      // corners are not 0 (all zeros is exempt)
      const n = node as RectangleNode;
      return CORNER_RADII.every((r) => n[r] !== undefined) && CORNER_RADII.some((r) => n[r] > 0);
    }
  }

  // Cloud files use rectangleCornerRadii when there are separate values for
  // corner radii for Rectangle (and Frame) nodes
  // Other shapes, like Vector and Star, can only have a single value and use cornerRadius.
  // Valid for matching when rectangleCornerRadii exists, is an array, and any of the
  // corners are not 0 (all zeros is exempt)
  else if (
    rectangleCornerRadii !== undefined &&
    Array.isArray(rectangleCornerRadii) &&
    rectangleCornerRadii.length > 0 &&
    rectangleCornerRadii.some((r) => r > 0)
  )
    return true;

  return false;
};

export const hasValidSpacingToMatch = (node: CornerMixin) => {
  const { layoutMode } = node as FrameNode;

  // Spacing variables are only applicable when auto-layout is enabled
  if (layoutMode === "HORIZONTAL" || layoutMode === "VERTICAL") {
    return true;
  }

  return false;
};

export const hasValidStrokeToMatch = (node: MinimalStrokesMixin) => {
  const { strokes } = node;

  return (
    strokes && // Must have a strokes property
    Array.isArray(strokes) && // Is an array
    strokes.length > 0 && // Has at least one stroke
    !strokes.some((f) => f.visible === false) // No hidden strokes
  );
};

/**
 *
 * @param styles
 * @returns Object with style type and key as indexer
 * @description Creates a map of styles by name
 */
export function generateStyleBucket(
  styles: FigmaTeamStyle[],
  opts?: { includeNames: boolean }
): StyleBucket {
  // create hashmap of styles by styleType
  const styleBuckets: StyleBucket = {};

  for (const style of styles) {
    if (!styleBuckets[style.style_type]) {
      styleBuckets[style.style_type] = {};
    }

    styleBuckets[style.style_type][style.key] = style;

    if (opts?.includeNames) {
      // use the style name as the key
      // serializing this may create duplicate, in memory, they should ref. the same object
      styleBuckets[style.style_type][style.name] = style;
    }
  }

  return styleBuckets;
}

export function getStyleLookupDefinitions(
  styleType: FigmaStyleType | "STROKE"
) {
  // sometimes the cloud and figma file diverge in naming
  // figmaPath is the path in the figma file
  // nodePath is the path in the cloud file (used by default)
  const FillLookupKeys: PropertyCheck[] = [
    {
      stylePath: "$.fills[0].color.r",
      nodePath: "$.fills[0].color.r",
      matchType: "exact",
    },
    {
      stylePath: "$.fills[0].color.g",
      nodePath: "$.fills[0].color.g",
      matchType: "exact",
    },
    {
      stylePath: "$.fills[0].color.b",
      nodePath: "$.fills[0].color.b",
      matchType: "exact",
    },
    {
      stylePath: "$.fills[0].color.a",
      nodePath: "$.fills[0].color.a",
      figmaPath: "$.fills[0].opacity",
      matchType: "exact",
    },
  ];

  const TextLookupKeys: PropertyCheck[] = [
    {
      stylePath: "$.style.fontFamily",
      nodePath: "$.style.fontFamily",
      figmaPath: "$.fontName.family",
      matchType: "exact",
      removeSpaces: true,
    },
    {
      stylePath: "$.style.fontSize",
      nodePath: "$.style.fontSize",
      figmaPath: "$.fontSize",
      matchType: "exact",
    },
    {
      stylePath: "$.style.fontPostScriptName",
      nodePath: "$.style.fontPostScriptName",
      figmaPath: "$.fontName.style",
      matchType: "includes",
    },
  ];

  const StrokeLookupKeys: PropertyCheck[] = [
    {
      stylePath: "$.fills[0].color.r",
      nodePath: "$.strokes[0].color.r",
      matchType: "exact",
    },
    {
      stylePath: "$.fills[0].color.g",
      nodePath: "$.strokes[0].color.g",
      matchType: "exact",
    },
    {
      stylePath: "$.fills[0].color.b",
      nodePath: "$.strokes[0].color.b",
      matchType: "exact",
    },
    {
      stylePath: "$.fills[0].color.a",
      nodePath: "$.strokes[0].color.a",
      figmaPath: "$.strokes[0].opacity",
      matchType: "exact",
    },
  ];

  if (styleType === "STROKE") return StrokeLookupKeys;

  if (styleType === "FILL") return FillLookupKeys;

  if (styleType === "TEXT") return TextLookupKeys;

  return undefined;
}

export function getStyleLookupKey(
  checks: PropertyCheck[],
  node: any,
  nodeType: "styleNode" | "figmaNode"
) {
  const key = [];

  for (const check of checks) {
    if (check.matchType === "exact") {
      let path = check.stylePath;

      // if we're looking at a figma path
      if (nodeType === "figmaNode") {
        path =
          typeof figma === "undefined"
            ? check.nodePath
            : check.figmaPath || check.nodePath;
      }

      let styleValue = jp.value(node, path);

      if (
        styleValue !== undefined &&
        (typeof styleValue === "string" || typeof styleValue === "number")
      ) {
        // an option to clean
        if (check.removeSpaces && typeof styleValue === "string") {
          styleValue = styleValue.split(" ").join("");
        }

        key.push(styleValue);
      } else {
        if (nodeType === "styleNode") {
          // console.log(`Partial matches not supported for: ${node.name} }`);
        }
      }
    }
  }

  if (key.length == 0) return "";
  return key.join("<->");
}

export function generateStyleLookup(styleBucket: StyleBucket) {
  const styleLookupMap: StyleLookupMap = {};

  const addStyleToValueMap = (
    type: FigmaStyleType,
    styleValue: string,
    style: FigmaTeamStyle
  ) => {
    if (!styleLookupMap[type]) {
      styleLookupMap[type] = {};
    }

    if (!styleLookupMap[type][styleValue]) {
      styleLookupMap[type][styleValue] = [];
    }

    styleLookupMap[type][styleValue].push(style);
  };

  for (const type of Object.keys(styleBucket)) {
    const checks = getStyleLookupDefinitions(type as FigmaStyleType);

    for (const styleKey of Object.keys(styleBucket[type])) {
      const style = styleBucket[type][styleKey];

      if (checks) {
        // dynamic key from the definition
        const key = getStyleLookupKey(checks, style.nodeDetails, "styleNode");

        if (key) {
          addStyleToValueMap(type as FigmaStyleType, key, style);
        }
      }
    }
    /*switch (type) {
        case "TEXT":
          {
            // use the font name
            const styleValue = jp.value(
              style.nodeDetails,
              "$.style.fontFamily"
            );
            if (styleValue) {
              addStyleToValueMap(type, styleValue, style);
            }
          }
          break;
        case "FILL":
          {
            // use the fill hex code - no alpha channel

            const styleValue = jp.value(style.nodeDetails, "$.fills[0].color");
            if (styleValue) {
              // color is a {r, g,b} obj
              const hex = figmaRGBToHex(
                styleValue.r,
                styleValue.g,
                styleValue.b
              );
              addStyleToValueMap(type, hex, style);
            }
          }
          break;
      }*/
  }

  return styleLookupMap;
}

/**
 *
 * @param styles
 * @returns Object with style name as key and style as value
 * @description Creates a map of styles by name
 */
export function generateComponentMap(
  components: FigmaTeamComponent[]
): ComponentBucket {
  // create hashmap of styles by styleType
  const componentBucket: ComponentBucket = {};

  // create a map of the team components by their key
  for (const comp of components) {
    const getComponentReadableName = () => {
      if (comp.name.includes("=")) {
        return comp.containing_frame.name;
      }

      return comp.name;
    };

    if (componentBucket)
      componentBucket[comp.key] = { name: getComponentReadableName() };
  }
  return componentBucket;
}
