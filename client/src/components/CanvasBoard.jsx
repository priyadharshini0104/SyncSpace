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

    // Join room when component mounts or roomId changes with user awareness
    socket.emit('join-room', {
      roomId: targetRoom,
      user: currentUser,
      color: myCursorColor
    });

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

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      const prevImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.putImageData(prevImage, 0, 0);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      socket.off('initial-canvas-state', onInitialState);
      socket.off('canvas-draw', onCanvasDraw);
      socket.off('cursor-move', onCursorMove);
      socket.off('user-left', onUserLeft);
    };
  }, [targetRoom, currentUser]);

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
    const confirmed = window.confirm('Are you sure you want to clear the whiteboard canvas for all collaborators?');
    if (!confirmed) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    socket.emit('canvas-draw', { room: targetRoom, type: 'clear' });
    setHistory([]);
  };

  const exportCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const imageUri = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `syncspace-${targetRoom}-diagram.png`;
    link.href = imageUri;
    link.click();
  };

  const curatedColors = [
    { label: 'Black Ink', value: '#000000' },
    { label: 'Magenta Promo', value: '#ff2e93' },
    { label: 'Block Lilac', value: '#8b5cf6' },
    { label: 'Block Mint', value: '#10b981' },
    { label: 'Block Coral', value: '#f59e0b' },
    { label: 'System Blue', value: '#3b82f6' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#ffffff', position: 'relative' }}>
      {/* SyncSpace DESIGN.md Floating Pill Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 20px',
        background: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        zIndex: 10,
        gap: '12px',
        flexWrap: 'wrap'
      }}>
        {/* Drawing Tools Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { id: 'pen', label: '✏️ Pen' },
            { id: 'rect', label: '▭ Rectangle' },
            { id: 'circle', label: '⭕ Circle' },
            { id: 'diamond', label: '◇ Diamond' },
            { id: 'text', label: '🔤 Text' },
            { id: 'eraser', label: '🧹 Eraser' }
          ].map((t) => {
            const isActive = tool === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTool(t.id)}
                className={isActive ? 'button-primary' : 'button-secondary'}
                style={{
                  padding: '6px 14px',
                  fontSize: '12px',
                  borderRadius: '9999px',
                  boxShadow: isActive ? '0 2px 6px rgba(0,0,0,0.12)' : 'none'
                }}
              >
                {t.label}
              </button>
            );
          })}

          <div style={{ height: '20px', width: '1px', backgroundColor: '#e5e7eb', margin: '0 4px' }} />

          {/* Line Width Selector Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {[
              { width: 2, label: 'Fine' },
              { width: 4, label: 'Medium' },
              { width: 8, label: 'Bold' }
            ].map((s) => (
              <button
                key={s.width}
                type="button"
                onClick={() => setLineWidth(s.width)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  fontSize: '11px',
                  fontWeight: '600',
                  border: lineWidth === s.width ? '1px solid #000000' : '1px solid #e5e7eb',
                  backgroundColor: lineWidth === s.width ? '#000000' : '#ffffff',
                  color: lineWidth === s.width ? '#ffffff' : '#4b5563',
                  cursor: 'pointer'
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Color Palette & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px', borderRadius: '9999px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}>
            {curatedColors.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setStrokeColor(c.value)}
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: c.value,
                  border: strokeColor === c.value ? '2px solid #000000' : '1px solid rgba(0,0,0,0.15)',
                  transform: strokeColor === c.value ? 'scale(1.15)' : 'scale(1)',
                  cursor: 'pointer',
                  transition: 'transform 0.1s ease',
                  padding: 0
                }}
                title={c.label}
              />
            ))}
            <input
              type="color"
              value={strokeColor}
              onChange={(e) => setStrokeColor(e.target.value)}
              style={{
                width: '22px',
                height: '22px',
                border: 'none',
                borderRadius: '50%',
                cursor: 'pointer',
                background: 'transparent',
                padding: 0
              }}
              title="Custom Color"
            />
          </div>

          <button
            type="button"
            onClick={exportCanvas}
            className="button-secondary"
            style={{ padding: '6px 14px', fontSize: '12px' }}
            title="Download high-resolution image of this whiteboard diagram"
          >
            💾 Export PNG
          </button>

          <button
            type="button"
            onClick={clearCanvas}
            style={{
              padding: '6px 14px',
              borderRadius: '9999px',
              border: '1px solid #fecaca',
              background: '#fff1f2',
              color: '#e11d48',
              fontSize: '12px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
            title="Clear the whiteboard canvas"
          >
            🗑 Clear
          </button>
        </div>
      </div>

      {/* Canvas Area with Editorial Dot-Grid Surface */}
      <div style={{
        flex: 1,
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: '#ffffff',
        backgroundImage: 'radial-gradient(#e5e7eb 1.5px, transparent 1.5px)',
        backgroundSize: '24px 24px'
      }}>
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            cursor: tool === 'text' ? 'text' : (tool === 'eraser' ? 'cell' : 'crosshair')
          }}
        />

        {/* Collaborative Multi-User Remote Cursors */}
        {Object.entries(remoteCursors).map(([id, cursor]) => (
          <div
            key={id}
            style={{
              position: 'absolute',
              left: `${cursor.x}px`,
              top: `${cursor.y}px`,
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              zIndex: 50,
              transition: 'left 0.04s linear, top 0.04s linear'
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill={cursor.color}>
              <path d="M3 3l7 18 3-7 7-3L3 3z" />
            </svg>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: cursor.color,
              color: '#ffffff',
              fontSize: '11px',
              padding: '3px 10px',
              borderRadius: '9999px',
              fontWeight: '600',
              boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
              border: '1.5px solid #ffffff'
            }}>
              {cursor.avatar && (
                <img
                  src={cursor.avatar}
                  alt=""
                  style={{ width: '14px', height: '14px', borderRadius: '50%', objectFit: 'cover' }}
                />
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