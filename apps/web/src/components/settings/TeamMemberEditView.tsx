'use client';

import React from 'react';
import {
  ArrowLeft,
  ChevronDown,
  Clock,
  DollarSign,
  Edit2,
  Key,
  LayoutTemplate,
  Receipt,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import TeamPermissionsMatrix, { type TeamRole } from './TeamPermissionsMatrix';
import type { Employee } from '@/lib/staff';
import type { LocationSummary } from '@/lib/locations';

type MemberTab = 'general' | 'permissions' | 'activity';

export type TeamMemberEditViewProps = {
  member: Employee;
  roles: TeamRole[];
  locations: LocationSummary[];
  memberViewTab: MemberTab;
  editForm: {
    name: string;
    email: string;
    phone: string;
    roleId: string;
    locationIds: string[];
    teamType: 'general' | 'location';
    pin: string;
    status: 'active' | 'inactive';
  };
  userPermissions: Record<string, boolean>;
  saving: boolean;
  readOnly?: boolean;
  onBack: () => void;
  onTabChange: (tab: MemberTab) => void;
  onFormChange: (patch: Partial<TeamMemberEditViewProps['editForm']>) => void;
  onSave: () => void;
  onDeactivate: () => void;
  onResetPassword: () => void;
  onToggleUserOverride: (label: string, enabled: boolean) => void;
};

function avatarColor(_name: string): string {
  return 'bg-[#EE635E]/10 text-[#EE635E] border border-[#EE635E]/20';
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export default function TeamMemberEditView({
  member,
  roles,
  locations,
  memberViewTab,
  editForm,
  userPermissions,
  saving,
  readOnly = false,
  onBack,
  onTabChange,
  onFormChange,
  onSave,
  onDeactivate,
  onResetPassword,
  onToggleUserOverride,
}: TeamMemberEditViewProps) {
  const locationLabel =
    editForm.teamType === 'general'
      ? 'All Locations'
      : editForm.locationIds
          .map((id) => locations.find((l) => l.id === id)?.name ?? id)
          .join(', ') || '—';

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in slide-in-from-right-4 duration-500 mt-2">
      <div className="flex items-center gap-4 pb-6 border-b border-gray-100 flex-wrap">
        <button
          type="button"
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-800 hover:bg-gray-100 transition-colors cursor-pointer shrink-0"
        >
          <ArrowLeft size={20} />
        </button>

        <div
          className={`w-16 h-16 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-lg font-bold ${avatarColor(member.name)}`}
        >
          {member.avatarInitials || initials(member.name)}
        </div>

        <div className="flex flex-col flex-1 min-w-[200px]">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-bold text-gray-900">{member.name}</h2>
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-md text-[12px] font-bold ${
                member.status === 'active'
                  ? 'bg-green-50 text-green-700 border border-green-200/50'
                  : 'bg-orange-50 text-corgi border border-orange-200/50 border-dashed'
              }`}
            >
              {member.status === 'active' ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p className="text-[14px] text-gray-500">
            {roles.find((r) => r.id === editForm.roleId)?.name ?? member.roleName} • {locationLabel}
          </p>
        </div>

        {!readOnly && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onResetPassword}
              className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 text-gray-700 text-[13px] font-bold rounded-xl hover:bg-gray-100 transition-all cursor-pointer shadow-sm"
            >
              <Key size={16} />
              Reset Password
            </button>
            {member.status === 'active' && (
              <button
                type="button"
                onClick={onDeactivate}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 text-[13px] font-bold rounded-xl hover:bg-red-100 transition-all cursor-pointer shadow-sm"
              >
                <Trash2 size={16} />
                Deactivate
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-8 border-b border-gray-100 px-2 overflow-x-auto">
        {(['general', 'permissions', 'activity'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => onTabChange(tab)}
            className={`pb-4 text-[14px] font-bold transition-all relative cursor-pointer whitespace-nowrap ${
              memberViewTab === tab ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab === 'general' && 'General Info'}
            {tab === 'permissions' && 'Permissions'}
            {tab === 'activity' && 'Activity & Stats'}
            {memberViewTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      <div className="py-4">
        {memberViewTab === 'general' && (
          <div className="flex flex-col gap-8 animate-in fade-in duration-300 pt-2">
            <div className="grid grid-cols-2 gap-x-8 gap-y-6 max-w-4xl">
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-bold text-gray-700">Email Address</label>
                <input
                  type="email"
                  disabled={readOnly}
                  value={editForm.email}
                  onChange={(e) => onFormChange({ email: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-[14px] font-medium text-gray-800 outline-none hover:bg-white hover:border-gray-200 focus:bg-white focus:ring-4 focus:ring-corgi/10 focus:border-corgi transition-all disabled:opacity-60"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-bold text-gray-700">Phone Number</label>
                <input
                  type="tel"
                  disabled={readOnly}
                  value={editForm.phone}
                  onChange={(e) => onFormChange({ phone: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-[14px] font-medium text-gray-800 outline-none hover:bg-white hover:border-gray-200 focus:bg-white focus:ring-4 focus:ring-corgi/10 focus:border-corgi transition-all disabled:opacity-60"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-bold text-gray-700">Team Type</label>
                <select
                  disabled={readOnly}
                  value={editForm.teamType}
                  onChange={(e) =>
                    onFormChange({
                      teamType: e.target.value as 'general' | 'location',
                      locationIds: e.target.value === 'general' ? [] : editForm.locationIds,
                    })
                  }
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-4 pr-10 py-3 text-[14px] font-medium appearance-none disabled:opacity-60"
                >
                  <option value="general">General (All locations)</option>
                  <option value="location">Specific location(s)</option>
                </select>
              </div>

              {editForm.teamType === 'location' && (
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-bold text-gray-700">Primary Location(s)</label>
                  <select
                    multiple
                    disabled={readOnly}
                    value={editForm.locationIds}
                    onChange={(e) =>
                      onFormChange({
                        locationIds: Array.from(e.target.selectedOptions, (o) => o.value),
                      })
                    }
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm min-h-[88px] disabled:opacity-60"
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-bold text-gray-700">Assigned Role</label>
                <div className="relative group">
                  <select
                    disabled={readOnly}
                    value={editForm.roleId}
                    onChange={(e) => onFormChange({ roleId: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-4 pr-10 py-3 text-[14px] font-medium text-gray-800 outline-none appearance-none cursor-pointer disabled:opacity-60"
                  >
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-bold text-gray-700">POS Login PIN (4 Digits)</label>
                <div className="relative group">
                  <input
                    type="password"
                    disabled={readOnly}
                    value={editForm.pin}
                    onChange={(e) => onFormChange({ pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                    maxLength={4}
                    placeholder="••••"
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-4 pr-10 py-3 text-[14px] font-bold tracking-[0.5em] text-gray-800 outline-none disabled:opacity-60"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-gray-400">
                    <Edit2 size={14} />
                  </span>
                </div>
                <span className="text-[12px] text-gray-500">Used for fast access on iPad / Mobile POS apps.</span>
              </div>
            </div>

            {!readOnly && (
              <div className="flex justify-end pt-4 border-t border-gray-100 max-w-4xl">
                <button
                  type="button"
                  disabled={saving}
                  onClick={onSave}
                  className="px-6 py-2.5 bg-[#EE635E] hover:bg-[#d94f4a] text-white text-[14px] font-bold rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        )}

        {memberViewTab === 'permissions' && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-300 pt-2">
            <div className="flex flex-col gap-1 mb-2">
              <h3 className="text-[15px] font-bold text-gray-900">Custom Permissions Override</h3>
              <p className="text-[13px] text-gray-500">
                Override specific permissions for this user without affecting the base role.
              </p>
            </div>
            <TeamPermissionsMatrix
              roles={roles}
              activeRoleId={editForm.roleId}
              userOverrides={userPermissions}
              onToggleUserOverride={readOnly ? undefined : onToggleUserOverride}
            />
          </div>
        )}

        {memberViewTab === 'activity' && (
          <div className="flex flex-col gap-8 animate-in fade-in duration-300 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl border border-gray-100 bg-white shadow-sm flex flex-col gap-1">
                <div className="flex items-center gap-2 text-gray-500 mb-2">
                  <Receipt size={16} />
                  <span className="text-[13px] font-bold">Total Orders</span>
                </div>
                <span className="text-2xl font-bold text-gray-900">—</span>
                <span className="text-[12px] text-gray-400 font-medium">Coming soon</span>
              </div>
              <div className="p-5 rounded-2xl border border-gray-100 bg-white shadow-sm flex flex-col gap-1">
                <div className="flex items-center gap-2 text-gray-500 mb-2">
                  <DollarSign size={16} />
                  <span className="text-[13px] font-bold">Revenue Generated</span>
                </div>
                <span className="text-2xl font-bold text-gray-900">—</span>
                <span className="text-[12px] text-green-600 font-medium flex items-center gap-1">
                  <TrendingUp size={12} /> Placeholder
                </span>
              </div>
              <div className="p-5 rounded-2xl border border-gray-100 bg-white shadow-sm flex flex-col gap-1">
                <div className="flex items-center gap-2 text-gray-500 mb-2">
                  <Clock size={16} />
                  <span className="text-[13px] font-bold">Avg. Shift Duration</span>
                </div>
                <span className="text-2xl font-bold text-gray-900">—</span>
                <span className="text-[12px] text-gray-400 font-medium">Over the last 30 days</span>
              </div>
            </div>

            <div className="flex flex-col border border-gray-100 rounded-2xl bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                <h3 className="text-[14px] font-bold text-gray-900">Recent Activity</h3>
              </div>
              <div className="px-5 py-8 text-center text-[13px] text-gray-400">
                <LayoutTemplate size={20} className="mx-auto mb-2 opacity-40" />
                Activity feed will be connected in a future release.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
