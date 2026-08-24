'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Delete,
  LogIn,
  CheckCircle2,
  MapPin,
  Castle,
  Church,
  Building2,
  Coffee,
  Landmark,
  ArrowLeft,
  UserCheck,
  Store,
} from 'lucide-react';
import { loginWithPinAsync, getEmployeesAsync, type Employee } from '@/lib/staff';
import { getLocationsCachedAsync, type LocationSummary } from '@/lib/locations';

const DEFAULT_LOCATIONS: Array<LocationSummary & { icon: React.ElementType }> = [
  { id: 'gotico', name: 'Gótico', address: 'Carrer de Ferran, 12', icon: Castle },
  { id: 'sagrada', name: 'Sagrada', address: 'Carrer de Mallorca, 401', icon: Church },
  { id: 'muntaner', name: 'Muntaner', address: 'Carrer de Muntaner, 180', icon: Building2 },
  { id: 'gracia', name: 'Gràcia', address: 'Carrer de Verdi, 22', icon: Coffee },
  { id: 'arc', name: 'ARC', address: 'Passeig de Lluís Companys, 5', icon: Landmark },
];

const DEMO_STAFF: Employee[] = [
  {
    id: 'usr_anna',
    name: 'Anna Muñoz Hidalgo',
    position: 'Manager',
    section: 'Management',
    nie: '',
    phone: '',
    email: 'anna@corgicafe.com',
    contractStart: '',
    scheduleStart: '09:00',
    scheduleEnd: '18:00',
    daysPerWeek: 5,
    avatarInitials: 'AM',
    status: 'active',
    roleName: 'Manager',
    locationNames: ['Gótico', 'Sagrada', 'Muntaner', 'Gràcia', 'ARC'],
  },
  {
    id: 'usr_felix',
    name: 'Felix G.',
    position: 'Super Admin',
    section: 'Executive',
    nie: '',
    phone: '',
    email: 'felix@corgicafe.com',
    contractStart: '',
    scheduleStart: '09:00',
    scheduleEnd: '18:00',
    daysPerWeek: 5,
    avatarInitials: 'FG',
    status: 'active',
    roleName: 'Super Admin',
    locationNames: ['Gótico', 'Sagrada', 'Muntaner', 'Gràcia', 'ARC'],
  },
  {
    id: 'usr_alex',
    name: 'Alex K.',
    position: 'Barista',
    section: 'Bar',
    nie: '',
    phone: '',
    email: 'alex@corgicafe.com',
    contractStart: '',
    scheduleStart: '08:00',
    scheduleEnd: '16:00',
    daysPerWeek: 5,
    avatarInitials: 'AK',
    status: 'active',
    roleName: 'Barista',
    locationNames: ['Gótico', 'Gràcia'],
  },
  {
    id: 'usr_elena',
    name: 'Elena Rodriguez',
    position: 'Chef',
    section: 'Kitchen',
    nie: '',
    phone: '',
    email: 'elena@corgicafe.com',
    contractStart: '',
    scheduleStart: '11:00',
    scheduleEnd: '20:00',
    daysPerWeek: 5,
    avatarInitials: 'ER',
    status: 'active',
    roleName: 'Chef',
    locationNames: ['Sagrada', 'Muntaner'],
  },
  {
    id: 'usr_mark',
    name: 'Mark T.',
    position: 'Waiter',
    section: 'Floor',
    nie: '',
    phone: '',
    email: 'mark@corgicafe.com',
    contractStart: '',
    scheduleStart: '12:00',
    scheduleEnd: '21:00',
    daysPerWeek: 5,
    avatarInitials: 'MT',
    status: 'active',
    roleName: 'Waiter',
    locationNames: ['ARC', 'Gótico'],
  },
];

