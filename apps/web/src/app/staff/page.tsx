'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, Calendar, Download, Building2, MoreHorizontal, User, Briefcase } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Employee, getEmployees, saveEmployees, getEmployeesAsync, createEmployeeAsync, updateEmployeeAsync } from '@/lib/staff';
import EmployeeModal from '@/components/operations/EmployeeModal';
import Link from 'next/link';

export default function StaffAdminPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [activeTab, setActiveTab] = useState<'All' | 'Floor' | 'Kitchen'>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    getEmployeesAsync().then(setEmployees).catch(console.error);
  }, []);

  const handleSaveEmployee = async (emp: Employee) => {
    try {
      const exists = employees.find(e => e.id === emp.id);
      if (exists) {
        const updated = await updateEmployeeAsync(emp.id, emp);
        setEmployees(employees.map(e => e.id === emp.id ? updated : e));
      } else {
        const created = await createEmployeeAsync({
          name: emp.name,
          pin: '1234', // default PIN
          roleId: 'role-waiter-id', // default role ID
          position: emp.position,
          section: emp.section,
          nie: emp.nie,
          phone: emp.phone,
          email: emp.email,
          contractStart: emp.contractStart,
          scheduleStart: emp.scheduleStart,
          scheduleEnd: emp.scheduleEnd,
          daysPerWeek: emp.daysPerWeek,
          avatarInitials: emp.avatarInitials,
          status: emp.status,
        });
        setEmployees([...employees, created]);
      }
    } catch (e) {
      console.error('Failed to save employee:', e);
    }
  };

  const filteredEmployees = employees.filter(e => {
    if (activeTab === 'All') return true;
    return e.section === activeTab;
  });

  const activeCount = employees.filter(e => e.status === 'active').length;
  const salaCount = employees.filter(e => e.section === 'Floor' && e.status === 'active').length;
  const cocinaCount = employees.filter(e => e.section === 'Kitchen' && e.status === 'active').length;
  const totalCount = employees.length;

  return (
    <DashboardLayout>
      <div className="flex-1 w-full h-[calc(100vh-2rem)] bg-white rounded-[2rem] border border-gray-100 shadow-sm flex flex-col overflow-hidden relative">
        
        {/* Header */}
        <div className="p-6 md:p-8 shrink-0 flex flex-wrap items-center justify-between gap-y-4 gap-x-4 bg-white z-10">
          <div className="order-1 flex-1 min-w-[200px]">
            <h1 className="text-2xl font-bold text-gray-900">Staff & HR</h1>
            <p className="text-sm font-medium text-gray-500 mt-1">Manage staff, schedules, and HR tasks</p>
          </div>

          <div className="order-3 lg:order-2 flex justify-end gap-3 w-full lg:w-auto">
            <Link href="/staff/time-tracking" className="flex items-center justify-center px-4 h-9 bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 rounded-xl transition-colors shrink-0">
              <span className="text-[13px] font-bold">Time Tracking</span>
            </Link>
            <Link href="/staff/schedule" className="flex items-center justify-center px-4 h-9 bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 rounded-xl transition-colors shrink-0">
              <span className="text-[13px] font-bold">View schedules</span>
            </Link>
          </div>

          <button 
            onClick={() => { setSelectedEmployee(null); setIsModalOpen(true); }}
            className="order-2 lg:order-3 flex items-center justify-center gap-2 px-4 h-9 bg-gray-900 hover:bg-gray-800 text-white rounded-xl transition-colors cursor-pointer shrink-0"
          >
            <Plus size={16} />
            <span className="text-[13px] font-bold">New employee</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-8">
          <div className="w-full space-y-8">
            
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-2xl border border-gray-100 relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-5 text-gray-900">
                  <User size={80} />
                </div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Active Staff</p>
                <p className="text-3xl font-black text-gray-900">{activeCount}</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Floor</p>
                <p className="text-3xl font-black text-gray-900">{salaCount}</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Kitchen</p>
                <p className="text-3xl font-black text-gray-900">{cocinaCount}</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-100 relative overflow-hidden bg-gray-50/50">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Total Staff</p>
                <p className="text-3xl font-black text-gray-500">{totalCount}</p>
              </div>
            </div>

            {/* Table Section */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white">
                <div className="flex items-center gap-0.5 h-9 bg-gray-50/80 p-1 rounded-xl border border-gray-200/60 shrink-0">
                  {(['All', 'Floor', 'Kitchen'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`cursor-pointer whitespace-nowrap h-7 flex items-center justify-center px-4 text-[13px] font-semibold rounded-lg transition-all duration-200 gap-1.5 ${
                        activeTab === tab 
                          ? 'bg-white text-gray-900 shadow-sm' 
                          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                
                <div className="flex gap-3">
                  <button className="flex items-center gap-2 px-4 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl transition-colors cursor-pointer shrink-0">
                    <Download size={16} />
                    <span className="text-[13px] font-bold">Export Excel</span>
                  </button>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-max">
                  <thead>
                    <tr className="border-b border-gray-100 bg-white">
                      <th className="py-3 px-6 text-[10px] font-black text-gray-400 uppercase tracking-wider whitespace-nowrap">Employee</th>
                      <th className="py-3 px-6 text-[10px] font-black text-gray-400 uppercase tracking-wider whitespace-nowrap">Position</th>
                      <th className="py-3 px-6 text-[10px] font-black text-gray-400 uppercase tracking-wider whitespace-nowrap">ID/NIE</th>
                      <th className="py-3 px-6 text-[10px] font-black text-gray-400 uppercase tracking-wider whitespace-nowrap">Phone</th>
                      <th className="py-3 px-6 text-[10px] font-black text-gray-400 uppercase tracking-wider whitespace-nowrap">Email</th>
                      <th className="py-3 px-6 text-[10px] font-black text-gray-400 uppercase tracking-wider whitespace-nowrap">Start Date</th>
                      <th className="py-3 px-6 text-[10px] font-black text-gray-400 uppercase tracking-wider whitespace-nowrap">Schedule</th>
                      <th className="py-3 px-6"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 bg-white">
                    {filteredEmployees.map(emp => (
                      <tr key={emp.id} className="hover:bg-gray-50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 font-black text-sm shrink-0 border border-gray-200">
                              {emp.avatarInitials}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 text-sm">{emp.name}</p>
                              <p className="text-[10px] font-semibold text-gray-400 mt-0.5">{emp.section}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 rounded-md text-[10px] font-bold border bg-gray-50 text-gray-700 border-gray-200/80">
                            {emp.position}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold text-gray-500 whitespace-nowrap">{emp.nie}</td>
                        <td className="px-6 py-4 text-xs font-semibold text-gray-500 whitespace-nowrap">{emp.phone}</td>
                        <td className="px-6 py-4 text-xs font-semibold text-gray-500 whitespace-nowrap">{emp.email}</td>
                        <td className="px-6 py-4 text-xs font-semibold text-gray-500 whitespace-nowrap">{emp.contractStart}</td>
                        <td className="px-6 py-4 text-xs font-semibold text-gray-500 whitespace-nowrap">
                          {emp.scheduleStart} – {emp.scheduleEnd}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => { setSelectedEmployee(emp); setIsModalOpen(true); }}
                            className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <MoreHorizontal size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>

        <EmployeeModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          employee={selectedEmployee}
          onSave={handleSaveEmployee}
        />
      </div>
    </DashboardLayout>
  );
}
