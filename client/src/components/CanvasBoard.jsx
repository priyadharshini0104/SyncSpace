import React, { useRef, useState, useEffect, useCallback } from 'react';
import socket from '../socket';

const generatedId = 'User #' + Math.random().toString(36).substring(2, 6).toUpperCase();
const userColors = ['#f43f5e', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'];
const myCursorColor = userColors[Math.floor(Math.random() * userColors.length)];

const CanvasBoard = ({ currentUser, roomId = 'demo-room' }) => {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState('select'); // 'select' | 'pen' | 'rect' | 'circle' | 'diamond' | 'text' | 'eraser'
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(3);
  const [fontSize, setFontSize] = useState(20); // 'text' font size: 14 | 20 | 32 | 48
  const [eraserSize, setEraserSize] = useState(24); // 'eraser' size: 12 | 24 | 48 | 72
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [snapshot, setSnapshot] = useState(null);
  const [history, setHistory] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [hoveredShapeId, setHoveredShapeId] = useState(null);
  const [hoveredHandle, setHoveredHandle] = useState(null); // 'nw' | 'ne' | 'se' | 'sw'
  const [remoteCursors, setRemoteCursors] = useState({});

  // Collaborative Action Notification Banner ("Who undid/redid who")
  const [toastNotice, setToastNotice] = useState(null);
  const toastTimeoutRef = useRef(null);

  // Step-by-Step History Replay State
  const [isReplayOpen, setIsReplayOpen] = useState(false);
  const [replayStep, setReplayStep] = useState(0);
  const [isReplayPlaying, setIsReplayPlaying] = useState(false);

  // Synchronous references to avoid stale closure state during 60-120fps mouse events
  const historyRef = useRef([]);
  const redoStackRef = useRef([]);
  const selectedIdRef = useRef(null);
  const toolRef = useRef('select');
  const dragStateRef = useRef({
    isDragging: false,
    isResizing: false,
    resizeHandle: null,
    selectedId: null,
    lastX: 0,
    lastY: 0,
    startX: 0,
    startY: 0,
    initialShape: null
  });

  const targetRoom = roomId || 'demo-room';

  const activeName = (typeof currentUser === 'object' ? currentUser?.name : currentUser) || generatedId;
  const activeAvatar = (typeof currentUser === 'object' ? currentUser?.avatar : '') || '';
  const activeEmail = (typeof currentUser === 'object' ? currentUser?.email : '') || '';

  const showToastNotification = useCallback((msg) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastNotice(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastNotice(null);
    }, 3500);
  }, []);

  // Synchronize ref copies whenever state changes
  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);

  // Normalize items to ensure all have unique IDs and author info
  const normalizeItems = useCallback((items) => {
    if (!Array.isArray(items)) return [];
    return items.map((item, idx) => ({
      ...item,
      id: item.id || `${item.type || 'shape'}-${idx}-${Date.now()}`,
      createdBy: item.createdBy || { name: 'Collaborator', color: '#6b7280' },
      createdAt: item.createdAt || Date.now()
    }));
  }, []);

  const renderShape = useCallback((ctx, item) => {
    if (!item) return;
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
      const fSize = item.fontSize || 20;
      ctx.font = `bold ${fSize}px Inter, system-ui, sans-serif`;
      ctx.fillText(text, x0, y0);
    }
  }, []);

  // Compute accurate bounding box for any shape or text
  const getItemBounds = useCallback((item) => {
    if (!item) return { minX: 0, maxX: 0, minY: 0, maxY: 0, boxX: 0, boxY: 0, boxW: 0, boxH: 0 };
    const { type, x0, y0, x1, y1, text } = item;
    let minX, maxX, minY, maxY;

    if (type === 'circle') {
      const r = Math.sqrt(Math.pow(x1 - x0, 2) + Math.pow(y1 - y0, 2));
      minX = x0 - r; maxX = x0 + r; minY = y0 - r; maxY = y0 + r;
    } else if (type === 'text') {
      const fSize = item.fontSize || 20;
      let textW = (text || '').length * (fSize * 0.6);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.font = `bold ${fSize}px Inter, system-ui, sans-serif`;
          textW = ctx.measureText(text || '').width;
        }
      }
      minX = x0 - 4; maxX = x0 + textW + 8; minY = y0 - (fSize * 1.05); maxY = y0 + (fSize * 0.25);
    } else {
      minX = Math.min(x0, x1 !== undefined ? x1 : x0);
      maxX = Math.max(x0, x1 !== undefined ? x1 : x0);
      minY = Math.min(y0, y1 !== undefined ? y1 : y0);
      maxY = Math.max(y0, y1 !== undefined ? y1 : y0);
    }

    const pad = 6;
    const boxX = minX - pad;
    const boxY = minY - pad;
    const boxW = Math.max(16, (maxX - minX) + pad * 2);
    const boxH = Math.max(16, (maxY - minY) + pad * 2);

    return { minX, maxX, minY, maxY, boxX, boxY, boxW, boxH };
  }, []);

  // Check if pointer is over any of the 4 interactive corner resize handles
  const getHandleAtPos = useCallback((item, px, py) => {
    if (!item) return null;
    const { boxX, boxY, boxW, boxH } = getItemBounds(item);
    const touchRadius = 10;
    const corners = [
      { handle: 'nw', x: boxX, y: boxY },
      { handle: 'ne', x: boxX + boxW, y: boxY },
      { handle: 'se', x: boxX + boxW, y: boxY + boxH },
      { handle: 'sw', x: boxX, y: boxY + boxH }
    ];

    for (const c of corners) {
      if (Math.abs(px - c.x) <= touchRadius && Math.abs(py - c.y) <= touchRadius) {
        return c.handle;
      }
    }
    return null;
  }, [getItemBounds]);

  const renderSelectionBox = useCallback((ctx, item) => {
    if (!item) return;
    const { boxX, boxY, boxW, boxH } = getItemBounds(item);

    ctx.save();
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    // 4 Corner Interactive Resize Handles
    ctx.setLineDash([]);
    const handleSize = 8;
    const corners = [
      { handle: 'nw', x: boxX, y: boxY },
      { handle: 'ne', x: boxX + boxW, y: boxY },
      { handle: 'se', x: boxX + boxW, y: boxY + boxH },
      { handle: 'sw', x: boxX, y: boxY + boxH }
    ];

    corners.forEach((c) => {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2;
      ctx.fillRect(c.x - handleSize / 2, c.y - handleSize / 2, handleSize, handleSize);
      ctx.strokeRect(c.x - handleSize / 2, c.y - handleSize / 2, handleSize, handleSize);
    });

    // Label Badge with Author Attribution ("Who drew this")
    const author = item.createdBy?.name || 'Collaborator';
    const isMe = item.createdBy?.email === activeEmail || item.createdBy?.name === activeName;
    const authorTag = isMe ? 'You' : author;

    ctx.fillStyle = '#2563eb';
    ctx.font = '600 10px Inter, system-ui, sans-serif';
    const tagText = `${item.type.toUpperCase()} • Drawn by ${authorTag}`;
    const tagWidth = ctx.measureText(tagText).width + 12;
    ctx.fillRect(boxX, boxY - 20, tagWidth, 18);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(tagText, boxX + 6, boxY - 7);

    ctx.restore();
  }, [getItemBounds, activeEmail, activeName]);

  const redrawCanvas = useCallback((items, selId) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    (items || []).forEach((item) => {
      if (item.type !== 'clear') renderShape(ctx, item);
    });

    if (selId) {
      const selectedItem = (items || []).find((s) => s.id === selId);
      if (selectedItem) renderSelectionBox(ctx, selectedItem);
    }
  }, [renderShape, renderSelectionBox]);

  const hitTest = useCallback((item, px, py) => {
    if (!item) return false;
    const { type, x0, y0, x1, y1, text } = item;

    if (type === 'rect') {
      const minX = Math.min(x0, x1) - 6;
      const maxX = Math.max(x0, x1) + 6;
      const minY = Math.min(y0, y1) - 6;
      const maxY = Math.max(y0, y1) + 6;
      return px >= minX && px <= maxX && py >= minY && py <= maxY;
    }

    if (type === 'circle') {
      const radius = Math.sqrt(Math.pow(x1 - x0, 2) + Math.pow(y1 - y0, 2));
      const dist = Math.sqrt(Math.pow(px - x0, 2) + Math.pow(py - y0, 2));
      return dist <= radius + 10;
    }

    if (type === 'diamond') {
      const midX = (x0 + x1) / 2;
      const midY = (y0 + y1) / 2;
      const rx = Math.abs(x1 - x0) / 2 || 1;
      const ry = Math.abs(y1 - y0) / 2 || 1;
      return (Math.abs(px - midX) / rx + Math.abs(py - midY) / ry) <= 1.15;
    }

    if (type === 'text') {
      const fSize = item.fontSize || 20;
      const canvas = canvasRef.current;
      let textW = (text || '').length * (fSize * 0.6);
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.font = `bold ${fSize}px Inter, system-ui, sans-serif`;
          textW = ctx.measureText(text || '').width;
        }
      }
      return px >= x0 - 8 && px <= x0 + textW + 12 && py >= y0 - (fSize * 1.2) && py <= y0 + (fSize * 0.4);
    }

    if (type === 'line') {
      const minX = Math.min(x0, x1) - 10;
      const maxX = Math.max(x0, x1) + 10;
      const minY = Math.min(y0, y1) - 10;
      const maxY = Math.max(y0, y1) + 10;
      if (px < minX || px > maxX || py < minY || py > maxY) return false;
      const dx = x1 - x0;
      const dy = y1 - y0;
      const l2 = dx * dx + dy * dy;
      if (l2 === 0) return true;
      const t = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / l2));
      const projX = x0 + t * dx;
      const projY = y0 + t * dy;
      const d = Math.sqrt(Math.pow(px - projX, 2) + Math.pow(py - projY, 2));
      return d <= (item.width || 3) + 10;
    }

    return false;
  }, []);

  // Primary Socket Lifecycle — ONLY depends on roomId and currentUser
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Join room with user identity
    socket.emit('join-room', {
      roomId: targetRoom,
      user: currentUser,
      color: myCursorColor
    });

    const onInitialState = (items) => {
      const normalized = normalizeItems(items);
      historyRef.current = normalized;
      setHistory(normalized);
      redoStackRef.current = [];
      redrawCanvas(normalized, selectedIdRef.current);
    };

    const onCanvasDraw = (item) => {
      if (!item) return;
      if (item.type === 'clear') {
        historyRef.current = [];
        setHistory([]);
        redoStackRef.current = [];
        setSelectedId(null);
        selectedIdRef.current = null;
        redrawCanvas([], null);
      } else if (item.type === 'undo' || item.type === 'redo') {
        if (Array.isArray(item.history)) {
          const normalized = normalizeItems(item.history);
          historyRef.current = normalized;
          setHistory(normalized);
          redrawCanvas(normalized, selectedIdRef.current);
        }
        if (item.notification) {
          const symbol = item.notification.action === 'undo' ? '↩️' : '↪️';
          const verb = item.notification.action === 'undo' ? 'undid' : 'redid';
          showToastNotification(`${symbol} ${item.notification.performer} ${verb} ${item.notification.shapeType.toUpperCase()} (drawn by ${item.notification.author})`);
        }
      } else if (item.type === 'move') {
        if (item.shape && item.shape.id) {
          const updated = historyRef.current.map((s) => (s.id === item.shape.id ? item.shape : s));
          historyRef.current = updated;
          setHistory(updated);
          redrawCanvas(updated, selectedIdRef.current);
        }
      } else if (item.type === 'update-all') {
        if (Array.isArray(item.history)) {
          const normalized = normalizeItems(item.history);
          historyRef.current = normalized;
          setHistory(normalized);
          redrawCanvas(normalized, selectedIdRef.current);
        }
      } else if (item.type === 'delete-shape') {
        if (item.id) {
          const updated = historyRef.current.filter((s) => s.id !== item.id);
          historyRef.current = updated;
          setHistory(updated);
          if (selectedIdRef.current === item.id) {
            selectedIdRef.current = null;
            setSelectedId(null);
          }
          redrawCanvas(updated, selectedIdRef.current);
        }
      } else {
        const itemWithId = {
          ...item,
          id: item.id || `${item.type || 'shape'}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          createdBy: item.createdBy || { name: 'Collaborator', color: '#6b7280' },
          createdAt: item.createdAt || Date.now()
        };
        const updated = [...historyRef.current, itemWithId];
        historyRef.current = updated;
        setHistory(updated);
        redoStackRef.current = [];
        redrawCanvas(updated, selectedIdRef.current);
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
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
      redrawCanvas(historyRef.current, selectedIdRef.current);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      socket.off('initial-canvas-state', onInitialState);
      socket.off('canvas-draw', onCanvasDraw);
      socket.off('cursor-move', onCursorMove);
      socket.off('user-left', onUserLeft);
    };
  }, [targetRoom, currentUser, normalizeItems, redrawCanvas, showToastNotification]);

  // Collaborative Undo Action
  const handleUndo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    const currentItems = historyRef.current;
    const lastItem = currentItems[currentItems.length - 1];
    const remainingItems = currentItems.slice(0, -1);

    redoStackRef.current.push(lastItem);
    historyRef.current = remainingItems;
    setHistory(remainingItems);
    setSelectedId(null);
    selectedIdRef.current = null;
    redrawCanvas(remainingItems, null);

    const authorName = lastItem?.createdBy?.name || 'Collaborator';
    const isMe = lastItem?.createdBy?.name === activeName || lastItem?.createdBy?.email === activeEmail;
    const authorLabel = isMe ? 'You' : authorName;
    const notice = `↩️ You undid ${lastItem?.type?.toUpperCase() || 'shape'} (drawn by ${authorLabel})`;
    showToastNotification(notice);

    socket.emit('canvas-draw', {
      room: targetRoom,
      type: 'undo',
      history: remainingItems,
      notification: {
        action: 'undo',
        performer: activeName,
        author: authorLabel,
        shapeType: lastItem?.type || 'shape'
      }
    });
  }, [activeName, activeEmail, targetRoom, redrawCanvas, showToastNotification]);

  // Collaborative Redo Action
  const handleRedo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    const itemToRestore = redoStackRef.current.pop();
    const updatedItems = [...historyRef.current, itemToRestore];

    historyRef.current = updatedItems;
    setHistory(updatedItems);
    setSelectedId(itemToRestore.id);
    selectedIdRef.current = itemToRestore.id;
    redrawCanvas(updatedItems, itemToRestore.id);

    const authorName = itemToRestore?.createdBy?.name || 'Collaborator';
    const isMe = itemToRestore?.createdBy?.name === activeName || itemToRestore?.createdBy?.email === activeEmail;
    const authorLabel = isMe ? 'You' : authorName;
    const notice = `↪️ You redid ${itemToRestore?.type?.toUpperCase() || 'shape'} (drawn by ${authorLabel})`;
    showToastNotification(notice);

    socket.emit('canvas-draw', {
      room: targetRoom,
      type: 'redo',
      history: updatedItems,
      notification: {
        action: 'redo',
        performer: activeName,
        author: authorLabel,
        shapeType: itemToRestore?.type || 'shape'
      }
    });
  }, [activeName, activeEmail, targetRoom, redrawCanvas, showToastNotification]);

  // Keyboard shortcut listener: Delete, Backspace, Escape, Undo (Ctrl+Z), Redo (Ctrl+Y), and Tool hotkeys
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger shortcuts if typing inside an active input or textarea
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

      // Ctrl+Z or Cmd+Z -> Undo / Redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }

      // Ctrl+Y or Cmd+Y -> Redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIdRef.current && !isDrawing) {
        e.preventDefault();
        deleteSelectedShape();
      } else if (e.key === 'Escape') {
        setSelectedId(null);
        selectedIdRef.current = null;
        setHoveredHandle(null);
        redrawCanvas(historyRef.current, null);
      } else if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        const key = e.key.toLowerCase();
        if (key === 'v' || key === 's') setTool('select');
        else if (key === 'p') setTool('pen');
        else if (key === 'r') setTool('rect');
        else if (key === 'c') setTool('circle');
        else if (key === 'd') setTool('diamond');
        else if (key === 't') setTool('text');
        else if (key === 'e') setTool('eraser');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawing, redrawCanvas, handleUndo, handleRedo]);

  // Step-by-Step Replay Loop
  useEffect(() => {
    let interval = null;
    if (isReplayOpen && isReplayPlaying) {
      interval = setInterval(() => {
        setReplayStep((prev) => {
          if (prev >= history.length) {
            setIsReplayPlaying(false);
            return prev;
          }
          const next = prev + 1;
          redrawCanvas(history.slice(0, next), null);
          return next;
        });
      }, 700);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isReplayOpen, isReplayPlaying, history, redrawCanvas]);

  const toggleReplay = () => {
    if (!isReplayOpen) {
      setIsReplayOpen(true);
      setReplayStep(history.length);
      setIsReplayPlaying(false);
      setSelectedId(null);
      selectedIdRef.current = null;
    } else {
      setIsReplayOpen(false);
      setIsReplayPlaying(false);
      redrawCanvas(history, null);
    }
  };

  const handleReplaySlider = (e) => {
    const step = Number(e.target.value);
    setReplayStep(step);
    setIsReplayPlaying(false);
    redrawCanvas(history.slice(0, step), null);
  };

  const deleteSelectedShape = () => {
    const targetId = selectedIdRef.current;
    if (!targetId) return;
    const currentItems = historyRef.current;
    const deletedItem = currentItems.find((item) => item.id === targetId);
    const updated = currentItems.filter((item) => item.id !== targetId);

    if (deletedItem) redoStackRef.current.push(deletedItem);
    historyRef.current = updated;
    setHistory(updated);
    setSelectedId(null);
    selectedIdRef.current = null;
    setHoveredHandle(null);
    dragStateRef.current.selectedId = null;
    dragStateRef.current.isDragging = false;
    dragStateRef.current.isResizing = false;
    redrawCanvas(updated, null);

    const author = deletedItem?.createdBy?.name || 'Collaborator';
    showToastNotification(`🗑 Deleted ${deletedItem?.type?.toUpperCase() || 'shape'} (drawn by ${author})`);

    socket.emit('canvas-draw', { room: targetRoom, type: 'delete-shape', id: targetId });
  };

  // Accurate coordinate calculation accounting for canvas buffer vs display bounding rect
  const getCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / (rect.width || 1);
    const scaleY = canvas.height / (rect.height || 1);
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handlePointerMove = (e) => {
    const { x, y } = getCoords(e);
    socket.emit('cursor-move', { room: targetRoom, x, y, user: activeName, color: myCursorColor, avatar: activeAvatar });

    // In replay mode, drawing & dragging are temporarily frozen
    if (isReplayOpen) return;

    // Mode 1: RESIZING A SHAPE OR TEXT VIA CORNER HANDLES
    if (dragStateRef.current.isResizing && dragStateRef.current.selectedId) {
      const { resizeHandle, selectedId, initialShape, startX, startY } = dragStateRef.current;
      const currentItems = historyRef.current;
      const targetItem = currentItems.find((s) => s.id === selectedId);
      if (!targetItem || !initialShape) return;

      const dx = x - startX;
      const dy = y - startY;

      let updatedItem = { ...targetItem };

      if (targetItem.type === 'rect' || targetItem.type === 'diamond') {
        let newX0 = initialShape.x0;
        let newY0 = initialShape.y0;
        let newX1 = initialShape.x1;
        let newY1 = initialShape.y1;

        if (resizeHandle === 'se') {
          newX1 = initialShape.x1 + dx;
          newY1 = initialShape.y1 + dy;
        } else if (resizeHandle === 'nw') {
          newX0 = initialShape.x0 + dx;
          newY0 = initialShape.y0 + dy;
        } else if (resizeHandle === 'ne') {
          newX1 = initialShape.x1 + dx;
          newY0 = initialShape.y0 + dy;
        } else if (resizeHandle === 'sw') {
          newX0 = initialShape.x0 + dx;
          newY1 = initialShape.y1 + dy;
        }

        updatedItem.x0 = newX0;
        updatedItem.y0 = newY0;
        updatedItem.x1 = newX1;
        updatedItem.y1 = newY1;
      } else if (targetItem.type === 'circle') {
        const dist = Math.sqrt(Math.pow(x - initialShape.x0, 2) + Math.pow(y - initialShape.y0, 2));
        const newRadius = Math.max(8, dist);
        updatedItem.x0 = initialShape.x0;
        updatedItem.y0 = initialShape.y0;
        updatedItem.x1 = initialShape.x0 + newRadius;
        updatedItem.y1 = initialShape.y0;
      } else if (targetItem.type === 'text') {
        const initSize = initialShape.fontSize || 20;
        let delta = 0;
        if (resizeHandle === 'se' || resizeHandle === 'ne') delta = dx;
        else if (resizeHandle === 'sw' || resizeHandle === 'nw') delta = -dx;
        const newFontSize = Math.min(96, Math.max(12, Math.round(initSize + delta / 3)));
        updatedItem.fontSize = newFontSize;
      }

      const updated = currentItems.map((item) => (item.id === selectedId ? updatedItem : item));
      historyRef.current = updated;
      redrawCanvas(updated, selectedId);

      socket.emit('canvas-draw', {
        room: targetRoom,
        type: 'move',
        shape: updatedItem
      });
      return;
    }

    // Mode 2: DRAGGING AN EXISTING SHAPE OR TEXT
    if (dragStateRef.current.isDragging && dragStateRef.current.selectedId) {
      const dx = x - dragStateRef.current.lastX;
      const dy = y - dragStateRef.current.lastY;
      dragStateRef.current.lastX = x;
      dragStateRef.current.lastY = y;

      if (dx === 0 && dy === 0) return;

      const currentItems = historyRef.current;
      const updated = currentItems.map((item) => {
        if (item.id === dragStateRef.current.selectedId) {
          return {
            ...item,
            x0: item.x0 + dx,
            y0: item.y0 + dy,
            x1: item.x1 !== undefined ? item.x1 + dx : undefined,
            y1: item.y1 !== undefined ? item.y1 + dy : undefined
          };
        }
        return item;
      });

      historyRef.current = updated;
      redrawCanvas(updated, dragStateRef.current.selectedId);

      const movedItem = updated.find((s) => s.id === dragStateRef.current.selectedId);
      if (movedItem) {
        socket.emit('canvas-draw', {
          room: targetRoom,
          type: 'move',
          shape: movedItem
        });
      }
      return;
    }

    // Mode 3: HOVER DETECTION (Handles and Shapes)
    if (tool === 'select') {
      const currentItems = historyRef.current;
      if (selectedIdRef.current) {
        const selItem = currentItems.find((s) => s.id === selectedIdRef.current);
        const handle = getHandleAtPos(selItem, x, y);
        setHoveredHandle(handle);
        if (handle) return;
      } else {
        setHoveredHandle(null);
      }

      let hit = null;
      for (let i = currentItems.length - 1; i >= 0; i--) {
        if (hitTest(currentItems[i], x, y)) {
          hit = currentItems[i].id;
          break;
        }
      }
      setHoveredShapeId(hit);
      return;
    }

    // Mode 4: DRAWING SHAPES OR PEN
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (tool === 'pen' || tool === 'eraser') {
      ctx.lineTo(x, y);
      ctx.stroke();
      const item = {
        id: 'stroke-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
        room: targetRoom,
        type: 'line',
        x0: startPos.x,
        y0: startPos.y,
        x1: x,
        y1: y,
        color: tool === 'eraser' ? '#ffffff' : strokeColor,
        width: tool === 'eraser' ? eraserSize : lineWidth,
        createdBy: {
          name: activeName,
          email: activeEmail,
          avatar: activeAvatar,
          color: myCursorColor
        },
        createdAt: Date.now()
      };
      socket.emit('canvas-draw', item);
      const updated = [...historyRef.current, item];
      historyRef.current = updated;
      setHistory(updated);
      setStartPos({ x, y });
    } else {
      ctx.putImageData(snapshot, 0, 0);
      renderShape(ctx, { type: tool, x0: startPos.x, y0: startPos.y, x1: x, y1: y, color: strokeColor, width: lineWidth });
    }
  };

  const handleMouseDown = (e) => {
    if (isReplayOpen) return;
    const { x, y } = getCoords(e);
    const currentItems = historyRef.current;

    // Check if clicked on a resize handle of the currently selected shape
    if (selectedIdRef.current) {
      const selItem = currentItems.find((s) => s.id === selectedIdRef.current);
      const handle = getHandleAtPos(selItem, x, y);
      if (handle) {
        dragStateRef.current = {
          isDragging: false,
          isResizing: true,
          resizeHandle: handle,
          selectedId: selItem.id,
          startX: x,
          startY: y,
          lastX: x,
          lastY: y,
          initialShape: JSON.parse(JSON.stringify(selItem))
        };
        return;
      }
    }

    // Check hit test for existing elements
    let hitItem = null;
    for (let i = currentItems.length - 1; i >= 0; i--) {
      if (hitTest(currentItems[i], x, y)) {
        hitItem = currentItems[i];
        break;
      }
    }

    // INTERACTION A: User clicked on an existing shape
    if (tool === 'select' || (hitItem && tool !== 'pen' && tool !== 'eraser')) {
      if (hitItem) {
        setSelectedId(hitItem.id);
        selectedIdRef.current = hitItem.id;
        dragStateRef.current = {
          isDragging: true,
          isResizing: false,
          resizeHandle: null,
          selectedId: hitItem.id,
          lastX: x,
          lastY: y,
          startX: x,
          startY: y
        };
        if (tool !== 'select') setTool('select');
        redrawCanvas(currentItems, hitItem.id);
      } else {
        setSelectedId(null);
        selectedIdRef.current = null;
        setHoveredHandle(null);
        dragStateRef.current.isDragging = false;
        dragStateRef.current.isResizing = false;
        dragStateRef.current.selectedId = null;
        redrawCanvas(currentItems, null);
      }
      return;
    }

    // INTERACTION B: Text Creation
    if (tool === 'text') {
      const text = prompt('Enter text for whiteboard:');
      if (text && text.trim()) {
        const item = {
          id: 'text-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
          room: targetRoom,
          type: 'text',
          text: text.trim(),
          fontSize: fontSize,
          x0: x,
          y0: y,
          color: strokeColor,
          width: lineWidth,
          createdBy: {
            name: activeName,
            email: activeEmail,
            avatar: activeAvatar,
            color: myCursorColor
          },
          createdAt: Date.now()
        };
        const updated = [...currentItems, item];
        historyRef.current = updated;
        setHistory(updated);
        redoStackRef.current = [];
        setSelectedId(item.id);
        selectedIdRef.current = item.id;
        setTool('select');
        redrawCanvas(updated, item.id);
        socket.emit('canvas-draw', item);
      }
      return;
    }

    // INTERACTION C: Geometric Shapes & Pen Drawing
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    setIsDrawing(true);
    setStartPos({ x, y });
    setSnapshot(ctx.getImageData(0, 0, canvas.width, canvas.height));

    if (tool === 'pen' || tool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : strokeColor;
      ctx.lineWidth = tool === 'eraser' ? eraserSize : lineWidth;
    }
  };

  const handleMouseUp = (e) => {
    if (isReplayOpen) return;

    // 1. End of Resize
    if (dragStateRef.current.isResizing) {
      dragStateRef.current.isResizing = false;
      dragStateRef.current.resizeHandle = null;
      const currentItems = historyRef.current;
      setHistory(currentItems);
      socket.emit('canvas-draw', {
        room: targetRoom,
        type: 'update-all',
        history: currentItems
      });
      return;
    }

    // 2. End of Select & Drag
    if (dragStateRef.current.isDragging) {
      dragStateRef.current.isDragging = false;
      const activeSelId = dragStateRef.current.selectedId;
      const currentItems = historyRef.current;
      setHistory(currentItems);

      const movedItem = currentItems.find((s) => s.id === activeSelId);
      if (movedItem) {
        socket.emit('canvas-draw', {
          room: targetRoom,
          type: 'update-all',
          history: currentItems
        });
      }
      return;
    }

    // 3. End of Shape Drawing
    if (!isDrawing) return;
    setIsDrawing(false);
    const { x, y } = getCoords(e);

    if (tool !== 'pen' && tool !== 'eraser') {
      if (Math.abs(x - startPos.x) < 3 && Math.abs(y - startPos.y) < 3) {
        redrawCanvas(historyRef.current, selectedIdRef.current);
        return;
      }

      const newItem = {
        id: `${tool}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        room: targetRoom,
        type: tool,
        x0: startPos.x,
        y0: startPos.y,
        x1: x,
        y1: y,
        color: strokeColor,
        width: lineWidth,
        createdBy: {
          name: activeName,
          email: activeEmail,
          avatar: activeAvatar,
          color: myCursorColor
        },
        createdAt: Date.now()
      };
      const updated = [...historyRef.current, newItem];
      historyRef.current = updated;
      setHistory(updated);
      redoStackRef.current = [];
      setSelectedId(newItem.id);
      selectedIdRef.current = newItem.id;
      redrawCanvas(updated, newItem.id);
      socket.emit('canvas-draw', newItem);
    }
  };

  // Recolor a selected shape dynamically
  const handleColorChange = (newColor) => {
    setStrokeColor(newColor);
    if (selectedIdRef.current) {
      const currentItems = historyRef.current;
      const updated = currentItems.map((item) => {
        if (item.id === selectedIdRef.current) {
          return { ...item, color: newColor };
        }
        return item;
      });
      historyRef.current = updated;
      setHistory(updated);
      redrawCanvas(updated, selectedIdRef.current);
      const movedItem = updated.find((s) => s.id === selectedIdRef.current);
      if (movedItem) {
        socket.emit('canvas-draw', {
          room: targetRoom,
          type: 'move',
          shape: movedItem
        });
      }
    }
  };

  // Change stroke width for shapes or active tool
  const handleLineWidthChange = (w) => {
    setLineWidth(w);
    if (selectedIdRef.current) {
      const currentItems = historyRef.current;
      const updated = currentItems.map((item) => {
        if (item.id === selectedIdRef.current && item.type !== 'text') {
          return { ...item, width: w };
        }
        return item;
      });
      historyRef.current = updated;
      setHistory(updated);
      redrawCanvas(updated, selectedIdRef.current);
      const movedItem = updated.find((s) => s.id === selectedIdRef.current);
      if (movedItem) {
        socket.emit('canvas-draw', {
          room: targetRoom,
          type: 'move',
          shape: movedItem
        });
      }
    }
  };

  // Change font size for text
  const handleFontSizeChange = (size) => {
    setFontSize(size);
    if (selectedIdRef.current) {
      const currentItems = historyRef.current;
      const updated = currentItems.map((item) => {
        if (item.id === selectedIdRef.current && item.type === 'text') {
          return { ...item, fontSize: size };
        }
        return item;
      });
      historyRef.current = updated;
      setHistory(updated);
      redrawCanvas(updated, selectedIdRef.current);
      const movedItem = updated.find((s) => s.id === selectedIdRef.current);
      if (movedItem) {
        socket.emit('canvas-draw', {
          room: targetRoom,
          type: 'move',
          shape: movedItem
        });
      }
    }
  };

  // Scale selected shape or text up or down by factor
  const scaleSelectedShape = (factor) => {
    if (!selectedIdRef.current) return;
    const currentItems = historyRef.current;
    const updated = currentItems.map((item) => {
      if (item.id === selectedIdRef.current) {
        if (item.type === 'circle') {
          const r = Math.sqrt(Math.pow(item.x1 - item.x0, 2) + Math.pow(item.y1 - item.y0, 2));
          const newR = Math.max(8, Math.round(r * factor));
          return { ...item, x1: item.x0 + newR, y1: item.y0 };
        } else if (item.type === 'rect' || item.type === 'diamond') {
          const cx = (item.x0 + item.x1) / 2;
          const cy = (item.y0 + item.y1) / 2;
          const halfW = ((item.x1 - item.x0) / 2) * factor;
          const halfH = ((item.y1 - item.y0) / 2) * factor;
          return {
            ...item,
            x0: Math.round(cx - halfW),
            x1: Math.round(cx + halfW),
            y0: Math.round(cy - halfH),
            y1: Math.round(cy + halfH)
          };
        } else if (item.type === 'text') {
          const curSize = item.fontSize || 20;
          const newSize = Math.min(96, Math.max(12, Math.round(curSize * factor)));
          return { ...item, fontSize: newSize };
        }
      }
      return item;
    });

    historyRef.current = updated;
    setHistory(updated);
    redrawCanvas(updated, selectedIdRef.current);
    const movedItem = updated.find((s) => s.id === selectedIdRef.current);
    if (movedItem) {
      socket.emit('canvas-draw', {
        room: targetRoom,
        type: 'move',
        shape: movedItem
      });
    }
  };

  const clearCanvas = () => {
    const confirmed = window.confirm('Are you sure you want to clear the whiteboard canvas for all collaborators?');
    if (!confirmed) return;
    historyRef.current = [];
    setHistory([]);
    redoStackRef.current = [];
    setSelectedId(null);
    selectedIdRef.current = null;
    setHoveredHandle(null);
    dragStateRef.current.selectedId = null;
    dragStateRef.current.isDragging = false;
    dragStateRef.current.isResizing = false;
    redrawCanvas([], null);
    showToastNotification(`🗑 Whiteboard was cleared by ${activeName}`);
    socket.emit('canvas-draw', { room: targetRoom, type: 'clear' });
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

  const getCanvasCursor = () => {
    if (isReplayOpen) return 'default';
    if (dragStateRef.current.isResizing) {
      const h = dragStateRef.current.resizeHandle;
      if (h === 'nw' || h === 'se') return 'nwse-resize';
      if (h === 'ne' || h === 'sw') return 'nesw-resize';
      return 'crosshair';
    }
    if (hoveredHandle) {
      if (hoveredHandle === 'nw' || hoveredHandle === 'se') return 'nwse-resize';
      if (hoveredHandle === 'ne' || hoveredHandle === 'sw') return 'nesw-resize';
    }
    if (dragStateRef.current.isDragging) return 'grabbing';
    if (tool === 'select') {
      if (hoveredShapeId) return 'grab';
      return 'default';
    }
    if (hoveredShapeId && tool !== 'pen' && tool !== 'eraser') return 'pointer';
    if (tool === 'text') return 'text';
    if (tool === 'eraser') return 'cell';
    return 'crosshair';
  };

  const selectedItem = history.find((s) => s.id === selectedId);

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
        {/* Left: Drawing Tools, Undo / Redo & Replay */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {/* UNDO / REDO / REPLAY BUTTONS */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginRight: '6px' }}>
            <button
              type="button"
              onClick={handleUndo}
              disabled={history.length === 0 || isReplayOpen}
              className="button-secondary"
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                borderRadius: '9999px',
                cursor: history.length === 0 || isReplayOpen ? 'not-allowed' : 'pointer',
                opacity: history.length === 0 || isReplayOpen ? 0.4 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Undo last action (Ctrl+Z)"
            >
              <span>↩️ Undo</span>
            </button>

            <button
              type="button"
              onClick={handleRedo}
              disabled={redoStackRef.current.length === 0 || isReplayOpen}
              className="button-secondary"
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                borderRadius: '9999px',
                cursor: redoStackRef.current.length === 0 || isReplayOpen ? 'not-allowed' : 'pointer',
                opacity: redoStackRef.current.length === 0 || isReplayOpen ? 0.4 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Redo action (Ctrl+Y or Ctrl+Shift+Z)"
            >
              <span>↪️ Redo</span>
            </button>

            <button
              type="button"
              onClick={toggleReplay}
              className={isReplayOpen ? 'button-primary' : 'button-secondary'}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                borderRadius: '9999px',
                backgroundColor: isReplayOpen ? '#000000' : '#f3f4f6',
                color: isReplayOpen ? '#ffffff' : '#1f2937',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Interactive Step-by-Step History Replay with Author Cards"
            >
              <span>🎞️ {isReplayOpen ? 'Exit Replay' : 'Replay'}</span>
            </button>
          </div>

          <div style={{ height: '20px', width: '1px', backgroundColor: '#e5e7eb', margin: '0 4px' }} />

          {/* Tool Pills */}
          {[
            { id: 'select', label: '↖️ Select & Move', keyHint: 'V / S' },
            { id: 'pen', label: '✏️ Pen', keyHint: 'P' },
            { id: 'rect', label: '▭ Rectangle', keyHint: 'R' },
            { id: 'circle', label: '⭕ Circle', keyHint: 'C' },
            { id: 'diamond', label: '◇ Diamond', keyHint: 'D' },
            { id: 'text', label: '🔤 Text', keyHint: 'T' },
            { id: 'eraser', label: '🧹 Eraser', keyHint: 'E' }
          ].map((t) => {
            const isActive = tool === t.id && !isReplayOpen;
            return (
              <button
                key={t.id}
                type="button"
                disabled={isReplayOpen}
                onClick={() => {
                  setTool(t.id);
                  if (t.id !== 'select') {
                    setSelectedId(null);
                    selectedIdRef.current = null;
                    setHoveredHandle(null);
                    redrawCanvas(historyRef.current, null);
                  }
                }}
                className={isActive ? 'button-primary' : 'button-secondary'}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  borderRadius: '9999px',
                  boxShadow: isActive ? '0 2px 6px rgba(0,0,0,0.12)' : 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  opacity: isReplayOpen ? 0.4 : 1
                }}
                title={t.id === 'select' ? 'Click and drag any shape or text to move or resize it (Shortcut: V or S)' : `Draw ${t.label} (Shortcut: ${t.keyHint})`}
              >
                <span>{t.label}</span>
                <span style={{ fontSize: '10px', opacity: 0.65, fontWeight: 'normal' }}>({t.keyHint})</span>
              </button>
            );
          })}

          <div style={{ height: '20px', width: '1px', backgroundColor: '#e5e7eb', margin: '0 4px' }} />

          {/* DYNAMIC SIZE SELECTORS BASED ON ACTIVE TOOL */}
          {tool === 'eraser' ? (
            /* Eraser Size Selector Pills */
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: '600', color: '#6b7280' }}>Eraser:</span>
              {[
                { size: 12, label: 'Fine (12px)' },
                { size: 24, label: 'Normal (24px)' },
                { size: 48, label: 'Large (48px)' },
                { size: 72, label: 'Jumbo (72px)' }
              ].map((e) => (
                <button
                  key={e.size}
                  type="button"
                  onClick={() => setEraserSize(e.size)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    fontSize: '11px',
                    fontWeight: '600',
                    border: eraserSize === e.size ? '1px solid #000000' : '1px solid #e5e7eb',
                    backgroundColor: eraserSize === e.size ? '#000000' : '#ffffff',
                    color: eraserSize === e.size ? '#ffffff' : '#4b5563',
                    cursor: 'pointer'
                  }}
                  title={`Set eraser width to ${e.size}px`}
                >
                  {e.label}
                </button>
              ))}
            </div>
          ) : tool === 'text' ? (
            /* Text Font Size Selector Pills */
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: '600', color: '#6b7280' }}>Text Size:</span>
              {[
                { size: 14, label: '14px S' },
                { size: 20, label: '20px M' },
                { size: 32, label: '32px L' },
                { size: 48, label: '48px XL' }
              ].map((t) => (
                <button
                  key={t.size}
                  type="button"
                  onClick={() => handleFontSizeChange(t.size)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    fontSize: '11px',
                    fontWeight: '600',
                    border: fontSize === t.size ? '1px solid #000000' : '1px solid #e5e7eb',
                    backgroundColor: fontSize === t.size ? '#000000' : '#ffffff',
                    color: fontSize === t.size ? '#ffffff' : '#4b5563',
                    cursor: 'pointer'
                  }}
                  title={`Set text size to ${t.size}px`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          ) : (
            /* Shape Stroke Thickness Selector Pills */
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: '600', color: '#6b7280' }}>Stroke:</span>
              {[
                { width: 2, label: 'Fine (2px)' },
                { width: 4, label: 'Medium (4px)' },
                { width: 8, label: 'Bold (8px)' },
                { width: 14, label: 'Heavy (14px)' }
              ].map((s) => (
                <button
                  key={s.width}
                  type="button"
                  onClick={() => handleLineWidthChange(s.width)}
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
                  title={`Set stroke thickness to ${s.width}px`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected Shape Context Toolbar / Color Palette & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {selectedId && selectedItem && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              padding: '3px 10px 3px 10px',
              borderRadius: '9999px',
              animation: 'fadeIn 0.15s ease',
              flexWrap: 'wrap'
            }}>
              {/* Author Attribution Card */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', paddingRight: '4px', borderRight: '1px solid #bfdbfe' }}>
                {selectedItem.createdBy?.avatar ? (
                  <img src={selectedItem.createdBy.avatar} alt="" style={{ width: '15px', height: '15px', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: selectedItem.createdBy?.color || '#2563eb' }} />
                )}
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#1d4ed8' }}>
                  {selectedItem.createdBy?.name === activeName ? 'Drawn by You' : `Drawn by ${selectedItem.createdBy?.name || 'Collaborator'}`}
                </span>
              </div>

              {/* Quick Size Scale Buttons for any selected shape */}
              <button
                type="button"
                onClick={() => scaleSelectedShape(0.8)}
                style={{
                  border: '1px solid #93c5fd',
                  background: '#ffffff',
                  color: '#1e40af',
                  fontSize: '11px',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
                title="Scale down size by 20%"
              >
                ➖ Smaller
              </button>
              <button
                type="button"
                onClick={() => scaleSelectedShape(1.25)}
                style={{
                  border: '1px solid #93c5fd',
                  background: '#ffffff',
                  color: '#1e40af',
                  fontSize: '11px',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
                title="Scale up size by 25%"
              >
                ➕ Larger
              </button>

              {/* Specific font size pills if text is selected */}
              {selectedItem.type === 'text' && (
                <div style={{ display: 'inline-flex', gap: '2px', marginLeft: '2px' }}>
                  {[14, 20, 32, 48].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleFontSizeChange(s)}
                      style={{
                        padding: '1px 6px',
                        borderRadius: '9999px',
                        fontSize: '10px',
                        fontWeight: '700',
                        border: '1px solid #93c5fd',
                        backgroundColor: (selectedItem.fontSize || 20) === s ? '#2563eb' : '#ffffff',
                        color: (selectedItem.fontSize || 20) === s ? '#ffffff' : '#1e40af',
                        cursor: 'pointer'
                      }}
                      title={`Set font size to ${s}px`}
                    >
                      {s}px
                    </button>
                  ))}
                </div>
              )}

              {/* Specific stroke width pills if shape is selected */}
              {selectedItem.type !== 'text' && (
                <div style={{ display: 'inline-flex', gap: '2px', marginLeft: '2px' }}>
                  {[2, 4, 8, 14].map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => handleLineWidthChange(w)}
                      style={{
                        padding: '1px 6px',
                        borderRadius: '9999px',
                        fontSize: '10px',
                        fontWeight: '700',
                        border: '1px solid #93c5fd',
                        backgroundColor: (selectedItem.width || 3) === w ? '#2563eb' : '#ffffff',
                        color: (selectedItem.width || 3) === w ? '#ffffff' : '#1e40af',
                        cursor: 'pointer'
                      }}
                      title={`Set stroke thickness to ${w}px`}
                    >
                      {w}px
                    </button>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={deleteSelectedShape}
                style={{
                  border: 'none',
                  background: '#fee2e2',
                  color: '#b91c1c',
                  fontSize: '11px',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
                title="Delete this selected shape (or press Backspace/Delete)"
              >
                🗑 Delete
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedId(null);
                  selectedIdRef.current = null;
                  setHoveredHandle(null);
                  redrawCanvas(historyRef.current, null);
                }}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#6b7280',
                  fontSize: '11px',
                  cursor: 'pointer',
                  padding: '0 2px'
                }}
                title="Deselect shape (or press Escape)"
              >
                ✕
              </button>
            </div>
          )}

          {/* Color Swatches */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px', borderRadius: '9999px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}>
            {curatedColors.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => handleColorChange(c.value)}
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
              onChange={(e) => handleColorChange(e.target.value)}
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
            title="Clear the whiteboard canvas for all collaborators"
          >
            🗑 Clear
          </button>
        </div>
      </div>

      {/* COLLABORATIVE ACTION TOAST BANNER (Who undid/redid who) */}
      {toastNotice && (
        <div style={{
          position: 'absolute',
          top: '64px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#000000',
          color: '#ffffff',
          fontSize: '12px',
          fontWeight: '600',
          padding: '6px 18px',
          borderRadius: '9999px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'fadeIn 0.2s ease'
        }}>
          <span>{toastNotice}</span>
          <button
            onClick={() => setToastNotice(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#9ca3af',
              fontSize: '12px',
              cursor: 'pointer',
              marginLeft: '4px',
              padding: 0
            }}
          >
            ✕
          </button>
        </div>
      )}

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
            cursor: getCanvasCursor()
          }}
        />

        {/* STEP-BY-STEP REPLAY FLOATING CONTROLLER WITH LIVE AUTHOR CARD */}
        {isReplayOpen && (
          <div style={{
            position: 'absolute',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '24px',
            boxShadow: '0 12px 36px rgba(0,0,0,0.18)',
            padding: '16px 24px',
            zIndex: 90,
            width: '90%',
            maxWidth: '680px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {/* Top Row: Author Attribution Card during Replay */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {replayStep > 0 && history[replayStep - 1] ? (
                  <>
                    <img
                      src={history[replayStep - 1].createdBy?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(history[replayStep - 1].createdBy?.name || 'User')}`}
                      alt=""
                      style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #2563eb' }}
                      onError={(e) => {
                        e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=User`;
                      }}
                    />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#111827' }}>
                        {history[replayStep - 1].createdBy?.name || 'Collaborator'} drew a {history[replayStep - 1].type.toUpperCase()}
                      </div>
                      <div style={{ fontSize: '11px', color: '#6b7280' }}>
                        {history[replayStep - 1].createdAt ? new Date(history[replayStep - 1].createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Earlier in session'}
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    ✨ Initial Empty Canvas &bull; Press Play or drag the slider to watch drawing history with author cards
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', fontFamily: 'monospace', backgroundColor: '#f3f4f6', padding: '2px 8px', borderRadius: '9999px' }}>
                  {replayStep} / {history.length}
                </span>
                <button
                  onClick={toggleReplay}
                  style={{
                    border: 'none',
                    background: '#f3f4f6',
                    color: '#374151',
                    fontSize: '11px',
                    fontWeight: '600',
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    cursor: 'pointer'
                  }}
                >
                  ✕ Close
                </button>
              </div>
            </div>

            {/* Bottom Row: Scrubber Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={() => setIsReplayPlaying(!isReplayPlaying)}
                className="button-primary"
                style={{
                  padding: '6px 14px',
                  fontSize: '12px',
                  borderRadius: '9999px',
                  backgroundColor: isReplayPlaying ? '#e11d48' : '#000000',
                  color: '#ffffff',
                  minWidth: '80px'
                }}
              >
                {isReplayPlaying ? '⏸ Pause' : '▶ Play'}
              </button>

              <input
                type="range"
                min="0"
                max={history.length}
                value={replayStep}
                onChange={handleReplaySlider}
                style={{
                  flex: 1,
                  cursor: 'pointer',
                  accentColor: '#000000'
                }}
              />
            </div>
          </div>
        )}

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