'use client';

import React, { useState, useEffect } from 'react';
import { Clock, User } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Employee, TimeEntry, getEmployees, getTimeEntries, saveTimeEntries, getEmployeesAsync } from '@/lib/staff';
import Link from 'next/link';

export default function TimeTrackingPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    getEmployeesAsync().then(setEmployees).catch(console.error);
    setTimeEntries(getTimeEntries(todayStr));
  }, [todayStr]);

  const handleCheckIn = (employeeId: string) => {
    const newEntries = timeEntries.map(entry => {
      if (entry.employeeId === employeeId) {
        return {
          ...entry,
          status: 'on_shift' as const,
          checkInTime: new Date().toISOString()
        };
      }
      return entry;
    });
    setTimeEntries(newEntries);
    saveTimeEntries(todayStr, newEntries);
  };

  const handleCheckOut = (employeeId: string) => {
    const newEntries = timeEntries.map(entry => {
      if (entry.employeeId === employeeId && entry.checkInTime) {
        const checkOut = new Date();
        const checkIn = new Date(entry.checkInTime);
        const hours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
        return {
          ...entry,
          status: 'completed' as const,
          checkOutTime: checkOut.toISOString(),
          totalHours: entry.totalHours + hours
        };
      }
      return entry;
    });
    setTimeEntries(newEntries);
    saveTimeEntries(todayStr, newEntries);
  };

  // KPIs
  const activeStaff = employees.filter(e => e.status === 'active').length;
  const onShiftCount = timeEntries.filter(e => e.status === 'on_shift').length;
  const pendingCount = timeEntries.filter(e => e.status === 'pending').length;
  const finishedCount = timeEntries.filter(e => e.status === 'completed').length;
  const totalHoursToday = timeEntries.reduce((sum, e) => sum + e.totalHours, 0);

  const getEntryForEmployee = (empId: string) => {
    return timeEntries.find(e => e.employeeId === empId);
  };

  return (
    <DashboardLayout>
      <div className="flex-1 w-full h-[calc(100vh-2rem)] bg-white rounded-[2rem] border border-gray-100 shadow-sm flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white z-10">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Time Tracking</h1>
            <p className="text-sm font-medium text-gray-500 mt-1">Daily check-in and check-out records</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-200">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-0.5">Today's date</p>
              <p className="font-bold text-gray-900 text-sm">{new Date().toLocaleDateString('en-US')}</p>
            </div>
            <Link href="/staff" className="px-5 py-2.5 bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 rounded-2xl transition-colors shrink-0">
              <span className="text-sm font-bold">Back to Admin</span>
            </Link>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
          <div className="w-full space-y-6">
            
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-gray-100 relative overflow-hidden">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Active Staff</p>
                <p className="text-3xl font-black text-gray-900">{activeStaff}</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">On Shift</p>
                <p className="text-3xl font-black text-gray-900">{onShiftCount}</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Pending</p>
                <p className="text-3xl font-black text-gray-900">{pendingCount}</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Finished</p>
                <p className="text-3xl font-black text-gray-900">{finishedCount}</p>
              </div>
              <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100">
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-wider mb-1">Hours Today</p>
                <p className="text-3xl font-black text-amber-600">{totalHoursToday.toFixed(1)}<span className="text-sm font-bold text-amber-400 ml-1">h</span></p>
              </div>
            </div>

            {/* Action Table */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
                <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider">Attendance Record</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-max">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="py-3 px-6 text-[10px] font-black text-gray-400 uppercase tracking-wider whitespace-nowrap">Employee</th>
                      <th className="py-3 px-6 text-[10px] font-black text-gray-400 uppercase tracking-wider text-center whitespace-nowrap">Status</th>
                      <th className="py-3 px-6 text-[10px] font-black text-gray-400 uppercase tracking-wider text-center whitespace-nowrap">Check In</th>
                      <th className="py-3 px-6 text-[10px] font-black text-gray-400 uppercase tracking-wider text-center whitespace-nowrap">Time In</th>
                      <th className="py-3 px-6 text-[10px] font-black text-gray-400 uppercase tracking-wider text-center whitespace-nowrap">Time Out</th>
                      <th className="py-3 px-6 text-[10px] font-black text-gray-400 uppercase tracking-wider text-center whitespace-nowrap">Check Out</th>
                      <th className="py-3 px-6 text-[10px] font-black text-gray-400 uppercase tracking-wider text-right whitespace-nowrap">Hours Today</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 bg-white">
                    {employees.map(emp => {
                      const entry = getEntryForEmployee(emp.id);
                      if (!entry) return null;

                      return (
                        <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 font-black text-sm shrink-0 border border-gray-200">
                                {emp.avatarInitials}
                              </div>
                              <div>
                                <p className="font-bold text-gray-900 text-sm">{emp.name}</p>
                                <p className="text-[10px] font-semibold text-gray-400 mt-0.5">{emp.position}</p>
                              </div>
                            </div>
                          </td>
                          
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold border ${
                              entry.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                              entry.status === 'on_shift' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                              'bg-gray-50 text-gray-500 border-gray-200'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                entry.status === 'pending' ? 'bg-amber-500' :
                                entry.status === 'on_shift' ? 'bg-emerald-500' :
                                'bg-gray-400'
                              }`}></span>
                              {entry.status === 'pending' ? 'Pending' : entry.status === 'on_shift' ? 'On Shift' : 'Finished'}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-center">
                            <button 
                              onClick={() => handleCheckIn(emp.id)}
                              disabled={entry.status !== 'pending'}
                              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                                entry.status === 'pending' 
                                  ? 'bg-corgi hover:bg-[#e6a800] text-brown cursor-pointer' 
                                  : 'bg-gray-50 text-gray-400 border border-gray-200 cursor-not-allowed opacity-60'
                              }`}
                            >
                              Check In
                            </button>
                          </td>

                          <td className="px-6 py-4 text-center">
                            <span className={`font-bold text-sm ${entry.checkInTime ? 'text-emerald-600' : 'text-gray-300'}`}>
                              {entry.checkInTime ? new Date(entry.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-center">
                            <span className={`font-bold text-sm ${entry.checkOutTime ? 'text-gray-900' : 'text-gray-300'}`}>
                              {entry.checkOutTime ? new Date(entry.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-center">
                            <button 
                              onClick={() => handleCheckOut(emp.id)}
                              disabled={entry.status !== 'on_shift'}
                              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                                entry.status === 'on_shift' 
                                  ? 'bg-gray-900 hover:bg-black text-white cursor-pointer' 
                                  : 'bg-gray-50 text-gray-400 border border-gray-200 cursor-not-allowed opacity-60'
                              }`}
                            >
                              Check Out
                            </button>
                          </td>

                          <td className="px-6 py-4 text-right">
                            <span className={`font-black text-sm ${entry.totalHours > 0 ? 'text-orange-500' : 'text-gray-400'}`}>
                              {entry.totalHours.toFixed(2)} <span className="text-[10px]">h</span>
                            </span>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
