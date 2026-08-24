'use client';

import React from 'react';
import { ArrowLeft, Check, ChevronDown, Mail, MapPin, Settings } from 'lucide-react';
import TeamPermissionsMatrix, { type TeamRole } from './TeamPermissionsMatrix';
import type { LocationSummary } from '@/lib/locations';

export type TeamType = 'general' | 'location';

export type TeamInviteViewProps = {
  roles: TeamRole[];
  locations: LocationSummary[];
  inviteEmail: string;
  inviteEmailError: string;
  inviteRoleId: string;
  accessDuration: string;
  teamType: TeamType;
  inviteLocationIds: string[];
  isRoleSetupMode: boolean;
  hasRoleChanges: boolean;
  userPermissions: Record<string, boolean>;
  saving: boolean;
  onBack: () => void;
  onEmailChange: (email: string) => void;
  onRoleChange: (roleId: string) => void;
  onAccessDurationChange: (duration: string) => void;
  onTeamTypeChange: (type: TeamType) => void;
  onLocationIdsChange: (ids: string[]) => void;
  onToggleRoleSetup: () => void;
  onSendInvitation: () => void;
  onToggleRolePermission: (roleId: string, row: { resource: string; action: string; label: string }, enabled: boolean) => void;
  onToggleUserOverride: (label: string, enabled: boolean) => void;
};

