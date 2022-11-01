import { FigmaCalculator } from "../..";

export function removeNodesOutsideFrameBounds(startNode: BaseNode) {
  // only do this for top-level frames
  const nodes = FigmaCalculator.FindChildren(
    startNode,
    (n) => n.type === "FRAME"
  );

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i] as FrameNode;

    //const oob = node.findAll(n => n.absoluteTransform && n.absoluteTransform[0][2] > node.x + node.width || n.absoluteTransform[1][2] > node.y + node.height)
    const oob = node.findAll();

    const oobNodes = [];

    for (let j = 0; j < oob.length; j++) {
      const child = oob[j];
      //console.log(child.name, child.absoluteTransform[0][2], child.width, node.x, node.width, child.absoluteTransform[1][2], child.height, node.y, node.height)

      // out of bounds to the top
      if (child.absoluteTransform[1][2] + child.height < node.y) {
        //console.log('out of bounds to the top')
        oobNodes.push(child);
      }
      // out of bounds to the bottom
      else if (child.absoluteTransform[1][2] > node.y + node.height) {
        //console.log('out of bounds to the bottom')
        oobNodes.push(child);
      }
      // out of bounds to the left
      else if (child.absoluteTransform[0][2] + child.width < node.x) {
        //console.log('out of bounds to the left')
        oobNodes.push(child);
      }
      // out of bounds to the right
      else if (child.absoluteTransform[0][2] > node.x + node.width) {
        //console.log('out of bounds to the right')
        oobNodes.push(child);
      }
    }

    for (let k = 0; k < oobNodes.length; k++) {
      try {
        FigmaCalculator.RemoveNode(startNode, oobNodes[k].id);
      } catch (e) {
        //console.log('Could not remove ' + hiddenNodes[i]);
      }
    }
  }
}
