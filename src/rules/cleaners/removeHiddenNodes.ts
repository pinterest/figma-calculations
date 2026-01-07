import { FigmaCalculator } from "../..";

export async function removeHiddenNodes(startNode: BaseNode) {
  const hiddenNodes = FigmaCalculator.FindAll(
    startNode,
    (n) => n.visible === false
  );
  for (let i = 0; i < hiddenNodes.length; i++) {
    try {
      await FigmaCalculator.RemoveNode(startNode, hiddenNodes[i].id);
    } catch (e) {
      //console.log('Could not remove ' + hiddenNodes[i]);
    }
  }
}
