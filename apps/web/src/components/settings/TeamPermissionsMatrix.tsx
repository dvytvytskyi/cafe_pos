'use client';

import React from 'react';
import { Check, Plus, Minus, Shield, Sparkles } from 'lucide-react';
import { PERMISSIONS_CATALOG, ALL_CAPABILITY_KEYS } from '@/lib/permissions/catalog';
import type { UserPermissionOverrides } from '@/lib/permissions/can';
import {
  sortRolesForMatrix,
  isSuperAdminRole,
  isSuperAdminOnlyCapability,
  SUPER_ADMIN_ROLE_NAME,
} from '@/lib/permissions/presets';

export type TeamRole = {
  id: string;
  name: string;
  permissions?: unknown; // string[] or Record<string, string[]>
};

function getRoleGrants(role: TeamRole): string[] {
  if (!role) return [];
  if (isSuperAdminRole(role.name, Array.isArray(role.permissions) ? role.permissions as string[] : null)) {
    return [...ALL_CAPABILITY_KEYS];
  }
  if (!role.permissions) return [];
  const perms = role.permissions;

  try {
    // 1. Array format: ['*'] or ['orders.view', 'orders.create']
    if (Array.isArray(perms)) {
      const list = perms;
      if (list.includes('*')) return ALL_CAPABILITY_KEYS;
      const result: string[] = [];
      for (const p of list) {
        if (p === '*') {
          result.push(...ALL_CAPABILITY_KEYS);
        } else if (typeof p === 'string' && p.endsWith('.*')) {
          const prefix = p.slice(0, -2);
          ALL_CAPABILITY_KEYS.filter((k) => k.startsWith(prefix + '.')).forEach((k) =>
            result.push(k)
          );
        } else if (typeof p === 'string') {
          result.push(p);
        }
      }
      return result;
    }

    // 2. Object format: { all: true }, { orders: ['*'] }, { orders: ['view', 'create'] }
    if (typeof perms === 'object' && perms !== null) {
      const obj = perms as Record<string, unknown>;
      if (obj.all === true || obj['*'] === true) {
        return ALL_CAPABILITY_KEYS;
      }

      const result: string[] = [];
      for (const [modKey, val] of Object.entries(obj)) {
        if (val === true || val === '*') {
          if (modKey === '*') {
            result.push(...ALL_CAPABILITY_KEYS);
          } else {
            ALL_CAPABILITY_KEYS.filter((k) => k.startsWith(modKey + '.')).forEach((k) =>
              result.push(k)
            );
          }
        } else if (Array.isArray(val)) {
          for (const act of val) {
            if (act === '*') {
              ALL_CAPABILITY_KEYS.filter((k) => k.startsWith(modKey + '.')).forEach((k) =>
                result.push(k)
              );
            } else if (typeof act === 'string') {
              const capKey = `${modKey}.${act}`;
              result.push(capKey);
              if (modKey === 'kitchen' && act === 'view') result.push('kitchen_bar.view');
              if (modKey === 'kitchen' && act === 'update') result.push('kitchen_bar.bump');
              if (modKey === 'tasks') result.push('operations.tasks');
            }
          }
        }
      }
      return result;
    }
  } catch (err) {
    console.error('Error parsing role grants:', err);
  }

  return [];
}

type TeamPermissionsMatrixProps = {
  roles: TeamRole[];
  activeRoleId: string;
  onActiveRoleChange?: (roleId: string) => void;
  isRoleSetupMode?: boolean;
  onToggleRolePermission?: (roleId: string, capabilityKey: string, enabled: boolean) => void;
  userOverrides?: UserPermissionOverrides;
  onToggleUserOverride?: (capabilityKey: string, action: 'add' | 'remove' | 'reset') => void;
};

