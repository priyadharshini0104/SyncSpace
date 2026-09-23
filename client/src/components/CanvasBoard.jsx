import React, { useState, useRef } from 'react';
import { Stage, Layer, Line, Rect, Text } from 'react-konva';
export default function CanvasBoard({ tool = 'pen', color = '#000000' }) {
  const [lines, setLines] = useState([]);
  const [rectangles, setRectangles] = useState([]);
  const [texts, setTexts] = useState([]);
  const isDrawing = useRef(false);
  const handleMouseDown = (e) => {
    isDrawing.current = true;
    const pos = e.target.getStage().getPointerPosition();
    if (tool === 'pen') {
      setLines([...lines, { tool, points: [pos.x, pos.y], color }]);
    } else if (tool === 'rect') {
      setRectangles([...rectangles, { x: pos.x, y: pos.y, width: 0, height: 0, color }]);
    } else if (tool === 'text') {
      setTexts([...texts, { x: pos.x, y: pos.y, text: 'Sample Text', fontSize: 16, fill: color }]);
    }
  };
  const handleMouseMove = (e) => {
    if (!isDrawing.current) return;
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    if (tool === 'pen') {
      let lastLine = lines[lines.length - 1];
      if (lastLine) {
        lastLine.points = lastLine.points.concat([point.x, point.y]);
        lines.splice(lines.length - 1, 1, lastLine);
        setLines(lines.concat());
      }
    } else if (tool === 'rect') {
      let lastRect = rectangles[rectangles.length - 1];
      if (lastRect) {
        lastRect.width = point.x - lastRect.x;
        lastRect.height = point.y - lastRect.y;
        rectangles.splice(rectangles.length - 1, 1, lastRect);
        setRectangles(rectangles.concat());
      }
    }
  };
  const handleMouseUp = () => {
    isDrawing.current = false;
  };
  return (
    <Stage
      width={window.innerWidth}
      height={window.innerHeight}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <Layer>
        {lines.map((line, i) => (
          <Line key={i} points={line.points} stroke={line.color} strokeWidth={3} tension={0.5} lineCap="round" />
        ))}
        {rectangles.map((r, i) => (
          <Rect key={i} x={r.x} y={r.y} width={r.width} height={r.height} stroke={r.color} strokeWidth={2} />
        ))}
        {texts.map((t, i) => (
          <Text key={i} x={t.x} y={t.y} text={t.text} fontSize={t.fontSize} fill={t.fill} draggable />
        ))}
      </Layer>
    </Stage>
  );
}
