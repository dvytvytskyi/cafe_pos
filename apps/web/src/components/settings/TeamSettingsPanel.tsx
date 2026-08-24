'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Search,
  ChevronDown,
  MoreHorizontal,
  Edit2,
  Key,
  Trash2,
  X,
  Check,
  Copy,
} from 'lucide-react';
import {
  createEmployeeAsync,
  getEmployeesAsync,
  getRolesAsync,
  resetEmployeePasswordAsync,
  updateEmployeeAsync,
  updateRoleAsync,
  type Employee,
  StaffApiError,
} from '@/lib/staff';
import type { LocationSummary } from '@/lib/locations';
import { CORGI_STORE_LOCATIONS } from '@/lib/corgi-locations';
import { filterStaffByTeamTab, isGeneralTeamMember } from '@/lib/location-scope';
import type { RolePermissions } from '@/lib/auth-constants';
import TeamInviteView, { type TeamType } from './TeamInviteView';
import TeamMemberEditView from './TeamMemberEditView';
import type { TeamRole } from './TeamPermissionsMatrix';
import type { PermissionRow } from './TeamPermissionsMatrix';

function generatePin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function avatarColor(name: string): string {
  const palette = [
    'bg-orange-100 text-orange-700',
    'bg-blue-100 text-blue-700',
    'bg-purple-100 text-purple-700',
    'bg-green-100 text-green-700',
  ];
  const idx = name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % palette.length;
  return palette[idx]!;
}

function togglePermInRole(
  perms: RolePermissions,
  row: PermissionRow,
  enabled: boolean
): RolePermissions {
  const next = { ...perms };
  const current = [...(next[row.resource] ?? [])];
  if (enabled && !current.includes(row.action)) {
    current.push(row.action);
  } else if (!enabled) {
    const idx = current.indexOf(row.action);
    if (idx >= 0) current.splice(idx, 1);
  }
  next[row.resource] = current;
  return next;
}

