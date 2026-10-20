/**
 * Convert saved SyncSpace shapes to descriptors suitable for a React-Konva
 * renderer. Adapt property names to match your current whiteboard schema.
 * This function does not clear or mutate a live Konva stage.
 */
export function restoreCanvasSnapshot(shapes = []) {
  if (!Array.isArray(shapes)) {
    throw new TypeError("restoreCanvasSnapshot expects an array of shapes.");
  }

  return shapes.filter(Boolean).map((shape, index) => {
    const id = shape.id ?? `restored-${index}`;
    const common = { key: id, id };

    switch (shape.type) {
      case "pen":
      case "line":
      case "eraser":
        return {
          ...common,
          nodeType: "Line",
          points: Array.isArray(shape.points) ? [...shape.points] : [],
          stroke: shape.stroke ?? "#111827",
          strokeWidth: Number(shape.strokeWidth ?? 3),
          lineCap: shape.lineCap ?? "round",
          lineJoin: shape.lineJoin ?? "round",
          globalCompositeOperation:
            shape.type === "eraser" ? "destination-out" : "source-over",
        };
      case "rect":
      case "rectangle":
        return {
          ...common, nodeType: "Rect",
          x: Number(shape.x ?? 0), y: Number(shape.y ?? 0),
          width: Number(shape.width ?? 0), height: Number(shape.height ?? 0),
          stroke: shape.stroke ?? "#111827",
          strokeWidth: Number(shape.strokeWidth ?? 2),
          fill: shape.fill ?? "transparent",
        };
      case "circle":
        return {
          ...common, nodeType: "Circle",
          x: Number(shape.x ?? 0), y: Number(shape.y ?? 0),
          radius: Number(shape.radius ?? 0),
          stroke: shape.stroke ?? "#111827",
          strokeWidth: Number(shape.strokeWidth ?? 2),
          fill: shape.fill ?? "transparent",
        };
      case "text":
        return {
          ...common, nodeType: "Text",
          x: Number(shape.x ?? 0), y: Number(shape.y ?? 0),
          text: String(shape.text ?? ""),
          fill: shape.fill ?? "#111827",
          fontSize: Number(shape.fontSize ?? 18),
          fontFamily: shape.fontFamily ?? "Arial",
        };
      default:
        return { ...common, nodeType: "Unknown", original: { ...shape } };
    }
  });
}
