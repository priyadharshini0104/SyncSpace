import React, { useRef, useState, useEffect } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

const CanvasBoard = ({ replayFrame }) => {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState('pen');
  const [strokeColor, setStrokeColor] = useState('#2563eb');
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [snapshot, setSnapshot] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    socket.emit('join-room', 'demo-room');

    socket.on('canvas-draw', (data) => {
      const { type, x0, y0, x1, y1, color, size } = data;
      ctx.strokeStyle = color;
      ctx.lineWidth = size || 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (type === 'line') {
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      } else if (type === 'rect') {
        ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
      } else if (type === 'circle') {
        const radius = Math.sqrt(Math.pow(x1 - x0, 2) + Math.pow(y1 - y0, 2));
        ctx.beginPath();
        ctx.arc(x0, y0, radius, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (type === 'arrow') {
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      } else if (type === 'clear') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    });

    return () => {
      socket.off('canvas-draw');
    };
  }, []);

  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleMouseDown = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCanvasCoords(e);

    setIsDrawing(true);
    setStartPos({ x, y });
    setSnapshot(ctx.getImageData(0, 0, canvas.width, canvas.height));

    if (tool === 'pen' || tool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : strokeColor;
      ctx.lineWidth = tool === 'eraser' ? 24 : 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCanvasCoords(e);

    if (tool === 'pen' || tool === 'eraser') {
      ctx.lineTo(x, y);
      ctx.stroke();

      socket.emit('canvas-draw', {
        room: 'demo-room',
        type: 'line',
        x0: startPos.x,
        y0: startPos.y,
        x1: x,
        y1: y,
        color: tool === 'eraser' ? '#ffffff' : strokeColor,
        size: tool === 'eraser' ? 24 : 3
      });
      setStartPos({ x, y });
    } else {
      ctx.putImageData(snapshot, 0, 0);
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 3;

      if (tool === 'rect') {
        ctx.strokeRect(startPos.x, startPos.y, x - startPos.x, y - startPos.y);
      } else if (tool === 'circle') {
        const radius = Math.sqrt(Math.pow(x - startPos.x, 2) + Math.pow(y - startPos.y, 2));
        ctx.beginPath();
        ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (tool === 'arrow') {
        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    }
  };

  const handleMouseUp = (e) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const { x, y } = getCanvasCoords(e);

    if (tool !== 'pen' && tool !== 'eraser') {
      socket.emit('canvas-draw', {
        room: 'demo-room',
        type: tool,
        x0: startPos.x,
        y0: startPos.y,
        x1: x,
        y1: y,
        color: strokeColor,
        size: 3
      });
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    socket.emit('canvas-draw', { room: 'demo-room', type: 'clear' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#ffffff' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        background: '#f8fafc',
        borderBottom: '1px solid #e2e8f0',
        color: '#0f172a'
      }}>
        <button onClick={() => setTool('pen')} style={{ padding: '6px 12px', borderRadius: '4px', background: tool === 'pen' ? '#2563eb' : '#e2e8f0', color: tool === 'pen' ? '#fff' : '#000', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>✏️ Pen</button>
        <button onClick={() => setTool('rect')} style={{ padding: '6px 12px', borderRadius: '4px', background: tool === 'rect' ? '#2563eb' : '#e2e8f0', color: tool === 'rect' ? '#fff' : '#000', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>▭ Rectangle</button>
        <button onClick={() => setTool('circle')} style={{ padding: '6px 12px', borderRadius: '4px', background: tool === 'circle' ? '#2563eb' : '#e2e8f0', color: tool === 'circle' ? '#fff' : '#000', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>⭕ Circle</button>
        <button onClick={() => setTool('arrow')} style={{ padding: '6px 12px', borderRadius: '4px', background: tool === 'arrow' ? '#2563eb' : '#e2e8f0', color: tool === 'arrow' ? '#fff' : '#000', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>➔ Arrow</button>
        <button onClick={() => setTool('eraser')} style={{ padding: '6px 12px', borderRadius: '4px', background: tool === 'eraser' ? '#ef4444' : '#e2e8f0', color: tool === 'eraser' ? '#fff' : '#000', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>🧹 Eraser</button>
        <button onClick={clearCanvas} style={{ padding: '6px 12px', borderRadius: '4px', background: '#64748b', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>🗑 Clear</button>

        <span style={{ marginLeft: '12px', fontSize: '13px', fontWeight: 'bold' }}>Color:</span>
        <input 
          type="color" 
          value={strokeColor} 
          onChange={(e) => setStrokeColor(e.target.value)} 
          style={{ width: '28px', height: '28px', border: 'none', cursor: 'pointer', background: 'transparent' }}
        />
      </div>

      <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%' }}>
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            cursor: tool === 'eraser' ? 'cell' : 'crosshair'
          }}
        />
      </div>
    </div>
  );
};

export default CanvasBoard;