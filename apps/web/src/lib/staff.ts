export interface Employee {
  id: string;
  name: string;
  position: string;
  section: 'Floor' | 'Kitchen' | 'Bar' | string;
  nie: string;
  phone: string;
  email: string;
  contractStart: string;
  contractEnd?: string;
  scheduleStart: string;
  scheduleEnd: string;
  daysPerWeek: number;
  avatarInitials: string;
  status: 'active' | 'inactive';
  roleId?: string;
  roleName?: string;
  /** Form-only — never returned by GET /api/staff */
  pin?: string;
}

export class StaffApiError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = 'StaffApiError';
    this.code = code;
  }
}

function mapApiEmployee(raw: Record<string, unknown>): Employee {
  const role = raw.role as { id?: string; name?: string } | undefined;
  return {
    id: String(raw.id),
    name: String(raw.name ?? ''),
    position: String(raw.position ?? ''),
    section: (raw.section as Employee['section']) || 'Floor',
    nie: String(raw.nie ?? ''),
    phone: String(raw.phone ?? ''),
    email: String(raw.email ?? ''),
    contractStart: String(raw.contractStart ?? ''),
    contractEnd: raw.contractEnd ? String(raw.contractEnd) : undefined,
    scheduleStart: String(raw.scheduleStart ?? '10:00'),
    scheduleEnd: String(raw.scheduleEnd ?? '15:00'),
    daysPerWeek: Number(raw.daysPerWeek ?? 5),
    avatarInitials: String(raw.avatarInitials ?? ''),
    status: (raw.status as Employee['status']) || 'active',
    roleId: String(raw.roleId ?? role?.id ?? ''),
    roleName: String(role?.name ?? ''),
  };
}

export interface TimeEntry {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  checkInTime: string | null; // ISO string
  checkOutTime: string | null;
  totalHours: number;
  status: 'pending' | 'on_shift' | 'completed';
}

/** @deprecated Use getEmployeesAsync — staff list is stored in PostgreSQL. */
export const getEmployees = (): Employee[] => [];

/** @deprecated No-op — staff data lives in PostgreSQL. */
export const saveEmployees = (_employees: Employee[]) => {};

/** @deprecated Use getTimeTrackingAsync from @/lib/time-tracking — time cards are in PostgreSQL. */
export const getTimeEntries = (_date: string): TimeEntry[] => [];

/** @deprecated No-op — time cards live in PostgreSQL. */
export const saveTimeEntries = (_date: string, _entries: TimeEntry[]) => {};

// --- Database Connected Async Operations ---

export async function getEmployeesAsync(): Promise<Employee[]> {
  const res = await fetch('/api/staff');
  if (!res.ok) {
    throw new StaffApiError('Failed to fetch staff list from PostgreSQL');
  }
  const data = await res.json();
  const list = Array.isArray(data) ? data : data.items;
  return list.map((raw: Record<string, unknown>) => mapApiEmployee(raw));
}

export async function getRolesAsync(): Promise<{ id: string; name: string }[]> {
  const res = await fetch('/api/roles');
  if (!res.ok) {
    throw new StaffApiError('Failed to fetch roles');
  }
  return res.json();
}

export async function createEmployeeAsync(data: {
  name: string;
  pin: string;
  roleId: string;
  locationIds?: string[];
  position?: string;
  section?: 'Floor' | 'Kitchen';
  nie?: string;
  phone?: string;
  email?: string;
  contractStart?: string;
  contractEnd?: string;
  scheduleStart?: string;
  scheduleEnd?: string;
  daysPerWeek?: number;
  avatarInitials?: string;
  status?: 'active' | 'inactive';
}): Promise<Employee> {
  const res = await fetch('/api/staff', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new StaffApiError(
      err.error || 'Failed to create staff member in PostgreSQL',
      err.code
    );
  }
  const raw = await res.json();
  return mapApiEmployee(raw);
}

export async function updateEmployeeAsync(id: string, data: {
  name?: string;
  pin?: string;
  roleId?: string;
  locationIds?: string[];
  position?: string;
  section?: 'Floor' | 'Kitchen';
  nie?: string;
  phone?: string;
  email?: string;
  contractStart?: string;
  contractEnd?: string;
  scheduleStart?: string;
  scheduleEnd?: string;
  daysPerWeek?: number;
  avatarInitials?: string;
  status?: 'active' | 'inactive';
}): Promise<Employee> {
  const res = await fetch(`/api/staff/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new StaffApiError(
      err.error || `Failed to update staff member [${id}] in PostgreSQL`,
      err.code
    );
  }
  const raw = await res.json();
  return mapApiEmployee(raw);
}

export async function deleteEmployeeAsync(id: string): Promise<boolean> {
  const res = await fetch(`/api/staff/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error(`Failed to delete staff member [${id}] from PostgreSQL`);
  }
  const result = await res.json();
  return result.success;
}

export async function loginWithPinAsync(pin: string): Promise<{
  success: boolean;
  user: unknown;
  error?: string;
}> {
  const res = await fetch('/api/auth/login-pin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin }),
    credentials: 'include',
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      success: false,
      user: null,
      error: body.error ?? body.code ?? 'Invalid PIN',
    };
  }
  return body;
}

