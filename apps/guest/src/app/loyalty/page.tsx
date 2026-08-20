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
  X
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

    const achievements = [
      { id: 1, name: 'First Sip', desc: 'Order your first coffee', icon: '☕', unlocked: true },
      { id: 2, name: 'Corgi Friend', desc: 'Visit cafe 5 times', icon: '🐕', unlocked: true },
      { id: 3, name: 'Early Bird', desc: 'Order before 9:00 AM', icon: '🌅', unlocked: true },
      { id: 4, name: 'Sweet Tooth', desc: 'Order 3 desserts in 1 order', icon: '🍰', unlocked: false },
      { id: 5, name: 'VIP Club', desc: 'Reach VIP status tier', icon: '👑', unlocked: false },
      { id: 6, name: 'Local Legend', desc: 'Visit the cafe 50 times', icon: '🏆', unlocked: false },
      { id: 7, name: 'Salty Dog', desc: 'Try salted caramel latte', icon: '🧂', unlocked: true },
      { id: 8, name: 'Eco Champion', desc: 'Use reusable cup 10 times', icon: '🌱', unlocked: false },
      { id: 9, name: 'Night Owl', desc: 'Order a drink after 10 PM', icon: '🦉', unlocked: false },
      { id: 10, name: 'Menu Master', desc: 'Try all menu categories', icon: '📜', unlocked: false },
      { id: 11, name: 'Sharing is Caring', desc: 'Redeem gift card for friend', icon: '🎁', unlocked: true },
      { id: 12, name: 'Corgi Lover', desc: 'Buy any Corgi merch item', icon: '👕', unlocked: false }
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

        {/* Simple QR Code & Points Panel */}
        <div className="px-6 -mt-10 relative z-10 max-w-[440px] mx-auto">
          <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 flex flex-col items-center">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Scannable Member Code</span>
            
            {/* QR Code */}
            <div className="my-6 bg-gray-50 p-4 rounded-[24px] shadow-inner">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrCode)}`}
                alt="Member QR Code"
                className="w-[180px] h-[180px] object-contain rounded-lg"
              />
            </div>

            {/* Loyalty points details */}
            <div className="w-full flex justify-between items-center border-t border-gray-100 pt-5 mt-2">
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Member Tier</span>
                <span className="text-lg font-black text-gray-800 mt-1 uppercase tracking-tight">{customer.tier}</span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Balance</span>
                <span className="text-2xl font-black text-[#FDBD38] flex items-center gap-1.5 mt-0.5 justify-end leading-none">
                  <Coins className="w-5 h-5 text-[#FDBD38]" />
                  {customer.points.toFixed(0)} <span className="text-xs font-bold text-gray-400">PTS</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="max-w-[440px] mx-auto px-6 mt-8 flex flex-col gap-4">
          
          {/* Tier Progression Progress Card */}
          <div className="bg-white p-5 rounded-[24px] border border-gray-100 flex flex-col text-left shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <Sparkle className="w-5 h-5 text-[#FDBD38]" />
                <span className="text-sm font-bold text-gray-800">Tier Progress</span>
              </div>
              <span className="text-xs font-bold text-[#FDBD38]">
                {tierRate}x Points Rate
              </span>
            </div>

            <div className="w-full bg-gray-100 h-3.5 rounded-full overflow-hidden relative border border-gray-50/50 mb-2">
              <div 
                className="bg-gradient-to-r from-[#FDBD38] to-[#EE635E] h-full rounded-full transition-all duration-700 ease-out" 
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-[11px] font-bold text-gray-400 mt-1">
              <span>Spent: {customer.ltv.toFixed(2)}€</span>
              {nextTier ? (
                <span>{pointsToNextTier ? `${pointsToNextTier.toFixed(2)}€` : 'Next Level'} to {nextTier}</span>
              ) : (
                <span>Maximum Tier Achieved!</span>
              )}
            </div>
          </div>

          {/* Achievements Grid (Borderless & frameless) */}
          <div className="flex flex-col text-left px-2 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <Sparkle className="w-5 h-5 text-[#FDBD38]" />
              <span className="text-sm font-bold text-gray-800">My Achievements</span>
            </div>

            <div className="grid grid-cols-3 gap-y-6 gap-x-3">
              {achievements.map((ach) => (
                <div 
                  key={ach.id} 
                  className={`flex flex-col items-center text-center transition-all ${
                    ach.unlocked 
                      ? 'opacity-100' 
                      : 'opacity-40 filter grayscale'
                  }`}
                >
                  <div className="text-3xl mb-2 relative flex items-center justify-center w-12 h-12">
                    <span className="text-3xl">{ach.icon}</span>
                    {!ach.unlocked && (
                      <div className="absolute bottom-0 right-0 bg-gray-500 text-white rounded-full p-0.5 border border-white">
                        <Lock className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-gray-800 leading-tight line-clamp-1">{ach.name}</span>
                  <span className="text-[8px] text-gray-400 font-semibold mt-0.5 leading-tight line-clamp-2 max-w-[90px]">{ach.desc}</span>
                </div>
              ))}
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

