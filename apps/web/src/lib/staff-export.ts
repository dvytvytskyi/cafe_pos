import type { Employee } from './staff';

function escapeCsvCell(value: string): string {
  const safe = String(value ?? '').replace(/"/g, '""');
  return `"${safe}"`;
}

export function buildEmployeesCsv(employees: Employee[]): string {
  const headers = [
    'Name',
    'Section',
    'Position',
    'Status',
    'NIE',
    'Phone',
    'Email',
    'Contract Start',
    'Contract End',
    'Schedule Start',
    'Schedule End',
    'Days Per Week',
    'Role',
  ];

  const rows = employees.map((e) => [
    e.name,
    e.section,
    e.position,
    e.status,
    e.nie,
    e.phone,
    e.email,
    e.contractStart,
    e.contractEnd ?? '',
    e.scheduleStart,
    e.scheduleEnd,
    String(e.daysPerWeek),
    e.roleName ?? '',
  ]);

  return [headers, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\n');
}

export function exportEmployeesToCsv(employees: Employee[], filename?: string): void {
  const csv = buildEmployeesCsv(employees);
  const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename ?? `staff-export-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