export default function TeamInviteView({
  roles,
  locations,
  inviteEmail,
  inviteEmailError,
  inviteRoleId,
  accessDuration,
  teamType,
  inviteLocationIds,
  isRoleSetupMode,
  hasRoleChanges,
  userPermissions,
  saving,
  onBack,
  onEmailChange,
  onRoleChange,
  onAccessDurationChange,
  onTeamTypeChange,
  onLocationIdsChange,
  onToggleRoleSetup,
  onSendInvitation,
  onToggleRolePermission,
  onToggleUserOverride,
}: TeamInviteViewProps) {
  const canSend = inviteEmail && !inviteEmailError && inviteRoleId;

  return (
    <div className="flex flex-col gap-8 w-full animate-in fade-in slide-in-from-right-4 duration-500 mt-2">
      <div className="flex items-center justify-between pb-4 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-800 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-xl font-bold text-gray-900">
            {isRoleSetupMode ? 'Default Role Settings' : 'Invite New Member'}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleRoleSetup}
            className={`flex items-center gap-2 px-4 py-2 text-[13px] font-bold rounded-xl transition-all cursor-pointer ${
              isRoleSetupMode
                ? 'bg-purple-100 text-purple-700 hover:bg-purple-200 shadow-sm'
                : 'bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Settings size={16} />
            {isRoleSetupMode
              ? hasRoleChanges
                ? 'Save & Exit Setup Mode'
                : 'Exit Setup Mode'
              : 'Setup Default Roles'}
          </button>

          {!isRoleSetupMode && (
            <>
              <button
                type="button"
                onClick={onBack}
                className="px-4 py-2 text-[13px] font-bold text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!canSend || saving}
                onClick={onSendInvitation}
                className={`px-5 py-2 text-[13px] font-bold rounded-xl transition-colors duration-500 ease-in-out shadow-sm hover:shadow-md cursor-pointer flex items-center gap-2 disabled:opacity-50 ${
                  canSend
                    ? 'bg-[#FFB800] text-black hover:bg-[#E5A600]'
                    : 'bg-[#EE635E] hover:bg-[#d94f4a] text-white'
                }`}
              >
                <Mail size={16} />
                {saving ? 'Sending…' : 'Send Invitation'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-8 w-full">
        {!isRoleSetupMode && (
          <>
            <div className="flex flex-col gap-4 max-w-4xl">
              <label className="text-[13px] font-bold text-gray-700">Team Type</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => onTeamTypeChange('general')}
                  className={`px-4 py-2 rounded-xl text-[13px] font-bold border transition-all ${
                    teamType === 'general'
                      ? 'bg-[#EE635E]/10 border-[#EE635E] text-[#EE635E]'
                      : 'bg-gray-50 border-gray-100 text-gray-600 hover:border-gray-200'
                  }`}
                >
                  General (All locations)
                </button>
                <button
                  type="button"
                  onClick={() => onTeamTypeChange('location')}
                  className={`px-4 py-2 rounded-xl text-[13px] font-bold border transition-all ${
                    teamType === 'location'
                      ? 'bg-[#EE635E]/10 border-[#EE635E] text-[#EE635E]'
                      : 'bg-gray-50 border-gray-100 text-gray-600 hover:border-gray-200'
                  }`}
                >
                  Specific location(s)
                </button>
              </div>
            </div>

            {teamType === 'location' && (
              <div className="flex flex-col gap-2 max-w-4xl">
                <label className="text-[13px] font-bold text-gray-700">Locations</label>
                <div className="flex flex-wrap gap-2 p-3 bg-gray-50/80 border border-gray-200 rounded-2xl">
                  {locations.map((loc) => {
                    const isSelected = inviteLocationIds.includes(loc.id);
                    return (
                      <button
                        key={loc.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            onLocationIdsChange(inviteLocationIds.filter((id) => id !== loc.id));
                          } else {
                            onLocationIdsChange([...inviteLocationIds, loc.id]);
                          }
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                          isSelected
                            ? 'bg-[#EE635E] text-white border-[#EE635E] shadow-sm'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <MapPin size={13} className={isSelected ? 'text-white' : 'text-gray-400'} />
                        <span>{loc.name}</span>
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-end gap-6 max-w-4xl flex-wrap">
              <div className="flex flex-col gap-2 flex-1 min-w-[200px] relative">
                <label className="text-[13px] font-bold text-gray-700">Email Address</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => onEmailChange(e.target.value)}
                  placeholder="e.g., alex@corgipos.com"
                  className={`w-full border rounded-xl px-4 py-3 text-[14px] font-medium outline-none transition-all ${
                    inviteEmailError
                      ? 'border-red-500 bg-red-50/30 text-red-900 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                      : 'bg-gray-50 border-gray-100 hover:border-gray-200 hover:bg-white focus:bg-white focus:border-corgi focus:ring-4 focus:ring-corgi/10 text-gray-800'
                  }`}
                />
                {inviteEmailError && (
                  <span className="text-[13px] text-red-500 absolute -bottom-6 left-1">{inviteEmailError}</span>
                )}
              </div>
              <div className="flex flex-col gap-2 flex-[0.7] min-w-[160px]">
                <label className="text-[13px] font-bold text-gray-700">Select Role</label>
                <div className="relative group">
                  <select
                    value={inviteRoleId}
                    onChange={(e) => onRoleChange(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-4 pr-10 py-3 text-[14px] font-medium text-gray-800 outline-none hover:border-gray-200 hover:bg-white focus:ring-4 focus:ring-corgi/10 focus:border-corgi transition-all appearance-none cursor-pointer"
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
              <div className="flex flex-col gap-2 flex-[0.7] min-w-[160px]">
                <label className="text-[13px] font-bold text-gray-700">Access Duration</label>
                <div className="relative group">
                  <select
                    value={accessDuration}
                    onChange={(e) => onAccessDurationChange(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-4 pr-10 py-3 text-[14px] font-medium text-gray-800 outline-none hover:border-gray-200 hover:bg-white focus:ring-4 focus:ring-corgi/10 focus:border-corgi transition-all appearance-none cursor-pointer"
                  >
                    <option value="1 Day">1 Day</option>
                    <option value="7 Days">7 Days</option>
                    <option value="30 Days">30 Days</option>
                    <option value="1 Year">1 Year</option>
                    <option value="No limit">No Limit</option>
                  </select>
                  <ChevronDown
                    size={16}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        <div className="flex flex-col gap-3">
          <label className="text-[13px] font-bold text-gray-700">
            {isRoleSetupMode ? 'Configure Permissions for All Roles' : 'Assign Role & Permissions'}
            {isRoleSetupMode && (
              <span className="ml-2 text-purple-600 font-medium text-[12px] bg-purple-50 px-2 py-0.5 rounded-md">
                Setup Mode Active
              </span>
            )}
          </label>
          <TeamPermissionsMatrix
            roles={roles}
            activeRoleId={inviteRoleId}
            onActiveRoleChange={onRoleChange}
            isRoleSetupMode={isRoleSetupMode}
            onToggleRolePermission={onToggleRolePermission}
            userOverrides={userPermissions}
            onToggleUserOverride={onToggleUserOverride}
          />
        </div>
      </div>
    </div>
  );
}
