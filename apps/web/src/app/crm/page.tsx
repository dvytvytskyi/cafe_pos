'use client';

import React, { useState, useEffect, Suspense } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useSearchParams } from 'next/navigation';
import { getOrderHistoryAsync, Order } from '@/lib/orders';
import { 
  getGuestsAsync, 
  saveGuestAsync,
  updateGuestAsync,
  deleteGuestAsync,
  adjustGuestPointsAsync,
  CrmApiError,
  Guest, 
  getTierCashbackRate,
  getLoyaltyConfigAsync,
  DEFAULT_LOYALTY_CONFIG,
  type LoyaltyConfig,
  buildCustomerQrCode,
  formatLoyaltyPoints,
  formatLoyaltyPointsDelta,
} from '@/lib/crm';
import {
  filterCustomersBySearch,
  EMPTY_CRM_LIST_MESSAGE,
  validateCustomerName,
  validatePhoneE164,
  validateEmail,
  sortCustomers,
} from '@/lib/crm-validation';
import { 
  Search, 
  UserPlus, 
  Edit, 
  Trash2, 
  Award, 
  Sparkles, 
  Clock, 
  Coins, 
  TrendingUp, 
  User, 
  Calendar, 
  AlertTriangle, 
  Mail, 
  Phone,
  Heart,
  QrCode,
  X,
  Check,
  Coffee,
  Star,
  Settings,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function CrmPageContent() {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  const [guests, setGuests] = useState<Guest[]>([]);
  const [crmOrders, setCrmOrders] = useState<Order[]>([]);
  const [loyaltyConfig, setLoyaltyConfig] = useState<LoyaltyConfig>(DEFAULT_LOYALTY_CONFIG);
  const [manualActivityLogs, setManualActivityLogs] = useState<
    Array<{ id: string | number; type: string; guestName: string; description: string; time: Date }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'vip' | 'inactive' | 'allergies'>('all');
  
  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  
  // Manual Points Adjustment States
  const [isAdjustPointsOpen, setIsAdjustPointsOpen] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustType, setAdjustType] = useState<'add' | 'subtract'>('add');
  
  // Form states
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formBirthday, setFormBirthday] = useState('');
  const [formAllergies, setFormAllergies] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formErrors, setFormErrors] = useState<{ name?: string; phone?: string; email?: string }>({});
  const [toast, setToast] = useState<string | null>(null);
  const [adjustError, setAdjustError] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // Load guests from PostgreSQL on mount
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    getGuestsAsync()
      .then((data) => {
        if (!cancelled) setGuests(sortCustomers(data, 'name', 'asc'));
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Failed to load guests');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getLoyaltyConfigAsync()
      .then((config) => {
        if (!cancelled) setLoyaltyConfig(config);
      })
      .catch(console.error);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 365);

    getOrderHistoryAsync({
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      limit: activeTab === 'activity' ? 100 : 50,
      ...(selectedGuestId && activeTab === 'overview' ? { customerId: selectedGuestId } : {}),
    })
      .then((history) => {
        if (cancelled) return;
        setCrmOrders(history.orders);
      })
      .catch(console.error);
    return () => { cancelled = true; };
  }, [selectedGuestId, activeTab]);

  // Set default selected guest
  useEffect(() => {
    if (guests.length > 0 && !selectedGuestId) {
      setSelectedGuestId(guests[0].id);
    }
  }, [guests, selectedGuestId]);

  // Helper: check if customer is inactive (> 30 days)
  const isInactive = (lastVisitDate: string) => {
    const today = new Date();
    const lastVisit = new Date(lastVisitDate);
    const diffTime = Math.abs(today.getTime() - lastVisit.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 30;
  };

  const orderBelongsToGuest = (order: Order, guestId: string) =>
    order.customerId === guestId || (order.loyaltyGuestIds?.includes(guestId) ?? false);

  // Filtered guests (client-side search + segment filters), sorted A→Z by name
  const filteredGuests = sortCustomers(
    filterCustomersBySearch(guests, searchQuery).filter(guest => {
      if (activeFilter === 'vip') {
        return guest.tier === 'VIP' || guest.tier === 'Gold';
      }
      if (activeFilter === 'inactive') {
        return isInactive(guest.lastVisitDate);
      }
      if (activeFilter === 'allergies') {
        return !!guest.allergyNotes;
      }
      return true;
    }),
    'name',
    'asc'
  );

  const selectedGuest = guests.find(g => g.id === selectedGuestId) || null;

  const validateGuestForm = () => {
    const errors: { name?: string; phone?: string; email?: string } = {};
    try {
      validateCustomerName(formName);
    } catch (err) {
      errors.name = err instanceof Error ? err.message : 'Invalid name';
    }
    try {
      validatePhoneE164(formPhone);
    } catch (err) {
      errors.phone = err instanceof Error ? err.message : 'Invalid phone';
    }
    try {
      validateEmail(formEmail);
    } catch (err) {
      errors.email = err instanceof Error ? err.message : 'Invalid email';
    }
    setFormErrors(errors);
    return !errors.name && !errors.phone && !errors.email;
  };

  // Add Guest handler
  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateGuestForm()) return;

    setIsSaving(true);
    try {
      const created = await saveGuestAsync({
        name: formName,
        phone: formPhone,
        email: formEmail,
        birthday: formBirthday || undefined,
        allergyNotes: formAllergies || undefined,
        notes: formNotes || undefined,
      });
      setGuests((prev) => sortCustomers([created, ...prev], 'name', 'asc'));
      setSelectedGuestId(created.id);
      setIsAddOpen(false);
      resetForm();
    } catch (err) {
      if (err instanceof CrmApiError && err.code === 'PHONE_DUPLICATE') {
        setFormErrors((p) => ({
          ...p,
          phone: 'This phone number is already registered to another guest.',
        }));
        setToast('This phone number is already registered to another guest.');
        return;
      }
      if (err instanceof CrmApiError && err.status === 400) {
        const msg = err.message;
        if (msg.toLowerCase().includes('phone')) {
          setFormErrors((p) => ({ ...p, phone: msg }));
        } else if (msg.toLowerCase().includes('email')) {
          setFormErrors((p) => ({ ...p, email: msg }));
        } else if (msg.toLowerCase().includes('name')) {
          setFormErrors((p) => ({ ...p, name: msg }));
        } else {
          setToast(msg);
        }
        return;
      }
      console.error('Failed to create guest:', err);
      setToast(err instanceof Error ? err.message : 'Failed to create guest');
    } finally {
      setIsSaving(false);
    }
  };

  // Edit Guest handler
  const handleEditGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGuestId || !validateGuestForm()) return;

    setIsSaving(true);
    try {
      const updated = await updateGuestAsync(selectedGuestId, {
        name: formName,
        phone: formPhone,
        email: formEmail,
        birthday: formBirthday,
        allergyNotes: formAllergies || undefined,
        notes: formNotes || undefined,
      });
      setGuests((prev) => sortCustomers(prev.map((g) => (g.id === selectedGuestId ? updated : g)), 'name', 'asc'));
      setIsEditOpen(false);
      resetForm();
    } catch (err) {
      if (err instanceof CrmApiError && err.code === 'PHONE_DUPLICATE') {
        setFormErrors((p) => ({
          ...p,
          phone: 'This phone number is already registered to another guest.',
        }));
        setToast('This phone number is already registered to another guest.');
        return;
      }
      if (err instanceof CrmApiError && err.status === 400) {
        const msg = err.message;
        if (msg.toLowerCase().includes('phone')) {
          setFormErrors((p) => ({ ...p, phone: msg }));
        } else if (msg.toLowerCase().includes('email')) {
          setFormErrors((p) => ({ ...p, email: msg }));
        } else if (msg.toLowerCase().includes('name')) {
          setFormErrors((p) => ({ ...p, name: msg }));
        } else {
          setToast(msg);
        }
        return;
      }
      console.error('Failed to update guest:', err);
      setToast(err instanceof Error ? err.message : 'Failed to update guest');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Guest handler
  const handleDeleteGuest = async () => {
    if (!selectedGuestId) return;
    setIsSaving(true);
    try {
      await deleteGuestAsync(selectedGuestId);
      const updated = guests.filter((g) => g.id !== selectedGuestId);
      setGuests(updated);
      setSelectedGuestId(updated.length > 0 ? updated[0]!.id : null);
      setIsDeleteConfirmOpen(false);
    } catch (err) {
      console.error('Failed to delete guest:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Adjust Points handler
  const handleAdjustPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGuestId) return;
    const amountVal = Math.round(parseFloat(adjustAmount));
    if (isNaN(amountVal) || amountVal <= 0) return;
    if (!adjustReason.trim()) return;

    const diff = adjustType === 'add' ? amountVal : -amountVal;
    const currentGuest = guests.find((g) => g.id === selectedGuestId);
    if (!currentGuest) return;

    setAdjustError(null);
    setIsSaving(true);
    try {
      const updated = await adjustGuestPointsAsync(selectedGuestId, diff, adjustReason);
      setGuests((prev) => prev.map((g) => (g.id === selectedGuestId ? updated : g)));
      setIsAdjustPointsOpen(false);
      setAdjustAmount('');
      setAdjustReason('');

      setManualActivityLogs((prev) => [
        {
          id: Date.now(),
          type: 'adjustment',
          guestName: currentGuest.name,
          description: `Manually adjusted points by ${formatLoyaltyPointsDelta(diff)} pts (${adjustReason})`,
          time: new Date(),
        },
        ...prev,
      ]);
    } catch (err) {
      if (err instanceof CrmApiError && err.code === 'INSUFFICIENT_POINTS') {
        setAdjustError('Not enough points for this deduction.');
        return;
      }
      console.error('Failed to adjust points:', err);
      setAdjustError(err instanceof Error ? err.message : 'Failed to adjust points');
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormBirthday('');
    setFormAllergies('');
    setFormNotes('');
    setFormErrors({});
  };

  const openEditModal = () => {
    if (!selectedGuest) return;
    setFormName(selectedGuest.name);
    setFormPhone(selectedGuest.phone);
    setFormEmail(selectedGuest.email);
    setFormBirthday(selectedGuest.birthday);
    setFormAllergies(selectedGuest.allergyNotes || '');
    setFormNotes(selectedGuest.notes || '');
    setIsEditOpen(true);
  };

  // Tier Badge Color classes
  const getTierStyles = (tier: Guest['tier']) => {
    switch (tier) {
      case 'VIP': return 'bg-[#EE635E] text-white border-transparent';
      case 'Gold': return 'bg-gray-100 text-gray-800 border-transparent';
      case 'Silver': return 'bg-gray-50 text-gray-600 border-transparent';
      default: return 'bg-gray-50/50 text-gray-500 border-transparent';
    }
  };

  // Calculate high-level stats
  const totalGuests = guests.length;
  const vipCount = guests.filter(g => g.tier === 'VIP' || g.tier === 'Gold').length;
  const totalLTV = guests.reduce((sum, g) => sum + g.ltv, 0).toFixed(2);
  const totalPoints = formatLoyaltyPoints(guests.reduce((sum, g) => sum + g.points, 0));

  return (
    <DashboardLayout>
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm flex-1 flex flex-col h-full overflow-hidden relative">
        {toast && (
          <div
            className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl shadow-lg"
            data-testid="crm-toast"
          >
            {toast}
          </div>
        )}
        
        {/* CRM Top Headers & Stats */}
         <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-6 shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Loyalty & CRM</h1>
            <p className="text-sm font-medium text-gray-500 mt-1">Manage client data, loyalty rewards, and guest segments.</p>
          </div>
          
          {/* Quick Dashboard Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto shrink-0">
            <div className="bg-gray-50 border border-gray-105 rounded-xl px-3.5 py-2 flex flex-col justify-center min-w-[110px]">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Total Guests</span>
              <span className="text-base font-bold text-gray-900">{totalGuests}</span>
            </div>
            <div className="bg-gray-50 border border-gray-105 rounded-xl px-3.5 py-2 flex flex-col justify-center min-w-[110px]">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">VIP & Gold</span>
              <span className="text-base font-bold text-corgi">{vipCount}</span>
            </div>
            <div className="bg-gray-50 border border-gray-105 rounded-xl px-3.5 py-2 flex flex-col justify-center min-w-[110px]">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Total LTV</span>
              <span className="text-base font-bold text-gray-900">€{totalLTV}</span>
            </div>
            <div className="bg-gray-50 border border-gray-105 rounded-xl px-3.5 py-2 flex flex-col justify-center min-w-[110px]">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Total Points</span>
              <span className="text-base font-bold text-gray-900">{totalPoints} pts</span>
            </div>
          </div>
        </div>

        {/* Column Grid Layout */}
        {activeTab === 'overview' && (
          <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
          
          {/* Left panel: List of Guests */}
          <div className="w-full lg:w-96 flex flex-col border border-gray-100 rounded-2xl overflow-hidden bg-gray-50/30 shrink-0">
            
            {/* Search & Actions Header */}
            <div className="p-4 border-b border-gray-100 bg-white space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    data-testid="crm-search-input"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search by name, phone, email..."
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 font-medium focus:outline-none focus:border-corgi transition-colors"
                  />
                </div>
                <button
                  type="button"
                  data-testid="crm-add-guest-btn"
                  onClick={() => { resetForm(); setIsAddOpen(true); }}
                  className="bg-corgi hover:bg-corgi/90 text-white rounded-xl px-4 py-2.5 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer shrink-0"
                >
                  <UserPlus size={14} className="stroke-[2.5px]" />
                  <span>Add</span>
                </button>
              </div>

              {/* Segmentation filter pills */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(['all', 'vip', 'inactive', 'allergies'] as const).map(filter => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`cursor-pointer px-3 py-1 text-xs font-bold rounded-lg border transition-all ${
                      activeFilter === filter
                        ? 'bg-[#EE635E] border-[#EE635E] text-white shadow-sm'
                        : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-900'
                    }`}
                  >
                    {filter === 'all' && 'All Guests'}
                    {filter === 'vip' && 'VIPs'}
                    {filter === 'inactive' && 'Inactive'}
                    {filter === 'allergies' && 'Allergies'}
                  </button>
                ))}
              </div>
            </div>

            {/* Guest list scrollable panel */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50 bg-white">
              {isLoading ? (
                <div className="p-8 text-center text-gray-400 text-xs font-semibold" data-testid="crm-loading">
                  Loading guests…
                </div>
              ) : loadError ? (
                <div className="p-8 text-center text-red-400 text-xs font-semibold" data-testid="crm-load-error">
                  {loadError}
                </div>
              ) : filteredGuests.length > 0 ? (
                filteredGuests.map(guest => {
                  const isSelected = guest.id === selectedGuestId;
                  const cashbackRate = getTierCashbackRate(guest.tier, loyaltyConfig) * 100;
                  return (
                    <div
                      key={guest.id}
                      onClick={() => setSelectedGuestId(guest.id)}
                      className={`p-4 flex items-center justify-between cursor-pointer transition-all hover:bg-gray-50/80 ${
                        isSelected ? 'bg-gray-50/90' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Avatar initials fallback */}
                        <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 font-bold text-sm flex items-center justify-center border border-gray-200/50 shrink-0">
                          {guest.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-bold text-gray-900 truncate" data-testid="crm-guest-row-name">{guest.name}</span>
                          <span className="text-[11px] font-semibold text-gray-400 mt-0.5 truncate">{guest.phone}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${getTierStyles(guest.tier)}`}>
                          {guest.tier} ({cashbackRate}%)
                        </span>
                        <span className="text-[11px] font-bold text-gray-500">
                          {formatLoyaltyPoints(guest.points)} pts
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-gray-400 text-xs font-semibold" data-testid="crm-empty-state">
                  {EMPTY_CRM_LIST_MESSAGE}
                </div>
              )}
            </div>
          </div>

          {/* Right panel: Guest Details */}
            <div className="flex-1 border border-gray-100 rounded-2xl bg-white overflow-y-auto flex flex-col">
              {selectedGuest ? (
                <div className="p-6 md:p-8 flex-1 flex flex-col space-y-8 animate-in fade-in duration-300">
                  
                  {/* Profile Header Details */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-3xl bg-gray-100 text-gray-700 font-bold text-2xl flex items-center justify-center border-2 border-gray-200/40">
                        {selectedGuest.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h2 className="text-xl font-bold text-gray-900">{selectedGuest.name}</h2>
                          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getTierStyles(selectedGuest.tier)}`}>
                            {selectedGuest.tier} Tier
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-gray-400 mt-1">Joined on {selectedGuest.joinedDate}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={openEditModal}
                        className="p-2 border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-400 rounded-xl transition-colors cursor-pointer"
                        title="Edit Profile"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => setIsQrOpen(true)}
                        data-testid="crm-qr-open"
                        className="p-2 border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-400 rounded-xl transition-colors cursor-pointer"
                        title="Show Loyalty Card"
                      >
                        <QrCode size={18} />
                      </button>
                      <button
                        onClick={() => setIsDeleteConfirmOpen(true)}
                        className="p-2 border border-red-100 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                        title="Delete Customer"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Grid of Key Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/40">
                      <div className="flex items-center gap-1.5 text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">
                        <TrendingUp size={14} />
                        <span>LTV</span>
                      </div>
                      <div className="text-lg font-bold text-gray-900">€{selectedGuest.ltv.toFixed(2)}</div>
                    </div>

                    <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/40">
                      <div className="flex items-center gap-1.5 text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">
                        <Award size={14} />
                        <span>Avg Check</span>
                      </div>
                      <div className="text-lg font-bold text-gray-900">
                        €{selectedGuest.visitCount > 0 ? (selectedGuest.ltv / selectedGuest.visitCount).toFixed(2) : '0.00'}
                      </div>
                    </div>

                    <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/40">
                      <div className="flex items-center gap-1.5 text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">
                        <Clock size={14} />
                        <span>Visits</span>
                      </div>
                      <div className="text-lg font-bold text-gray-900">{selectedGuest.visitCount} visits</div>
                    </div>

                    <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/40 flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-1.5 text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">
                          <Coins size={14} className="text-amber-500" />
                          <span>Balance</span>
                        </div>
                        <div className="text-lg font-bold text-gray-900">{formatLoyaltyPoints(selectedGuest.points)} pts</div>
                      </div>
                      <button 
                        onClick={() => { setAdjustError(null); setIsAdjustPointsOpen(true); }}
                        data-testid="crm-adjust-open"
                        className="px-2.5 py-1.5 bg-white border border-gray-200 hover:border-corgi hover:text-corgi text-gray-700 transition-all text-[11px] font-bold rounded-xl shadow-sm cursor-pointer"
                      >
                        +/- Adjust
                      </button>
                    </div>
                  </div>

                  {/* Guest Profile Details & History */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    {/* Left Column: Basic Information */}
                    <div className="space-y-6">
                      <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Customer Details</h3>
                      
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <Phone size={16} className="text-gray-400" />
                          <div>
                            <span className="text-xs text-gray-400 block font-semibold">Phone</span>
                            <span className="text-sm font-bold text-gray-950">{selectedGuest.phone}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Mail size={16} className="text-gray-400" />
                          <div>
                            <span className="text-xs text-gray-400 block font-semibold">Email</span>
                            <span className="text-sm font-bold text-gray-950">{selectedGuest.email}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Calendar size={16} className="text-gray-400" />
                          <div>
                            <span className="text-xs text-gray-400 block font-semibold">Birthday</span>
                            <span className="text-sm font-bold text-gray-950">{selectedGuest.birthday}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Clock size={16} className="text-gray-400" />
                          <div>
                            <span className="text-xs text-gray-400 block font-semibold">Last Visit</span>
                            <span className="text-sm font-bold text-gray-950">
                              {selectedGuest.lastVisitDate} 
                              {selectedGuest.lastVisitDate !== 'Never' && isInactive(selectedGuest.lastVisitDate) && (
                                <span className="text-red-500 font-bold text-xs ml-2 uppercase">● Inactive</span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* General Notes */}
                      {selectedGuest.notes && (
                        <div className="border border-gray-100 rounded-xl p-3.5 bg-gray-50/50">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Staff Notes</span>
                          <p className="text-[13px] font-medium text-gray-600 leading-relaxed">{selectedGuest.notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Right Column: Allergies & Preferences */}
                    <div className="space-y-6">
                      
                      {/* Allergy Alert Card */}
                      <div className="space-y-3">
                        <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Health & Allergies</h3>
                        {selectedGuest.allergyNotes ? (
                          <div className="bg-amber-50 border border-amber-100 text-amber-900 p-4 rounded-xl flex gap-3 items-start">
                            <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                            <div>
                              <div className="font-bold text-sm text-amber-800">Allergen Alert</div>
                              <div className="text-xs font-semibold text-amber-700 mt-1">{selectedGuest.allergyNotes}</div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-green-50 border border-green-100 text-green-800 p-4 rounded-xl flex gap-3 items-start">
                            <Check className="text-green-600 shrink-0 mt-0.5" size={18} />
                            <div>
                              <div className="font-bold text-sm text-green-800">No Allergies Reported</div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Favorite Dishes */}
                      <div className="space-y-3">
                        <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Favorite Items</h3>
                        {selectedGuest.favoriteDishes.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {selectedGuest.favoriteDishes.map((dish, i) => (
                              <span 
                                key={i}
                                className="px-3 py-1.5 bg-gray-100 rounded-lg text-xs font-bold text-gray-700 flex items-center gap-1.5"
                              >
                                <Heart size={12} className="text-corgi fill-current" />
                                {dish}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 font-semibold block italic">No transactions recorded yet.</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Guest Purchase History */}
                  <div className="mt-8 pt-8 border-t border-gray-100 space-y-4">
                    <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock size={12} />
                      <span>Purchase History</span>
                    </h3>
                    
                    {(() => {
                      const guestOrders = crmOrders.filter((o) => orderBelongsToGuest(o, selectedGuest.id));
                      if (guestOrders.length === 0) {
                        return (
                          <div className="text-xs text-gray-400 font-semibold block italic py-2">
                            No recent transactions found for this customer.
                          </div>
                        );
                      }
                      return (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                                <th className="py-2.5 px-3">Order ID</th>
                                <th className="py-2.5 px-3">Date</th>
                                <th className="py-2.5 px-3">Items</th>
                                <th className="py-2.5 px-3">Points Earned</th>
                                <th className="py-2.5 px-3 text-right">Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 text-xs">
                              {guestOrders.map((order) => (
                                <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                                  <td className="py-3 px-3 font-bold text-gray-900">{order.id}</td>
                                  <td className="py-3 px-3 text-gray-500 font-semibold">
                                    {new Date(order.time).toLocaleDateString()}
                                  </td>
                                  <td className="py-3 px-3 font-medium text-gray-700 max-w-[200px] truncate" title={order.items.map(i => `${i.name} x${i.quantity}`).join(', ')}>
                                    {order.items.map(i => `${i.name} (x${i.quantity})`).join(', ')}
                                  </td>
                                  <td className="py-3 px-3 font-bold text-green-600">
                                    {order.customerPointsEarned ? `+${formatLoyaltyPoints(order.customerPointsEarned)}` : '0'}
                                  </td>
                                  <td className="py-3 px-3 text-right font-bold text-gray-950">
                                    €{order.total.toFixed(2)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}
                  </div>

                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2">
                  <User size={48} className="text-gray-300" />
                  <span className="font-bold text-sm">Select a guest to view details</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="flex-1 flex flex-col overflow-y-auto space-y-6 animate-in fade-in duration-300">
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">Recent Guest Activity</h2>
              <p className="text-xs text-gray-500 font-medium">Chronological record of transactions, points adjustments, and registrations.</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
              {(() => {
                const logs: any[] = [];
                // 1. Add order activities
                crmOrders.forEach(o => {
                  if (o.customerId) {
                    logs.push({
                      id: o.id + '-' + o.time.getTime(),
                      type: 'checkout',
                      guestName: o.customerName,
                      description: `Paid order ${o.id} for €${o.total.toFixed(2)} (${o.customerPointsEarned ? `+${formatLoyaltyPoints(o.customerPointsEarned)} pts earned` : '0 pts'})`,
                      time: o.time
                    });
                  }
                });
                manualActivityLogs.forEach((l) => {
                  logs.push(l);
                });

                // Sort by time desc
                logs.sort((a, b) => b.time.getTime() - a.time.getTime());

                if (logs.length === 0) {
                  return (
                    <div className="text-sm text-gray-400 font-bold text-center py-10">No recent activities found</div>
                  );
                }

                return (
                  <div className="space-y-4 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
                    {logs.map((log) => (
                      <div key={log.id} className="flex gap-4 items-start relative pl-10">
                        <div className={`absolute left-2 w-4.5 h-4.5 rounded-full border-4 border-white shadow-sm flex items-center justify-center -translate-x-1/2 mt-1 ${
                          log.type === 'adjustment' ? 'bg-amber-500' : 'bg-green-500'
                        }`} />
                        <div className="flex-1 bg-gray-50/50 rounded-2xl p-4 border border-gray-100/50 flex justify-between items-start gap-4">
                          <div>
                            <span className="font-bold text-sm text-gray-900 block">{log.guestName}</span>
                            <span className="text-xs font-semibold text-gray-600 mt-1 block">{log.description}</span>
                          </div>
                          <span className="text-[10px] font-bold text-gray-400 shrink-0">
                            {log.time.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Program Tab */}
        {activeTab === 'program' && (
          <div className="flex-1 flex flex-col overflow-y-auto space-y-6 animate-in fade-in duration-300">
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">Loyalty Tiers & Cashback Rates</h2>
              <p className="text-xs text-gray-500 font-medium">Overview of the current threshold rules and points conversion metrics.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { name: 'Bronze', rate: '5%', threshold: '€0+', style: 'bg-orange-50/30 border-orange-100 text-orange-700' },
                { name: 'Silver', rate: '8%', threshold: '€75+', style: 'bg-gray-50 border-gray-100 text-gray-700' },
                { name: 'Gold', rate: '10%', threshold: '€150+', style: 'bg-amber-50/50 border-amber-100 text-amber-800' },
                { name: 'VIP', rate: '15%', threshold: '€300+', style: 'bg-gray-900 text-white border-transparent' },
              ].map(tier => (
                <div key={tier.name} className={`border rounded-3xl p-6 flex flex-col gap-4 shadow-sm ${tier.style}`}>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-lg">{tier.name}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white shadow-sm border border-gray-100">
                      {tier.threshold}
                    </span>
                  </div>
                  <div>
                    <div className="text-3xl font-bold">{tier.rate}</div>
                    <span className="text-[11px] font-bold opacity-75 mt-1 block">Cashback Points Rate</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5"><Settings size={16} /> Points Conversion Info</h3>
              <p className="text-xs font-semibold text-gray-500 leading-relaxed">
                Loyalty points are calculated automatically when checkout is processed. Points accrue based on the customer's LTV status and can be used on the POS Terminal to pay for future table checks. 1 loyalty point equals €1.00 credit value.
              </p>
            </div>
          </div>
        )}

        {/* Modal: ADD Guest */}
        <AnimatePresence>
          {isAddOpen && (
            <div 
              onClick={() => setIsAddOpen(false)}
              className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-gray-900/40 backdrop-blur-sm"
            >
              <motion.div 
                onClick={e => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative bg-white rounded-3xl p-6 shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-gray-900">Add New Guest</h3>
                  <button onClick={() => setIsAddOpen(false)} className="p-1 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg cursor-pointer"><X size={20} /></button>
                </div>
                
                <form onSubmit={handleAddGuest} noValidate className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Full Name *</label>
                    <input
                      type="text"
                      required
                      data-testid="crm-form-name"
                      value={formName}
                      onChange={e => { setFormName(e.target.value); setFormErrors(p => ({ ...p, name: undefined })); }}
                      placeholder="e.g. John Smith"
                      className={`w-full bg-gray-50 border rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-800 outline-none focus:bg-white transition-all ${formErrors.name ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-gray-900'}`}
                    />
                    {formErrors.name && (
                      <p className="text-xs font-semibold text-red-500" data-testid="crm-form-name-error">{formErrors.name}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Phone Number *</label>
                      <input
                        type="text"
                        data-testid="crm-form-phone"
                        value={formPhone}
                        onChange={e => { setFormPhone(e.target.value); setFormErrors(p => ({ ...p, phone: undefined })); }}
                        placeholder="+34 600..."
                        className={`w-full bg-gray-50 border rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-800 outline-none focus:bg-white transition-all ${formErrors.phone ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-gray-900'}`}
                      />
                      {formErrors.phone && (
                        <p className="text-xs font-semibold text-red-500" data-testid="crm-form-phone-error">{formErrors.phone}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Birthday</label>
                      <input
                        type="date"
                        value={formBirthday}
                        onChange={e => setFormBirthday(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-800 outline-none focus:border-gray-900 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Email Address *</label>
                    <input
                      type="email"
                      data-testid="crm-form-email"
                      value={formEmail}
                      onChange={e => { setFormEmail(e.target.value); setFormErrors(p => ({ ...p, email: undefined })); }}
                      placeholder="john@example.com"
                      className={`w-full bg-gray-50 border rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-800 outline-none focus:bg-white transition-all ${formErrors.email ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-gray-900'}`}
                    />
                    {formErrors.email && (
                      <p className="text-xs font-semibold text-red-500" data-testid="crm-form-email-error">{formErrors.email}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block text-amber-700">Allergen Notes</label>
                    <input
                      type="text"
                      value={formAllergies}
                      onChange={e => setFormAllergies(e.target.value)}
                      placeholder="e.g. Gluten, Peanut, Lactose..."
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-800 outline-none focus:border-amber-600 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Staff Notes</label>
                    <textarea
                      value={formNotes}
                      onChange={e => setFormNotes(e.target.value)}
                      placeholder="e.g. Prefers terraza area, lactose-free milk..."
                      className="w-full h-20 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-800 outline-none focus:border-gray-900 focus:bg-white transition-all resize-none"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => setIsAddOpen(false)}
                      className="px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      data-testid="crm-form-submit"
                      className="px-6 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Create Profile
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal: EDIT Guest */}
        <AnimatePresence>
          {isEditOpen && (
            <div 
              onClick={() => setIsEditOpen(false)}
              className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-gray-900/40 backdrop-blur-sm"
            >
              <motion.div 
                onClick={e => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative bg-white rounded-3xl p-6 shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-gray-900">Edit Guest Profile</h3>
                  <button onClick={() => setIsEditOpen(false)} className="p-1 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg cursor-pointer"><X size={20} /></button>
                </div>
                
                <form onSubmit={handleEditGuest} noValidate className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Full Name *</label>
                    <input
                      type="text"
                      required
                      data-testid="crm-form-name"
                      value={formName}
                      onChange={e => { setFormName(e.target.value); setFormErrors(p => ({ ...p, name: undefined })); }}
                      placeholder="e.g. John Smith"
                      className={`w-full bg-gray-50 border rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-800 outline-none focus:bg-white transition-all ${formErrors.name ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-gray-900'}`}
                    />
                    {formErrors.name && (
                      <p className="text-xs font-semibold text-red-500" data-testid="crm-form-name-error">{formErrors.name}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Phone Number *</label>
                      <input
                        type="text"
                        data-testid="crm-form-phone"
                        value={formPhone}
                        onChange={e => { setFormPhone(e.target.value); setFormErrors(p => ({ ...p, phone: undefined })); }}
                        placeholder="+34 600..."
                        className={`w-full bg-gray-50 border rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-800 outline-none focus:bg-white transition-all ${formErrors.phone ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-gray-900'}`}
                      />
                      {formErrors.phone && (
                        <p className="text-xs font-semibold text-red-500" data-testid="crm-form-phone-error">{formErrors.phone}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Birthday</label>
                      <input
                        type="date"
                        value={formBirthday}
                        onChange={e => setFormBirthday(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-800 outline-none focus:border-gray-900 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Email Address *</label>
                    <input
                      type="email"
                      data-testid="crm-form-email"
                      value={formEmail}
                      onChange={e => { setFormEmail(e.target.value); setFormErrors(p => ({ ...p, email: undefined })); }}
                      placeholder="john@example.com"
                      className={`w-full bg-gray-50 border rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-800 outline-none focus:bg-white transition-all ${formErrors.email ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-gray-900'}`}
                    />
                    {formErrors.email && (
                      <p className="text-xs font-semibold text-red-500" data-testid="crm-form-email-error">{formErrors.email}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block text-amber-700">Allergen Notes</label>
                    <input
                      type="text"
                      value={formAllergies}
                      onChange={e => setFormAllergies(e.target.value)}
                      placeholder="e.g. Gluten, Peanut, Lactose..."
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-800 outline-none focus:border-amber-600 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Staff Notes</label>
                    <textarea
                      value={formNotes}
                      onChange={e => setFormNotes(e.target.value)}
                      placeholder="e.g. Prefers terraza area, lactose-free milk..."
                      className="w-full h-20 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-800 outline-none focus:border-gray-900 focus:bg-white transition-all resize-none"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => setIsEditOpen(false)}
                      className="px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors cursor-pointer"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal: Show QR Loyalty Card */}
        <AnimatePresence>
          {isQrOpen && selectedGuest && (
            <div 
              onClick={() => setIsQrOpen(false)}
              className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-gray-900/40 backdrop-blur-sm"
            >
              <motion.div 
                onClick={e => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-sm flex flex-col items-center"
              >
                <div className="w-full flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-gray-900">Loyalty Pass</h3>
                  <button onClick={() => setIsQrOpen(false)} className="p-1 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg cursor-pointer"><X size={20} /></button>
                </div>

                {/* simulated Pass Wallet card */}
                <div className="w-full bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-2xl p-6 shadow-lg relative overflow-hidden mb-6 flex flex-col justify-between h-48">
                  {/* Subtle Corgi watermark */}
                  <div className="absolute right-[-10px] bottom-[-20px] text-gray-800/10 opacity-30 select-none pointer-events-none transform -rotate-12">
                    <Coffee size={160} />
                  </div>

                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold tracking-widest text-orange-400 uppercase block mb-1">Corgi Club</span>
                      <h4 className="text-base font-bold truncate max-w-[200px]">{selectedGuest.name}</h4>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getTierStyles(selectedGuest.tier)}`}>
                      {selectedGuest.tier}
                    </span>
                  </div>

                  <div className="flex justify-between items-end">
                    <div>
                      <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">ID</span>
                      <span className="text-xs font-bold font-mono">{selectedGuest.id}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">Balance</span>
                      <span className="text-lg font-bold text-amber-400 flex items-center gap-0.5 justify-end">
                        <Coins size={14} />
                        {formatLoyaltyPoints(selectedGuest.points)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* QR Code */}
                <div className="bg-gray-50 border border-gray-100 p-6 rounded-2xl flex flex-col items-center gap-3">
                  {(() => {
                    const qrToken = buildCustomerQrCode(selectedGuest.id);
                    return (
                      <>
                        <div className="w-40 h-40 bg-white border border-gray-200 rounded-xl p-3 flex items-center justify-center">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrToken)}`}
                            alt="Loyalty QR Code"
                            className="w-full h-full object-contain"
                            data-testid="crm-qr-image"
                          />
                        </div>
                        <span
                          className="text-[10px] font-mono text-gray-500 break-all text-center max-w-[240px]"
                          data-testid="crm-qr-token"
                        >
                          {qrToken}
                        </span>
                        <span className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Scan to Redeem Points</span>
                      </>
                    );
                  })()}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal: Delete Confirmation */}
        <AnimatePresence>
          {isDeleteConfirmOpen && (
            <div 
              onClick={() => setIsDeleteConfirmOpen(false)}
              className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-gray-900/40 backdrop-blur-sm"
            >
              <motion.div 
                onClick={e => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white p-6 rounded-3xl shadow-xl w-80"
              >
                <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mb-4">
                  <Trash2 size={24} />
                </div>
                <h4 className="text-lg font-bold text-gray-900 mb-2">Delete Profile?</h4>
                <p className="text-[13px] text-gray-500 mb-6 font-medium leading-relaxed">
                  Are you sure you want to remove this client from the guest database? All transaction LTV and bonus records will be lost.
                </p>
                <div className="flex justify-end gap-3">
                  <button 
                    onClick={() => setIsDeleteConfirmOpen(false)} 
                    className="px-4 py-2.5 text-[13px] font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleDeleteGuest} 
                    className="px-5 py-2.5 text-[13px] font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors cursor-pointer shadow-sm"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal: Adjust Points */}
        <AnimatePresence>
          {isAdjustPointsOpen && selectedGuest && (
            <div 
              onClick={() => setIsAdjustPointsOpen(false)}
              className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-gray-900/40 backdrop-blur-sm"
            >
              <motion.div 
                onClick={e => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white p-6 rounded-3xl shadow-xl w-full max-w-md"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-gray-900">Adjust Points Balance</h3>
                  <button 
                    onClick={() => setIsAdjustPointsOpen(false)} 
                    className="w-8 h-8 rounded-full bg-gray-50 text-gray-500 flex items-center justify-center hover:bg-gray-100 hover:text-gray-800 transition-all border border-transparent hover:border-gray-200 cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
                
                <form onSubmit={handleAdjustPoints} className="space-y-4">
                  <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                      Current Balance — {selectedGuest.name}
                    </span>
                    <span className="text-xl font-bold text-gray-900" data-testid="crm-adjust-current-balance">
                      {formatLoyaltyPoints(selectedGuest.points)} pts
                    </span>
                  </div>

                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setAdjustType('add')}
                      className={`flex-1 py-2.5 rounded-xl text-xs transition-all cursor-pointer border ${
                        adjustType === 'add' 
                          ? 'bg-orange-50/50 border-orange-200 text-corgi shadow-sm font-bold' 
                          : 'bg-white border-gray-150 text-gray-500 hover:bg-gray-50 font-bold'
                      }`}
                    >
                      + Add Points
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustType('subtract')}
                      data-testid="crm-adjust-subtract"
                      className={`flex-1 py-2.5 rounded-xl text-xs transition-all cursor-pointer border ${
                        adjustType === 'subtract' 
                          ? 'bg-gray-900 border-gray-900 text-white shadow-sm font-bold' 
                          : 'bg-white border-gray-150 text-gray-500 hover:bg-gray-50 font-bold'
                      }`}
                    >
                      - Subtract Points
                    </button>
                  </div>
 
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Points Amount *</label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      required
                      data-testid="crm-adjust-amount"
                      value={adjustAmount}
                      onChange={e => setAdjustAmount(e.target.value)}
                      placeholder="e.g. 10"
                      className="w-full bg-gray-50 border border-gray-150 hover:bg-white hover:border-gray-200 focus:bg-white focus:border-corgi rounded-xl px-4 py-2.5 text-[13px] font-semibold text-gray-900 outline-none transition-all"
                      autoFocus
                    />
                  </div>
 
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Reason / Comment *</label>
                    <textarea
                      required
                      data-testid="crm-adjust-reason"
                      value={adjustReason}
                      onChange={e => setAdjustReason(e.target.value)}
                      placeholder="Why is this change being made? (e.g. Compensation for long wait time)"
                      className="w-full bg-gray-50 border border-gray-150 hover:bg-white hover:border-gray-200 focus:bg-white focus:border-corgi rounded-xl px-4 py-2.5 text-[13px] font-medium text-gray-900 outline-none transition-all min-h-[80px]"
                    />
                  </div>

                  {adjustError && (
                    <p className="text-xs font-semibold text-red-500" data-testid="crm-adjust-error">{adjustError}</p>
                  )}
 
                  <div className="flex justify-end gap-3 pt-2">
                    <button 
                      type="button"
                      onClick={() => setIsAdjustPointsOpen(false)} 
                      className="px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-xs font-bold rounded-xl text-gray-600 cursor-pointer transition-all active:scale-[0.98]"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      disabled={isSaving}
                      data-testid="crm-adjust-submit"
                      className={`px-5 py-2.5 text-xs font-bold text-white rounded-xl transition-all active:scale-[0.98] cursor-pointer shadow-sm disabled:opacity-50 ${
                        adjustType === 'add' ? 'bg-corgi hover:bg-corgi/90' : 'bg-gray-900 hover:bg-gray-900/90'
                      }`}
                    >
                      Apply
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </DashboardLayout>
  );
}

export default function CrmPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500 font-bold">Loading CRM...</div>}>
      <CrmPageContent />
    </Suspense>
  );
}