export default function LoginPage() {
  const [locations, setLocations] = useState(DEFAULT_LOCATIONS);
  const [staffList, setStaffList] = useState<Employee[]>(DEMO_STAFF);
  
  // Selection Flow States
  const [selectedLocation, setSelectedLocation] = useState<LocationSummary | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Employee | null>(null);

  // PIN Login States
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const locs = await getLocationsCachedAsync();
        if (locs && locs.length > 0) {
          const merged = locs.map((l) => {
            const match = DEFAULT_LOCATIONS.find((dl) => dl.name.toLowerCase() === l.name.toLowerCase() || dl.id === l.id);
            return {
              ...l,
              icon: match?.icon || Store,
            };
          });
          setLocations(merged);
        }
      } catch (err) {
        console.warn('Using default locations list:', err);
      }

      try {
        const staff = await getEmployeesAsync();
        if (staff && staff.length > 0) {
          setStaffList(staff);
        }
      } catch (err) {
        console.warn('Using default staff list:', err);
      }
    }
    void loadData();
  }, []);

  // Filter staff by selected location
  const availableStaff = selectedLocation
    ? staffList.filter((s) => {
        if (!s.locationNames || s.locationNames.length === 0) return true;
        return s.locationNames.some(
          (locName) => locName.toLowerCase() === selectedLocation.name.toLowerCase()
        );
      })
    : staffList;

  const appendDigit = (digit: string) => {
    if (pin.length >= 4 || loadingLogin || success) return;
    setError(null);
    setPin((p) => p + digit);
  };

  const backspace = () => {
    if (loadingLogin || success) return;
    setError(null);
    setPin((p) => p.slice(0, -1));
  };

  const handleSubmit = async (value = pin) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length !== 4) {
      setError('Enter 4 digits');
      return;
    }
    setLoadingLogin(true);
    setError(null);
    try {
      const result = await loginWithPinAsync(digits);
      if (!result.success) {
        setError(result.error ?? 'Invalid PIN code');
        setPin('');
        return;
      }
      setSuccess(true);
      setTimeout(() => {
        window.location.href = '/';
      }, 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setPin('');
    } finally {
      setLoadingLogin(false);
    }
  };

  useEffect(() => {
    if (pin.length === 4) {
      handleSubmit(pin).catch(console.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  return (
    <div className="min-h-screen w-full bg-[#fdfbf7] flex items-center justify-center p-4 sm:p-6 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-gray-100/80 w-full max-w-lg flex flex-col items-center relative overflow-hidden"
      >
        {/* Header Color Stripe */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#EE635E] via-[#FC8C86] to-[#EE635E]" />

        {/* Brand Logo & Title Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#EE635E]/10 p-2 flex items-center justify-center mb-3 border border-[#EE635E]/20 shadow-sm">
            <img src="/media/image.png" alt="Corgi POS Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Corgi POS</h1>
          <p className="text-xs font-semibold text-gray-500 mt-0.5">
            {!selectedLocation
              ? 'Step 1: Select store location'
              : !selectedStaff
              ? `Step 2: Select user in ${selectedLocation.name}`
              : `Step 3: Enter PIN for ${selectedStaff.name}`}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {/* STEP 1: SELECT LOCATION */}
          {!selectedLocation ? (
            <motion.div
              key="step-1-location"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              className="w-full flex flex-col items-center"
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full">
                {locations.map((loc) => {
                  const IconComp = (loc as unknown as { icon?: React.ElementType }).icon || MapPin;
                  return (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => {
                        setSelectedLocation(loc);
                        setError(null);
                      }}
                      className="p-4 bg-gray-50 hover:bg-[#EE635E]/10 border border-gray-100 hover:border-[#EE635E]/40 rounded-2xl transition-all duration-200 cursor-pointer flex flex-col items-center text-center group active:scale-95 shadow-2xs hover:shadow-sm"
                    >
                      <div className="w-11 h-11 rounded-2xl bg-white text-gray-700 group-hover:bg-[#EE635E] group-hover:text-white flex items-center justify-center mb-2.5 transition-all shadow-xs group-hover:scale-110">
                        <IconComp size={20} />
                      </div>
                      <span className="text-sm font-bold text-gray-900 group-hover:text-[#EE635E] transition-colors leading-tight">
                        {loc.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          ) : !selectedStaff ? (
            /* STEP 2: SELECT USER IN SELECTED LOCATION */
            <motion.div
              key="step-2-user"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              className="w-full flex flex-col items-center"
            >
              {/* Location Breadcrumb Bar */}
              <div className="w-full p-3 bg-[#EE635E]/10 border border-[#EE635E]/20 rounded-2xl flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-xs font-bold text-[#EE635E]">
                  <MapPin size={14} />
                  <span>{selectedLocation.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLocation(null);
                    setSelectedStaff(null);
                    setError(null);
                  }}
                  className="px-3 py-1 bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 shadow-2xs"
                >
                  <ArrowLeft size={12} />
                  <span>Change Location</span>
                </button>
              </div>

              {/* Staff Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                {availableStaff.length === 0 ? (
                  <div className="col-span-2 py-8 text-center text-xs font-medium text-gray-400">
                    No staff members assigned to {selectedLocation.name}
                  </div>
                ) : (
                  availableStaff.map((staff) => (
                    <button
                      key={staff.id}
                      type="button"
                      onClick={() => {
                        setSelectedStaff(staff);
                        setPin('');
                        setError(null);
                      }}
                      className="p-3.5 bg-gray-50 hover:bg-[#EE635E]/10 border border-gray-100 hover:border-[#EE635E]/30 rounded-2xl transition-all duration-200 cursor-pointer flex items-center gap-3 text-left group active:scale-95 shadow-2xs hover:shadow-sm"
                    >
                      <div className="w-10 h-10 rounded-full bg-[#EE635E]/10 text-[#EE635E] group-hover:bg-[#EE635E] group-hover:text-white flex items-center justify-center font-bold text-sm shrink-0 border border-[#EE635E]/20 transition-all">
                        {staff.avatarInitials || staff.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-xs font-bold text-gray-900 group-hover:text-[#EE635E] transition-colors truncate leading-tight">
                          {staff.name}
                        </span>
                        <span className="text-[10px] text-gray-500 font-semibold leading-tight mt-0.5 truncate">
                          {staff.position || staff.roleName || 'Staff'}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          ) : (
            /* STEP 3: ENTER PIN FOR SELECTED USER */
            <motion.div
              key="step-3-pin"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              className="w-full flex flex-col items-center max-w-sm mx-auto"
            >
              {/* Selected User Header */}
              <div className="w-full p-3 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#EE635E] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
                    {selectedStaff.avatarInitials || selectedStaff.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-900 leading-tight">
                      {selectedStaff.name}
                    </span>
                    <span className="text-xs text-gray-500 font-medium leading-tight mt-0.5">
                      {selectedLocation.name} • {selectedStaff.position || selectedStaff.roleName || 'Staff'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStaff(null);
                    setPin('');
                    setError(null);
                  }}
                  className="px-2.5 py-1.5 bg-white hover:bg-gray-100 border border-gray-200 text-gray-600 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 shadow-2xs"
                >
                  <ArrowLeft size={12} />
                  <span>Switch</span>
                </button>
              </div>

              {/* PIN Dots */}
              <div className="flex justify-center gap-3.5 mb-5" data-testid="pin-dots">
                {[0, 1, 2, 3].map((i) => {
                  const isFilled = pin.length > i;
                  return (
                    <motion.div
                      key={i}
                      animate={{ scale: isFilled ? 1.15 : 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-200 ${
                        isFilled
                          ? 'bg-[#EE635E] border-[#EE635E] shadow-sm'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    />
                  );
                })}
              </div>

              {/* Error / Success Banner */}
              <div className="h-6 mb-3 flex items-center justify-center w-full">
                <AnimatePresence mode="wait">
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-xs font-bold text-red-500 text-center bg-red-50 px-3 py-1 rounded-full border border-red-100"
                      data-testid="login-error"
                    >
                      {error}
                    </motion.div>
                  )}
                  {success && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-xs font-bold text-emerald-600 text-center bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 flex items-center gap-1.5"
                    >
                      <CheckCircle2 size={14} />
                      <span>Authorized! Redirecting...</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Keypad Grid */}
              <div className="grid grid-cols-3 gap-3 w-full mb-5">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    disabled={loadingLogin || success}
                    onClick={() => appendDigit(digit)}
                    className="h-13 rounded-2xl bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-xl font-bold text-gray-900 transition-all shadow-2xs hover:shadow-sm cursor-pointer disabled:opacity-50 active:scale-95 flex items-center justify-center"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={loadingLogin || success || pin.length === 0}
                  onClick={() => {
                    setError(null);
                    setPin('');
                  }}
                  className="h-13 rounded-2xl bg-gray-50 hover:bg-gray-100 text-xs font-bold text-gray-500 transition-all cursor-pointer disabled:opacity-40 active:scale-95 flex items-center justify-center uppercase tracking-wider"
                >
                  Clear
                </button>
                <button
                  type="button"
                  disabled={loadingLogin || success}
                  onClick={() => appendDigit('0')}
                  className="h-13 rounded-2xl bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-xl font-bold text-gray-900 transition-all shadow-2xs hover:shadow-sm cursor-pointer disabled:opacity-50 active:scale-95 flex items-center justify-center"
                >
                  0
                </button>
                <button
                  type="button"
                  disabled={loadingLogin || success || pin.length === 0}
                  onClick={backspace}
                  className="h-13 rounded-2xl bg-gray-50 hover:bg-gray-100 text-gray-600 transition-all cursor-pointer disabled:opacity-40 active:scale-95 flex items-center justify-center"
                >
                  <Delete size={20} />
                </button>
              </div>

              {/* Quick Demo PIN Chips */}
              <div className="w-full pt-3.5 border-t border-gray-100 flex flex-col items-center gap-2">
                <span className="text-[11px] font-semibold text-gray-400">Quick Demo PINs:</span>
                <div className="flex gap-2">
                  {['1234', '0000', '1111'].map((demoPin) => (
                    <button
                      key={demoPin}
                      type="button"
                      onClick={() => {
                        setPin(demoPin);
                        handleSubmit(demoPin).catch(console.error);
                      }}
                      className="px-2.5 py-1 bg-gray-100 hover:bg-[#EE635E]/10 hover:text-[#EE635E] text-gray-600 rounded-lg text-xs font-bold transition-all cursor-pointer"
                    >
                      {demoPin}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
