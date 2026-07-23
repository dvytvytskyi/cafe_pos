'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, ChevronDown, ChevronRight } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Employee, getEmployees } from '@/lib/staff';
import Link from 'next/link';

export default function StaffSchedulePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setEmployees(getEmployees());
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Generate days for the current week
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <DashboardLayout>
      <div className="flex-1 w-full h-[calc(100vh-2rem)] bg-white rounded-[2rem] border border-gray-100 shadow-sm flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white z-10">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Schedules</h1>
            <p className="text-sm font-medium text-gray-500 mt-1">Manage employee shifts and time off</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="flex items-center gap-0.5 h-9 bg-gray-50/80 p-1 rounded-xl border border-gray-200/60 shrink-0">
              <button className="cursor-pointer whitespace-nowrap h-7 flex items-center justify-center px-4 text-[13px] font-semibold rounded-lg transition-all duration-200 gap-1.5 bg-white text-gray-900 shadow-sm">
                This Month
              </button>
              <button className="cursor-pointer whitespace-nowrap h-7 flex items-center justify-center px-4 text-[13px] font-semibold rounded-lg transition-all duration-200 gap-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-200/50">
                Group
              </button>
              <button className="cursor-pointer whitespace-nowrap h-7 flex items-center justify-center px-4 text-[13px] font-semibold rounded-lg transition-all duration-200 gap-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-200/50">
                Employees
              </button>
            </div>
            <div className="flex gap-3">
              <Link href="/staff/time-tracking" className="px-5 py-2.5 bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 rounded-2xl transition-colors shrink-0">
                <span className="text-sm font-bold">Time Tracking</span>
              </Link>
              <Link href="/staff" className="px-5 py-2.5 bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 rounded-2xl transition-colors shrink-0">
                <span className="text-sm font-bold">Back to Admin</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {employees.map((emp) => (
              <div key={emp.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden relative flex flex-col h-full">
                <div 
                  className="p-5 flex flex-col flex-1 cursor-pointer relative z-10 hover:bg-gray-50/50 transition-colors"
                  onClick={() => toggleExpand(emp.id)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-700 font-black text-lg border border-gray-200 shrink-0">
                      {emp.avatarInitials}
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors shrink-0">
                      {expandedId === emp.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>
                  </div>

                  <div className="mb-4">
                    <h3 className="font-black text-gray-900 text-lg truncate">{emp.name}</h3>
                    <p className="text-xs font-semibold text-gray-500 mt-1 flex flex-wrap items-center gap-2">
                      <span className="truncate">{emp.position} · {emp.section}</span>
                      <span className="flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Active
                      </span>
                    </p>
                  </div>

                  <div className="mt-auto border-t border-gray-50 pt-4">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1">Contracted hours</p>
                    <p className="text-base font-black text-gray-900">{emp.scheduleStart} - {emp.scheduleEnd}</p>
                  </div>
                </div>

                {/* Expanded Calendar Grid View */}
                {expandedId === emp.id && (
                  <div className="border-t border-gray-100 p-5 bg-gray-50/30 relative z-10">
                    <div className="grid grid-cols-7 gap-1">
                      {days.map((day, idx) => {
                        const isWorking = idx < emp.daysPerWeek;
                        return (
                          <div key={day} className={`aspect-square rounded-lg p-1.5 border flex flex-col justify-center items-center ${
                            isWorking 
                              ? 'bg-corgi/20 border-corgi/40' 
                              : 'bg-gray-100/50 border-gray-200'
                          }`}>
                            <span className="text-[9px] font-bold text-gray-500 mb-1">{day}</span>
                            {isWorking ? (
                              <span className="text-[10px] leading-tight font-black text-gray-900 text-center">
                                {emp.scheduleStart.split(':')[0]}<br/>|<br/>{emp.scheduleEnd.split(':')[0]}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-gray-400 text-center italic">Off</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
