export interface Point { x: number; y: number }
export interface Zone { id: string; points: Point[]; name: string; closed?: boolean }
export interface Table { 
  id: string; x: number; y: number; width: number; height: number; 
  type: 'rect' | 'circle' | 'custom'; name: string; seats?: number; 
  points?: Point[]; qrCode?: string; rotation?: number; 
  status?: 'available' | 'occupied' | 'billed' | 'dirty'; 
}
export interface Obstacle { id: string; x?: number; y?: number; width?: number; height?: number; name: string; rotation?: number; points?: Point[] }
export interface Room {
  id: string;
  name: string;
  tables: Table[];
  zones: Zone[];
  obstacles: Obstacle[];
  defaultZoom?: number;
  defaultScrollX?: number;
  defaultScrollY?: number;
}

export const DEFAULT_ROOMS: Room[] = [
  {
    id: 'room-1',
    name: 'Main Hall',
    tables: [
      { id: 't1', x: 1400, y: 1450, width: 60, height: 60, type: 'rect', name: '1', seats: 4, status: 'available' },
      { id: 't2', x: 1520, y: 1450, width: 60, height: 60, type: 'rect', name: '2', seats: 4, status: 'occupied' },
      { id: 't3', x: 1640, y: 1450, width: 60, height: 60, type: 'rect', name: '3', seats: 4, status: 'billed' },
      { id: 't4', x: 1400, y: 1580, width: 80, height: 80, type: 'circle', name: '4', seats: 6, status: 'dirty' },
      { id: 't5', x: 1560, y: 1580, width: 80, height: 80, type: 'circle', name: '5', seats: 6, status: 'available' },
    ],
    zones: [
      { id: '1', name: 'Main Dining', points: [{x: 1350, y: 1350}, {x: 1750, y: 1350}, {x: 1750, y: 1700}, {x: 1350, y: 1700}], closed: true },
      { id: '2', name: 'Patio', points: [{x: 1800, y: 1350}, {x: 2000, y: 1350}, {x: 2000, y: 1700}, {x: 1800, y: 1700}], closed: true },
    ],
    obstacles: [
      { id: 'o1', name: 'Bar Counter', points: [{x: 1300, y: 1750}, {x: 1700, y: 1750}, {x: 1700, y: 1800}, {x: 1300, y: 1800}] }
    ]
  },
  {
    id: 'room-2',
    name: 'Terrace',
    tables: [
      { id: 't6', x: 1420, y: 1460, width: 60, height: 60, type: 'rect', name: 'T1', seats: 4, status: 'available' },
      { id: 't7', x: 1540, y: 1460, width: 60, height: 60, type: 'rect', name: 'T2', seats: 4, status: 'available' },
    ],
    zones: [],
    obstacles: []
  },
  {
    id: 'room-3',
    name: 'VIP Room',
    tables: [
      { id: 't8', x: 1450, y: 1450, width: 80, height: 80, type: 'rect', name: 'V1', seats: 8, status: 'available' },
    ],
    zones: [],
    obstacles: []
  },
  {
    id: 'room-4',
    name: 'Bar Area',
    tables: [
      { id: 't9', x: 1400, y: 1480, width: 50, height: 50, type: 'circle', name: 'B1', seats: 2, status: 'available' },
      { id: 't10', x: 1500, y: 1480, width: 50, height: 50, type: 'circle', name: 'B2', seats: 2, status: 'available' },
    ],
    zones: [],
    obstacles: []
  }
];

export const getRooms = (): Room[] => {
  if (typeof window === 'undefined') return DEFAULT_ROOMS;
  const stored = localStorage.getItem('corgi_rooms');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed.length > 1) return parsed;
      // Auto-migrate if the user has only 1 room stored and it's 'Main Hall'
      if (parsed.length === 1 && parsed[0].name === 'Main Hall') {
        saveRooms(DEFAULT_ROOMS);
        return DEFAULT_ROOMS;
      }
      return parsed;
    } catch (e) {
      console.error("Failed to parse rooms", e);
    }
  }
  return DEFAULT_ROOMS;
};

export const saveRooms = (rooms: Room[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('corgi_rooms', JSON.stringify(rooms));
  }
};

export async function updateTableStatusAsync(
  tableId: string,
  newStatus: NonNullable<Table['status']>
): Promise<Table> {
  const res = await fetch(`/api/tables/${tableId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: newStatus }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || body.error || `Failed to update table [${tableId}] status`);
  }
  return res.json();
}

/** @deprecated Prefer updateTableStatusAsync — kept for callers migrating off localStorage */
export const updateTableStatus = (tableId: string, newStatus: Table['status']) => {
  updateTableStatusAsync(tableId, newStatus!).catch(err =>
    console.error('Failed to update table status in DB:', err)
  );
};

// --- Database Connected Async Operations ---

export async function seedDefaultLayoutAsync(locationId: string): Promise<Room[]> {
  await saveRoomsAsync(locationId, DEFAULT_ROOMS);
  return DEFAULT_ROOMS;
}

export async function getRoomsAsync(locationId: string): Promise<Room[]> {
  const res = await fetch(`/api/locations/${locationId}/layout`);
  if (!res.ok) {
    throw new Error('Failed to fetch rooms and tables layout from PostgreSQL');
  }
  return res.json();
}

export async function saveRoomsAsync(locationId: string, rooms: Room[]): Promise<boolean> {
  const res = await fetch(`/api/locations/${locationId}/layout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rooms }),
  });
  if (!res.ok) {
    throw new Error('Failed to save rooms and tables layout to PostgreSQL');
  }
  const result = await res.json();
  return result.success;
}

