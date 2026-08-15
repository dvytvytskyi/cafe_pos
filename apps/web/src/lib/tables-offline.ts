import type { Room, Table } from './tables';
import {
  enqueueOutbox,
  getTableLayout,
  putTableLayout,
  type TableLayoutRecord,
} from './pos-offline-db';

function uuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `offline-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function offlineGetRooms(locationId: string): Promise<Room[]> {
  const cached = await getTableLayout(locationId);
  return (cached?.rooms as Room[]) ?? [];
}

export async function offlineSaveRooms(locationId: string, rooms: Room[]): Promise<boolean> {
  const record: TableLayoutRecord = {
    locationId,
    rooms,
    updatedAt: new Date().toISOString(),
  };
  await putTableLayout(record);
  return true;
}

export async function offlineReplaceLayoutSnapshot(locationId: string, rooms: Room[]): Promise<void> {
  await putTableLayout({
    locationId,
    rooms,
    updatedAt: new Date().toISOString(),
  });
}

export async function offlineUpdateTableStatus(
  locationId: string,
  tableId: string,
  newStatus: NonNullable<Table['status']>
): Promise<Table> {
  const cached = await getTableLayout(locationId);
  const rooms = (cached?.rooms as Room[]) ?? [];
  let updated: Table | null = null;

  const nextRooms = rooms.map((room) => ({
    ...room,
    tables: room.tables.map((t) => {
      if (t.id === tableId) {
        updated = { ...t, status: newStatus };
        return updated;
      }
      return t;
    }),
  }));

  if (!updated) throw new Error(`Table [${tableId}] not found in offline layout`);

  await putTableLayout({
    locationId,
    rooms: nextRooms,
    updatedAt: new Date().toISOString(),
  });

  await enqueueOutbox({
    id: uuid(),
    type: 'table_status',
    locationId,
    tableId,
    payload: { status: newStatus },
    createdAt: new Date().toISOString(),
    retryCount: 0,
  });

  return updated;
}