export default function TeamSettingsPanel() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roles, setRoles] = useState<TeamRole[]>([]);
  const storeLocations = useMemo<LocationSummary[]>(
    () =>
      CORGI_STORE_LOCATIONS.map((loc) => ({
        id: loc.id,
        name: loc.shortName,
        address: loc.address,
      })),
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [teamTab, setTeamTab] = useState<'general' | string>('general');
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  const [isInviteView, setIsInviteView] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteEmailError, setInviteEmailError] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState('');
  const [accessDuration, setAccessDuration] = useState('No limit');
  const [teamType, setTeamType] = useState<TeamType>('location');
  const [inviteLocationIds, setInviteLocationIds] = useState<string[]>([]);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccessPin, setInviteSuccessPin] = useState<string | null>(null);
  const [savingInvite, setSavingInvite] = useState(false);
  const [userPermissions, setUserPermissions] = useState<Record<string, boolean>>({});
  const [isRoleSetupMode, setIsRoleSetupMode] = useState(false);
  const [hasRoleChanges, setHasRoleChanges] = useState(false);
  const [roleDrafts, setRoleDrafts] = useState<Record<string, RolePermissions>>({});

  const [editingId, setEditingId] = useState<string | null>(null);
  const [memberViewTab, setMemberViewTab] = useState<'general' | 'permissions' | 'activity'>('general');
  const [editForm, setEditForm] = useState<{
    name: string;
    email: string;
    phone: string;
    roleId: string;
    locationIds: string[];
    teamType: TeamType;
    pin: string;
    status: 'active' | 'inactive';
  } | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [resetMemberId, setResetMemberId] = useState<string | null>(null);
  const [resetResult, setResetResult] = useState<{ tempPassword: string; resetLink: string } | null>(null);
  const [resetting, setResetting] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [staff, roleList] = await Promise.all([getEmployeesAsync(), getRolesAsync()]);
      setEmployees(staff);
      setRoles(
        roleList.map((r) => ({
          id: r.id,
          name: r.name,
          permissions: (r.permissions as RolePermissions) ?? {},
        }))
      );
      if (!inviteRoleId && roleList[0]) setInviteRoleId(roleList[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team');
    } finally {
      setLoading(false);
    }
  }, [inviteRoleId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount refresh via shared load()
    void load();
  }, [load]);

  useEffect(() => {
    const handleClickOutside = () => setOpenActionMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const localeTabs = useMemo(() => {
    const tabs: { id: string; label: string }[] = [{ id: 'general', label: 'General' }];
    for (const loc of storeLocations) {
      tabs.push({ id: loc.id, label: loc.name });
    }
    return tabs;
  }, [storeLocations]);

  const tabEmployees = useMemo(() => {
    return filterStaffByTeamTab(employees, teamTab);
  }, [employees, teamTab]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tabEmployees.filter((emp) => {
      const matchesSearch =
        !q ||
        emp.name.toLowerCase().includes(q) ||
        emp.email.toLowerCase().includes(q);
      const matchesRole = roleFilter === 'all' || emp.roleId === roleFilter || emp.roleName === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [tabEmployees, search, roleFilter]);

  const isGeneralTabReadOnly = teamTab === 'general';

  const openEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setMemberViewTab('general');
    setEditForm({
      name: emp.name,
      email: emp.email,
      phone: emp.phone,
      roleId: emp.roleId ?? roles[0]?.id ?? '',
      locationIds: emp.locationIds ?? [],
      teamType: isGeneralTeamMember(emp.locationIds) ? 'general' : 'location',
      pin: '',
      status: emp.status,
    });
    setUserPermissions({});
  };

  const handleInviteEmailChange = (email: string) => {
    setInviteEmail(email);
    if (email && !/\S+@\S+\.\S+/.test(email)) {
      setInviteEmailError('Please enter a valid email address with an @ sign.');
    } else {
      setInviteEmailError('');
    }
  };

  const handleToggleRolePermission = (roleId: string, row: PermissionRow, enabled: boolean) => {
    const role = roles.find((r) => r.id === roleId);
    if (!role) return;
    const base = roleDrafts[roleId] ?? role.permissions ?? {};
    const next = togglePermInRole(base, row, enabled);
    setRoleDrafts((prev) => ({ ...prev, [roleId]: next }));
    setRoles((prev) =>
      prev.map((r) => (r.id === roleId ? { ...r, permissions: next } : r))
    );
    setHasRoleChanges(true);
  };

  const handleToggleRoleSetup = async () => {
    if (isRoleSetupMode && hasRoleChanges) {
      try {
        for (const [roleId, perms] of Object.entries(roleDrafts)) {
          await updateRoleAsync(roleId, perms as Record<string, string[]>);
        }
        setRoleDrafts({});
        setHasRoleChanges(false);
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save role permissions');
        return;
      }
    }
    setIsRoleSetupMode(!isRoleSetupMode);
  };

  const handleSendInvitation = async () => {
    setInviteError(null);
    if (!inviteEmail.trim() || !/\S+@\S+\.\S+/.test(inviteEmail)) {
      setInviteEmailError('Please enter a valid email address');
      return;
    }
    if (!inviteRoleId) {
      setInviteError('Select a role');
      return;
    }
    if (teamType === 'location' && inviteLocationIds.length === 0) {
      setInviteError('Select at least one location');
      return;
    }

    setSavingInvite(true);
    try {
      const pin = generatePin();
      const name = inviteEmail.split('@')[0] || 'New Member';
      await createEmployeeAsync({
        name,
        email: inviteEmail.trim(),
        pin,
        roleId: inviteRoleId,
        locationIds: teamType === 'general' ? [] : inviteLocationIds,
        avatarInitials: initials(name),
        status: 'active',
      });
      setInviteSuccessPin(pin);
      setInviteEmail('');
      setUserPermissions({});
      await load();
    } catch (err) {
      setInviteError(err instanceof StaffApiError ? err.message : 'Failed to create team member');
    } finally {
      setSavingInvite(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editForm) return;
    setSavingEdit(true);
    try {
      const payload: Parameters<typeof updateEmployeeAsync>[1] = {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim(),
        roleId: editForm.roleId,
        locationIds: editForm.teamType === 'general' ? [] : editForm.locationIds,
        status: editForm.status,
      };
      if (editForm.pin.length === 4) payload.pin = editForm.pin;
      await updateEmployeeAsync(editingId, payload);
      setEditingId(null);
      setEditForm(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save member');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeactivate = async (emp: Employee) => {
    if (!confirm(`Deactivate ${emp.name}?`)) return;
    try {
      await updateEmployeeAsync(emp.id, { status: 'inactive' });
      setEditingId(null);
      setEditForm(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate member');
    }
  };

  const handleConfirmReset = async () => {
    if (!resetMemberId) return;
    setResetting(true);
    try {
      const result = await resetEmployeePasswordAsync(resetMemberId);
      setResetResult(result);
      await navigator.clipboard.writeText(`${result.resetLink}\nPassword: ${result.tempPassword}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
      setResetMemberId(null);
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-gray-500 mt-2">Loading team…</p>;
  }

  if (isInviteView) {
    if (inviteSuccessPin) {
      return (
        <div className="p-6 border border-green-200 bg-green-50/40 rounded-2xl mt-2">
          <p className="font-bold text-green-800">Invitation sent — member created</p>
          <p className="text-sm text-green-700 mt-2">
            Share their terminal PIN securely:{' '}
            <span className="font-mono font-bold">{inviteSuccessPin}</span>
          </p>
          <button
            type="button"
            onClick={() => {
              setIsInviteView(false);
              setInviteSuccessPin(null);
            }}
            className="mt-4 px-4 py-2 bg-black text-white rounded-xl text-sm font-bold"
          >
            Back to team list
          </button>
        </div>
      );
    }

    return (
      <TeamInviteView
        roles={roles}
        locations={storeLocations}
        inviteEmail={inviteEmail}
        inviteEmailError={inviteEmailError}
        inviteRoleId={inviteRoleId}
        accessDuration={accessDuration}
        teamType={teamType}
        inviteLocationIds={inviteLocationIds}
        isRoleSetupMode={isRoleSetupMode}
        hasRoleChanges={hasRoleChanges}
        userPermissions={userPermissions}
        saving={savingInvite}
        onBack={() => {
          setIsInviteView(false);
          setInviteError(null);
          setIsRoleSetupMode(false);
        }}
        onEmailChange={handleInviteEmailChange}
        onRoleChange={setInviteRoleId}
        onAccessDurationChange={setAccessDuration}
        onTeamTypeChange={setTeamType}
        onLocationIdsChange={setInviteLocationIds}
        onToggleRoleSetup={handleToggleRoleSetup}
        onSendInvitation={handleSendInvitation}
        onToggleRolePermission={handleToggleRolePermission}
        onToggleUserOverride={(label, enabled) =>
          setUserPermissions((prev) => ({ ...prev, [label]: enabled }))
        }
      />
    );
  }

  if (editingId && editForm) {
    const member = employees.find((e) => e.id === editingId);
    if (!member) return null;
    return (
      <TeamMemberEditView
        member={member}
        roles={roles}
        locations={storeLocations}
        memberViewTab={memberViewTab}
        editForm={editForm}
        userPermissions={userPermissions}
        saving={savingEdit}
        readOnly={isGeneralTabReadOnly && isGeneralTeamMember(member.locationIds)}
        onBack={() => {
          setEditingId(null);
          setEditForm(null);
        }}
        onTabChange={setMemberViewTab}
        onFormChange={(patch) => setEditForm((f) => (f ? { ...f, ...patch } : f))}
        onSave={handleSaveEdit}
        onDeactivate={() => handleDeactivate(member)}
        onResetPassword={() => {
          setResetMemberId(member.id);
          setResetResult(null);
        }}
        onToggleUserOverride={(label, enabled) =>
          setUserPermissions((prev) => ({ ...prev, [label]: enabled }))
        }
      />
    );
  }

  return (
    <>
      <div className="w-full max-w-full flex flex-col gap-8 mt-2">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Team & Roles</h2>
          <button
            type="button"
            onClick={() => setIsInviteView(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#EE635E] hover:bg-[#d94f4a] text-white text-[13px] font-bold rounded-full transition-all cursor-pointer"
          >
            <Plus size={16} />
            Invite Member
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-500" role="alert">
            {error}
          </p>
        )}
        {inviteError && <p className="text-sm text-red-500">{inviteError}</p>}

        <div className="flex gap-2 overflow-x-auto pb-1">
          {localeTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTeamTab(tab.id)}
              className={`px-4 py-2 rounded-full text-[13px] font-bold whitespace-nowrap transition-all ${
                teamTab === tab.id
                  ? 'bg-[#EE635E] text-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100'
              }`}
            >
              {tab.label}
              {tab.id === 'general' && (
                <span className="ml-1.5 text-[10px] opacity-70">All locations</span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-11 pr-4 py-3 text-[14px] font-medium text-gray-800 outline-none focus:border-corgi"
            />
          </div>
          <div className="relative shrink-0">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-gray-50 border border-gray-100 text-gray-600 text-[14px] font-medium rounded-xl pl-4 pr-10 py-3 appearance-none"
            >
              <option value="all">All Roles</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
          </div>
        </div>

        <div className="border border-gray-100 rounded-2xl bg-white relative overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-[12px] font-bold text-gray-400 uppercase">Member</th>
                <th className="px-6 py-4 text-[12px] font-bold text-gray-400 uppercase">Role</th>
                <th className="px-6 py-4 text-[12px] font-bold text-gray-400 uppercase">Locations</th>
                <th className="px-6 py-4 text-[12px] font-bold text-gray-400 uppercase">Status</th>
                <th className="px-6 py-4 text-[12px] font-bold text-gray-400 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((member) => (
                <tr
                  key={member.id}
                  onClick={() => openEdit(member)}
                  className="hover:bg-gray-50/70 transition-all group cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${avatarColor(member.name)}`}
                      >
                        {member.avatarInitials || initials(member.name)}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[14px] font-bold text-gray-900">{member.name}</span>
                        <span className="text-[13px] text-gray-500">{member.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[12px] font-bold bg-blue-100 text-blue-700">
                      {member.roleName || '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[13px] text-gray-600">
                    {isGeneralTeamMember(member.locationIds)
                      ? 'All locations'
                      : member.locationNames?.join(', ') || '—'}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-md text-[12px] font-bold ${
                        member.status === 'active'
                          ? 'bg-green-50 text-green-700 border border-green-200/50'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {member.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenActionMenuId(openActionMenuId === member.id ? null : member.id);
                      }}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-800 hover:bg-white border border-transparent hover:border-gray-200 ml-auto"
                    >
                      <MoreHorizontal size={16} />
                    </button>
                    {openActionMenuId === member.id && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-12 top-10 w-48 bg-white border border-gray-100 shadow-lg rounded-2xl p-2 z-50 text-left"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            openEdit(member);
                            setOpenActionMenuId(null);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium text-gray-700 hover:bg-gray-50 rounded-xl"
                        >
                          <Edit2 size={14} /> Edit Member
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setResetMemberId(member.id);
                            setResetResult(null);
                            setOpenActionMenuId(null);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium text-gray-700 hover:bg-gray-50 rounded-xl"
                        >
                          <Key size={14} /> Reset Password
                        </button>
                        <div className="h-px bg-gray-100 my-1 mx-2" />
                        <button
                          type="button"
                          onClick={() => {
                            handleDeactivate(member);
                            setOpenActionMenuId(null);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium text-red-600 hover:bg-red-50 rounded-xl"
                        >
                          <Trash2 size={14} /> Deactivate User
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-center py-10 text-sm text-gray-500">No team members match your filters.</p>
          )}
        </div>
      </div>

      {resetMemberId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => {
              setResetMemberId(null);
              setResetResult(null);
            }}
          />
          <div className="relative bg-white rounded-3xl shadow-xl w-full max-w-md p-6">
            <button
              type="button"
              onClick={() => {
                setResetMemberId(null);
                setResetResult(null);
              }}
              className="absolute top-4 right-4 w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400"
            >
              <X size={18} />
            </button>
            {!resetResult ? (
              <div className="flex flex-col items-center text-center gap-4 pt-2">
                <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center">
                  <Key size={24} className="text-corgi" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Reset Password?</h3>
                <p className="text-sm text-gray-500">
                  A temporary password will be generated. The user must change it on next login.
                </p>
                <div className="flex w-full gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => setResetMemberId(null)}
                    className="flex-1 py-3 rounded-xl font-bold text-sm bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={resetting}
                    onClick={handleConfirmReset}
                    className="flex-1 py-3 rounded-xl font-bold text-sm bg-black text-white disabled:opacity-50"
                  >
                    {resetting ? 'Generating…' : 'Yes, Reset'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center gap-4 pt-2">
                <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
                  <Check size={28} className="text-green-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Password Reset</h3>
                <div className="w-full text-left space-y-2 text-sm">
                  <p>
                    <span className="font-bold">Temporary password:</span>{' '}
                    <code className="font-mono">{resetResult.tempPassword}</code>
                  </p>
                  <p className="break-all text-gray-500">{resetResult.resetLink}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${resetResult.resetLink}\nPassword: ${resetResult.tempPassword}`
                    );
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy credentials'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResetMemberId(null);
                    setResetResult(null);
                  }}
                  className="w-full py-3 rounded-xl font-bold text-sm bg-black text-white"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
