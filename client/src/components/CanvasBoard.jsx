import React, { useRef, useState, useEffect } from 'react';
import socket from '../socket';

const generatedId = 'User #' + Math.random().toString(36).substring(2, 6).toUpperCase();
const userColors = ['#f43f5e', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'];
const myCursorColor = userColors[Math.floor(Math.random() * userColors.length)];

const CanvasBoard = ({ replayFrame, currentUser, roomId = 'demo-room' }) => {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState('pen');
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [snapshot, setSnapshot] = useState(null);
  const [history, setHistory] = useState([]);
  const [remoteCursors, setRemoteCursors] = useState({});

  const targetRoom = roomId || 'demo-room';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Join room when component mounts or roomId changes
    socket.emit('join-room', targetRoom);

    const onInitialState = (items) => {
      if (Array.isArray(items)) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        items.forEach((item) => renderShape(ctx, item));
        setHistory(items);
      }
    };

    const onCanvasDraw = (item) => {
      if (item.type === 'clear') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setHistory([]);
      } else {
        renderShape(ctx, item);
        setHistory((prev) => [...prev, item]);
      }
    };

    const onCursorMove = (data) => {
      setRemoteCursors((prev) => ({
        ...prev,
        [data.socketId]: { x: data.x, y: data.y, user: data.user, color: data.color, avatar: data.avatar }
      }));
    };

    const onUserLeft = (id) => {
      setRemoteCursors((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    };

    socket.on('initial-canvas-state', onInitialState);
    socket.on('canvas-draw', onCanvasDraw);
    socket.on('cursor-move', onCursorMove);
    socket.on('user-left', onUserLeft);

    return () => {
      socket.off('initial-canvas-state', onInitialState);
      socket.off('canvas-draw', onCanvasDraw);
      socket.off('cursor-move', onCursorMove);
      socket.off('user-left', onUserLeft);
    };
  }, [targetRoom]);

  const renderShape = (ctx, item) => {
    ctx.strokeStyle = item.color || '#000000';
    ctx.fillStyle = item.color || '#000000';
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
      ctx.beginPath();
      const radius = Math.sqrt(Math.pow(x1 - x0, 2) + Math.pow(y1 - y0, 2));
      ctx.arc(x0, y0, radius, 0, 2 * Math.PI);
      ctx.stroke();
    } else if (type === 'diamond') {
      ctx.beginPath();
      const midX = (x0 + x1) / 2;
      const midY = (y0 + y1) / 2;
      ctx.moveTo(midX, y0);
      ctx.lineTo(x1, midY);
      ctx.lineTo(midX, y1);
      ctx.lineTo(x0, midY);
      ctx.closePath();
      ctx.stroke();
    } else if (type === 'text') {
      ctx.font = 'bold 16px Inter, sans-serif';
      ctx.fillText(text, x0, y0);
    } else if (type === 'clear') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const getCoords = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerMove = (e) => {
    const { x, y } = getCoords(e);
    const activeName = (typeof currentUser === 'object' ? currentUser?.name : currentUser) || generatedId;
    const activeAvatar = (typeof currentUser === 'object' ? currentUser?.avatar : '') || '';
    socket.emit('cursor-move', { room: targetRoom, x, y, user: activeName, color: myCursorColor, avatar: activeAvatar });

    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (tool === 'pen' || tool === 'eraser') {
      ctx.lineTo(x, y);
      ctx.stroke();
      const item = {
        room: targetRoom,
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

  const handleMouseDown = (e) => {
    const { x, y } = getCoords(e);
    if (tool === 'text') {
      const text = prompt('Enter text for whiteboard:');
      if (text) {
        const item = { room: targetRoom, type: 'text', text, x0: x, y0: y, color: strokeColor };
        const ctx = canvasRef.current.getContext('2d');
        renderShape(ctx, item);
        socket.emit('canvas-draw', item);
        setHistory((prev) => [...prev, item]);
      }
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
    }
  };

  const handleMouseUp = (e) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const { x, y } = getCoords(e);
    if (tool !== 'pen' && tool !== 'eraser') {
      const item = { room: targetRoom, type: tool, x0: startPos.x, y0: startPos.y, x1: x, y1: y, color: strokeColor, width: lineWidth };
      socket.emit('canvas-draw', item);
      setHistory((prev) => [...prev, item]);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    socket.emit('canvas-draw', { room: targetRoom, type: 'clear' });
    setHistory([]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#ffffff', position: 'relative' }}>
      {/* SyncSpace Pill Design Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        background: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {[
            { id: 'pen', label: '✏️ Pen' },
            { id: 'rect', label: '▭ Rectangle' },
            { id: 'circle', label: '⭕ Circle' },
            { id: 'diamond', label: '◇ Diamond' },
            { id: 'text', label: '🔤 Text' },
            { id: 'eraser', label: '🧹 Eraser' }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              style={{
                padding: '6px 14px',
                borderRadius: '9999px',
                border: tool === t.id ? '1px solid #000000' : '1px solid #e5e7eb',
                background: tool === t.id ? '#000000' : '#ffffff',
                color: tool === t.id ? '#ffffff' : '#1f2937',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.1s ease'
              }}
            >
              {t.label}
            </button>
          ))}
          <button
            onClick={clearCanvas}
            style={{
              padding: '6px 14px',
              borderRadius: '9999px',
              border: '1px solid #fecaca',
              background: '#fee2e2',
              color: '#b91c1c',
              fontSize: '12px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            🗑 Clear
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="color"
            value={strokeColor}
            onChange={(e) => setStrokeColor(e.target.value)}
            style={{
              width: '24px',
              height: '24px',
              border: 'none',
              borderRadius: '50%',
              cursor: 'pointer',
              background: 'transparent'
            }}
            title="Stroke Color"
          />
          <span className="caption" style={{ color: '#6b7280' }}>
            SPACE: {targetRoom}
          </span>
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ display: 'block', width: '100%', height: '100%', cursor: tool === 'text' ? 'text' : 'crosshair' }}
        />

        {Object.entries(remoteCursors).map(([id, cursor]) => (
          <div key={id} style={{ position: 'absolute', left: `${cursor.x}px`, top: `${cursor.y}px`, pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: '4px', zIndex: 50 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill={cursor.color}><path d="M3 3l7 18 3-7 7-3L3 3z" /></svg>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              background: cursor.color,
              color: '#ffffff',
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '9999px',
              fontWeight: 'bold',
              boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
            }}>
              {cursor.avatar && (
                <img src={cursor.avatar} alt="" style={{ width: '14px', height: '14px', borderRadius: '50%', objectFit: 'cover' }} />
              )}
              <span>{cursor.user}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CanvasBoard;