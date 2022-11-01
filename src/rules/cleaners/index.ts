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
  static run(startNode: BaseNode) {
    removeEmptyFramesAndGroups(startNode);
    removeTransparentNodes(startNode);
    removeHiddenNodes(startNode);
    removeNodesOutsideFrameBounds(startNode);
  }
}

export default LintCleaner;
