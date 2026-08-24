'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Download, User, MoreHorizontal } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {
  Employee,
  getEmployeesAsync,
  createEmployeeAsync,
  updateEmployeeAsync,
  getRolesAsync,
  StaffApiError,
} from '@/lib/staff';
import {
  filterEmployeesBySearch,
  filterEmployeesByArchived,
  EMPTY_STAFF_LIST_MESSAGE,
} from '@/lib/staff-validation';
import { exportEmployeesToCsv } from '@/lib/staff-export';
import EmployeeModal, { RoleOption } from '@/components/operations/EmployeeModal';
import Link from 'next/link';

export default function StaffAdminPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [activeTab, setActiveTab] = useState<'All' | 'Floor' | 'Kitchen' | 'Bar'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setLoadError(null);
    Promise.all([getEmployeesAsync(), getRolesAsync()])
      .then(([staff, roleList]) => {
        setEmployees(staff);
        setRoles(roleList);
      })
      .catch((err) => {
        console.error(err);
        setLoadError(err instanceof Error ? err.message : 'Failed to load staff');
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleSaveEmployee = async (emp: Employee) => {
    try {
      const exists = employees.find((e) => e.id === emp.id);
      if (exists) {
        const updatePayload: Parameters<typeof updateEmployeeAsync>[1] = {
          name: emp.name,
          roleId: emp.roleId,
          position: emp.position,
          section: emp.section as 'Floor' | 'Kitchen' | 'Bar',
          nie: emp.nie,
          phone: emp.phone,
          email: emp.email,
          contractStart: emp.contractStart,
          contractEnd: emp.contractEnd,
          scheduleStart: emp.scheduleStart,
          scheduleEnd: emp.scheduleEnd,
          daysPerWeek: emp.daysPerWeek,
          avatarInitials: emp.avatarInitials,
          status: emp.status,
        };
        if (emp.pin) updatePayload.pin = emp.pin;
        const updated = await updateEmployeeAsync(emp.id, updatePayload);
        setEmployees(employees.map((e) => (e.id === emp.id ? updated : e)));
      } else {
        if (!emp.pin || !emp.roleId) {
          setToast('PIN and role are required for new employees.');
          throw new Error('Missing PIN or role');
        }
        const created = await createEmployeeAsync({
          name: emp.name,
          pin: emp.pin,
          roleId: emp.roleId,
          position: emp.position,
          section: emp.section as 'Floor' | 'Kitchen' | 'Bar',
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
      setIsModalOpen(false);
    } catch (e) {
      if (e instanceof StaffApiError && e.code === 'PIN_DUPLICATE') {
        setToast('This PIN is already in use. Please choose a different PIN.');
        throw e;
      }
      console.error('Failed to save employee:', e);
      throw e;
    }
  };

  const filteredEmployees = useMemo(() => {
    let list = employees;
    list = filterEmployeesByArchived(list, showArchived);
    list = filterEmployeesBySearch(list, searchQuery);
    if (activeTab !== 'All') {
      list = list.filter((e) => e.section === activeTab);
    }
    return list;
  }, [employees, showArchived, searchQuery, activeTab]);

  const activeCount = employees.filter((e) => e.status === 'active').length;
  const salaCount = employees.filter((e) => e.section === 'Floor' && e.status === 'active').length;
  const cocinaCount = employees.filter((e) => e.section === 'Kitchen' && e.status === 'active').length;
  const barCount = employees.filter((e) => e.section === 'Bar' && e.status === 'active').length;
  const totalCount = employees.length;

  const handleExport = () => {
    if (filteredEmployees.length === 0) {
      setToast('No employees to export.');
      return;
    }
    exportEmployeesToCsv(filteredEmployees);
  };

  return (
    <DashboardLayout>
      <div className="flex-1 w-full h-[calc(100vh-2rem)] bg-white rounded-[2rem] border border-gray-100 shadow-sm flex flex-col overflow-hidden relative">
        {toast && (
          <div
            className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl shadow-lg"
            data-testid="staff-toast"
          >
            {toast}
          </div>
        )}

        <div className="p-6 md:p-8 shrink-0 flex flex-wrap items-center justify-between gap-y-4 gap-x-4 bg-white z-10">
          <div className="order-1 flex-1 min-w-[200px]">
            <h1 className="text-2xl font-bold text-gray-900">Staff & HR</h1>
            <p className="text-sm font-medium text-gray-500 mt-1">Manage staff, schedules, and HR tasks</p>
          </div>

          <div className="order-3 lg:order-2 flex justify-end gap-3 w-full lg:w-auto">
            <Link
              href="/staff/time-tracking"
              className="flex items-center justify-center px-4 h-9 bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 rounded-xl transition-colors shrink-0"
            >
              <span className="text-[13px] font-bold">Time Tracking</span>
            </Link>
            <Link
              href="/staff/schedule"
              className="flex items-center justify-center px-4 h-9 bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 rounded-xl transition-colors shrink-0"
            >
              <span className="text-[13px] font-bold">View schedules</span>
            </Link>
          </div>

          <button
            onClick={() => {
              setSelectedEmployee(null);
              setIsModalOpen(true);
            }}
            data-testid="staff-new-employee-btn"
            className="order-2 lg:order-3 flex items-center justify-center gap-2 px-4 h-9 bg-[#EE635E] hover:bg-[#d94f4a] text-white rounded-xl transition-colors cursor-pointer shrink-0"
          >
            <Plus size={16} />
            <span className="text-[13px] font-bold">New employee</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-8">
          {loadError && (
            <div role="alert" className="mb-4 bg-red-50 border border-red-100 text-red-700 text-sm font-medium rounded-xl px-4 py-3">
              {loadError}
            </div>
          )}
          {isLoading ? (
            <div className="py-16 text-center text-gray-400 text-sm font-medium">Loading staff…</div>
          ) : (
          <div className="w-full space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-white p-6 rounded-2xl border border-gray-100 relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-5 text-gray-900">
                  <User size={80} />
                </div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Active Staff</p>
                <p className="text-3xl font-bold text-gray-900">{activeCount}</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Floor</p>
                <p className="text-3xl font-bold text-gray-900">{salaCount}</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Kitchen</p>
                <p className="text-3xl font-bold text-gray-900">{cocinaCount}</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Bar</p>
                <p className="text-3xl font-bold text-gray-900">{barCount}</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-100 relative overflow-hidden bg-gray-50/50">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Staff</p>
                <p className="text-3xl font-bold text-gray-500">{totalCount}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex flex-wrap justify-between items-center gap-3 bg-white">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-0.5 h-9 bg-gray-50/80 p-1 rounded-xl border border-gray-200/60 shrink-0">
                    {(['All', 'Floor', 'Kitchen', 'Bar'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        data-testid={`staff-tab-${tab}`}
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
                  <input
                    type="search"
                    placeholder="Search by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    data-testid="staff-search-input"
                    className="h-9 px-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-gray-900 min-w-[180px]"
                  />
                  <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showArchived}
                      onChange={(e) => setShowArchived(e.target.checked)}
                      data-testid="staff-archived-toggle"
                      className="rounded border-gray-300"
                    />
                    Show archived
                  </label>
                </div>

                <button
                  type="button"
                  onClick={handleExport}
                  data-testid="staff-export-btn"
                  className="flex items-center gap-2 px-4 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl transition-colors cursor-pointer shrink-0"
                >
                  <Download size={16} />
                  <span className="text-[13px] font-bold">Export Excel</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                {filteredEmployees.length === 0 ? (
                  <div
                    className="py-16 text-center text-gray-400 text-sm font-medium"
                    data-testid="staff-empty-state"
                  >
                    {EMPTY_STAFF_LIST_MESSAGE}
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse min-w-max" data-testid="staff-table">
                    <thead>
                      <tr className="border-b border-gray-100 bg-white">
                        <th className="py-3 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                          Employee
                        </th>
                        <th className="py-3 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                          Position
                        </th>
                        <th className="py-3 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                          ID/NIE
                        </th>
                        <th className="py-3 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                          Phone
                        </th>
                        <th className="py-3 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                          Email
                        </th>
                        <th className="py-3 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                          Start Date
                        </th>
                        <th className="py-3 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                          Schedule
                        </th>
                        <th className="py-3 px-6"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 bg-white">
                      {filteredEmployees.map((emp) => (
                        <tr
                          key={emp.id}
                          className="hover:bg-gray-50 transition-colors group"
                          data-testid={`staff-row-${emp.id}`}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 font-bold text-sm shrink-0 border border-gray-200">
                                {emp.avatarInitials}
                              </div>
                              <div>
                                <p className="font-bold text-gray-900 text-sm" data-testid="staff-row-name">
                                  {emp.name}
                                </p>
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
                          <td className="px-6 py-4 text-xs font-semibold text-gray-500 whitespace-nowrap">
                            {emp.contractStart}
                          </td>
                          <td className="px-6 py-4 text-xs font-semibold text-gray-500 whitespace-nowrap">
                            {emp.scheduleStart} – {emp.scheduleEnd}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => {
                                setSelectedEmployee(emp);
                                setIsModalOpen(true);
                              }}
                              data-testid={`staff-edit-${emp.id}`}
                              className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                            >
                              <MoreHorizontal size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
          )}
        </div>

        <EmployeeModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          employee={selectedEmployee}
          roles={roles}
          onSave={handleSaveEmployee}
        />
      </div>
    </DashboardLayout>
  );
}
