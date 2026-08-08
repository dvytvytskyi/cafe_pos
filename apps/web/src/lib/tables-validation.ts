import type { Room, Table } from './tables';

export const LAYOUT_CANVAS_SIZE = 3000;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function tableToRect(table: Pick<Table, 'x' | 'y' | 'width' | 'height'>): Rect {
  return { x: table.x, y: table.y, w: table.width, h: table.height };
}

export function checkOverlap(r1: Rect, r2: Rect): boolean {
  return !(
    r1.x + r1.w <= r2.x ||
    r2.x + r2.w <= r1.x ||
    r1.y + r1.h <= r2.y ||
    r2.y + r2.h <= r1.y
  );
}

export function isWithinCanvasBounds(table: Pick<Table, 'x' | 'y' | 'width' | 'height'>, canvasSize = LAYOUT_CANVAS_SIZE): boolean {
  return (
    table.x >= 0 &&
    table.y >= 0 &&
    table.width > 0 &&
    table.height > 0 &&
    table.x + table.width <= canvasSize &&
    table.y + table.height <= canvasSize
  );
}

export function validateTableDimensions(table: Pick<Table, 'width' | 'height'>): string | null {
  if (table.width <= 0 || table.height <= 0) {
    return `Table "${(table as Table).name ?? 'unknown'}" has invalid size (${table.width}x${table.height})`;
  }
  return null;
}

export class LayoutValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LayoutValidationError';
  }
}

export function validateRoomLayout(rooms: Room[], canvasSize = LAYOUT_CANVAS_SIZE): void {
  for (const room of rooms) {
    for (let i = 0; i < room.tables.length; i++) {
      const table = room.tables[i]!;

      const sizeErr = validateTableDimensions(table);
      if (sizeErr) throw new LayoutValidationError(sizeErr);

      if (!isWithinCanvasBounds(table, canvasSize)) {
        throw new LayoutValidationError(
          `Table "${table.name}" is outside canvas bounds (${table.x},${table.y} ${table.width}x${table.height})`,
        );
      }

      for (let j = i + 1; j < room.tables.length; j++) {
        const other = room.tables[j]!;
        if (checkOverlap(tableToRect(table), tableToRect(other))) {
          throw new LayoutValidationError(
            `Tables "${table.name}" and "${other.name}" overlap in room "${room.name}"`,
          );
        }
      }
    }
  }
}
