'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MousePointer2, Square, Plus, Map, Move, Trash2, Maximize2, SplitSquareHorizontal, ZoomIn, ZoomOut, Focus, Hexagon, QrCode, Download, RefreshCw, Layers, Copy, Play, Settings2, Check, ChevronRight } from 'lucide-react';
import OrderTerminalModal from '@/components/pos/OrderTerminalModal';
import OrderDetailsModal from '@/components/operations/OrderDetailsModal';
import { getOrders, saveOrders, Order, OrderItem } from '@/lib/orders';
import { getGuests, getTierCashbackRate, updateGuestPointsAndLTV } from '@/lib/crm';
import { getRooms, saveRooms, DEFAULT_ROOMS, Room, Table, Zone, Obstacle, Point } from '@/lib/tables';
import { logAuditEvent } from '@/lib/audit';

const GRID_SIZE = 40; // 40px = 1m
const SNAP_SIZE = GRID_SIZE / 4; // 10px = 0.25m
const CANVAS_SIZE = 3000;
const CENTER = CANVAS_SIZE / 2;

type Mode = 'select' | 'draw-zone' | 'draw-wall' | 'add-table-rect' | 'add-table-circle' | 'draw-table' | 'draw-obstacle';

export default function TablesView({ 
  onDirtyChange, 
  readonly = false,
  extraHeaderActions
}: { 
  onDirtyChange?: (isDirty: boolean) => void, 
  readonly?: boolean,
  extraHeaderActions?: React.ReactNode 
}) {

  const [mode, setMode] = useState<Mode>('select');
  const [rooms, setRooms] = useState<Room[]>(() => getRooms());
  const [activeRoomId, setActiveRoomId] = useState<string>('room-1');
  const [isLiveView, setIsLiveView] = useState(readonly);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [roomToDelete, setRoomToDelete] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  const [isExiting, setIsExiting] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isSettingDefaultView, setIsSettingDefaultView] = useState(false);
  const [panState, setPanState] = useState<{ isPanning: boolean; startX: number; startY: number; scrollLeft: number; scrollTop: number } | null>(null);
  const [isControlsExpanded, setIsControlsExpanded] = useState(false);

  const [isSavedFeedback, setIsSavedFeedback] = useState(false);

  const saveDefaultView = () => {
    const currentZoom = zoom;
    const currentScrollLeft = scrollContainerRef.current?.scrollLeft || 0;
    const currentScrollTop = scrollContainerRef.current?.scrollTop || 0;

    const updatedRooms = rooms.map(r => r.id === activeRoomId ? {
      ...r,
      defaultZoom: currentZoom,
      defaultScrollX: currentScrollLeft,
      defaultScrollY: currentScrollTop
    } : r);

    setRooms(updatedRooms);
    saveRooms(updatedRooms);
    
    setIsSavedFeedback(true);
    setTimeout(() => {
      setIsSavedFeedback(false);
      setIsSettingDefaultView(false);
      setIsControlsExpanded(false); // Collapse floating panel into arrow icon after saving default view
    }, 1200);
  };

  const activeRoom = rooms.find(r => r.id === activeRoomId) || rooms[0];
  const tables = activeRoom.tables;
  const zones = activeRoom.zones;
  const obstacles = activeRoom.obstacles;

  const setTables = (newTables: Table[] | ((prev: Table[]) => Table[])) => {
    setRooms(rooms.map(r => r.id === activeRoomId ? { 
      ...r, tables: typeof newTables === 'function' ? newTables(r.tables) : newTables 
    } : r));
  };
  
  const setZones = (newZones: Zone[] | ((prev: Zone[]) => Zone[])) => {
    setRooms(rooms.map(r => r.id === activeRoomId ? { 
      ...r, zones: typeof newZones === 'function' ? newZones(r.zones) : newZones 
    } : r));
  };

  const setObstacles = (newObstacles: Obstacle[] | ((prev: Obstacle[]) => Obstacle[])) => {
    setRooms(rooms.map(r => r.id === activeRoomId ? { 
      ...r, obstacles: typeof newObstacles === 'function' ? newObstacles(r.obstacles) : newObstacles 
    } : r));
  };
  
  // Drawing state
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [mousePos, setMousePos] = useState<Point | null>(null);

  // Dragging state
  const [dragItem, setDragItem] = useState<{ type: 'table' | 'zone' | 'obstacle', id: string, offset: Point } | null>(null);
  const [selectedItem, setSelectedItem] = useState<{ type: 'table' | 'zone' | 'obstacle', id: string } | null>(null);
  const [qrModalTable, setQrModalTable] = useState<string | null>(null);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);

  const svgRef = useRef<SVGSVGElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [initialRooms, setInitialRooms] = useState<Room[]>(() => getRooms());
  const [isDirty, setIsDirty] = useState(false);
  const [activeOrderTableId, setActiveOrderTableId] = useState<string | null>(null);
  const [selectedOrderForSidebar, setSelectedOrderForSidebar] = useState<Order | null>(null);

  useEffect(() => {
    // Basic deep equality check for arrays of objects
    const dirty = JSON.stringify(rooms) !== JSON.stringify(initialRooms);
    if (dirty !== isDirty) {
      setIsDirty(dirty);
      onDirtyChange?.(dirty);
    }
  }, [rooms, initialRooms, isDirty, onDirtyChange]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = ''; // Required for Chrome
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const handleRecenter = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      // Use smooth scrolling for recenter action
      container.scrollTo({
        left: ((CANVAS_SIZE * zoom) - container.clientWidth) / 2,
        top: ((CANVAS_SIZE * zoom) - container.clientHeight) / 2,
        behavior: 'smooth'
      });
    }
  };

  const handleZoom = (delta: number) => {
    setZoom(prevZoom => {
      const newZoom = Math.max(0.25, Math.min(prevZoom + delta, 3));
      if (newZoom === prevZoom) return prevZoom;

      if (scrollContainerRef.current) {
        const container = scrollContainerRef.current;
        const centerX = (container.scrollLeft + container.clientWidth / 2) / prevZoom;
        const centerY = (container.scrollTop + container.clientHeight / 2) / prevZoom;

        requestAnimationFrame(() => {
          if (scrollContainerRef.current) {
            const updatedContainer = scrollContainerRef.current;
            updatedContainer.scrollLeft = (centerX * newZoom) - updatedContainer.clientWidth / 2;
            updatedContainer.scrollTop = (centerY * newZoom) - updatedContainer.clientHeight / 2;
          }
        });
      }

      return newZoom;
    });
  };

  // Load default zoom and scroll position when switching rooms or on mount
  useEffect(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const room = activeRoom as any;
      if (room.defaultZoom && typeof room.defaultScrollX === 'number' && typeof room.defaultScrollY === 'number') {
        setZoom(room.defaultZoom);
        // We delay scrolling slightly to let the zoom/resize finish rendering
        requestAnimationFrame(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft = room.defaultScrollX;
            scrollContainerRef.current.scrollTop = room.defaultScrollY;
          }
        });
      } else {
        // Fallback to recenter
        setZoom(1);
        container.scrollLeft = (CANVAS_SIZE - container.clientWidth) / 2;
        container.scrollTop = (CANVAS_SIZE - container.clientHeight) / 2;
      }
    }
  }, [activeRoomId, activeRoom]);

  // Helper to snap to grid or nearest existing point
  const snapToGrid = (value: number) => Math.round(value / SNAP_SIZE) * SNAP_SIZE;
  const snapPoint = (raw: Point): Point => {
    // 1. Gather all existing vertices to snap to
    const allPoints: Point[] = [];
    zones.forEach(z => allPoints.push(...z.points));
    tables.filter(t => t.type === 'custom' && t.points).forEach(t => {
      // For custom tables, points are offset by table.x and table.y
      t.points!.forEach(p => allPoints.push({ x: p.x + t.x, y: p.y + t.y }));
    });
    if (currentPoints.length > 0) {
      allPoints.push(currentPoints[0]); // Snap to start point easily
    }

    // 2. Find the nearest existing point
    let nearestPoint: Point | null = null;
    let minDist = 20; // Magnetic snap radius (20px)
    
    for (const p of allPoints) {
      const dist = Math.hypot(raw.x - p.x, raw.y - p.y);
      if (dist < minDist) {
        minDist = dist;
        nearestPoint = p;
      }
    }

    // 3. Snap to vertex if close, otherwise grid
    if (nearestPoint) {
      return { x: nearestPoint.x, y: nearestPoint.y };
    }
    return { x: snapToGrid(raw.x), y: snapToGrid(raw.y) };
  };

  const getPointerPos = (e: React.PointerEvent<SVGSVGElement>): Point => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const CTM = svgRef.current.getScreenCTM();
    if (!CTM) return { x: 0, y: 0 };
    return {
      x: (e.clientX - CTM.e) / CTM.a,
      y: (e.clientY - CTM.f) / CTM.d,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const isDirectClick = e.target === e.currentTarget || (e.target as SVGElement).tagName === 'rect';
    if (isDirectClick && (mode === 'select' || isLiveView)) {
      if (scrollContainerRef.current) {
        setPanState({
          isPanning: true,
          startX: e.clientX,
          startY: e.clientY,
          scrollLeft: scrollContainerRef.current.scrollLeft,
          scrollTop: scrollContainerRef.current.scrollTop
        });
        e.currentTarget.setPointerCapture(e.pointerId);
      }
      return;
    }

    const rawPos = getPointerPos(e);
    const pos = snapPoint(rawPos);

    if (mode === 'draw-zone' || mode === 'draw-wall' || mode === 'draw-table' || mode === 'draw-obstacle') {
      // Auto-close if close to start point
      if (currentPoints.length > 2) {
        const startPoint = currentPoints[0];
        const dist = Math.hypot(pos.x - startPoint.x, pos.y - startPoint.y);
        if (dist < 20) {
          finishDrawing(true);
          return;
        }
      }

      // Finish without closing if double-clicked on the last point
      if (currentPoints.length > 0) {
        const lastPoint = currentPoints[currentPoints.length - 1];
        const distToLast = Math.hypot(pos.x - lastPoint.x, pos.y - lastPoint.y);
        if (distToLast < 20) {
          finishDrawing(false);
          return;
        }
      }

      // If drawing a simple wall (straight line), finish immediately after the second point
      if (mode === 'draw-wall' && currentPoints.length === 1) {
        finishDrawing(false, [...currentPoints, pos]);
        return;
      }

      setCurrentPoints([...currentPoints, pos]);
    } else if (mode === 'add-table-rect' || mode === 'add-table-circle') {
      const type = mode === 'add-table-rect' ? 'rect' : 'circle';
      const width = 40;
      
      setTables([...tables, {
        id: `table-${Date.now()}`,
        x: pos.x - width/2,
        y: pos.y - width/2,
        width,
        height: width,
        type,
        name: `${tables.length + 1}`,
        seats: mode === 'add-table-rect' ? 4 : 2,
        rotation: 0,
        status: 'available'
      }]);
      setMode('select');
      return;
    } else if (mode === 'select' && !dragItem) {
      setSelectedItem(null);
      setIsEditorOpen(false);
    }
  };

  const updateTable = (id: string, updates: Partial<Table>) => {
    setTables(tables.map(t => {
      if (t.id !== id) return t;
      // Check for uniqueness when updating name
      if (updates.name !== undefined) {
        let val = updates.name;
        const isDuplicate = tables.some(other => other.id !== id && other.name === val);
        if (isDuplicate) {
          return { ...t, ...updates, name: val + ' (1)' }; // temporary fallback if collision
        }
        return { ...t, ...updates, name: val };
      }
      return { ...t, ...updates };
    }));
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rawPos = getPointerPos(e);
    const pos = snapPoint(rawPos);
    setMousePos(pos);

    if (panState?.isPanning && scrollContainerRef.current) {
      const dx = e.clientX - panState.startX;
      const dy = e.clientY - panState.startY;
      scrollContainerRef.current.scrollLeft = panState.scrollLeft - dx;
      scrollContainerRef.current.scrollTop = panState.scrollTop - dy;
      return;
    }

    if (dragItem && mode === 'select') {
      if (dragItem.type === 'table') {
        setTables(tables.map(t => 
          t.id === dragItem.id ? { ...t, x: pos.x - dragItem.offset.x, y: pos.y - dragItem.offset.y } : t
        ));
      } else if (dragItem.type === 'obstacle') {
        setObstacles(obstacles.map(o => 
          o.id === dragItem.id ? { ...o, x: pos.x - dragItem.offset.x, y: pos.y - dragItem.offset.y } : o
        ));
      } else if (dragItem.type === 'zone') {
        setZones(zones.map(z => {
          if (z.id === dragItem.id) {
            const dx = pos.x - dragItem.offset.x;
            const dy = pos.y - dragItem.offset.y;
            return {
              ...z,
              points: z.points.map(p => ({ x: p.x + dx, y: p.y + dy }))
            };
          }
          return z;
        }));
        setDragItem({ ...dragItem, offset: pos });
      }
    }
  };

  const handlePointerUp = (e?: React.PointerEvent<SVGSVGElement>) => {
    if (panState?.isPanning) {
      if (e) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      setPanState(null);
      return;
    }
    setDragItem(null);
  };

  const finishDrawing = (closed = true, overridePoints?: Point[]) => {
    const pts = overridePoints || currentPoints;
    if (pts.length > 1) {
      if (mode === 'draw-table') {
        setTables([...tables, {
          id: `table-${Date.now()}`,
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          type: 'custom',
          name: `${tables.length + 1}`,
          seats: 4,
          points: pts,
          rotation: 0,
          status: 'available'
        }]);
      } else if (mode === 'draw-obstacle') {
        setObstacles([...obstacles, {
          id: `obstacle-${Date.now()}`,
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          name: `Element ${obstacles.length + 1}`,
          points: pts,
          rotation: 0
        }]);
      } else {
        setZones([...zones, {
          id: `shape-${Date.now()}`,
          points: pts,
          name: mode === 'draw-wall' ? `Wall ${zones.length + 1}` : `Zone ${zones.length + 1}`,
          closed: mode === 'draw-wall' ? false : closed
        }]);
      }
    }
    setCurrentPoints([]);
    setMode('select');
  };

  const cancelDrawing = () => {
    setCurrentPoints([]);
    setMode('select');
  };

  const handleItemPointerDown = (e: React.PointerEvent, type: 'table' | 'zone' | 'obstacle', id: string, origin: Point) => {
    e.stopPropagation();
    if (readonly || isLiveView) return; // Completely disable selection and dragging in readonly/live view
    if (mode === 'select') {
      const rawPos = getPointerPos(e as unknown as React.PointerEvent<SVGSVGElement>);
      const pos = snapPoint(rawPos);
      if (selectedItem?.id !== id) setIsEditorOpen(false);
      setSelectedItem({ type, id });
      
      if (type === 'table' || type === 'obstacle') {
        setDragItem({ type, id, offset: { x: pos.x - origin.x, y: pos.y - origin.y } });
      } else {
        setDragItem({ type, id, offset: pos });
      }
    }
  };

  const handleDeleteSelected = () => {
    if (!selectedItem) return;
    if (selectedItem.type === 'table') {
      setTables(tables.filter(t => t.id !== selectedItem.id));
    } else if (selectedItem.type === 'obstacle') {
      setObstacles(obstacles.filter(o => o.id !== selectedItem.id));
    } else {
      setZones(zones.filter(z => z.id !== selectedItem.id));
    }
    setSelectedItem(null);
    setIsEditorOpen(false);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 rounded-2xl overflow-hidden shadow-inner relative">
      {/* Save Banner */}
      {!readonly && (isDirty || saveStatus !== 'idle') && (
        <div 
          className={`absolute bottom-8 left-1/2 -translate-x-1/2 z-40 bg-white px-5 py-2.5 rounded-full shadow-2xl border ${saveStatus === 'saved' ? 'border-green-100' : 'border-orange-100'} flex items-center gap-4 transition-all duration-500 ease-in-out ${isExiting ? 'opacity-0 translate-y-8 scale-95' : 'opacity-100 translate-y-0 scale-100'} ${!isExiting && saveStatus === 'idle' ? 'animate-in slide-in-from-bottom-8 fade-in duration-300' : ''}`}
        >
          <span className="text-sm font-bold text-gray-600">
            {saveStatus === 'saved' ? 'All changes saved!' : 'You have unsaved changes'}
          </span>
          <button
            onClick={() => {
              if (saveStatus !== 'idle') return;
              saveRooms(rooms);
              setSaveStatus('saved');
              setTimeout(() => {
                setIsExiting(true);
                setTimeout(() => {
                  setInitialRooms(rooms);
                  setIsDirty(false);
                  onDirtyChange?.(false);
                  setSaveStatus('idle');
                  setIsExiting(false);
                }, 500);
              }, 1500);
            }}
            className={`${saveStatus === 'saved' ? 'bg-green-500 hover:bg-green-600' : 'bg-corgi hover:bg-orange-600'} text-white px-5 py-2 rounded-full text-sm font-bold transition-colors shadow-sm cursor-pointer flex items-center gap-2`}
          >
            {saveStatus === 'saved' ? <span className="flex items-center gap-1.5"><Check size={16} /> Saved</span> : 'Save Layout'}
          </button>
        </div>
      )}

      {/* Toolbar */}
      {!readonly && (
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-100 shadow-sm z-10">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setMode('select')}
            className={`p-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors cursor-pointer ${mode === 'select' ? 'bg-corgi/10 text-corgi' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <MousePointer2 size={18} /> Select
          </button>
          <div className="w-px h-6 bg-gray-200 mx-2"></div>
          <button 
            onClick={() => setMode('draw-zone')}
            className={`p-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors cursor-pointer ${mode === 'draw-zone' ? 'bg-purple-100 text-purple-600' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <Map size={18} /> Draw Zone
          </button>
          <button 
            onClick={() => setMode('draw-wall')}
            className={`p-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors cursor-pointer ${mode === 'draw-wall' ? 'bg-purple-100 text-purple-600' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <SplitSquareHorizontal size={18} /> Draw Wall
          </button>
          <div className="w-px h-6 bg-gray-200 mx-2"></div>
          <button 
            onClick={() => setMode('add-table-rect')}
            className={`p-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors cursor-pointer ${mode === 'add-table-rect' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <Square size={18} /> Square Table
          </button>
          <button 
            onClick={() => setMode('add-table-circle')}
            className={`p-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors cursor-pointer ${mode === 'add-table-circle' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <div className="w-[14px] h-[14px] border-2 border-current rounded-full" /> Round Table
          </button>
          <button 
            onClick={() => setMode('draw-table')}
            className={`p-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors cursor-pointer ${mode === 'draw-table' ? 'bg-orange-100 text-orange-600' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <Hexagon size={18} /> Custom Table
          </button>
          
          <div className="w-px h-6 bg-gray-200 mx-2"></div>
          <button 
            onClick={() => setMode('draw-obstacle')}
            className={`p-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors cursor-pointer ${mode === 'draw-obstacle' ? 'bg-gray-200 text-gray-800' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <Square size={18} className="fill-gray-300" /> Element
          </button>
          
          <div className="w-px h-6 bg-gray-200 mx-2"></div>
          <button 
            onClick={() => handleZoom(-0.05)}
            className="p-1.5 rounded-lg flex items-center text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut size={18} />
          </button>
          <span className="text-sm font-bold text-gray-700 w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button 
            onClick={() => handleZoom(0.05)}
            className="p-1.5 rounded-lg flex items-center text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn size={18} />
          </button>
          
          <div className="w-px h-6 bg-gray-200 mx-2"></div>
          <button 
            onClick={handleRecenter}
            className="p-1.5 rounded-lg flex items-center text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer"
            title="Recenter Canvas"
          >
            <Focus size={18} />
          </button>
        </div>
        
        <div className="flex items-center gap-3">
          {selectedItem && mode === 'select' && !isLiveView && (
            <button 
              onClick={handleDeleteSelected}
              className="p-2 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
              title="Delete Selected"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </div>
      )}

      {/* Room Tabs */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-gray-400 mr-2" />
          {rooms.map(room => (
            <div 
              key={room.id}
              className={`group flex items-center rounded-xl transition-colors ${activeRoomId === room.id ? 'bg-white border border-gray-200' : 'hover:bg-gray-100'}`}
            >
              {editingRoomId === room.id ? (
                <input
                  autoFocus
                  type="text"
                  value={room.name}
                  onChange={(e) => setRooms(rooms.map(r => r.id === room.id ? { ...r, name: e.target.value } : r))}
                  onBlur={() => setEditingRoomId(null)}
                  onKeyDown={(e) => { if (e.key === 'Enter') setEditingRoomId(null); }}
                  className="px-4 py-1.5 text-sm font-bold bg-transparent outline-none w-24 text-center text-gray-900"
                />
              ) : (
                <button
                  onClick={() => {
                    if (activeRoomId === room.id) {
                      setEditingRoomId(room.id);
                    } else {
                      setActiveRoomId(room.id);
                      setSelectedItem(null);
                    }
                  }}
                  className={`px-4 py-1.5 text-sm font-bold cursor-pointer ${activeRoomId === room.id ? 'text-gray-900' : 'text-gray-500'}`}
                >
                  {room.name}
                </button>
              )}
              {!readonly && rooms.length > 1 && (
                <div className="overflow-hidden transition-[max-width,opacity] duration-300 max-w-0 opacity-0 group-hover:max-w-[32px] group-hover:opacity-100 flex items-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setRoomToDelete(room.id);
                    }}
                    className={`pr-3 pl-1 text-gray-400 hover:text-red-500 transition-colors cursor-pointer whitespace-nowrap flex-shrink-0`}
                    title="Delete Room"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
          {!readonly && (
          <button 
            onClick={() => {
              const newRoomId = `room-${Date.now()}`;
              setRooms([...rooms, { id: newRoomId, name: `Room ${rooms.length + 1}`, tables: [], zones: [], obstacles: [] }]);
              setActiveRoomId(newRoomId);
            }}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
            title="Add Floor / Room"
          >
            <Plus size={16} />
          </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!readonly && (
            <button 
              onClick={() => {
                if (!isLiveView) {
                  setTables(tables.map(t => ({ ...t, status: t.status || 'available' })));
                }
                setIsLiveView(!isLiveView);
                setSelectedItem(null);
                setIsEditorOpen(false);
              }}
              className={`px-4 py-1.5 rounded-full flex items-center gap-2 text-sm font-bold transition-all cursor-pointer whitespace-nowrap shadow-sm border ${
                isLiveView 
                  ? 'bg-corgi text-white border-corgi' 
                  : 'bg-white text-corgi border-corgi/30 hover:bg-corgi/10'
              }`}
            >
              <Play size={14} className={isLiveView ? 'fill-white' : ''} /> 
              {isLiveView ? 'Exit Live View' : 'Live POS View'}
            </button>
          )}
          {extraHeaderActions}
        </div>
      </div>

      {/* Editor Info Bar */}
      {(mode === 'draw-zone' || mode === 'draw-wall' || mode === 'draw-table' || mode === 'draw-obstacle') && (
        <div className="bg-purple-600 text-white px-4 py-2 text-sm font-medium flex justify-between items-center z-10 shadow-md">
          <span>
            {mode === 'draw-zone' || mode === 'draw-table' || mode === 'draw-obstacle'
              ? 'Click to add points. Click the start point to auto-close the shape.' 
              : 'Click to draw walls. Click Finish when done.'}
          </span>
          <div className="flex gap-3">
            <button onClick={() => finishDrawing(false)} className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded transition-colors">Finish</button>
            <button onClick={cancelDrawing} className="px-3 py-1 hover:bg-white/10 rounded transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* Canvas Area */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-auto relative custom-scrollbar"
        style={{
          cursor: panState?.isPanning 
            ? 'grabbing' 
            : (mode === 'draw-zone' || mode === 'draw-obstacle')
              ? "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"%239333ea\" stroke-width=\"2\" stroke-linecap=\"round\"><line x1=\"12\" y1=\"2\" x2=\"12\" y2=\"22\"></line><line x1=\"2\" y1=\"12\" x2=\"22\" y2=\"12\"></line></svg>') 12 12, crosshair" 
              : (mode === 'select' || isLiveView)
                ? 'grab'
                : 'crosshair'
        }}
      >
        <style>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 14px;
            height: 14px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: #f8fafc;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 8px;
            border: 3px solid #f8fafc;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
          .custom-scrollbar::-webkit-scrollbar-corner {
            background: #f8fafc;
          }
        `}</style>
        <svg 
          ref={svgRef}
          width={CANVAS_SIZE * zoom} 
          height={CANVAS_SIZE * zoom} 
          viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}
          className="bg-white"
          style={{ 
            minWidth: CANVAS_SIZE * zoom, 
            minHeight: CANVAS_SIZE * zoom,
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <defs>
            <pattern id="grid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
              <path d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`} fill="none" stroke="#e5e7eb" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Highlight Center Square */}
          <rect 
            x={CENTER - GRID_SIZE/2} 
            y={CENTER - GRID_SIZE/2} 
            width={GRID_SIZE} 
            height={GRID_SIZE} 
            fill="rgba(168, 85, 247, 0.08)"
            stroke="rgba(168, 85, 247, 0.2)"
            strokeWidth="1"
          />
          <circle cx={CENTER} cy={CENTER} r="2" fill="rgba(168, 85, 247, 0.4)" />

          {/* Render Zones / Walls */}
          {zones.map((zone) => {
            const isSelected = selectedItem?.id === zone.id;
            return (
              <g 
                key={zone.id} 
                className={mode === 'select' ? 'cursor-move' : ''}
                onPointerDown={(e) => handleItemPointerDown(e, 'zone', zone.id, zone.points[0])}
              >
                {zone.closed !== false ? (
                  <polygon 
                    points={zone.points.map(p => `${p.x},${p.y}`).join(' ')} 
                    fill="none" 
                    stroke={isSelected ? '#9333ea' : '#475569'} 
                    strokeWidth="6"
                    strokeLinejoin="round"
                    className="transition-colors"
                  />
                ) : (
                  <polyline 
                    points={zone.points.map(p => `${p.x},${p.y}`).join(' ')} 
                    fill="none" 
                    stroke={isSelected ? '#9333ea' : '#475569'} 
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-colors"
                  />
                )}
                {/* Zone Label */}
                {zone.points.length > 0 && (
                  <text 
                    x={zone.points[0].x + 10} 
                    y={zone.points[0].y + 20} 
                    fill="#6b21a8" 
                    className="text-[14px] font-bold pointer-events-none select-none"
                  >
                    {zone.name}
                  </text>
                )}
              </g>
            );
          })}

          {/* Render currently drawing shape */}
          {currentPoints.length > 0 && (
            <g className="pointer-events-none">
              <polyline 
                points={currentPoints.map(p => `${p.x},${p.y}`).join(' ') + (mousePos ? ` ${mousePos.x},${mousePos.y}` : '')}
                fill="none" 
                stroke="#c084fc" 
                strokeWidth="6" 
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="10,10"
              />
              {currentPoints.map((p, i) => {
                const isStart = i === 0 && currentPoints.length > 2;
                return (
                  <circle key={i} cx={p.x} cy={p.y} r={isStart ? "8" : "4"} fill={isStart ? "#ec4899" : "#9333ea"} />
                );
              })}
              
              {/* Measurement text for the active line segment being drawn */}
              {mousePos && currentPoints.length > 0 && (
                (() => {
                  const lastPoint = currentPoints[currentPoints.length - 1];
                  const dist = Math.hypot(mousePos.x - lastPoint.x, mousePos.y - lastPoint.y);
                  const meters = (dist / GRID_SIZE).toFixed(2);
                  const midX = (lastPoint.x + mousePos.x) / 2;
                  const midY = (lastPoint.y + mousePos.y) / 2;
                  
                  // Only show label if the line is long enough
                  if (dist > 15) {
                    return (
                      <g>
                        <rect x={midX - 25} y={midY - 30} width="50" height="22" rx="4" fill="#1e293b" opacity="0.9" />
                        <text x={midX} y={midY - 15} fill="white" fontSize="12" fontWeight="bold" textAnchor="middle">{meters}m</text>
                      </g>
                    );
                  }
                  return null;
                })()
              )}
            </g>
          )}

          {/* Render Tables */}
          {tables.map(table => {
            const isSelected = selectedItem?.id === table.id;
            const cx = table.type === 'custom' && table.points ? table.points.reduce((sum, p) => sum + p.x, 0) / table.points.length : table.width / 2;
            const cy = table.type === 'custom' && table.points ? table.points.reduce((sum, p) => sum + p.y, 0) / table.points.length : table.height / 2;
            
            const getTableColors = () => {
              if (isSelected) {
                return 'fill-amber-100 stroke-corgi stroke-[3px]';
              }
              return 'fill-amber-50/40 stroke-corgi group-hover:fill-amber-100/40 transition-colors';
            };
            
            const colors = getTableColors();

            return (
              <g
                key={table.id}
                transform={`translate(${table.x}, ${table.y})`}
                className={`group ${mode === 'select' && !isLiveView ? 'cursor-move' : isLiveView ? 'cursor-pointer' : ''}`}
                onPointerDown={(e) => {
                  if (isLiveView) {
                    setActiveOrderTableId(table.id);
                  } else {
                    handleItemPointerDown(e, 'table', table.id, { x: table.x, y: table.y });
                  }
                }}
              >
                <g transform={table.rotation ? `rotate(${table.rotation}, ${cx}, ${cy})` : ''}>
                {table.type === 'custom' && table.points ? (
                  <polygon 
                    points={table.points.map(p => `${p.x},${p.y}`).join(' ')}
                    className={`transition-all duration-300 stroke-[3px] drop-shadow-sm group-hover:drop-shadow-md ${colors}`}
                  />
                ) : table.type === 'rect' ? (
                  <rect 
                    x={0} y={0} 
                    width={table.width} height={table.height} 
                    rx="8"
                    className={`transition-all duration-300 stroke-[3px] drop-shadow-sm group-hover:drop-shadow-md ${colors}`}
                  />
                ) : (
                  <circle 
                    cx={table.width / 2} cy={table.height / 2} 
                    r={table.width / 2} 
                    className={`transition-all duration-300 stroke-[3px] drop-shadow-sm group-hover:drop-shadow-md ${colors}`}
                  />
                )}
                
                {/* Table Name Label */}
                <text 
                  x={table.type === 'custom' && table.points ? table.points.reduce((sum, p) => sum + p.x, 0) / table.points.length : table.width / 2} 
                  y={table.type === 'custom' && table.points ? table.points.reduce((sum, p) => sum + p.y, 0) / table.points.length + 5 : table.height / 2 + 5} 
                  fill={table.type === 'custom' ? '#c2410c' : table.type === 'rect' ? '#a16207' : '#15803d'} 
                  fontSize="14" 
                  fontWeight="bold" 
                  textAnchor="middle"
                  className="pointer-events-none select-none"
                >
                  {table.name}
                </text>

                {/* Table Status Badge Plate - Centered top overlapping pill */}
                {table.status && table.status !== 'available' && (() => {
                  let badgeX = 0;
                  let badgeY = -6; // slightly overlapping top edge
                  if (table.type === 'rect') {
                    badgeX = table.width / 2;
                  } else if (table.type === 'circle') {
                    badgeX = table.width / 2;
                  } else if (table.type === 'custom' && table.points) {
                    const minX = Math.min(...table.points.map(p => p.x));
                    const maxX = Math.max(...table.points.map(p => p.x));
                    const minY = Math.min(...table.points.map(p => p.y));
                    badgeX = minX + (maxX - minX) / 2;
                    badgeY = minY - 6;
                  }

                  return (
                    <g className="pointer-events-none select-none">
                      <rect
                        x={badgeX - 25}
                        y={badgeY}
                        width="50"
                        height="12"
                        rx="6"
                        fill={
                          table.status === 'occupied' ? '#fee2e2' :
                          table.status === 'billed' ? '#fef3c7' :
                          table.status === 'dirty' ? '#ffedd5' : '#f3f4f6'
                        }
                        stroke={
                          table.status === 'occupied' ? '#ef4444' :
                          table.status === 'billed' ? '#d97706' :
                          table.status === 'dirty' ? '#ea580c' : '#9ca3af'
                        }
                        strokeWidth="1.5"
                      />
                      <text
                        x={badgeX}
                        y={badgeY + 8.5}
                        fill={
                          table.status === 'occupied' ? '#991b1b' :
                          table.status === 'billed' ? '#92400e' :
                          table.status === 'dirty' ? '#c2410c' : '#374151'
                        }
                        fontSize="6.5"
                        fontWeight="black"
                        textAnchor="middle"
                        letterSpacing="0.5"
                        className="uppercase"
                      >
                        {table.status}
                      </text>
                    </g>
                  );
                })()}
                
                {/* Seats Badge */}
                {(() => {
                  let badgeX = 0;
                  let badgeY = 0;
                  if (table.type === 'rect') {
                    badgeX = table.width - 4;
                    badgeY = table.height - 4;
                  } else if (table.type === 'circle') {
                    const r = table.width / 2;
                    badgeX = r + r * 0.707 - 2;
                    badgeY = r + r * 0.707 - 2;
                  } else if (table.type === 'custom' && table.points) {
                    badgeX = Math.max(...table.points.map(p => p.x));
                    badgeY = Math.max(...table.points.map(p => p.y));
                  }
                  const seatsCount = table.seats || (table.type === 'custom' ? 4 : 0);
                  
                  return seatsCount > 0 ? (
                    <g className="pointer-events-none select-none">
                      <circle cx={badgeX} cy={badgeY} r="10" fill="white" stroke={isSelected ? '#ea580c' : '#fb923c'} strokeWidth="2" />
                      <text x={badgeX} y={badgeY + 3.5} fill="#ea580c" fontSize="10" fontWeight="bold" textAnchor="middle">{seatsCount}</text>
                    </g>
                  ) : null;
                })()}
                </g>
                
                {/* Settings Badge (shows on hover or when selected, hidden when dragging or editor open) */}
                {!isLiveView && dragItem?.id !== table.id && (!isSelected || !isEditorOpen) && (
                  <foreignObject 
                    x={table.type === 'custom' && table.points ? Math.max(...table.points.map(p => p.x)) + 5 : table.width + 5} 
                    y={table.type === 'custom' && table.points ? Math.min(...table.points.map(p => p.y)) - 15 : -15} 
                    width="40" 
                    height="40" 
                    className={`overflow-visible transition-opacity duration-200 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    onPointerDown={(e) => { 
                      e.stopPropagation(); 
                      if (!isSelected) setSelectedItem({ type: 'table', id: table.id });
                      setIsEditorOpen(true); 
                    }}
                  >
                    <div className="bg-white rounded-full shadow-md border border-gray-100 p-2 flex items-center justify-center pointer-events-auto cursor-pointer hover:bg-gray-50 text-gray-500 hover:text-corgi transition-colors">
                      <Settings2 size={16} />
                    </div>
                  </foreignObject>
                )}

                {/* Popover Editor for Selected Table */}
                {isSelected && isEditorOpen && !isLiveView && (
                  <foreignObject 
                    x={table.type === 'custom' && table.points ? Math.max(...table.points.map(p => p.x)) + 15 : table.width + 15} 
                    y={table.type === 'custom' && table.points ? Math.min(...table.points.map(p => p.y)) - 10 : -10} 
                    width="160" 
                    height="280" 
                    className="overflow-visible"
                    onPointerDown={(e) => e.stopPropagation()} // Prevent dragging when clicking editor
                  >
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 flex flex-col gap-4 pointer-events-auto origin-left animate-in fade-in zoom-in-95 duration-200">
                      <div>
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Table Name</label>
                        <input 
                          type="text" 
                          maxLength={10}
                          value={table.name}
                          onChange={(e) => updateTable(table.id, { name: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-corgi/50 focus:border-corgi transition-all text-center"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Seats</label>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => updateTable(table.id, { seats: Math.max(1, (table.seats || 4) - 1) })}
                            className="w-8 h-8 rounded-xl bg-gray-50 hover:bg-corgi/10 flex items-center justify-center text-gray-500 hover:text-corgi transition-colors cursor-pointer"
                          >-</button>
                          <span className="flex-1 text-center font-bold text-gray-800 text-lg">{table.seats || 4}</span>
                          <button 
                            onClick={() => updateTable(table.id, { seats: (table.seats || 4) + 1 })}
                            className="w-8 h-8 rounded-xl bg-gray-50 hover:bg-corgi/10 flex items-center justify-center text-gray-500 hover:text-corgi transition-colors cursor-pointer"
                          >+</button>
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 flex justify-between">
                          <span>Rotation</span>
                          <span className="text-gray-500">{table.rotation || 0}°</span>
                        </label>
                        <input 
                          type="range" 
                          min="0" max="360" step="15"
                          value={table.rotation || 0}
                          onChange={(e) => updateTable(table.id, { rotation: parseInt(e.target.value) })}
                          className="w-full accent-corgi"
                        />
                      </div>
                      <div className="pt-2 border-t border-gray-100 flex gap-2">
                        <button 
                          onClick={() => setQrModalTable(table.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl hover:bg-corgi/10 text-gray-500 hover:text-corgi transition-colors text-sm font-bold cursor-pointer"
                          title="QR Code"
                        >
                          <QrCode size={16} /> QR
                        </button>
                        <button 
                          onClick={() => {
                            setTables([...tables, { ...table, id: `table-${Date.now()}`, x: table.x + 40, y: table.y + 40 }]);
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl hover:bg-blue-50 text-gray-500 hover:text-blue-600 transition-colors text-sm font-bold cursor-pointer"
                          title="Duplicate"
                        >
                          <Copy size={16} />
                        </button>
                      </div>
                    </div>
                  </foreignObject>
                )}
              </g>
            );
          })}

          {/* Render Obstacles / Elements */}
          {obstacles.map(obs => {
            const isSelected = selectedItem?.id === obs.id;
            const hasPoints = !!obs.points;
            
            return (
              <g
                key={obs.id}
                transform={`translate(${obs.x || 0}, ${obs.y || 0})`}
                className={`group ${mode === 'select' && !isLiveView ? 'cursor-move' : ''}`}
                onPointerDown={(e) => !isLiveView && handleItemPointerDown(e, 'obstacle', obs.id, { x: obs.x || 0, y: obs.y || 0 })}
              >
                <g transform={obs.rotation && !hasPoints ? `rotate(${obs.rotation}, ${(obs.width||0)/2}, ${(obs.height||0)/2})` : ''}>
                  {hasPoints ? (
                    <polygon 
                      points={obs.points!.map(p => `${p.x},${p.y}`).join(' ')}
                      className={`transition-all duration-200 stroke-[2px] ${
                        isSelected 
                          ? 'fill-gray-300 stroke-gray-500' 
                          : 'fill-gray-200 stroke-gray-400 group-hover:fill-gray-300'
                      }`}
                      style={{
                        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.05) 10px, rgba(0,0,0,0.05) 20px)'
                      }}
                    />
                  ) : (
                    <rect 
                      x={0} y={0} 
                      width={obs.width} height={obs.height} 
                      rx="4"
                      className={`transition-all duration-200 stroke-[2px] ${
                        isSelected 
                          ? 'fill-gray-300 stroke-gray-500' 
                          : 'fill-gray-200 stroke-gray-400 group-hover:fill-gray-300'
                      }`}
                      style={{
                        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.05) 10px, rgba(0,0,0,0.05) 20px)'
                      }}
                    />
                  )}
                  
                  <text 
                    x={hasPoints ? obs.points!.reduce((sum, p) => sum + p.x, 0) / obs.points!.length : (obs.width || 0) / 2} 
                    y={hasPoints ? obs.points!.reduce((sum, p) => sum + p.y, 0) / obs.points!.length + 4 : (obs.height || 0) / 2 + 4} 
                    fill="#475569" 
                    fontSize="12" 
                    fontWeight="bold" 
                    textAnchor="middle"
                    className="pointer-events-none select-none"
                  >
                    {obs.name}
                  </text>
                </g>
                
                {/* Settings Badge for Obstacle */}
                {!isLiveView && dragItem?.id !== obs.id && (!isSelected || !isEditorOpen) && (
                  <foreignObject 
                    x={hasPoints ? Math.max(...obs.points!.map(p => p.x)) + 5 : (obs.width || 0) + 5} 
                    y={hasPoints ? Math.min(...obs.points!.map(p => p.y)) - 15 : -15} 
                    width="40" 
                    height="40" 
                    className={`overflow-visible transition-opacity duration-200 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    onPointerDown={(e) => { 
                      e.stopPropagation(); 
                      if (!isSelected) setSelectedItem({ type: 'obstacle', id: obs.id });
                      setIsEditorOpen(true); 
                    }}
                  >
                    <div className="bg-white rounded-full shadow-md border border-gray-100 p-2 flex items-center justify-center pointer-events-auto cursor-pointer hover:bg-gray-50 text-gray-500 hover:text-gray-900 transition-colors">
                      <Settings2 size={16} />
                    </div>
                  </foreignObject>
                )}
                
                {/* Popover Editor for Selected Obstacle */}
                {isSelected && isEditorOpen && !isLiveView && (
                  <foreignObject 
                    x={hasPoints ? Math.max(...obs.points!.map(p => p.x)) + 15 : (obs.width || 0) + 15} 
                    y={hasPoints ? Math.min(...obs.points!.map(p => p.y)) - 10 : -10} 
                    width="160" 
                    height="120" 
                    className="overflow-visible"
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 flex flex-col gap-4 pointer-events-auto origin-left animate-in fade-in zoom-in-95 duration-200">
                      <div>
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Element Name</label>
                        <input 
                          type="text" 
                          value={obs.name}
                          onChange={(e) => setObstacles(obstacles.map(o => o.id === obs.id ? { ...o, name: e.target.value } : o))}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-500 transition-all text-center"
                        />
                      </div>
                      <div className="pt-2 border-t border-gray-100 flex gap-2">
                        <button 
                          onClick={() => {
                            setObstacles([...obstacles, { ...obs, id: `obs-${Date.now()}`, x: (obs.x || 0) + 40, y: (obs.y || 0) + 40 }]);
                          }}
                          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors text-sm font-bold cursor-pointer"
                          title="Duplicate"
                        >
                          <Copy size={16} />
                        </button>
                      </div>
                    </div>
                  </foreignObject>
                )}
              </g>
            );
          })}

          {/* Render Ghost Preview */}
          {(mode === 'add-table-rect' || mode === 'add-table-circle') && mousePos && (
            <g
              transform={`translate(${mousePos.x - 20}, ${mousePos.y - 20})`}
              className="pointer-events-none opacity-50"
            >
              {mode === 'add-table-rect' ? (
                <rect 
                  x={0} y={0} 
                  width={40} height={40} 
                  fill="#fef9c3" 
                  stroke="#eab308" 
                  strokeWidth="3" 
                  rx="8"
                />
              ) : (
                <circle 
                  cx={20} cy={20} 
                  r={20} 
                  fill="#dcfce7" 
                  stroke="#22c55e" 
                  strokeWidth="3"
                />
              )}
            </g>
          )}
        </svg>
      </div>

      {/* Floating Canvas Controls */}
      <div className="absolute bottom-6 right-6 z-30 flex items-center justify-end">
        <AnimatePresence initial={false}>
          {isControlsExpanded && (
            <motion.div
              initial={{ width: 0, opacity: 0, scale: 0.8 }}
              animate={{ width: 'auto', opacity: 1, scale: 1 }}
              exit={{ width: 0, opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-2 rounded-2xl border border-gray-200/80 shadow-lg mr-2 overflow-hidden whitespace-nowrap"
            >
              <button 
                onClick={() => handleZoom(-0.05)}
                className="p-1.5 rounded-lg flex items-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer active:scale-95 shrink-0"
                title="Zoom Out"
              >
                <ZoomOut size={16} />
              </button>
              <span className="text-xs font-bold text-gray-700 w-10 text-center select-none shrink-0">{Math.round(zoom * 100)}%</span>
              <button 
                onClick={() => handleZoom(0.05)}
                className="p-1.5 rounded-lg flex items-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer active:scale-95 shrink-0"
                title="Zoom In"
              >
                <ZoomIn size={16} />
              </button>
              
              <div className="w-px h-5 bg-gray-200 mx-1 shrink-0"></div>
              <button 
                onClick={handleRecenter}
                className="p-1.5 rounded-lg flex items-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer active:scale-95 shrink-0"
                title="Recenter Canvas"
              >
                <Focus size={16} />
              </button>

              <div className="w-px h-5 bg-gray-200 mx-1 shrink-0"></div>
              {isSettingDefaultView ? (
                isSavedFeedback ? (
                  <button 
                    className="px-3 py-1.5 bg-corgi text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1 shrink-0 cursor-default select-none animate-pulse"
                  >
                    <Check size={14} /> Saved
                  </button>
                ) : (
                  <button 
                    onClick={saveDefaultView}
                    className="px-3 py-1.5 bg-corgi hover:brightness-110 text-white rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-sm flex items-center gap-1 shrink-0"
                  >
                    <Check size={14} /> Save View
                  </button>
                )
              ) : (
                <button 
                  onClick={() => setIsSettingDefaultView(true)}
                  className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold border border-gray-200 transition-all cursor-pointer active:scale-95 shrink-0"
                  title="Set current position & zoom as default for this room"
                >
                  Set Default View
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setIsControlsExpanded(!isControlsExpanded)}
          className={`w-[40px] h-[40px] flex items-center justify-center rounded-full bg-white border shadow-md transition-all duration-300 active:scale-90 cursor-pointer ${
            isControlsExpanded 
              ? 'border-gray-200/80 text-gray-400 rotate-180' 
              : 'border-corgi/20 text-corgi hover:bg-corgi/5 animate-pulse'
          }`}
          title={isControlsExpanded ? "Collapse Controls" : "Configure Layout View"}
        >
          {isControlsExpanded ? (
            <ChevronRight size={18} className="translate-x-[0.5px]" />
          ) : (
            <Settings2 size={18} />
          )}
        </button>
      </div>



      {/* QR Code Modal */}
      {qrModalTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => { setQrModalTable(null); setConfirmRegenerate(false); }}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 relative" onClick={e => e.stopPropagation()}>
            {(() => {
              const modalTable = tables.find(t => t.id === qrModalTable);
              if (!modalTable) return null;
              
              const generateQR = () => {
                const newCode = Math.random().toString(36).substring(2, 10);
                updateTable(modalTable.id, { qrCode: newCode });
              };

              const downloadQR = async () => {
                if (!modalTable.qrCode) return;
                const url = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=https://corgi-cafe.com/table/${modalTable.qrCode}&color=1f2937&margin=0`;
                try {
                  const response = await fetch(url);
                  const blob = await response.blob();
                  const link = document.createElement('a');
                  link.href = URL.createObjectURL(blob);
                  link.download = `Table-${modalTable.name}-QR.png`;
                  link.click();
                } catch (err) {
                  window.open(url, '_blank');
                }
              };

              return (
                <div className="flex flex-col items-center">
                  <h3 className="text-xl font-bold text-gray-800 mb-6">Table {modalTable.name} QR Code</h3>
                  
                  {confirmRegenerate ? (
                    <div className="flex flex-col items-center gap-4 w-full py-6 animate-in zoom-in-95 duration-200">
                      <div className="w-16 h-16 rounded-2xl bg-orange-50 text-corgi flex items-center justify-center mb-2">
                        <RefreshCw size={32} />
                      </div>
                      <h4 className="text-lg font-bold text-gray-800">Are you sure?</h4>
                      <p className="text-gray-500 text-center text-sm px-2">The old QR code will immediately stop working. This action cannot be undone.</p>
                      <div className="flex w-full gap-3 mt-4">
                        <button 
                          onClick={() => setConfirmRegenerate(false)}
                          className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => {
                            generateQR();
                            setConfirmRegenerate(false);
                          }}
                          className="flex-1 py-2.5 rounded-xl bg-corgi text-white font-semibold hover:bg-orange-600 transition-colors cursor-pointer"
                        >
                          Yes, Regenerate
                        </button>
                      </div>
                    </div>
                  ) : modalTable.qrCode ? (
                    <div className="flex flex-col items-center gap-6 w-full animate-in zoom-in-95 duration-200">
                      <div className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https://corgi-cafe.com/table/${modalTable.qrCode}&color=1f2937&margin=0`} 
                          alt="QR Code" 
                          className="w-48 h-48 rounded-md"
                        />
                      </div>
                      
                      <div className="flex w-full gap-3">
                        <button 
                          onClick={downloadQR}
                          className="flex-1 flex items-center justify-center gap-2 bg-corgi text-white font-semibold py-2.5 rounded-xl hover:bg-orange-600 transition-colors cursor-pointer"
                        >
                          <Download size={18} /> Download
                        </button>
                        <button 
                          onClick={() => setConfirmRegenerate(true)}
                          className="flex items-center justify-center gap-2 bg-orange-50 text-corgi font-semibold px-4 py-2.5 rounded-xl hover:bg-orange-100 transition-colors cursor-pointer"
                          title="Generate New QR"
                        >
                          <RefreshCw size={20} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-6 w-full py-4">
                      <div className="w-32 h-32 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 bg-gray-50">
                        <QrCode size={48} opacity={0.5} />
                      </div>
                      <p className="text-gray-500 text-center text-sm px-4">No QR code generated for this table yet.</p>
                      <button 
                        onClick={generateQR}
                        className="w-full flex items-center justify-center gap-2 bg-corgi text-white font-semibold py-2.5 rounded-xl hover:bg-orange-600 transition-colors cursor-pointer"
                      >
                        Generate QR Code
                      </button>
                    </div>
                  )}
                  
                  <button 
                    onClick={() => { setQrModalTable(null); setConfirmRegenerate(false); }}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Room Deletion Modal */}
      {roomToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setRoomToDelete(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 relative" onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 text-red-500 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Room?</h3>
              <p className="text-gray-500 text-sm mb-6">
                Are you sure you want to delete <b>{rooms.find(r => r.id === roomToDelete)?.name}</b>? All tables and elements inside this room will be lost forever.
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setRoomToDelete(null)}
                  className="flex-1 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    const newRooms = rooms.filter(r => r.id !== roomToDelete);
                    setRooms(newRooms);
                    if (activeRoomId === roomToDelete) setActiveRoomId(newRooms[0].id);
                    setRoomToDelete(null);
                  }}
                  className="flex-1 py-3 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition-colors cursor-pointer"
                >
                  Delete Room
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Order Terminal Modal */}
      {isLiveView && activeOrderTableId && (
        (() => {
          const table = tables.find(t => t.id === activeOrderTableId);
          if (!table) return null;
          
          const activeOrder = getOrders().find(o => o.tableId === activeOrderTableId && !o.paid);
          
          return (
            <OrderTerminalModal
              tableId={activeOrderTableId}
              tableName={table.name}
              currentStatus={table.status || 'available'}
              initialOrder={activeOrder}
              onClose={() => setActiveOrderTableId(null)}
              onAction={(action, items, discountPercent, customerId, keepOpen) => {
                let newStatus = table.status;
                if (action === 'send_to_kitchen') newStatus = 'occupied';
                else if (action === 'print_check') newStatus = 'billed';
                else if (action === 'pay') newStatus = 'occupied'; // Keep occupied, payment will complete in sidebar
                else if (action === 'clean') newStatus = 'available';

                let orderToOpen: Order | null = null;

                // Manage linked orders
                if (action !== 'clean') {
                  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
                  const discountAmount = subtotal * discountPercent;
                  const finalTotal = parseFloat(Math.max(0, subtotal - discountAmount).toFixed(2));
                  const formattedItems = items.map(i => ({
                    name: i.name,
                    price: i.price,
                    quantity: i.quantity,
                    comments: i.comments
                  }));

                  const allOrders = getOrders();
                  
                  if (activeOrder) {
                    // Update existing order
                    const updatedOrders = allOrders.map(o => {
                      if (o.id === activeOrder.id) {
                        const finalCustomerId = customerId || o.customerId;
                        const guestName = finalCustomerId ? (getGuests().find(g => g.id === finalCustomerId)?.name || o.customerName) : o.customerName;
                        const updated: Order = {
                          ...o,
                          items: formattedItems,
                          total: finalTotal,
                          customerId: finalCustomerId,
                          customerName: guestName,
                          discount: discountPercent > 0 ? {
                            name: `${discountPercent * 100}% Discount`,
                            value: discountPercent * 100,
                            amountDeducted: parseFloat(discountAmount.toFixed(2))
                          } : undefined,
                        };
                        orderToOpen = updated;
                        return updated;
                      }
                      return o;
                    });
                    saveOrders(updatedOrders);
                  } else {
                    // Create new order
                    const guestName = customerId ? (getGuests().find(g => g.id === customerId)?.name || `Table ${table.name}`) : `Table ${table.name}`;
                    const newOrder: Order = {
                      id: 'ORD-' + Math.floor(1000 + Math.random() * 9000),
                      source: 'dine_in',
                      customerId: customerId,
                      customerName: guestName,
                      tableId: table.id,
                      items: formattedItems,
                      total: finalTotal,
                      discount: discountPercent > 0 ? {
                        name: `${discountPercent * 100}% Discount`,
                        value: discountPercent * 100,
                        amountDeducted: parseFloat(discountAmount.toFixed(2))
                      } : undefined,
                      status: 'preparing',
                      time: new Date(),
                      paid: false,
                      orderedBy: 'waiter',
                    };
                    orderToOpen = newOrder;
                    saveOrders([...allOrders, newOrder]);
                  }
                }

                updateTable(activeOrderTableId, { status: newStatus });
                if (!keepOpen) {
                  setActiveOrderTableId(null);
                }

                // If action is pay, immediately trigger the existing payment sidebar modal
                if (action === 'pay' && orderToOpen) {
                  setSelectedOrderForSidebar(orderToOpen);
                }
              }}
            />
          );
        })()
      )}

      {/* Existing Order details sidebar modal */}
      <OrderDetailsModal
        order={selectedOrderForSidebar}
        isOpen={!!selectedOrderForSidebar}
        onClose={() => setSelectedOrderForSidebar(null)}
        onUpdateStatus={(orderId, status) => {
          const allOrders = getOrders();
          const order = allOrders.find(o => o.id === orderId);
          if (order) {
            const updated = { ...order, status };
            const updatedOrders = allOrders.map(o => o.id === orderId ? updated : o);
            saveOrders(updatedOrders);
            setSelectedOrderForSidebar(updated);

            // Update table status if needed
            const table = tables.find(t => t.id === order.tableId);
            if (table) {
              let newStatus = table.status;
              if (status === 'completed') newStatus = 'dirty';
              else if (status === 'cancelled') newStatus = 'available';
              if (newStatus !== table.status) {
                updateTable(table.id, { status: newStatus });
              }
            }
          }
        }}
        onUpdateOrder={(updatedOrder) => {
          const allOrders = getOrders();
          const updatedOrders = allOrders.map(o => o.id === updatedOrder.id ? updatedOrder : o);
          saveOrders(updatedOrders);
          setSelectedOrderForSidebar(updatedOrder);

          // Update table status based on payment or completion
          const table = tables.find(t => t.id === updatedOrder.tableId);
          if (table) {
            let newStatus = table.status;
            if (updatedOrder.paid) newStatus = 'dirty';
            else if (updatedOrder.status === 'completed') newStatus = 'dirty';
            else if (updatedOrder.status === 'cancelled') newStatus = 'available';
            
            if (newStatus !== table.status) {
              updateTable(table.id, { status: newStatus });
            }
          }
        }}
      />

    </div>
  );
}
