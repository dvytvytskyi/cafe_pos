'use client';

import React from 'react';
import { Check, LayoutTemplate, Shield } from 'lucide-react';
import type { RolePermissions } from '@/lib/auth-constants';
import { hasPermission } from '@/lib/auth';

export type TeamRole = {
  id: string;
  name: string;
  permissions?: RolePermissions;
};

type PermissionRow = {
  label: string;
  resource: string;
  action: 'create' | 'view' | 'edit' | 'delete';
};

const POS_ROWS: PermissionRow[] = [
  { label: 'Take new orders', resource: 'orders', action: 'create' },
  { label: 'Accept payments', resource: 'orders', action: 'edit' },
  { label: 'Apply discounts', resource: 'orders', action: 'edit' },
  { label: 'Refunds & Voids', resource: 'orders', action: 'delete' },
  { label: 'View Kitchen Display', resource: 'tasks', action: 'view' },
];

const MGMT_ROWS: PermissionRow[] = [
  { label: 'Access settings', resource: 'settings', action: 'view' },
  { label: 'Manage menu items', resource: 'menu', action: 'edit' },
  { label: 'View sales reports', resource: 'reports', action: 'view' },
  { label: 'Export data', resource: 'reports', action: 'view' },
  { label: 'Manage team & roles', resource: 'staff', action: 'edit' },
];

function roleHasPerm(role: TeamRole, row: PermissionRow): boolean {
  return hasPermission(role.permissions ?? {}, row.resource, row.action);
}

type TeamPermissionsMatrixProps = {
  roles: TeamRole[];
  activeRoleId: string;
  onActiveRoleChange?: (roleId: string) => void;
  isRoleSetupMode?: boolean;
  onToggleRolePermission?: (roleId: string, row: PermissionRow, enabled: boolean) => void;
  userOverrides?: Record<string, boolean>;
  onToggleUserOverride?: (label: string, enabled: boolean) => void;
};

export default function TeamPermissionsMatrix({
  roles,
  activeRoleId,
  onActiveRoleChange,
  isRoleSetupMode = false,
  onToggleRolePermission,
  userOverrides = {},
  onToggleUserOverride,
}: TeamPermissionsMatrixProps) {
  const renderRow = (row: PermissionRow, i: number) => (
    <tr key={`${row.label}-${i}`} className="hover:bg-gray-50/30 transition-colors group">
      <td className="px-6 py-4 font-medium text-gray-700">{row.label}</td>
      {roles.map((role) => {
        const isColActive = isRoleSetupMode || activeRoleId === role.id;
        const fromRole = roleHasPerm(role, row);
        const isPermChecked = isRoleSetupMode
          ? fromRole
          : activeRoleId === role.id
            ? (userOverrides[row.label] ?? fromRole)
            : fromRole;

        const highlightBgRow = isRoleSetupMode
          ? 'group-hover:bg-purple-50/20'
          : activeRoleId === role.id
            ? 'bg-[#EE635E]/10'
            : '';
        const activeHighlight = isRoleSetupMode ? 'bg-purple-600' : 'bg-[#EE635E]';
        const checkedBg = isColActive ? activeHighlight : 'bg-gray-300';

        return (
          <td
            key={role.id}
            className={`px-2 py-3 text-center transition-all duration-500 ease-out ${highlightBgRow}`}
          >
            <button
              type="button"
              disabled={!isColActive}
              onClick={() => {
                if (isRoleSetupMode) {
                  onToggleRolePermission?.(role.id, row, !fromRole);
                } else if (activeRoleId === role.id) {
                  onToggleUserOverride?.(row.label, !isPermChecked);
                }
              }}
              className={`mx-auto w-5 h-5 rounded flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                isColActive ? 'cursor-pointer hover:scale-110 active:scale-95' : 'cursor-default'
              } ${
                isPermChecked
                  ? `${checkedBg} text-white shadow-sm ${isColActive ? 'scale-110' : 'scale-90 opacity-60'}`
                  : `border border-gray-200 bg-gray-50 ${isColActive ? 'hover:border-gray-300 scale-100' : 'scale-90 opacity-40'}`
              }`}
            >
              {isPermChecked && <Check size={12} strokeWidth={3} className="transition-all duration-300" />}
            </button>
          </td>
        );
      })}
    </tr>
  );

  return (
    <div className="border border-gray-100 rounded-2xl bg-white overflow-hidden shadow-sm overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[720px]">
        <thead>
          <tr className="bg-gray-50/50 border-b border-gray-100">
            <th className="px-6 py-4 text-[13px] font-bold text-gray-400 w-[22%]">Access Rights</th>
            {roles.map((role) => {
              const isColActive = isRoleSetupMode || activeRoleId === role.id;
              const highlightBg = isRoleSetupMode ? 'bg-purple-50/50' : 'bg-[#EE635E]/10';
              const highlightColor = isRoleSetupMode ? 'bg-purple-600 border-purple-600' : 'bg-[#EE635E] border-[#EE635E]';
              const highlightText = isRoleSetupMode ? 'text-purple-600' : 'text-[#EE635E]';

              return (
                <th
                  key={role.id}
                  onClick={() => !isRoleSetupMode && onActiveRoleChange?.(role.id)}
                  className={`px-2 py-4 text-center transition-all duration-500 ease-out ${
                    !isRoleSetupMode ? 'cursor-pointer hover:bg-gray-50' : ''
                  } ${isColActive && !isRoleSetupMode ? highlightBg : ''}`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all duration-500 ${
                        isColActive ? `${highlightColor} scale-125` : 'border-gray-300 scale-100'
                      }`}
                    >
                      {isColActive && (
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-in zoom-in spin-in-12 duration-300" />
                      )}
                    </div>
                    <span
                      className={`text-[12px] font-bold transition-all duration-500 ${
                        isColActive ? `${highlightText} scale-105` : 'text-gray-600'
                      }`}
                    >
                      {role.name}
                    </span>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 text-[14px]">
          <tr className="bg-gray-50/30">
            <td colSpan={roles.length + 1} className="px-6 py-3 text-[12px] font-bold text-gray-500 uppercase tracking-wider">
              <div className="flex items-center gap-2">
                <LayoutTemplate size={14} /> POS & Orders
              </div>
            </td>
          </tr>
          {POS_ROWS.map((row, i) => renderRow(row, i))}
          <tr className="bg-gray-50/30">
            <td colSpan={roles.length + 1} className="px-6 py-3 text-[12px] font-bold text-gray-500 uppercase tracking-wider">
              <div className="flex items-center gap-2">
                <Shield size={14} /> Management
              </div>
            </td>
          </tr>
          {MGMT_ROWS.map((row, i) => renderRow(row, i))}
        </tbody>
      </table>
    </div>
  );
}

export { POS_ROWS, MGMT_ROWS };
export type { PermissionRow };
