'use client';

import React, { useEffect, useRef, useState } from 'react';
import { User, Check, ChevronDown, X, Eye, EyeOff, LogOut } from 'lucide-react';
import {
  getProfileAsync,
  updateProfileAsync,
  changeProfilePasswordAsync,
  notifyProfileUpdated,
  ProfileApiError,
  type Profile,
} from '@/lib/profile';
import { joinProfileName, splitProfileName } from '@/lib/profile-validation';

export default function ProfileSettingsPanel() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState(false);
  const [phoneCountry, setPhoneCountry] = useState('+380');
  const [phoneLocal, setPhoneLocal] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password reset modal state
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getProfileAsync();
        if (cancelled) return;
        setProfile(data);
        const split = splitProfileName(data.name);
        setFirstName(split.firstName);
        setLastName(split.lastName);
        setEmail(data.email ?? '');
        setAvatarUrl(data.avatarUrl ?? null);
        setPendingAvatarFile(null);
        setRemoveAvatar(false);
        if (data.phone?.startsWith('+')) {
          const match = data.phone.match(/^(\+\d{1,3})(.*)$/);
          if (match) {
            setPhoneCountry(match[1]!);
            setPhoneLocal(match[2]!.trim());
          }
        }
      } catch (err) {
        console.error('Failed to load profile', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const validateEmail = (value: string) => {
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    setEmailError(!isValid);
    return isValid;
  };

  const handleUploadClick = () => fileInputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingAvatarFile(file);
    setAvatarUrl(URL.createObjectURL(file));
    setRemoveAvatar(false);
    setHasChanges(true);
  };
  const handleRemoveAvatar = () => {
    setAvatarUrl(null);
    setPendingAvatarFile(null);
    setRemoveAvatar(true);
    setHasChanges(true);
  };

  const buildPhone = () => {
    const digits = phoneLocal.replace(/\D/g, '');
    return digits ? `${phoneCountry}${digits}` : null;
  };

  const handleSave = async () => {
    setSaveError(null);
    if (!validateEmail(email)) return;
    try {
      let nextAvatarUrl: string | null | undefined = undefined;
      if (removeAvatar) {
        nextAvatarUrl = null;
      } else if (pendingAvatarFile) {
        const form = new FormData();
        form.append('file', pendingAvatarFile);
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: form });
        const uploadBody = await uploadRes.json().catch(() => ({}));
        if (!uploadRes.ok) {
          throw new Error(uploadBody.error ?? 'Failed to upload avatar');
        }
        nextAvatarUrl = uploadBody.url as string;
      }

      const name = joinProfileName(firstName, lastName);
      const updated = await updateProfileAsync({
        name,
        email,
        phone: buildPhone(),
        ...(nextAvatarUrl !== undefined ? { avatarUrl: nextAvatarUrl } : {}),
      });
      setProfile(updated);
      setAvatarUrl(updated.avatarUrl ?? null);
      setPendingAvatarFile(null);
      setRemoveAvatar(false);
      notifyProfileUpdated(updated);
      setIsSaved(true);
      setHasChanges(false);
      setTimeout(() => setIsSaved(false), 1500);
    } catch (err) {
      if (err instanceof ProfileApiError && err.code === 'EMAIL_ALREADY_IN_USE') {
        setSaveError('This email is already registered to another user.');
      } else {
        setSaveError(err instanceof Error ? err.message : 'Failed to save profile');
      }
    }
  };

  const handlePasswordSave = async () => {
    setPasswordError(null);
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    try {
      await changeProfilePasswordAsync(oldPassword, newPassword);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSaved(true);
      setTimeout(() => {
        setPasswordSaved(false);
        setIsResetModalOpen(false);
      }, 1200);
    } catch (err) {
      if (err instanceof ProfileApiError && err.code === 'INVALID_CURRENT_PASSWORD') {
        setPasswordError('Incorrect current password.');
      } else {
        setPasswordError(err instanceof Error ? err.message : 'Failed to change password');
      }
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mt-2 text-sm text-gray-500" data-testid="profile-loading">
        Loading profile…
      </div>
    );
  }

  const roleLabel = profile?.role.name ?? 'No role assigned';
  const locationLabel =
    profile?.locations.length === 0
      ? 'No location'
      : profile!.locations.length === 1
        ? profile!.locations[0]!.name
        : `${profile!.locations.length} locations`;

  return (
    <div className="max-w-3xl flex flex-col gap-10 mt-2">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-8 pb-4 border-b border-gray-100">My Profile</h2>

        <div className="flex items-center gap-6 mb-10 pb-8 border-b border-gray-100">
          <div className="relative group cursor-pointer" onClick={handleUploadClick}>
            <div className="w-20 h-20 rounded-full bg-gray-100 border-4 border-white shadow-sm flex items-center justify-center overflow-hidden">
              <img 
                src={avatarUrl ?? profile?.avatarUrl ?? "https://api.dicebear.com/7.x/notionists/svg?seed=Felix&backgroundColor=EE635E"} 
                alt="User Avatar" 
                className="w-full h-full object-cover group-hover:opacity-30 transition-opacity" 
              />
            </div>
            <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-[11px] font-bold tracking-wider">CHANGE</span>
            </div>
            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
          </div>
          <div className="flex flex-col gap-1.5">
            <h3 className="text-lg font-bold text-gray-800" data-testid="profile-display-name">
              {profile?.name ?? 'User'}
            </h3>
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-medium text-gray-500">
                {roleLabel} • {locationLabel}
              </p>
              <span className="text-gray-300">•</span>
              <button 
                type="button"
                onClick={() => {
                  setPasswordError(null);
                  setIsResetModalOpen(true);
                }}
                className="text-[13px] font-semibold text-gray-700 hover:text-black hover:underline cursor-pointer"
              >
                Reset password
              </button>
            </div>
            {(avatarUrl || profile?.avatarUrl) && (
              <button type="button" onClick={handleRemoveAvatar} className="text-[12px] font-bold text-red-500 self-start hover:underline mt-0.5">
                Remove photo
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-5">
          <div className="flex flex-col gap-2">
            <label className="text-[14px] font-medium text-gray-800">First Name</label>
            <input
              type="text"
              data-testid="profile-first-name"
              value={firstName}
              onChange={(e) => {
                setHasChanges(true);
                setFirstName(e.target.value.replace(/[^A-Za-zÀ-ÿ]/g, ''));
              }}
              className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 text-[14px] font-medium text-gray-800 outline-none focus:ring-4 focus:ring-corgi/10 focus:border-corgi transition-all"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[14px] font-medium text-gray-800">Last Name</label>
            <input
              type="text"
              data-testid="profile-last-name"
              value={lastName}
              onChange={(e) => {
                setHasChanges(true);
                setLastName(e.target.value);
              }}
              className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 text-[14px] font-medium text-gray-800 outline-none focus:ring-4 focus:ring-corgi/10 focus:border-corgi transition-all"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[14px] font-medium text-gray-800">Email Address</label>
            <input
              type="email"
              data-testid="profile-email"
              value={email}
              onChange={(e) => {
                setHasChanges(true);
                const val = e.target.value.replace(/\s/g, '');
                setEmail(val);
                if (emailError) validateEmail(val);
              }}
              onBlur={(e) => validateEmail(e.target.value)}
              className={`w-full bg-gray-50 border rounded-2xl px-4 py-3.5 text-[14px] font-medium text-gray-800 outline-none focus:ring-4 transition-all ${
                emailError
                  ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20'
                  : 'border-gray-100 focus:border-corgi focus:ring-corgi/10'
              }`}
            />
            {emailError && (
              <span className="text-[12px] font-medium text-red-500 ml-1" data-testid="profile-email-error">
                Please enter a valid email address.
              </span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[14px] font-medium text-gray-800">Phone Number</label>
            <div className="flex bg-gray-50 border border-gray-100 rounded-2xl focus-within:ring-4 focus-within:ring-corgi/10 focus-within:border-corgi transition-all overflow-hidden">
              <div className="flex items-center px-2 border-r border-gray-200 bg-gray-100/50 relative">
                <select
                  value={phoneCountry}
                  onChange={(e) => {
                    setHasChanges(true);
                    setPhoneCountry(e.target.value);
                  }}
                  className="bg-transparent pl-2 pr-6 py-3.5 text-[14px] font-medium text-gray-800 outline-none cursor-pointer appearance-none z-10"
                >
                  <option value="+380">🇺🇦 +380</option>
                  <option value="+1">🇺🇸 +1</option>
                  <option value="+44">🇬🇧 +44</option>
                  <option value="+34">🇪🇸 +34</option>
                </select>
                <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              <input
                type="tel"
                data-testid="profile-phone"
                value={phoneLocal}
                onChange={(e) => {
                  setHasChanges(true);
                  setPhoneLocal(e.target.value);
                }}
                className="bg-transparent flex-1 px-4 py-3.5 text-[14px] font-medium text-gray-800 outline-none"
              />
            </div>
          </div>
        </div>

        {saveError && (
          <p className="text-sm text-red-500 mt-4" role="alert" data-testid="profile-save-error">
            {saveError}
          </p>
        )}

        <div
          data-testid="profile-save-bar"
          data-visible={hasChanges ? 'true' : 'false'}
          className={`flex justify-end gap-3 overflow-hidden transition-all duration-500 ${
            hasChanges ? 'max-h-24 opacity-100 mt-8 pt-6 border-t border-gray-100' : 'max-h-0 opacity-0 mt-0 pt-0'
          }`}
        >
          <button
            type="button"
            onClick={() => setHasChanges(false)}
            className="px-6 py-3 bg-white border border-gray-200 text-gray-600 text-[14px] font-bold rounded-full hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="profile-save-btn"
            onClick={handleSave}
            className={`px-6 py-3 text-white text-[14px] font-bold rounded-full transition-all flex items-center justify-center gap-2 ${
              isSaved ? 'bg-green-500 w-32' : 'bg-[#EE635E] hover:bg-[#d94f4a] w-[140px]'
            } cursor-pointer`}
          >
            {isSaved ? (
              <>
                <Check size={16} strokeWidth={3} /> Saved!
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>

        {/* Log out Action Section */}
        <div className="mt-12 pt-8 border-t border-gray-100 flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold text-gray-900">Sign Out</span>
            <span className="text-xs text-gray-500">Log out of your current session on this device</span>
          </div>
          <button
            type="button"
            data-testid="profile-logout-btn"
            onClick={async () => {
              try {
                await fetch('/api/auth/logout', { method: 'POST' });
              } catch (e) {
                console.error(e);
              }
              window.location.href = '/login';
            }}
            className="px-5 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200/60 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 active:scale-95"
          >
            <LogOut size={16} />
            <span>Log out</span>
          </button>
        </div>
      </div>

      {/* Styled Reset Password Modal */}
      {isResetModalOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsResetModalOpen(false)}
        >
          <div 
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl flex flex-col gap-6 relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h3 className="text-lg font-bold text-gray-900">Reset Password</h3>
              <button 
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Password Inputs */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-gray-700">Current Password</label>
                <div className="relative flex items-center">
                  <input
                    type={showOld ? "text" : "password"}
                    data-testid="profile-old-password"
                    placeholder="Enter current password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-[14px] font-medium text-gray-800 outline-none focus:ring-4 focus:ring-corgi/10 focus:border-corgi pr-10 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOld(!showOld)}
                    className="absolute right-3 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-gray-700">New Password</label>
                <div className="relative flex items-center">
                  <input
                    type={showNew ? "text" : "password"}
                    data-testid="profile-new-password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-[14px] font-medium text-gray-800 outline-none focus:ring-4 focus:ring-corgi/10 focus:border-corgi pr-10 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-gray-700">Confirm New Password</label>
                <div className="relative flex items-center">
                  <input
                    type={showConfirm ? "text" : "password"}
                    data-testid="profile-confirm-password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-[14px] font-medium text-gray-800 outline-none focus:ring-4 focus:ring-corgi/10 focus:border-corgi pr-10 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {passwordError && (
                <p className="text-xs font-semibold text-red-500 mt-1" role="alert" data-testid="profile-password-error">
                  {passwordError}
                </p>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsResetModalOpen(false);
                  setPasswordError(null);
                }}
                className="px-5 py-2.5 bg-white border border-gray-200 text-gray-600 text-[13px] font-bold rounded-full hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="profile-password-save-btn"
                onClick={handlePasswordSave}
                className={`px-6 py-2.5 text-white text-[13px] font-bold rounded-full transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  passwordSaved ? 'bg-green-500' : 'bg-[#EE635E] hover:bg-[#d94f4a]'
                }`}
              >
                {passwordSaved ? (
                  <>
                    <Check size={16} strokeWidth={3} /> Updated!
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
