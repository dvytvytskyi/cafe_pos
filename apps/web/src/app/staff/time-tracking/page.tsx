'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Employee, getEmployeesAsync } from '@/lib/staff';
import {
  TimeTrackingEntry,
  getTimeTrackingAsync,
  clockInAsync,
  clockOutAsync,
} from '@/lib/time-tracking';
import Link from 'next/link';

function pendingEntry(employeeId: string, date: string): TimeTrackingEntry {
  return {
    id: `pending-${employeeId}`,
    employeeId,
    employeeName: '',
    date,
    checkInTime: null,
    checkOutTime: null,
    totalHours: 0,
    totalMinutes: 0,
    status: 'pending',
  };
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDisplayDate(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00.000Z`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function TimeTrackingPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [entries, setEntries] = useState<TimeTrackingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]!);
  const todayStr = new Date().toISOString().split('T')[0]!;
  const isToday = selectedDate === todayStr;

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [staff, tracking] = await Promise.all([
        getEmployeesAsync(),
        getTimeTrackingAsync(selectedDate),
      ]);
      setEmployees(staff.filter((e) => e.status === 'active'));
      setEntries(tracking);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load time tracking');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const getEntryForEmployee = (empId: string): TimeTrackingEntry => {
    return entries.find((e) => e.employeeId === empId) ?? pendingEntry(empId, selectedDate);
  };

  const handleCheckIn = async (employeeId: string) => {
    try {
      setActionError(null);
      const updated = await clockInAsync({ userId: employeeId });
      setEntries((prev) => [...prev.filter((e) => e.employeeId !== employeeId), updated]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Check in failed';
      setActionError(msg === 'Unauthorized' ? 'Please log in to record check-ins.' : msg);
      console.error('Check in failed:', e);
    }
  };

  const handleCheckOut = async (employeeId: string) => {
    try {
      setActionError(null);
      const updated = await clockOutAsync({ userId: employeeId });
      setEntries((prev) => [...prev.filter((e) => e.employeeId !== employeeId), updated]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Check out failed';
      setActionError(msg === 'Unauthorized' ? 'Please log in to record check-outs.' : msg);
      console.error('Check out failed:', e);
    }
  };

  const activeStaff = employees.length;
  const onShiftCount = employees.filter((e) => getEntryForEmployee(e.id).status === 'on_shift').length;
  const pendingCount = employees.filter((e) => getEntryForEmployee(e.id).status === 'pending').length;
  const finishedCount = employees.filter((e) => getEntryForEmployee(e.id).status === 'completed').length;
  const totalHoursToday = employees.reduce(
    (sum, e) => sum + getEntryForEmployee(e.id).totalHours,
    0
  );

  return (
    <DashboardLayout>
      <div
        className="flex-1 w-full h-[calc(100vh-2rem)] bg-white rounded-[2rem] border border-gray-100 shadow-sm flex flex-col overflow-hidden"
        data-testid="time-tracking-page"
      >
        <div className="p-6 border-b border-gray-100 shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white z-10">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Time Tracking</h1>
            <p className="text-sm font-medium text-gray-500 mt-1">Daily check-in and check-out records</p>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-200">
              <button
                type="button"
                onClick={() => setSelectedDate(addDays(selectedDate, -1))}
                data-testid="time-tracking-prev-day"
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-white"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="text-center min-w-[140px]">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                  {isToday ? "Today's date" : 'Selected date'}
                </p>
                <p className="font-bold text-gray-900 text-sm" data-testid="time-tracking-date">
                  {formatDisplayDate(selectedDate)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                disabled={selectedDate >= todayStr}
                data-testid="time-tracking-next-day"
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-white disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
              {!isToday && (
                <button
                  type="button"
                  onClick={() => setSelectedDate(todayStr)}
                  className="ml-1 px-2 py-1 text-[11px] font-bold text-corgi hover:underline"
                >
                  Today
                </button>
              )}
            </div>
            <Link
              href="/staff"
              className="px-5 py-2.5 bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 rounded-2xl transition-colors shrink-0"
            >
              <span className="text-sm font-bold">Back to Admin</span>
            </Link>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
          {(loadError || actionError) && (
            <div role="alert" className="mb-4 bg-red-50 border border-red-100 text-red-700 text-[13px] font-medium rounded-xl px-4 py-3">
              {loadError ?? actionError}
            </div>
          )}

          <div className="w-full space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Active Staff</p>
                <p className="text-3xl font-bold text-gray-900" data-testid="time-tracking-active-count">
                  {activeStaff}
                </p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">On Shift</p>
                <p className="text-3xl font-bold text-gray-900" data-testid="time-tracking-on-shift-count">
                  {onShiftCount}
                </p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Pending</p>
                <p className="text-3xl font-bold text-gray-900" data-testid="time-tracking-pending-count">
                  {pendingCount}
                </p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Finished</p>
                <p className="text-3xl font-bold text-gray-900" data-testid="time-tracking-finished-count">
                  {finishedCount}
                </p>
              </div>
              <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100">
                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-1">Hours Today</p>
                <p className="text-3xl font-bold text-amber-600" data-testid="time-tracking-hours-today">
                  {totalHoursToday.toFixed(1)}
                  <span className="text-sm font-bold text-amber-400 ml-1">h</span>
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
                <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider">Attendance Record</h3>
              </div>
              {loading ? (
                <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-max" data-testid="time-tracking-table">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/50">
                        <th className="py-3 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                          Employee
                        </th>
                        <th className="py-3 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center whitespace-nowrap">
                          Status
                        </th>
                        <th className="py-3 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center whitespace-nowrap">
                          Check In
                        </th>
                        <th className="py-3 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center whitespace-nowrap">
                          Time In
                        </th>
                        <th className="py-3 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center whitespace-nowrap">
                          Time Out
                        </th>
                        <th className="py-3 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center whitespace-nowrap">
                          Check Out
                        </th>
                        <th className="py-3 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right whitespace-nowrap">
                          Hours
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 bg-white">
                      {employees.map((emp) => {
                        const entry = getEntryForEmployee(emp.id);
                        const canCheckIn = isToday && entry.status === 'pending';
                        const canCheckOut = isToday && entry.status === 'on_shift';
                        return (
                          <tr
                            key={emp.id}
                            className="hover:bg-gray-50 transition-colors"
                            data-testid={`time-tracking-row-${emp.id}`}
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 font-bold text-sm shrink-0 border border-gray-200">
                                  {emp.avatarInitials}
                                </div>
                                <div>
                                  <p className="font-bold text-gray-900 text-sm">{emp.name}</p>
                                  <p className="text-[10px] font-semibold text-gray-400 mt-0.5">{emp.position}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold border ${
                                  entry.status === 'pending'
                                    ? 'bg-amber-50 text-amber-600 border-amber-200'
                                    : entry.status === 'on_shift'
                                      ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                      : 'bg-gray-50 text-gray-500 border-gray-200'
                                }`}
                                data-testid={`time-tracking-status-${emp.id}`}
                              >
                                {entry.status === 'pending'
                                  ? 'Pending'
                                  : entry.status === 'on_shift'
                                    ? 'On Shift'
                                    : 'Finished'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button
                                onClick={() => void handleCheckIn(emp.id)}
                                disabled={!canCheckIn}
                                data-testid={`time-tracking-check-in-${emp.id}`}
                                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                                  canCheckIn
                                    ? 'bg-corgi hover:bg-[#e6a800] text-brown cursor-pointer'
                                    : 'bg-gray-50 text-gray-400 border border-gray-200 cursor-not-allowed opacity-60'
                                }`}
                              >
                                Check In
                              </button>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span
                                className={`font-bold text-sm ${entry.checkInTime ? 'text-emerald-600' : 'text-gray-300'}`}
                                data-testid={`time-tracking-in-${emp.id}`}
                              >
                                {entry.checkInTime
                                  ? new Date(entry.checkInTime).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  : '--:--'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span
                                className={`font-bold text-sm ${entry.checkOutTime ? 'text-gray-900' : 'text-gray-300'}`}
                                data-testid={`time-tracking-out-${emp.id}`}
                              >
                                {entry.checkOutTime
                                  ? new Date(entry.checkOutTime).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  : '--:--'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button
                                onClick={() => void handleCheckOut(emp.id)}
                                disabled={!canCheckOut}
                                data-testid={`time-tracking-check-out-${emp.id}`}
                                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                                  canCheckOut
                                    ? 'bg-gray-900 hover:bg-black text-white cursor-pointer'
                                    : 'bg-gray-50 text-gray-400 border border-gray-200 cursor-not-allowed opacity-60'
                                }`}
                              >
                                Check Out
                              </button>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span
                                className={`font-bold text-sm ${entry.totalHours > 0 ? 'text-orange-500' : 'text-gray-400'}`}
                                data-testid={`time-tracking-hours-${emp.id}`}
                              >
                                {entry.totalHours.toFixed(2)} <span className="text-[10px]">h</span>
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
