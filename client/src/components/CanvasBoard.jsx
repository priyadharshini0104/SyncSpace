import React, { useRef, useState, useEffect } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

const CanvasBoard = ({ replayFrame }) => {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState('pen');
  const [strokeColor, setStrokeColor] = useState('#2563eb');
  const [lineWidth, setLineWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [snapshot, setSnapshot] = useState(null);
  const [history, setHistory] = useState([]);
  const [textInput, setTextInput] = useState('');
  const [textPos, setTextPos] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    socket.emit('join-room', 'demo-room');

    socket.on('canvas-draw', (item) => {
      renderShape(ctx, item);
      setHistory((prev) => [...prev, item]);
    });

    return () => {
      socket.off('canvas-draw');
    };
  }, []);

  const renderShape = (ctx, item) => {
    ctx.strokeStyle = item.color || '#2563eb';
    ctx.fillStyle = item.color || '#2563eb';
    ctx.lineWidth = item.width || 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const { type, x0, y0, x1, y1, text } = item;

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
    } else if (type === 'diamond') {
      const midX = (x0 + x1) / 2;
      const midY = (y0 + y1) / 2;
      ctx.beginPath();
      ctx.moveTo(midX, y0);
      ctx.lineTo(x1, midY);
      ctx.lineTo(midX, y1);
      ctx.lineTo(x0, midY);
      ctx.closePath();
      ctx.stroke();
    } else if (type === 'arrow') {
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      const angle = Math.atan2(y1 - y0, x1 - x0);
      const head = 12;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1 - head * Math.cos(angle - Math.PI / 6), y1 - head * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(x1 - head * Math.cos(angle + Math.PI / 6), y1 - head * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();
    } else if (type === 'text') {
      ctx.font = '16px sans-serif';
      ctx.fillText(text, x0, y0);
    } else if (type === 'clear') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  // Replay scrubbing execution (Week 4 Requirement)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || history.length === 0) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const count = Math.round((replayFrame / 50) * history.length);
    for (let i = 0; i < count; i++) {
      renderShape(ctx, history[i]);
    }
  }, [replayFrame]);

  const getCoords = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseDown = (e) => {
    const { x, y } = getCoords(e);
    if (tool === 'text') {
      setTextPos({ x, y });
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    setIsDrawing(true);
    setStartPos({ x, y });
    setSnapshot(ctx.getImageData(0, 0, canvas.width, canvas.height));

    if (tool === 'pen' || tool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : strokeColor;
      ctx.lineWidth = tool === 'eraser' ? 24 : lineWidth;
      ctx.lineCap = 'round';
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    const { x, y } = getCoords(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (tool === 'pen' || tool === 'eraser') {
      ctx.lineTo(x, y);
      ctx.stroke();

      const item = {
        room: 'demo-room',
        type: 'line',
        x0: startPos.x,
        y0: startPos.y,
        x1: x,
        y1: y,
        color: tool === 'eraser' ? '#ffffff' : strokeColor,
        width: tool === 'eraser' ? 24 : lineWidth
      };
      socket.emit('canvas-draw', item);
      setHistory((prev) => [...prev, item]);
      setStartPos({ x, y });
    } else {
      ctx.putImageData(snapshot, 0, 0);
      renderShape(ctx, { type: tool, x0: startPos.x, y0: startPos.y, x1: x, y1: y, color: strokeColor, width: lineWidth });
    }
  };

  const handleMouseUp = (e) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const { x, y } = getCoords(e);

    if (tool !== 'pen' && tool !== 'eraser') {
      const item = { room: 'demo-room', type: tool, x0: startPos.x, y0: startPos.y, x1: x, y1: y, color: strokeColor, width: lineWidth };
      socket.emit('canvas-draw', item);
      setHistory((prev) => [...prev, item]);
    }
  };

  const submitText = () => {
    if (!textInput || !textPos) return;
    const item = { room: 'demo-room', type: 'text', text: textInput, x0: textPos.x, y0: textPos.y, color: strokeColor };
    const ctx = canvasRef.current.getContext('2d');
    renderShape(ctx, item);
    socket.emit('canvas-draw', item);
    setHistory((prev) => [...prev, item]);
    setTextInput('');
    setTextPos(null);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    socket.emit('canvas-draw', { room: 'demo-room', type: 'clear' });
    setHistory([]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#ffffff', position: 'relative' }}>
      {/* Advanced Toolbar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 12px',
        background: '#f8fafc',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <button onClick={() => setTool('pen')} style={{ padding: '5px 10px', borderRadius: '4px', background: tool === 'pen' ? '#2563eb' : '#e2e8f0', color: tool === 'pen' ? '#fff' : '#000', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>✏️ Pen</button>
        <button onClick={() => setTool('rect')} style={{ padding: '5px 10px', borderRadius: '4px', background: tool === 'rect' ? '#2563eb' : '#e2e8f0', color: tool === 'rect' ? '#fff' : '#000', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>▭ Rectangle</button>
        <button onClick={() => setTool('circle')} style={{ padding: '5px 10px', borderRadius: '4px', background: tool === 'circle' ? '#2563eb' : '#e2e8f0', color: tool === 'circle' ? '#fff' : '#000', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>⭕ Circle</button>
        <button onClick={() => setTool('diamond')} style={{ padding: '5px 10px', borderRadius: '4px', background: tool === 'diamond' ? '#2563eb' : '#e2e8f0', color: tool === 'diamond' ? '#fff' : '#000', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>◇ Diamond</button>
        <button onClick={() => setTool('arrow')} style={{ padding: '5px 10px', borderRadius: '4px', background: tool === 'arrow' ? '#2563eb' : '#e2e8f0', color: tool === 'arrow' ? '#fff' : '#000', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>➔ Arrow</button>
        <button onClick={() => setTool('text')} style={{ padding: '5px 10px', borderRadius: '4px', background: tool === 'text' ? '#2563eb' : '#e2e8f0', color: tool === 'text' ? '#fff' : '#000', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>🔤 Text</button>
        <button onClick={() => setTool('eraser')} style={{ padding: '5px 10px', borderRadius: '4px', background: tool === 'eraser' ? '#ef4444' : '#e2e8f0', color: tool === 'eraser' ? '#fff' : '#000', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>🧹 Eraser</button>
        <button onClick={clearCanvas} style={{ padding: '5px 10px', borderRadius: '4px', background: '#64748b', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>🗑 Clear</button>

        <span style={{ fontSize: '12px', fontWeight: 'bold', marginLeft: '6px', color: '#334155' }}>Size:</span>
        <select value={lineWidth} onChange={(e) => setLineWidth(Number(e.target.value))} style={{ padding: '3px 6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
          <option value="2">Thin (2px)</option>
          <option value="4">Medium (4px)</option>
          <option value="8">Bold (8px)</option>
        </select>

        <span style={{ fontSize: '12px', fontWeight: 'bold', marginLeft: '6px', color: '#334155' }}>Color:</span>
        <input type="color" value={strokeColor} onChange={(e) => setStrokeColor(e.target.value)} style={{ width: '28px', height: '28px', border: 'none', cursor: 'pointer' }} />
      </div>

      {/* Floating Text Dialog when Text Tool is clicked */}
      {textPos && (
        <div style={{ position: 'absolute', left: textPos.x, top: textPos.y, zIndex: 10, background: '#fff', padding: '6px', border: '1px solid #000', borderRadius: '4px', display: 'flex', gap: '4px' }}>
          <input autoFocus type="text" placeholder="Type text..." value={textInput} onChange={(e) => setTextInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitText()} style={{ padding: '4px', fontSize: '13px' }} />
          <button onClick={submitText} style={{ padding: '4px 8px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px' }}>Add</button>
        </div>
      )}

      {/* Canvas Area */}
      <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%' }}>
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ display: 'block', width: '100%', height: '100%', cursor: tool === 'text' ? 'text' : tool === 'eraser' ? 'cell' : 'crosshair' }}
        />
      </div>
    </div>
  );
};

export default CanvasBoard;