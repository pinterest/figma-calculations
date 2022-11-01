import { FigmaCalculator } from "../..";

export function removeEmptyFramesAndGroups(startNode: BaseNode) {
  const frames = FigmaCalculator.FindAll(
    startNode,
    (n) => n.type === "FRAME" || n.type === "GROUP"
  );
  for (let j = 0; j < frames.length; j++) {
    const frame = frames[j] as FrameNode;

    const hasNoChildren = !frame.children || frame.children.length === 0;
    const hasNoFills =
      !Array.isArray(frame.fills) || !frame.fills || frame.fills.length === 0;

    const hasNoFillStyle =
      !frame.fillStyleId ||
      ((frame as any).styles && !(frame as any).styles.fill);

    if (hasNoChildren && hasNoFills && hasNoFillStyle) {
      try {
        FigmaCalculator.RemoveNode(startNode, frame.id);
      } catch (e) {}
    }
  }
}
