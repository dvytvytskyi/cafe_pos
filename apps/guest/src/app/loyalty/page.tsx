'use client';

import React, { useEffect, useState } from 'react';
import { useGuest } from '@/lib/guest-context';
import {
  requestOtp,
  verifyOtp,
  registerGuest,
  logoutGuest,
  getLoyalty,
  getLoyaltyTransactions,
  updateProfile,
  getProfile,
} from '@/lib/api-client';
import type { GuestLoyaltyResponse, GuestLoyaltyTransaction } from '@corgi/contracts';
import { 
  Phone, 
  Lock, 
  User, 
  Mail, 
  Gift, 
  Activity, 
  LogOut, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle, 
  Coins, 
  Sparkle,
  History,
  AlertTriangle,
  X,
  Plus,
  Coffee,
  Heart,
  Sun,
  Cake,
  Crown,
  Trophy,
  Sparkles,
  Leaf,
  Moon,
  BookOpen,
  ShoppingBag
} from 'lucide-react';

export default function LoyaltyPage() {
  const { isLoggedIn, profileName, refreshAuth } = useGuest();

  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [devCode, setDevCode] = useState('');
  const [needRegister, setNeedRegister] = useState(false);
  const [loading, setLoading] = useState(false);

  // Registration form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [allergyNotes, setAllergyNotes] = useState('');

  // Logged-in profile states
  const [loyalty, setLoyalty] = useState<GuestLoyaltyResponse | null>(null);
  const [transactions, setTransactions] = useState<GuestLoyaltyTransaction[]>([]);
  const [editName, setEditName] = useState('');
  const [editAllergy, setEditAllergy] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [isAddPointsOpen, setIsAddPointsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedSticker, setSelectedSticker] = useState<{
    id: number;
    name: string;
    desc: string;
    path: string;
    unlocked: boolean;
  } | null>(null);

  // Fetch loyalty status and transaction history
  const loadLoyaltyData = async () => {
    try {
      const loy = await getLoyalty();
      setLoyalty(loy);
      setEditName(loy.customer.name || profileName || '');
      setEditAllergy(loy.customer.allergyNotes || '');

      const txs = await getLoyaltyTransactions();
      setTransactions(txs);
    } catch (err) {
      console.error('Failed to load loyalty details:', err);
    }
  };

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setIsApplyingPromo(true);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    const code = promoCode.trim().toUpperCase();
    if (code === 'CORGI100' || code === 'COFFEE50' || code === 'FREE50' || code === 'BONUS') {
      const addedPoints = code === 'CORGI100' ? 100 : 50;
      if (loyalty) {
        setLoyalty({
          ...loyalty,
          customer: {
            ...loyalty.customer,
            points: loyalty.customer.points + addedPoints
          }
        });
        // Add to transactions list
        const newTx = {
          id: Math.random().toString(36).substring(7),
          type: 'earn' as const,
          points: addedPoints,
          createdAt: new Date().toISOString(),
          orderId: undefined
        };
        setTransactions([newTx, ...transactions]);
        alert(`Successfully added ${addedPoints} points! 🎉`);
      }
      setPromoCode('');
      setIsAddPointsOpen(false);
    } else {
      alert('Invalid promo code. Try "CORGI100" or "COFFEE50"!');
    }
    setIsApplyingPromo(false);
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadLoyaltyData();
    } else {
      setLoyalty(null);
      setTransactions([]);
    }
  }, [isLoggedIn]);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;
    setLoading(true);
    try {
      const res = await requestOtp(phone);
      setOtpSent(true);
      if (res.devCode) {
        setDevCode(res.devCode);
      }
    } catch (err: any) {
      alert(`OTP request failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode) return;
    setLoading(true);
    try {
      const res = await verifyOtp(phone, otpCode);
      if (res.ok) {
        if (res.token) {
          localStorage.setItem('corgi_guest_session_token', res.token);
        }
        // Fetch profile to see if profile needs completion (if name is 'Guest')
        try {
          const profile = await getProfile();
          if (profile.name === 'Guest' || profile.email?.endsWith('@guest.corgi.local')) {
            setNeedRegister(true);
          } else {
            await refreshAuth();
            setOtpSent(false);
          }
        } catch {
          setNeedRegister(true);
        }
      } else {
        setNeedRegister(true);
      }
    } catch (err: any) {
      if (err.message.includes('404') || err.message.includes('not found') || err.message.includes('register')) {
        setNeedRegister(true);
      } else {
        alert(`Verification failed: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regEmail) return;
    setLoading(true);
    try {
      await updateProfile({
        name: regName,
        email: regEmail,
        allergyNotes: allergyNotes || undefined,
      });
      await refreshAuth();
      setNeedRegister(false);
    } catch (err: any) {
      alert(`Registration failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsUpdatingProfile(true);
    try {
      await updateProfile({
        name: editName || undefined,
        allergyNotes: editAllergy,
      });
      await refreshAuth();
      await loadLoyaltyData();
      alert('Profile updated successfully!');
    } catch (err: any) {
      alert(`Failed to update profile: ${err.message}`);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleLogoutClick = async () => {
    if (confirm('Are you sure you want to log out?')) {
      await logoutGuest();
      await refreshAuth();
    }
  };



  // Helper to determine tier badge border / color
  const getTierGradient = (tier: string) => {
    const t = tier.toLowerCase();
    if (t === 'silver') {
      return 'from-slate-200 via-slate-350 to-slate-400 text-slate-800 border-slate-300';
    }
    if (t === 'gold') {
      return 'from-amber-200 via-yellow-450 to-amber-500 text-amber-950 border-amber-300';
    }
    if (t === 'vip') {
      return 'from-slate-900 via-purple-950 to-indigo-950 text-indigo-100 border-indigo-900';
    }
    // Bronze
    return 'from-orange-200 via-amber-600 to-amber-700 text-orange-950 border-orange-300';
  };

  // Helper to get tier rates
  const getTierRate = (tier: string, config: any) => {
    const t = tier.toLowerCase();
    if (t === 'silver') return config.silverRate;
    if (t === 'gold') return config.goldRate;
    if (t === 'vip') return config.vipRate;
    return config.bronzeRate;
  };

  // Helper to get tier threshold
  const getTierThreshold = (tier: string, config: any) => {
    const t = tier.toLowerCase();
    if (t === 'silver') return config.goldThreshold;
    if (t === 'vip') return Infinity;
    // bronze -> silver, silver -> gold, gold -> vip
    if (t === 'bronze') return config.silverThreshold;
    return config.vipThreshold;
  };
  if (isLoggedIn && loyalty) {
    const { customer, config, nextTier, pointsToNextTier, qrCode } = loyalty;
    const tierRate = getTierRate(customer.tier, config);
    const nextThreshold = getTierThreshold(customer.tier, config);
    const progressPercent = nextThreshold === Infinity ? 100 : Math.min(100, (customer.ltv / nextThreshold) * 100);

    const stickers = [
      { id: 1, name: 'Coffee Lover', desc: 'Order your first coffee to unlock this sticker!', path: '/stickers/corgi_coffee1.png', unlocked: true },
      { id: 2, name: 'French Croissant', desc: 'Order a fresh croissant with coffee to unlock this sticker!', path: '/stickers/corgi_croissant_1.png', unlocked: true },
      { id: 3, name: 'Healthy Smoothie', desc: 'Order a fresh fruit smoothie to unlock this sticker!', path: '/stickers/corgi_smoothie_1.png', unlocked: true },
      { id: 4, name: 'Fiesta Time', desc: 'Visit the cafe during our Friday Fiesta night to unlock this sticker!', path: '/stickers/corgi_fiesta_1.png', unlocked: true },
      { id: 5, name: 'Sweet Tooth', desc: 'Order 3 desserts in a single purchase to unlock this sticker!', path: '/stickers/corgi_sweety_1.png', unlocked: true },
      { id: 6, name: 'Music Lover', desc: 'Tune in and connect to the Corgi Radio channel to unlock this sticker!', path: '/stickers/corgi_music_1.png', unlocked: true },
      { id: 7, name: 'Happy Birthday', desc: 'Visit the cafe on your birthday to unlock this sticker!', path: '/stickers/corgi_birthday_1.png', unlocked: false },
      { id: 8, name: 'Easter Bunny', desc: 'Visit the cafe during Easter holidays to unlock this sticker!', path: '/stickers/corgi_easter_1.png', unlocked: false },
      { id: 9, name: 'Cupid Corgi', desc: "Visit the cafe on Valentine's Day to unlock this sticker!", path: '/stickers/corgi_cupidon_1.png', unlocked: false },
      { id: 10, name: 'Spooky Corgi', desc: 'Visit the cafe on Halloween day to unlock this sticker!', path: '/stickers/corgi_halloween_1.png', unlocked: false },
      { id: 11, name: 'Merry Christmas', desc: 'Visit the cafe during Christmas week to unlock this sticker!', path: '/stickers/corgi_hristmas_1.png', unlocked: false },
      { id: 12, name: 'Workaholic', desc: 'Connect to the cafe Wi-Fi for 5 hours in one visit to unlock this sticker!', path: '/stickers/corgi_laptop1.png', unlocked: false }
    ];

    return (
      <div className="h-screen overflow-y-auto bg-gray-50 pb-[90px] relative scroll-smooth">
        {/* Profile Header */}
        <div className="bg-[#FDBD38] text-white px-6 pt-10 pb-20 rounded-b-[40px] shadow-lg relative">
          <div className="max-w-[440px] mx-auto flex items-center justify-between">
            <div className="flex flex-col text-left">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-white/80">Loyalty Club</span>
              <h1 className="text-[26px] font-extrabold mt-1 tracking-tight leading-none">
                Hello, {profileName || customer.name}!
              </h1>
            </div>
            <button
              onClick={() => setIsProfileOpen(true)}
              className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/40 shadow-sm active:scale-95 transition-all cursor-pointer flex-shrink-0"
            >
              <img 
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80" 
                alt="Profile Avatar"
                className="w-full h-full object-cover"
              />
            </button>
          </div>
        </div>

        {/* Flipping 3D QR Card */}
        <div className="px-6 -mt-10 relative z-10 max-w-[440px] mx-auto">
          <div 
            className="w-full h-[360px] relative cursor-pointer"
            style={{ perspective: '1000px' }}
          >
            <div 
              className={`w-full h-full relative transition-transform duration-700 [transform-style:preserve-3d] ${
                isCardFlipped ? '[transform:rotateY(180deg)]' : ''
              }`}
            >
              {/* Front Side: QR Code Card */}
              <div 
                onClick={() => setIsCardFlipped(true)}
                className="absolute inset-0 w-full h-full bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 flex flex-col items-center justify-between [backface-visibility:hidden]"
              >
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Scannable Member Code</span>
                
                {/* QR Code */}
                <div className="my-3 bg-gray-50 p-4 rounded-[24px] shadow-inner">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrCode)}`}
                    alt="Member QR Code"
                    className="w-[170px] h-[170px] object-contain rounded-lg"
                  />
                </div>

                {/* Loyalty points details */}
                <div className="w-full flex justify-between items-center border-t border-gray-100 pt-4">
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Member Tier</span>
                    <span className="text-lg font-black text-gray-800 uppercase tracking-tight leading-none mt-1">{customer.tier}</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Balance</span>
                    <span className="text-2xl font-black text-[#FDBD38] flex items-center gap-1.5 justify-end leading-none mt-0.5">
                      <Coins className="w-5 h-5 text-[#FDBD38]" />
                      {customer.points.toFixed(0)} <span className="text-xs font-bold text-gray-400">PTS</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Back Side: Profile Info Card */}
              <div 
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.closest('button') || target.closest('input') || target.closest('select')) return;
                  setIsCardFlipped(false);
                }}
                className="absolute inset-0 w-full h-full bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 flex flex-col justify-between [backface-visibility:hidden] [transform:rotateY(180deg)]"
              >
                <div className="flex flex-col w-full h-full justify-between">
                  {/* Header Row: Left Tier, Center Photo, Right spent */}
                  <div className="flex justify-between items-start w-full">
                    {/* Left Status */}
                    <div className="flex flex-col text-left">
                      <span className="text-base font-black text-gray-800 tracking-tight uppercase leading-none">{customer.tier}</span>
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-1">Profile</span>
                    </div>

                    {/* Center Avatar */}
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-md -mt-1">
                      <img 
                        src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80" 
                        alt="Profile Avatar"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Right Spent */}
                    <div className="flex flex-col text-right">
                      <span className="text-base font-black text-[#FDBD38] tracking-tight leading-none">{customer.ltv.toFixed(0)}€</span>
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-1">Spent</span>
                    </div>
                  </div>

                  {/* Name & Subtitle */}
                  <div className="flex flex-col items-center text-center my-2">
                    <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase mb-1 leading-tight">
                      {profileName || customer.name}
                    </h2>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider leading-none">
                      Loyalty ID: #{customer.id.slice(-8).toUpperCase()}
                    </span>
                  </div>

                  {/* Collapsible Add Points Code Field */}
                  {isAddPointsOpen && (
                    <div className="w-full flex gap-2 items-center px-1 mb-3 animate-fadeIn">
                      <input 
                        type="text" 
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        placeholder="Enter code (e.g. CORGI100)" 
                        className="flex-1 border border-gray-200 rounded-[12px] py-2 px-3 text-xs font-bold text-gray-800 focus:outline-none focus:border-[#FDBD38]"
                      />
                      <button 
                        onClick={handleApplyPromo}
                        disabled={isApplyingPromo}
                        className="bg-[#FDBD38] hover:bg-[#c29124] text-white px-4 py-2 rounded-[12px] text-xs font-black transition-all cursor-pointer whitespace-nowrap"
                      >
                        {isApplyingPromo ? '...' : 'Claim'}
                      </button>
                    </div>
                  )}

                  {/* Footer Buttons: Add Points & History */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setIsAddPointsOpen(!isAddPointsOpen)}
                      className="flex-1 bg-gray-50 border border-gray-100 hover:bg-gray-100 text-gray-700 py-3 rounded-[16px] font-extrabold text-xs transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4 text-gray-500" />
                      <span>Add Points</span>
                    </button>
                    <button
                      onClick={() => setIsHistoryOpen(true)}
                      className="flex-1 bg-gray-50 border border-gray-100 hover:bg-gray-100 text-gray-700 py-3 rounded-[16px] font-extrabold text-xs transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <History className="w-4 h-4 text-gray-500" />
                      <span>History</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Content Container (Solid Full-Width #FAF7F3 Background) */}
        <div className="w-full bg-[#FAF7F3] mt-8 py-8 px-6 border-t border-gray-100/50">
          <div className="max-w-[440px] mx-auto flex flex-col gap-8">
            
            {/* Tier Progression Progress Card (Frameless) */}
            <div className="flex flex-col text-left">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-bold text-gray-800">Tier Progress</span>
                <span className="text-xs font-bold text-[#FDBD38]">
                  {tierRate}x Points Rate
                </span>
              </div>

              <div className="w-full bg-gray-200/70 h-3 rounded-full overflow-hidden relative mb-2">
                <div 
                  className="bg-gradient-to-r from-[#FDBD38] to-[#EE635E] h-full rounded-full transition-all duration-700 ease-out" 
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 mt-1">
                <span>Spent: {customer.ltv.toFixed(2)}€</span>
                {nextTier ? (
                  <span>{pointsToNextTier ? `${pointsToNextTier.toFixed(2)}€` : 'Next Level'} to {nextTier}</span>
                ) : (
                  <span>Maximum Tier Achieved!</span>
                )}
              </div>
            </div>

            {/* Social Media Stickers Grid */}
            <div className="flex flex-col text-left mb-2">
              <div className="flex flex-col gap-0.5 mb-4">
                <span className="text-sm font-bold text-gray-800">Social Media Stickers</span>
                <span className="text-[10px] text-gray-400 font-bold">Press on sticker to learn how to open</span>
              </div>

              <div className="grid grid-cols-3 gap-y-6 gap-x-3">
                {stickers.map((st) => (
                  <button 
                    key={st.id} 
                    onClick={() => setSelectedSticker(st)}
                    className={`flex flex-col items-center text-center transition-all focus:outline-none cursor-pointer ${
                      st.unlocked 
                        ? 'opacity-100' 
                        : 'opacity-40 filter grayscale'
                    }`}
                  >
                    <div className="w-16 h-16 relative flex items-center justify-center mb-1">
                      <img 
                        src={st.path} 
                        alt={st.name} 
                        className="w-14 h-14 object-contain"
                      />
                      {!st.unlocked && (
                        <div className="absolute bottom-0 right-0 bg-gray-500 text-white rounded-full p-0.5 border border-white">
                          <Lock className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-gray-800 leading-tight line-clamp-1">{st.name}</span>
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Profile Drawer Sheet (100vh slide-up from bottom) */}
        <div className={`fixed inset-0 z-50 flex justify-center items-end bg-black/40 transition-opacity duration-300 ${
          isProfileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}>
          <div className={`w-full max-w-[480px] h-[100dvh] bg-white rounded-t-[32px] overflow-hidden flex flex-col shadow-2xl relative transition-transform duration-300 ease-out transform ${
            isProfileOpen ? 'translate-y-0' : 'translate-y-full'
          }`}>
            {/* Drawer Header */}
            <div className="px-6 pt-12 pb-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0 bg-gray-50/50">
              <button 
                onClick={() => setIsProfileOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-all active:scale-90 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              <span className="font-extrabold text-sm text-gray-800 tracking-widest uppercase">My Profile</span>
              <button 
                onClick={() => {
                  setIsProfileOpen(false);
                  handleLogoutClick();
                }}
                className="text-xs font-bold text-[#EE635E] hover:opacity-85 active:scale-95 transition-all cursor-pointer"
              >
                Log out
              </button>
            </div>

            {/* Drawer Body Container (Scrollable) */}
            <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6">
              
              {/* Profile Avatar & Tier Banner */}
              <div className="flex flex-col items-center text-center bg-gray-55/40 p-5 rounded-[24px] border border-gray-100">
                <div className="relative mb-3">
                  <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-md">
                    <img 
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80" 
                      alt="Profile Avatar"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="absolute -bottom-1 -right-1 bg-[#FDBD38] text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-white shadow-sm">
                    {customer.tier}
                  </span>
                </div>
                <h3 className="font-black text-lg text-gray-800 uppercase tracking-tight">{profileName || customer.name}</h3>
                <span className="text-[10px] font-bold text-gray-400 mt-0.5">{customer.points.toFixed(0)} Points Balance</span>
              </div>

              {/* Editable Profile Information Form */}
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-4 block">Edit Information</span>
                
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">Full Name</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Enter full name"
                        className="w-full border border-gray-200 rounded-[14px] py-2.5 pl-10 pr-4 text-sm font-medium text-gray-800 focus:outline-none focus:border-[#FDBD38]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">Allergy & Dietary Notes</label>
                    <div className="relative">
                      <AlertTriangle className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                      <input
                        type="text"
                        value={editAllergy}
                        onChange={(e) => setEditAllergy(e.target.value)}
                        placeholder="e.g. Nuts, Dairy, Gluten (Optional)"
                        className="w-full border border-gray-200 rounded-[14px] py-2.5 pl-10 pr-4 text-sm font-medium text-gray-800 focus:outline-none focus:border-[#FDBD38]"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleSaveProfile}
                    disabled={isUpdatingProfile}
                    className="w-full bg-[#FDBD38] hover:opacity-90 disabled:opacity-60 text-white py-3 rounded-full font-semibold text-sm transition-all active:scale-[0.99] mt-2 cursor-pointer"
                  >
                    {isUpdatingProfile ? 'Saving profile...' : 'Save Profile Changes'}
                  </button>
                </div>
              </div>

              {/* Useful Hacks / Preferences Section */}
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-4 block">My Preferences</span>
                
                <div className="bg-gray-50 p-5 rounded-[24px] border border-gray-100 flex flex-col gap-4">
                  {/* Favorite Beverage */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">Favorite Drink</label>
                    <select className="w-full border border-gray-200 bg-white rounded-[14px] py-2.5 px-3 text-sm font-medium text-gray-800 focus:outline-none focus:border-[#FDBD38]">
                      <option>Signature Cappuccino</option>
                      <option>Salted Caramel Latte</option>
                      <option>Flat White</option>
                      <option>Iced Americano</option>
                    </select>
                  </div>

                  {/* Milk Preferences */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">Milk Choice</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['Whole', 'Oat', 'Almond'].map((milk) => (
                        <button 
                          key={milk} 
                          type="button"
                          className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                            milk === 'Oat' 
                              ? 'border-[#FDBD38] bg-[#FDBD38]/10 text-[#c29124]' 
                              : 'border-gray-250 text-gray-500 bg-white'
                          }`}
                        >
                          {milk}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Favorite Table Selection */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">Preferred seating</label>
                    <select className="w-full border border-gray-200 bg-white rounded-[14px] py-2.5 px-3 text-sm font-medium text-gray-800 focus:outline-none focus:border-[#FDBD38]">
                      <option>Window Desk (High Chairs)</option>
                      <option>Terrace Lounge</option>
                      <option>Cozy Sofa Area</option>
                      <option>Quiet Room</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Points Calculator Helper */}
              <div className="flex flex-col text-left mb-6">
                <span className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-4 block">Points Calculator</span>
                <div className="bg-amber-50/50 p-5 rounded-[24px] border border-amber-100/50 text-xs leading-relaxed text-[#c29124]">
                  <p className="font-semibold">Calculate how many points you will earn on your next purchase:</p>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="font-extrabold text-sm text-gray-800">Spent €</span>
                    <input 
                      type="number" 
                      defaultValue={15} 
                      className="w-16 bg-white border border-gray-250 rounded-lg py-1 px-2 text-center font-bold text-gray-800"
                    />
                    <span className="font-extrabold text-sm text-gray-800">➔</span>
                    <span className="font-extrabold text-sm text-[#FDBD38] flex items-center gap-1">
                      <Coins className="w-4 h-4" />
                      {(15 * tierRate).toFixed(0)} PTS
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Points History Drawer Sheet (80dvh slide-up from bottom) */}
        <div className={`fixed inset-0 z-50 flex justify-center items-end bg-black/40 transition-opacity duration-300 ${
          isHistoryOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}>
          <div className={`w-full max-w-[480px] h-[80dvh] bg-white rounded-t-[32px] overflow-hidden flex flex-col shadow-2xl relative transition-transform duration-300 ease-out transform ${
            isHistoryOpen ? 'translate-y-0' : 'translate-y-full'
          }`}>
            {/* Drawer Header */}
            <div className="px-6 pt-12 pb-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0 bg-gray-50/50">
              <button 
                onClick={() => setIsHistoryOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-550 transition-all active:scale-90 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              <span className="font-extrabold text-sm text-gray-805 tracking-widest uppercase">Points History</span>
              <div className="w-8 h-8" />
            </div>

            {/* Drawer Body Container (Scrollable) */}
            <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-4">
              {transactions.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <Coins className="w-12 h-12 text-gray-300 mb-3" />
                  <span className="text-sm font-bold text-gray-400">No transactions recorded yet</span>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {transactions.map((tx) => {
                    const isEarn = tx.type === 'earn';
                    const dateLabel = new Date(tx.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });
                    return (
                      <div key={tx.id} className="flex justify-between items-center border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${
                            isEarn ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'
                          }`}>
                            {isEarn ? '+' : '-'}
                          </div>
                          <div className="flex flex-col text-left">
                            <span className="text-xs font-bold text-gray-800">
                              {isEarn ? 'Points Earned' : 'Points Spent'}
                            </span>
                            <span className="text-[10px] text-gray-400 font-bold mt-0.5">{dateLabel}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className={`text-sm font-black ${
                            isEarn ? 'text-emerald-600' : 'text-orange-600'
                          }`}>
                            {isEarn ? '+' : '-'}{tx.points.toFixed(0)} PTS
                          </span>
                          {tx.orderId && (
                            <span className="text-[9px] font-bold text-gray-455 uppercase mt-0.5">Order #{tx.orderId.slice(-6)}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sticker Detail Modal Overlay */}
        {selectedSticker && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-6 animate-fadeIn">
            <div className="bg-white rounded-[32px] w-full max-w-[340px] p-6 shadow-2xl flex flex-col items-center text-center relative border border-gray-100 animate-scaleUp">
              <button 
                onClick={() => setSelectedSticker(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 absolute top-4 right-4 transition-all active:scale-90 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-28 h-28 my-4 relative flex items-center justify-center">
                <img 
                  src={selectedSticker.path} 
                  alt={selectedSticker.name} 
                  className={`w-24 h-24 object-contain ${
                    selectedSticker.unlocked ? '' : 'filter grayscale opacity-60'
                  }`}
                />
                {!selectedSticker.unlocked && (
                  <div className="absolute bottom-1 right-1 bg-gray-500 text-white rounded-full p-1.5 border border-white shadow-sm">
                    <Lock className="w-3 h-3" />
                  </div>
                )}
              </div>

              <h3 className="text-base font-black text-gray-800 tracking-tight mb-1 uppercase">{selectedSticker.name}</h3>
              
              <div className="mb-4">
                {selectedSticker.unlocked ? (
                  <span className="bg-emerald-50 text-emerald-600 text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full border border-emerald-100">
                    Unlocked 🎉
                  </span>
                ) : (
                  <span className="bg-gray-100 text-gray-500 text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full border border-gray-200">
                    Locked 🔒
                  </span>
                )}
              </div>

              <p className="text-xs font-semibold text-gray-500 leading-relaxed max-w-[240px] mb-4">
                {selectedSticker.desc}
              </p>

              <button
                onClick={() => setSelectedSticker(null)}
                className="w-full bg-[#FDBD38] hover:opacity-90 text-white py-3 rounded-full font-bold text-sm transition-all active:scale-[0.99] cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Registration complete profile layout
  if (needRegister) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-6 pb-12">
        <div className="w-full max-w-[400px] bg-white rounded-[32px] p-6 shadow-[0_15px_30px_rgba(0,0,0,0.06)] border border-gray-100 flex flex-col text-left">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-[#FDBD38] mb-3">
              <Gift className="w-6 h-6" />
            </div>
            <h1 className="text-[22px] font-extrabold text-gray-900 tracking-tight">Complete Profile</h1>
            <p className="text-xs text-gray-400 mt-1 max-w-[280px]">
              Complete your information to claim your member tier and start earning points.
            </p>
          </div>

          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full border border-gray-200 rounded-[14px] py-2.5 pl-10 pr-4 text-sm font-medium text-gray-800 focus:outline-none focus:border-[#FDBD38]"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full border border-gray-200 rounded-[14px] py-2.5 pl-10 pr-4 text-sm font-medium text-gray-800 focus:outline-none focus:border-[#FDBD38]"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">Allergy & Dietary Notes</label>
              <div className="relative">
                <AlertTriangle className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  value={allergyNotes}
                  onChange={(e) => setAllergyNotes(e.target.value)}
                  placeholder="e.g. Nuts, Dairy, Gluten (Optional)"
                  className="w-full border border-gray-200 rounded-[14px] py-2.5 pl-10 pr-4 text-sm font-medium text-gray-800 focus:outline-none focus:border-[#FDBD38]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#EE635E] hover:opacity-90 disabled:opacity-60 text-white py-3 rounded-full font-semibold text-sm transition-all active:scale-[0.99] mt-3 flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>{loading ? 'Creating account...' : 'Create Account'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  // OTP Login view (Logged Out)
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-6 pb-12">
      <div className="w-full max-w-[400px] bg-white rounded-[32px] p-6 shadow-[0_15px_30px_rgba(0,0,0,0.06)] border border-gray-100 flex flex-col text-left">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-[#FDBD38] mb-3">
            <Gift className="w-6 h-6" />
          </div>
          <h1 className="text-[22px] font-extrabold text-gray-900 tracking-tight">Loyalty Program</h1>
          <p className="text-xs text-gray-400 mt-1 max-w-[280px]">
            Sign up or log in using your phone number to collect points and claim free rewards.
          </p>
        </div>

        {!otpSent ? (
          <form onSubmit={handleRequestOtp} className="flex flex-col gap-4">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">Phone Number</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+34600111222"
                  className="w-full border border-gray-200 rounded-[14px] py-2.5 pl-10 pr-4 text-sm font-medium text-gray-800 focus:outline-none focus:border-[#FDBD38]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#FDBD38] hover:opacity-90 disabled:opacity-60 text-white py-3 rounded-full font-semibold text-sm transition-all active:scale-[0.99] mt-1 flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>{loading ? 'Sending SMS...' : 'Send SMS OTP'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
            <div className="bg-emerald-50 text-emerald-700 p-3.5 rounded-[16px] text-xs font-semibold flex items-start gap-2.5 mb-2 leading-relaxed">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>We sent a verification code to {phone}</span>
            </div>

            {devCode && (
              <div className="bg-amber-50 text-amber-850 p-3.5 rounded-[16px] text-xs font-semibold flex items-start gap-2.5 mb-2 border border-amber-100 leading-relaxed">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="block font-bold">Dev Sandbox Code (Auto-resolved):</span>
                  <span className="block font-black text-sm text-amber-950 mt-0.5 select-all">{devCode}</span>
                </div>
              </div>
            )}

            <div>
              <label className="text-[10px] font-bold text-gray-450 uppercase tracking-wide block mb-1">SMS Verification Code</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="123456"
                  className="w-full border border-gray-200 rounded-[14px] py-2.5 pl-10 pr-4 text-sm font-medium text-gray-800 focus:outline-none focus:border-[#FDBD38]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#FDBD38] hover:opacity-90 disabled:opacity-60 text-white py-3 rounded-full font-semibold text-sm transition-all active:scale-[0.99] mt-1 flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>{loading ? 'Verifying...' : 'Verify Code'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setOtpSent(false)}
              className="w-full border border-gray-250 hover:bg-gray-50 text-gray-500 py-3 rounded-full font-semibold text-xs transition-all active:scale-[0.99] mt-1 cursor-pointer"
            >
              Back to phone entry
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

