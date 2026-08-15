import assert from 'node:assert/strict';
import { buildEmployeesCsv } from './staff-export.ts';
import type { Employee } from './staff.ts';

const sample: Employee[] = [
  {
    id: '1',
    name: 'Anna "Test"',
    position: 'Waiter',
    section: 'Floor',
    nie: 'X123',
    phone: '+34 600 000 000',
    email: 'anna@corgicafe.com',
    contractStart: '2024-01-01',
    scheduleStart: '08:00',
    scheduleEnd: '17:00',
    daysPerWeek: 5,
    avatarInitials: 'AT',
    status: 'active',
    roleName: 'Waiter',
  },
];

const csv = buildEmployeesCsv(sample);
assert.match(csv, /Anna ""Test""/, 'escapes quotes in CSV');
assert.match(csv, /"Floor"/, 'includes section column');
assert.match(csv, /Waiter/, 'includes position');

console.log('✅ staff-export unit tests passed');
