import { prisma } from '../lib/db';

export interface Point { x: number; y: number }
export interface Zone { id: string; points: Point[]; name: string; closed?: boolean }
export interface Obstacle { id: string; x?: number; y?: number; width?: number; height?: number; name: string; rotation?: number; points?: Point[] }
export interface Table { 
  id: string; x: number; y: number; width: number; height: number; 
  type: 'rect' | 'circle' | 'custom'; name: string; seats?: number; 
  points?: Point[]; qrCode?: string; rotation?: number; 
  status?: 'available' | 'occupied' | 'billed' | 'dirty'; 
}
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

type RoomLayoutMeta = {
  name?: string;
  zones: Zone[];
  obstacles: Obstacle[];
  defaultZoom?: number;
  defaultScrollX?: number;
  defaultScrollY?: number;
};

export class TableRepository {
  async updateTableStatus(tableId: string, status: string) {
    const dbTable = await prisma.table.update({
      where: { id: tableId },
      data: { status },
    });
    return {
      id: dbTable.id,
      x: dbTable.x,
      y: dbTable.y,
      width: dbTable.width,
      height: dbTable.height,
      type: dbTable.shape as 'rect' | 'circle' | 'custom',
      name: dbTable.number,
      seats: dbTable.seats || 4,
      status: dbTable.status as Table['status'],
    } satisfies Table;
  }

  async saveRoomLayouts(locationId: string, rooms: Room[]) {
    // 1. Extract non-table layout metadata (zones and obstacles per room)
    const layoutMetadata: Record<string, RoomLayoutMeta> = {};
    const incomingTableIds = new Set<string>();

    for (const room of rooms) {
      layoutMetadata[room.id] = {
        name: room.name,
        zones: room.zones,
        obstacles: room.obstacles,
        ...(room.defaultZoom !== undefined ? { defaultZoom: room.defaultZoom } : {}),
        ...(room.defaultScrollX !== undefined ? { defaultScrollX: room.defaultScrollX } : {}),
        ...(room.defaultScrollY !== undefined ? { defaultScrollY: room.defaultScrollY } : {}),
      };
      for (const table of room.tables) {
        incomingTableIds.add(table.id);
      }
    }

    // 2. Save location level metadata (zones/obstacles layout) in transaction
    return prisma.$transaction(async (tx) => {
      // Upsert location metadata
      await tx.location.upsert({
        where: { id: locationId },
        create: {
          id: locationId,
          name: 'Corgi Cafe Main',
          address: 'Main St 123',
          layoutMetadata: layoutMetadata as any,
        },
        update: {
          layoutMetadata: layoutMetadata as any,
        },
      });

      // Fetch existing tables in database for this location
      const existingTables = await tx.table.findMany({
        where: { locationId },
      });
      const existingTableIds = new Set(existingTables.map(t => t.id));

      // Delete tables that are no longer present in the incoming layout
      const idsToDelete = Array.from(existingTableIds).filter(id => !incomingTableIds.has(id));
      if (idsToDelete.length > 0) {
        // Note: cascading delete or nullification handles related orders if needed.
        // For tests and clean updates, we delete.
        await tx.table.deleteMany({
          where: { id: { in: idsToDelete } },
        });
      }

      // Upsert tables that are in the incoming payload
      for (const room of rooms) {
        for (const table of room.tables) {
          const tableData = {
            number: table.name,
            x: table.x,
            y: table.y,
            width: table.width,
            height: table.height,
            shape: table.type,
            status: table.status || 'available',
            roomId: room.id,
            roomName: room.name,
            seats: table.seats || 4,
          };

          if (existingTableIds.has(table.id)) {
            // Update
            await tx.table.update({
              where: { id: table.id },
              data: tableData,
            });
          } else {
            // Create
            await tx.table.create({
              data: {
                id: table.id,
                locationId,
                ...tableData,
              },
            });
          }
        }
      }

      return true;
    });
  }

  async getRoomLayouts(locationId: string): Promise<Room[]> {
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      select: { layoutMetadata: true },
    });

    const dbTables = await prisma.table.findMany({
      where: { locationId },
      orderBy: { number: 'asc' },
    });

    const meta = (location?.layoutMetadata || {}) as Record<string, RoomLayoutMeta>;

    // Identify unique rooms from tables and metadata keys
    const roomsMap = new Map<string, Room>();

    // 1. Pre-populate rooms from metadata layout
    for (const [roomId, roomMeta] of Object.entries(meta)) {
      // Find room name from metadata or fallback to tables / default
      const roomTables = dbTables.filter(t => t.roomId === roomId);
      const name = roomMeta.name || (roomTables.length > 0 ? (roomTables[0].roomName || 'Room') : 'Hall');
      roomsMap.set(roomId, {
        id: roomId,
        name,
        tables: [],
        zones: roomMeta.zones || [],
        obstacles: roomMeta.obstacles || [],
        defaultZoom: roomMeta.defaultZoom,
        defaultScrollX: roomMeta.defaultScrollX,
        defaultScrollY: roomMeta.defaultScrollY,
      });
    }

    // 2. Map tables to rooms
    for (const dbT of dbTables) {
      const roomId = dbT.roomId || 'default-room';
      const roomName = dbT.roomName || 'Main Hall';

      if (!roomsMap.has(roomId)) {
        roomsMap.set(roomId, {
          id: roomId,
          name: roomName,
          tables: [],
          zones: [],
          obstacles: [],
        });
      }

      roomsMap.get(roomId)!.tables.push({
        id: dbT.id,
        x: dbT.x,
        y: dbT.y,
        width: dbT.width,
        height: dbT.height,
        type: dbT.shape as 'rect' | 'circle' | 'custom',
        name: dbT.number,
        seats: dbT.seats || 4,
        status: dbT.status as 'available' | 'occupied' | 'billed' | 'dirty',
      });
    }

    return Array.from(roomsMap.values());
  }
}

export const tableRepository = new TableRepository();
export const locationRepository = {
  async findById(id: string) {
    return prisma.location.findUnique({
      where: { id },
    });
  },
  async findAll() {
    return prisma.location.findMany();
  }
};
