import { FigmaCalculator } from "../..";

export function removeHiddenNodes(startNode: BaseNode) {
  const hiddenNodes = FigmaCalculator.FindAll(
    startNode,
    (n) => n.visible === false
  );
  for (var i = 0; i < hiddenNodes.length; i++) {
    try {
      FigmaCalculator.RemoveNode(startNode, hiddenNodes[i].id);
    } catch (e) {
      //console.log('Could not remove ' + hiddenNodes[i]);
    }
  }
}
