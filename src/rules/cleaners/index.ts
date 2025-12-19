import { removeNodesOutsideFrameBounds } from "./removeNodesOutsideFrameBounds";
import { removeTransparentNodes } from "./removeTransparentNodes";
import { removeEmptyFramesAndGroups } from "./removeEmptyFramesAndGroups";
import { removeHiddenNodes } from "./removeHiddenNodes";

export {
  removeNodesOutsideFrameBounds,
  removeTransparentNodes,
  removeHiddenNodes,
  removeEmptyFramesAndGroups,
};

export class LintCleaner {
  static async run(startNode: BaseNode) {
    await removeEmptyFramesAndGroups(startNode);
    await removeTransparentNodes(startNode);
    // await removeHiddenNodes(startNode);
    // await removeNodesOutsideFrameBounds(startNode);
  }
}

export default LintCleaner;
