'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronRight as ExpandIcon } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Employee, getEmployeesAsync } from '@/lib/staff';
import {
  ScheduleShift,
  getScheduleAsync,
  saveScheduleBulkAsync,
  toWeekStartString,
} from '@/lib/time-tracking';
import Link from 'next/link';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function StaffSchedulePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [weekStart, setWeekStart] = useState(() => toWeekStartString(new Date()));
  const [shifts, setShifts] = useState<ScheduleShift[]>([]);
  const [warnings, setWarnings] = useState<Array<{ userId: string; userName: string; weeklyHours: number }>>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const loadSchedule = useCallback(async () => {
    const [staff, data] = await Promise.all([
      getEmployeesAsync(),
      getScheduleAsync(weekStart),
    ]);
    setEmployees(staff.filter((e) => e.status === 'active'));
    setShifts(data.shifts);
    setWarnings(data.warnings);
    setDirty(false);
  }, [weekStart]);

  useEffect(() => {
    loadSchedule().catch(console.error);
  }, [loadSchedule]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const shiftsByUserDay = useMemo(() => {
    const map = new Map<string, ScheduleShift>();
    for (const s of shifts) {
      map.set(`${s.userId}:${s.dayOfWeek}`, s);
    }
    return map;
  }, [shifts]);

  const toggleDayShift = (emp: Employee, dayOfWeek: number) => {
    const key = `${emp.id}:${dayOfWeek}`;
    const existing = shiftsByUserDay.get(key);
    if (existing) {
      setShifts((prev) => prev.filter((s) => !(s.userId === emp.id && s.dayOfWeek === dayOfWeek)));
    } else {
      setShifts((prev) => [
        ...prev,
        {
          userId: emp.id,
          dayOfWeek,
          startTime: emp.scheduleStart || '09:00',
          endTime: emp.scheduleEnd || '17:00',
        },
      ]);
    }
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = shifts.map((s) => ({
        userId: s.userId,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
      }));
      await saveScheduleBulkAsync(weekStart, payload);
      await loadSchedule();
      setToast('Schedule saved successfully.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Save failed';
      setToast(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex-1 w-full h-[calc(100vh-2rem)] bg-white rounded-[2rem] border border-gray-100 shadow-sm flex flex-col overflow-hidden">
        {toast && (
          <div
            className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-xl shadow-lg"
            data-testid="schedule-toast"
          >
            {toast}
          </div>
        )}

        <div className="p-6 border-b border-gray-100 shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white z-10">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Schedules</h1>
            <p className="text-sm font-medium text-gray-500 mt-1">Manage employee shifts and time off</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setWeekStart(addDays(weekStart, -7))}
                data-testid="schedule-prev-week"
                className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-bold text-gray-900 px-2" data-testid="schedule-week-start">
                Week of {weekStart}
              </span>
              <button
                onClick={() => setWeekStart(addDays(weekStart, 7))}
                data-testid="schedule-next-week"
                className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <button
              onClick={handleSave}
              disabled={!dirty || saving}
              data-testid="schedule-save-btn"
              className="px-4 h-9 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white rounded-xl text-[13px] font-bold"
            >
              {saving ? 'Saving…' : 'Save week'}
            </button>
            <Link
              href="/staff/time-tracking"
              className="px-5 py-2.5 bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 rounded-2xl transition-colors shrink-0"
            >
              <span className="text-sm font-bold">Time Tracking</span>
            </Link>
            <Link
              href="/staff"
              className="px-5 py-2.5 bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 rounded-2xl transition-colors shrink-0"
            >
              <span className="text-sm font-bold">Back to Admin</span>
            </Link>
          </div>
        </div>

        {warnings.length > 0 && (
          <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl" data-testid="schedule-hours-warning">
            <p className="text-xs font-bold text-amber-800">
              Weekly hours warning (&gt;40h):{' '}
              {warnings.map((w) => `${w.userName} (${w.weeklyHours.toFixed(1)}h)`).join(', ')}
            </p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30" data-testid="schedule-page">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {employees.map((emp) => {
              const hasWarning = warnings.some((w) => w.userId === emp.id);
              return (
                <div
                  key={emp.id}
                  className="bg-white rounded-2xl border border-gray-100 overflow-hidden relative flex flex-col h-full"
                  data-testid={`schedule-card-${emp.id}`}
                >
                  <div
                    className="p-5 flex flex-col flex-1 cursor-pointer relative z-10 hover:bg-gray-50/50 transition-colors"
                    onClick={() => setExpandedId(expandedId === emp.id ? null : emp.id)}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-700 font-black text-lg border border-gray-200 shrink-0">
                        {emp.avatarInitials}
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors shrink-0">
                        {expandedId === emp.id ? <ChevronDown size={16} /> : <ExpandIcon size={16} />}
                      </div>
                    </div>
                    <div className="mb-4">
                      <h3 className="font-black text-gray-900 text-lg truncate">{emp.name}</h3>
                      <p className="text-xs font-semibold text-gray-500 mt-1 flex flex-wrap items-center gap-2">
                        <span className="truncate">
                          {emp.position} · {emp.section}
                        </span>
                        {hasWarning && (
                          <span
                            className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full shrink-0"
                            data-testid={`schedule-user-warning-${emp.id}`}
                          >
                            &gt;40h
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="mt-auto border-t border-gray-50 pt-4">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1">Default hours</p>
                      <p className="text-base font-black text-gray-900">
                        {emp.scheduleStart} - {emp.scheduleEnd}
                      </p>
                    </div>
                  </div>

                  {expandedId === emp.id && (
                    <div className="border-t border-gray-100 p-5 bg-gray-50/30 relative z-10">
                      <div className="grid grid-cols-7 gap-1">
                        {DAY_LABELS.map((day, idx) => {
                          const shift = shiftsByUserDay.get(`${emp.id}:${idx}`);
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleDayShift(emp, idx);
                              }}
                              data-testid={`schedule-day-${emp.id}-${idx}`}
                              className={`aspect-square rounded-lg p-1.5 border flex flex-col justify-center items-center transition-colors ${
                                shift
                                  ? 'bg-corgi/20 border-corgi/40 hover:bg-corgi/30'
                                  : 'bg-gray-100/50 border-gray-200 hover:bg-gray-100'
                              }`}
                            >
                              <span className="text-[9px] font-bold text-gray-500 mb-1">{day}</span>
                              {shift ? (
                                <span className="text-[10px] leading-tight font-black text-gray-900 text-center">
                                  {shift.startTime.split(':')[0]}
                                  <br />|<br />
                                  {shift.endTime.split(':')[0]}
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-gray-400 text-center italic">Off</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