export default function TeamPermissionsMatrix({
  roles,
  activeRoleId,
  onActiveRoleChange,
  isRoleSetupMode = false,
  onToggleRolePermission,
  userOverrides = { add: [], remove: [] },
  onToggleUserOverride,
}: TeamPermissionsMatrixProps) {
  const sortedRoles = sortRolesForMatrix(roles);
  const activeRole = sortedRoles.find((r) => r.id === activeRoleId) || sortedRoles[0];
  const overrideAddSet = new Set(userOverrides?.add ?? []);
  const overrideRemoveSet = new Set(userOverrides?.remove ?? []);

  return (
    <div className="w-full bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
      
      {/* Header Banner */}
      <div className="p-4 bg-gray-50/70 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
            {isRoleSetupMode
              ? 'Role Defaults Matrix (Setup Mode)'
              : `PERMISSIONS & OVERRIDES FOR ${activeRole?.name ?? 'MEMBER'}`}
          </h3>
        </div>

        {isRoleSetupMode ? (
          <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full border border-purple-200">
            Setup Mode Active: Editing Role Master Template
          </span>
        ) : (
          <div className="flex items-center gap-3 text-[11px] font-medium">
            <span className="flex items-center gap-1 text-gray-500">
              <span className="w-2.5 h-2.5 rounded bg-gray-300"></span> Role Default
            </span>
            <span className="flex items-center gap-1 text-emerald-600 font-bold">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500"></span> + Added Override
            </span>
            <span className="flex items-center gap-1 text-rose-600 font-bold">
              <span className="w-2.5 h-2.5 rounded bg-rose-500"></span> − Removed Override
            </span>
          </div>
        )}
      </div>

      {/* Matrix Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="bg-gray-50/50 text-gray-400 font-bold uppercase text-[10px] tracking-wider border-b border-gray-100">
            <tr>
              <th className="px-6 py-3 min-w-[240px]">Access Capability</th>
            {sortedRoles.map((role) => {
              const isSelected = activeRoleId === role.id;
              const isSupreme = role.name === SUPER_ADMIN_ROLE_NAME;
              return (
                <th
                  key={role.id}
                  onClick={() => onActiveRoleChange?.(role.id)}
                  className={`px-3 py-3 text-center cursor-pointer transition-colors ${
                    isRoleSetupMode
                      ? isSupreme
                        ? 'text-amber-700 font-bold bg-amber-50/80'
                        : 'text-purple-700 font-bold'
                      : isSelected
                        ? 'text-[#EE635E] font-bold bg-[#EE635E]/5'
                        : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span>{role.name}</span>
                    {isSupreme && (
                      <span className="text-[9px] uppercase tracking-wide text-amber-600 font-bold">
                        Full access
                      </span>
                    )}
                    {isSelected && !isRoleSetupMode && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#EE635E]"></span>
                    )}
                  </div>
                </th>
              );
            })}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {PERMISSIONS_CATALOG.map((group) => (
              <React.Fragment key={group.id}>
                {/* Group Header Row */}
                <tr className="bg-gray-50/80">
                  <td
                    colSpan={sortedRoles.length + 1}
                    className="px-6 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider font-mono"
                  >
                    {group.title}
                  </td>
                </tr>

                {/* Capability Rows */}
                {group.capabilities.map((cap) => {
                  return (
                    <tr key={cap.key} className="hover:bg-gray-50/40 transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex flex-col py-0.5">
                          <span className="text-[13px] font-bold text-gray-900 leading-snug">{cap.label}</span>
                          <span className="text-[11px] font-medium text-gray-500 mt-0.5 leading-snug">
                            {cap.description}
                          </span>
                        </div>
                      </td>

                      {sortedRoles.map((role) => {
                        const roleGrants = getRoleGrants(role);
                        const roleHasPerm =
                          isSuperAdminRole(role.name, roleGrants) ||
                          roleGrants.includes('*') ||
                          roleGrants.includes(cap.key);
                        const isColActive = isRoleSetupMode || activeRoleId === role.id;
                        const isSupremeCol = role.name === SUPER_ADMIN_ROLE_NAME;
                        const lockedSuperOnly =
                          isRoleSetupMode &&
                          isSuperAdminOnlyCapability(cap.key) &&
                          !isSupremeCol;

                        const isAddedOverride = overrideAddSet.has(cap.key);
                        const isRemovedOverride = overrideRemoveSet.has(cap.key);

                        const isEffective = isRoleSetupMode
                          ? roleHasPerm
                          : isAddedOverride
                          ? true
                          : isRemovedOverride
                          ? false
                          : roleHasPerm;

                        return (
                          <td
                            key={role.id}
                            className={`px-3 py-3 text-center transition-colors ${
                              !isRoleSetupMode && activeRoleId === role.id ? 'bg-[#EE635E]/5' : ''
                            }`}
                          >
                            <button
                              type="button"
                              disabled={!isColActive || lockedSuperOnly}
                              onClick={() => {
                                if (lockedSuperOnly) return;
                                if (isRoleSetupMode) {
                                  onToggleRolePermission?.(role.id, cap.key, !roleHasPerm);
                                } else if (activeRoleId === role.id) {
                                  if (roleHasPerm) {
                                    // Base is ON -> Toggle REMOVE override
                                    if (isRemovedOverride) {
                                      onToggleUserOverride?.(cap.key, 'reset');
                                    } else {
                                      onToggleUserOverride?.(cap.key, 'remove');
                                    }
                                  } else {
                                    // Base is OFF -> Toggle ADD override
                                    if (isAddedOverride) {
                                      onToggleUserOverride?.(cap.key, 'reset');
                                    } else {
                                      onToggleUserOverride?.(cap.key, 'add');
                                    }
                                  }
                                }
                              }}
                              className={`mx-auto w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-200 ${
                                isColActive
                                  ? 'cursor-pointer hover:scale-110 active:scale-95'
                                  : 'cursor-default opacity-40'
                              } ${
                                isRoleSetupMode
                                  ? isEffective
                                    ? isSupremeCol
                                      ? 'bg-amber-500 text-white shadow-xs'
                                      : 'bg-purple-600 text-white shadow-xs'
                                    : lockedSuperOnly
                                      ? 'border border-gray-100 bg-gray-100 opacity-40 cursor-not-allowed'
                                      : 'border border-gray-200 bg-gray-50'
                                  : isAddedOverride
                                  ? 'bg-emerald-500 text-white shadow-xs ring-2 ring-emerald-200'
                                  : isRemovedOverride
                                  ? 'bg-rose-500 text-white shadow-xs ring-2 ring-rose-200'
                                  : isEffective
                                  ? isColActive
                                    ? 'bg-[#EE635E] text-white shadow-xs'
                                    : 'bg-gray-400 text-white shadow-xs opacity-60'
                                  : 'border border-gray-200 bg-gray-50'
                              }`}
                            >
                              {isRoleSetupMode ? (
                                isEffective && <Check size={14} strokeWidth={2.5} />
                              ) : isAddedOverride ? (
                                <Plus size={14} strokeWidth={3} />
                              ) : isRemovedOverride ? (
                                <Minus size={14} strokeWidth={3} />
                              ) : (
                                isEffective && <Check size={14} strokeWidth={2} />
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
