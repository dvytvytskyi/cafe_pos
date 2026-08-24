'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MousePointer2, Square, Plus, Map, Move, Trash2, Maximize2, SplitSquareHorizontal, ZoomIn, ZoomOut, Focus, Hexagon, QrCode, Download, RefreshCw, Layers, Copy, Play, Settings2, Check, ChevronRight } from 'lucide-react';
import OrderTerminalModal from '@/components/pos/OrderTerminalModal';
import type { PosOrderConfirmMeta } from '@/components/pos/PosOrderConfirmSheet';
import OrderDetailsModal from '@/components/operations/OrderDetailsModal';
import { getOrdersAsync, createOrderAsync, updateOrderAsync, updateOrderStatusAsync, completePaymentAsync, printOrderAsync, addOrderItemsAsync, Order } from '@/lib/orders';
import { getGuestsAsync, Guest } from '@/lib/crm';
import {
  DEFAULT_ROOMS,
  Room,
  Table,
  Zone,
  Obstacle,
  Point,
  getRoomsAsync,
  saveRoomsAsync,
  seedDefaultLayoutAsync,
  updateTableStatusAsync,
  updateTablePatchAsync,
} from '@/lib/tables';
import { DEFAULT_LOCATION_ID } from '@/lib/constants';
import { getPrimaryStaffLocationId } from '@/lib/staff-location';
import { buildEmenuQrUrl } from '@/lib/emenu';
import { logAuditEvent } from '@/lib/audit';
import { resolveTableDisplayStatus, getOpenOrderForTable } from '@/lib/table-status-sync';
import { getTableDisplayStyle, shouldShowOrderSidebar, type TableDisplayStatus } from '@/lib/table-display-status';
import { calculateOrderTotals } from '@/lib/order-totals';

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
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string>('room-1');
  const [isLoadingLayout, setIsLoadingLayout] = useState(true);
  const [layoutError, setLayoutError] = useState<string | null>(null);
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

  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [initialRooms, setInitialRooms] = useState<Room[]>([]);
  const [crmGuests, setCrmGuests] = useState<Guest[]>([]);
  const [mounted, setMounted] = useState(false);
  const [staffLocationId, setStaffLocationId] = useState(DEFAULT_LOCATION_ID);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchActiveOrders = async (locationId = staffLocationId) => {
    try {
      const dbOrders = await getOrdersAsync(locationId);
      setActiveOrders(dbOrders);
    } catch (error) {
      console.error('Failed to fetch active orders from DB:', error);
    }
  };

  useEffect(() => {
    if (!mounted) return;

    async function loadLayout() {
      setIsLoadingLayout(true);
      setLayoutError(null);
      try {
        const locationId = await getPrimaryStaffLocationId();
        setStaffLocationId(locationId);
        let dbRooms = await getRoomsAsync(locationId);
        if (!dbRooms || dbRooms.length === 0) {
          dbRooms = await seedDefaultLayoutAsync(locationId);
        }
        setRooms(dbRooms);
        setInitialRooms(dbRooms);
        setActiveRoomId((prev) => (dbRooms.some((r) => r.id === prev) ? prev : dbRooms[0]!.id));
        await fetchActiveOrders(locationId);
      } catch (error) {
        console.error('Failed to load layout from DB:', error);
        setLayoutError('Could not load floor plan from server. Please retry.');
      } finally {
        setIsLoadingLayout(false);
      }
    }
    loadLayout();
    getGuestsAsync()
      .then(setCrmGuests)
      .catch((err) => console.error('Failed to load CRM guests:', err));
  }, [mounted]);

  useEffect(() => {
    if (!mounted || !isLiveView) return;
    fetchActiveOrders(staffLocationId);
    const intervalId = window.setInterval(() => fetchActiveOrders(staffLocationId), 30000);
    return () => window.clearInterval(intervalId);
  }, [isLiveView, mounted, staffLocationId]);

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
    saveRoomsAsync(staffLocationId, updatedRooms).catch(err => {
      console.error('Failed to save default view:', err);
      setLayoutError('Failed to save default view');
    });
    
    setIsSavedFeedback(true);
    setTimeout(() => {
      setIsSavedFeedback(false);
      setIsSettingDefaultView(false);
      setIsControlsExpanded(false); // Collapse floating panel into arrow icon after saving default view
    }, 1200);
  };

  const activeRoom = rooms.find(r => r.id === activeRoomId) || rooms[0];
  const tables = activeRoom?.tables ?? [];
  const zones = activeRoom?.zones ?? [];
  const obstacles = activeRoom?.obstacles ?? [];

  const displayStatus = (table: Table): TableDisplayStatus => {
    const dbStatus = table.status === 'dirty' ? 'available' : (table.status || 'available');
    return isLiveView
      ? resolveTableDisplayStatus(dbStatus, activeOrders, table.id)
      : dbStatus;
  };

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
  const [qrCacheKey, setQrCacheKey] = useState(0);

  const svgRef = useRef<SVGSVGElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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
    const isStatusOnly =
      Object.keys(updates).length === 1 && updates.status !== undefined;
    const isStaffOnly =
      Object.keys(updates).length === 1 && updates.assignedStaffId !== undefined;

    const updatedTables = tables.map(t => {
      if (t.id !== id) return t;
      if (updates.name !== undefined) {
        const val = updates.name;
        const isDuplicate = tables.some(other => other.id !== id && other.name === val);
        if (isDuplicate) {
          return { ...t, ...updates, name: val + ' (1)' };
        }
        return { ...t, ...updates, name: val };
      }
      return { ...t, ...updates };
    });
    setTables(updatedTables);

    if (isStatusOnly && updates.status) {
      updateTableStatusAsync(id, updates.status).catch(err => {
        console.error('Failed to update table status in DB:', err);
        setLayoutError('Failed to save table status');
      });
    } else if (isStaffOnly) {
      updateTablePatchAsync(id, { assignedStaffId: updates.assignedStaffId }).catch((err) => {
        console.error('Failed to update table waiter in DB:', err);
        setLayoutError('Failed to save table waiter');
      });
    }
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

  if (!mounted) {
    return (
      <div className="flex flex-col h-full bg-gray-50 rounded-2xl overflow-hidden shadow-inner relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm font-semibold text-gray-600">Loading floor plan…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 rounded-2xl overflow-hidden shadow-inner relative">
      {isLoadingLayout && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-50/90">
          <p className="text-sm font-semibold text-gray-600">Loading floor plan…</p>
        </div>
      )}
      {layoutError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-xl text-sm font-semibold shadow-md flex items-center gap-3">
          <span>{layoutError}</span>
          <button
            type="button"
            onClick={() => setLayoutError(null)}
            className="text-red-500 hover:text-red-700 font-bold"
          >
            ×
          </button>
        </div>
      )}
      {/* Save Banner */}
      {!readonly && (isDirty || saveStatus !== 'idle') && (
        <div 
          className={`absolute bottom-8 left-1/2 -translate-x-1/2 z-40 bg-white px-5 py-2.5 rounded-full shadow-2xl border ${saveStatus === 'saved' ? 'border-green-100' : 'border-orange-100'} flex items-center gap-4 transition-all duration-500 ease-in-out ${isExiting ? 'opacity-0 translate-y-8 scale-95' : 'opacity-100 translate-y-0 scale-100'} ${!isExiting && saveStatus === 'idle' ? 'animate-in slide-in-from-bottom-8 fade-in duration-300' : ''}`}
        >
          <span className="text-sm font-bold text-gray-600">
            {saveStatus === 'saved' ? 'All changes saved!' : 'You have unsaved changes'}
          </span>
          <button
            onClick={async () => {
              if (saveStatus !== 'idle') return;
              try {
                await saveRoomsAsync(staffLocationId, rooms);
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
              } catch (e) {
                console.error('Failed to save layout:', e);
                setLayoutError('Failed to save layout changes');
              }
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

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {isLiveView && (
            <div className="hidden lg:flex items-center gap-1.5 mr-2 flex-wrap max-w-xl">
              {(['incoming', 'preparing', 'ready', 'served', 'occupied', 'billed'] as TableDisplayStatus[]).map((key) => {
                const s = getTableDisplayStyle(key);
                return (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border"
                    style={{ backgroundColor: s.badgeFill, borderColor: s.badgeStroke, color: s.badgeText }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.stroke }} />
                    {s.label}
                  </span>
                );
              })}
            </div>
          )}
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
            
            const liveStatus: TableDisplayStatus = isLiveView
              ? displayStatus(table)
              : 'available';
            const liveStyle = getTableDisplayStyle(liveStatus);

            const getTableColors = () => {
              if (isSelected) {
                return { fill: '#fef3c7', stroke: '#fdbd38', strokeWidth: 3 };
              }
              if (isLiveView && liveStatus !== 'available') {
                return { fill: liveStyle.fill, stroke: liveStyle.stroke, strokeWidth: 3 };
              }
              return { fill: '#fffbeb66', stroke: '#fdbd38', strokeWidth: 3 };
            };

            const tableColors = getTableColors();

            return (
              <g
                key={table.id}
                data-testid={`pos-table-${table.id}`}
                transform={`translate(${table.x}, ${table.y})`}
                className={`group ${mode === 'select' && !isLiveView ? 'cursor-move' : isLiveView ? 'cursor-pointer' : ''}`}
                onPointerDown={(e) => {
                  if (isLiveView) {
                    const liveStatus = displayStatus(table);
                    const openOrder = getOpenOrderForTable(activeOrders, table.id);
                    if (shouldShowOrderSidebar(liveStatus) && openOrder) {
                      setActiveOrderTableId(null);
                      setSelectedOrderForSidebar(openOrder);
                    } else {
                      setSelectedOrderForSidebar(null);
                      setActiveOrderTableId(table.id);
                    }
                  } else {
                    handleItemPointerDown(e, 'table', table.id, { x: table.x, y: table.y });
                  }
                }}
              >
                <g transform={table.rotation ? `rotate(${table.rotation}, ${cx}, ${cy})` : ''}>
                {table.type === 'custom' && table.points ? (
                  <polygon 
                    points={table.points.map(p => `${p.x},${p.y}`).join(' ')}
                    fill={tableColors.fill}
                    stroke={tableColors.stroke}
                    strokeWidth={tableColors.strokeWidth}
                    className="transition-all duration-300 drop-shadow-sm group-hover:drop-shadow-md"
                  />
                ) : table.type === 'rect' || (table as { type?: string }).type === 'square' ? (
                  <rect 
                    x={0} y={0} 
                    width={table.width} height={table.height} 
                    rx="8"
                    fill={tableColors.fill}
                    stroke={tableColors.stroke}
                    strokeWidth={tableColors.strokeWidth}
                    className="transition-all duration-300 drop-shadow-sm group-hover:drop-shadow-md"
                  />
                ) : (
                  <circle 
                    cx={table.width / 2} cy={table.height / 2} 
                    r={table.width / 2} 
                    fill={tableColors.fill}
                    stroke={tableColors.stroke}
                    strokeWidth={tableColors.strokeWidth}
                    className="transition-all duration-300 drop-shadow-sm group-hover:drop-shadow-md"
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
                {(() => {
                  const status = liveStatus;
                  if (!status || status === 'available') return null;
                  const style = liveStyle;
                  const badgeLabel = style.label;
                  const badgeWidth = Math.max(50, badgeLabel.length * 5.5 + 14);
                  let badgeX = 0;
                  let badgeY = -6;
                  if (table.type === 'rect' || (table as { type?: string }).type === 'square') {
                    badgeX = table.width / 2;
                  } else if (table.type === 'circle' || (table as { type?: string }).type === 'round') {
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
                        x={badgeX - badgeWidth / 2}
                        y={badgeY}
                        width={badgeWidth}
                        height="12"
                        rx="6"
                        fill={style.badgeFill}
                        stroke={style.badgeStroke}
                        strokeWidth="1.5"
                      />
                      <text
                        x={badgeX}
                        y={badgeY + 8.5}
                        fill={style.badgeText}
                        fontSize="6.5"
                        fontWeight="black"
                        textAnchor="middle"
                        letterSpacing="0.3"
                      >
                        {badgeLabel}
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
              
              const emenuUrl = buildEmenuQrUrl(
                modalTable.id,
                staffLocationId,
                typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
              );
              const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(emenuUrl)}&color=1f2937&margin=0&cache=${qrCacheKey}`;

              const downloadQR = async () => {
                try {
                  const response = await fetch(qrImageUrl);
                  const blob = await response.blob();
                  const link = document.createElement('a');
                  link.href = URL.createObjectURL(blob);
                  link.download = `Table-${modalTable.name}-eMenu-QR.png`;
                  link.click();
                } catch {
                  window.open(qrImageUrl, '_blank');
                }
              };

              return (
                <div className="flex flex-col items-center">
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Table {modalTable.name} eMenu QR</h3>
                  <p className="text-[11px] text-gray-500 font-medium text-center break-all px-2 mb-4">{emenuUrl}</p>

                  <div className="flex flex-col items-center gap-6 w-full animate-in zoom-in-95 duration-200">
                    <div className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center">
                      <img
                        src={qrImageUrl.replace('500x500', '250x250')}
                        alt="eMenu QR Code"
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
                        className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        Regenerate
                      </button>
                    </div>

                    {confirmRegenerate && (
                      <div className="w-full p-4 border border-orange-200 bg-orange-50/40 rounded-xl text-left">
                        <p className="text-sm font-bold text-gray-800 mb-2">Regenerate QR code?</p>
                        <p className="text-xs text-gray-500 mb-3">Existing printed codes will still work unless you change the table URL. This refreshes the preview image.</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setQrCacheKey(Date.now());
                              setConfirmRegenerate(false);
                            }}
                            className="px-3 py-1.5 bg-black text-white rounded-lg text-xs font-bold"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setConfirmRegenerate(false)}
                            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  
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

          const tableDisplayStatus = displayStatus(table);
          const activeOrder = activeOrders.find(o => o.tableId === activeOrderTableId && !o.paid);

          return (
            <OrderTerminalModal
              tableId={activeOrderTableId}
              tableName={table.name}
              currentStatus={tableDisplayStatus}
              initialOrder={activeOrder}
              guests={crmGuests}
              locationId={staffLocationId}
              tableAssignedStaffId={table.assignedStaffId}
              onClose={() => setActiveOrderTableId(null)}
              onAction={async (action, items, discountPercent, customerId, keepOpen, meta?: PosOrderConfirmMeta) => {
                let newStatus = table.status;
                if (action === 'send_to_kitchen' || action === 'takeaway' || action === 'checkout') newStatus = 'occupied';
                else if (action === 'print_check') newStatus = 'billed';
                else if (action === 'clean') newStatus = 'available';

                if (action !== 'clean' && action !== 'print_check') {
                  const staffId = meta?.takenByStaffId;
                  const guestCount = meta?.guestCount;
                  const newCartItems = items.filter((i) => i.isNew === true);
                  const formattedNewItems = newCartItems.map((i) => ({
                    name: i.name,
                    price: i.price,
                    quantity: i.quantity,
                    comments: i.comments,
                    soldByStaffId: staffId,
                  }));
                  const formattedAllItems = items.map((i) => ({
                    name: i.name,
                    price: i.price,
                    quantity: i.quantity,
                    comments: i.comments,
                  }));
                  const { discountAmount, total: finalTotal } = calculateOrderTotals(formattedAllItems, {
                    discountPercent: discountPercent,
                  });

                  const finalCustomerId = customerId || activeOrder?.customerId;
                  const guestName = finalCustomerId
                    ? crmGuests.find((g) => g.id === finalCustomerId)?.name || activeOrder?.customerName || `Table ${table.name}`
                    : `Table ${table.name}`;

                  const discount =
                    discountPercent > 0
                      ? {
                          name: `${Math.round(discountPercent * 100)}% Discount`,
                          value: discountPercent * 100,
                          amountDeducted: discountAmount,
                        }
                      : undefined;

                  const source = action === 'takeaway' || action === 'checkout' ? 'takeaway' : 'dine_in';

                  try {
                    let orderToOpen: Order;
                    if (activeOrder) {
                      if (formattedNewItems.length > 0) {
                        await addOrderItemsAsync(activeOrder.id, formattedNewItems);
                      }
                      orderToOpen = await updateOrderAsync(activeOrder.id, {
                        total: finalTotal,
                        customerId: finalCustomerId,
                        customerName: guestName,
                        tableId: table.id,
                        discount,
                        status: 'preparing',
                        source,
                        guestCount,
                        takenByStaffId: activeOrder.takenByStaffId ?? staffId,
                        assignedStaffId: staffId,
                      });
                    } else {
                      orderToOpen = await createOrderAsync({
                        source,
                        status: 'preparing',
                        tableId: table.id,
                        locationId: staffLocationId,
                        items: formattedAllItems.map((i) => ({ ...i, soldByStaffId: staffId })),
                        total: finalTotal,
                        customerId: finalCustomerId,
                        customerName: guestName,
                        paid: false,
                        orderedBy: 'waiter',
                        discount,
                        guestCount,
                        takenByStaffId: staffId,
                        assignedStaffId: staffId,
                      });
                    }

                    if (staffId) {
                      updateTable(table.id, { assignedStaffId: staffId });
                    }

                    if (action === 'send_to_kitchen' || action === 'takeaway') {
                      try {
                        await printOrderAsync(orderToOpen.id, 'kitchen', true);
                        await printOrderAsync(orderToOpen.id, 'bar', true);
                      } catch (printErr) {
                        console.warn('Kitchen/bar print failed:', printErr);
                      }
                    }

                    if (action === 'checkout') {
                      setSelectedOrderForSidebar(orderToOpen);
                      setActiveOrderTableId(null);
                    }

                    await fetchActiveOrders();
                  } catch (err) {
                    console.error('Failed to save order:', err);
                    setLayoutError('Failed to save order');
                    return;
                  }
                } else if (action === 'print_check') {
                  if (activeOrder) {
                    try {
                      await printOrderAsync(activeOrder.id, 'receipt', false);
                    } catch (e) {
                      console.warn('Receipt print failed', e);
                    }
                  }
                }

                updateTable(activeOrderTableId, { status: newStatus });
                if (!keepOpen && action !== 'checkout') {
                  setActiveOrderTableId(null);
                }
              }}
            />
          );
        })()
      )}

      {/* Existing Order details sidebar modal */}
      {(() => {
        const sidebarTable = selectedOrderForSidebar?.tableId
          ? tables.find((t) => t.id === selectedOrderForSidebar.tableId)
          : undefined;

        return (
      <OrderDetailsModal
        order={selectedOrderForSidebar}
        isOpen={!!selectedOrderForSidebar}
        tableStatus={sidebarTable?.status}
        tableName={sidebarTable?.name}
        onClose={() => setSelectedOrderForSidebar(null)}
        onTableReleased={async () => {
          const tableId = selectedOrderForSidebar?.tableId;
          if (tableId) {
            const table = tables.find((t) => t.id === tableId);
            if (table) updateTable(table.id, { status: 'available' });
          }
          await fetchActiveOrders();
        }}
        onUpdateStatus={async (orderId, status) => {
          try {
            const updated = await updateOrderStatusAsync(orderId, status);
            setSelectedOrderForSidebar(updated);
            await fetchActiveOrders();

            // Update table status if needed
            const table = tables.find(t => t.id === updated.tableId);
            if (table) {
              let newStatus = table.status;
              if (status === 'completed' || status === 'cancelled') newStatus = 'available';
              if (newStatus !== table.status) {
                updateTable(table.id, { status: newStatus });
              }
            }
          } catch (err) {
            console.error('Failed to update order status:', err);
          }
        }}
        onUpdateOrder={async (updatedOrder) => {
          try {
            const updated = await updateOrderAsync(updatedOrder.id, updatedOrder);
            setSelectedOrderForSidebar(updated);
            await fetchActiveOrders();
          } catch (err) {
            console.error('Failed to update order:', err);
          }
        }}
        onPaymentComplete={async (updated) => {
          setSelectedOrderForSidebar(updated.paid ? null : updated);
          await fetchActiveOrders();
          if (updated.paid && updated.tableId) {
            await updateTableStatusAsync(updated.tableId, 'available');
            const table = tables.find(t => t.id === updated.tableId);
            if (table) {
              updateTable(table.id, { status: 'available' });
            }
          }
        }}
      />
        );
      })()}

    </div>
  );
}
