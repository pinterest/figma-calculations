import { FigmaCalculator } from "../..";

export function removeTransparentNodes(startNode: BaseNode) {
  const hiddenNodes = FigmaCalculator.FindAll(
    startNode,
    (n: any) => n.opacity && n.opacity === 0
  );
  for (let i = 0; i < hiddenNodes.length; i++) {
    try {
      FigmaCalculator.RemoveNode(startNode, hiddenNodes[i].id);
    } catch (e) {
      //console.log('Could not remove ' + hiddenNodes[i]);
    }
  }
}
