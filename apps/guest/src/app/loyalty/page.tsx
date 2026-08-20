'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
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
  AlertTriangle
} from 'lucide-react';

export default function LoyaltyPage() {
  const { isLoggedIn, profileName, refreshAuth } = useGuest();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
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

  // Holographic card states
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [sheen, setSheen] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const xc = rect.width / 2;
    const yc = rect.height / 2;
    
    const rotateX = -(y - yc) / (rect.height / 15);
    const rotateY = (x - xc) / (rect.width / 15);
    
    const sheenX = (x / rect.width) * 100;
    const sheenY = (y / rect.height) * 100;
    
    setTilt({ x: rotateX, y: rotateY });
    setSheen({ x: sheenX, y: sheenY });
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
      handleMouseLeave();
      return;
    }
    
    const xc = rect.width / 2;
    const yc = rect.height / 2;
    
    const rotateX = -(y - yc) / (rect.height / 15);
    const rotateY = (x - xc) / (rect.width / 15);
    
    const sheenX = (x / rect.width) * 100;
    const sheenY = (y / rect.height) * 100;
    
    setTilt({ x: rotateX, y: rotateY });
    setSheen({ x: sheenX, y: sheenY });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
    setSheen({ x: 50, y: 50 });
  };

  // Helper to determine tier gradient background style
  const getTierGradientStyle = (tier: string) => {
    const t = tier.toLowerCase();
    if (t === 'silver') {
      return {
        background: 'linear-gradient(135deg, #d3d3d3 0%, #ffffff 20%, #a9a9a9 40%, #e0e0e0 60%, #ffffff 80%, #909090 100%)',
        color: '#2d3748',
        borderColor: 'rgba(255, 255, 255, 0.4)',
        textShadow: '0 1px 1px rgba(255,255,255,0.6)',
      };
    }
    if (t === 'gold') {
      return {
        background: 'linear-gradient(135deg, #c39c43 0%, #fbf5b7 20%, #b38728 40%, #fef8cc 60%, #aa771c 80%, #ffd700 100%)',
        color: '#4a3712',
        borderColor: 'rgba(255, 255, 255, 0.4)',
        textShadow: '0 1px 1px rgba(255,255,255,0.6)',
      };
    }
    if (t === 'vip') {
      return {
        background: 'linear-gradient(135deg, #0f0f16 0%, #201b2d 30%, #08060c 50%, #2a203f 70%, #030205 100%)',
        color: '#e2e8f0',
        borderColor: 'rgba(139, 92, 246, 0.5)',
        textShadow: '0 -1px 1px rgba(0,0,0,0.8)',
      };
    }
    // Bronze
    return {
      background: 'linear-gradient(135deg, #bc6c47 0%, #e59f7c 20%, #9f4924 40%, #f4b899 60%, #7f3412 80%, #bc6c47 100%)',
      color: '#4c1d07',
      borderColor: 'rgba(255, 255, 255, 0.4)',
      textShadow: '0 1px 1px rgba(255,255,255,0.6)',
    };
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
            <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm border border-white/20 bg-white/20 text-white`}>
              {customer.tier}
            </span>
          </div>
        </div>

        {/* Style block for auto-oscillating holographic effects */}
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes card-float-ambient {
            0% {
              transform: perspective(1000px) rotateX(1.5deg) rotateY(-2deg) translateY(0px);
            }
            50% {
              transform: perspective(1000px) rotateX(-2deg) rotateY(2.5deg) translateY(-6px);
            }
            100% {
              transform: perspective(1000px) rotateX(1.5deg) rotateY(-2deg) translateY(0px);
            }
          }

          @keyframes sheen-ambient {
            0% {
              background-position: 0% 0%;
              opacity: 0.55;
            }
            50% {
              background-position: 100% 100%;
              opacity: 0.75;
            }
            100% {
              background-position: 0% 0%;
              opacity: 0.55;
            }
          }

          @keyframes flare-ambient {
            0% {
              transform: rotate(25deg) translate(-80%, -80%);
              opacity: 0.3;
            }
            50% {
              transform: rotate(25deg) translate(80%, 80%);
              opacity: 0.7;
            }
            100% {
              transform: rotate(25deg) translate(-80%, -80%);
              opacity: 0.3;
            }
          }

          .ambient-card-animation {
            animation: card-float-ambient 6s ease-in-out infinite;
          }

          .ambient-sheen-animation {
            background-size: 200% 200%;
            animation: sheen-ambient 8s ease-in-out infinite;
          }

          .ambient-flare-animation {
            animation: flare-ambient 7s ease-in-out infinite;
          }
        ` }} />

        {/* Floating Digital Member Card */}
        <div className="px-6 -mt-14 relative z-10 max-w-[480px] mx-auto" style={{ perspective: '1000px' }}>
          {!mounted ? (
            <div 
              onMouseMove={handleMouseMove}
              onTouchMove={handleTouchMove}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onTouchEnd={handleMouseLeave}
              className={`rounded-[32px] p-6 shadow-[0_20px_40px_rgba(0,0,0,0.12)] border flex flex-col relative overflow-hidden select-none cursor-pointer ambient-card-animation`}
              style={getTierGradientStyle(customer.tier)}
            >
              {/* Holographic Sheen/Shine Overlay */}
              <div 
                className="absolute inset-0 pointer-events-none rounded-[32px] transition-opacity duration-300 ambient-sheen-animation"
                style={{
                  background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.05) 50%, rgba(0,0,0,0.1) 100%)',
                  mixBlendMode: 'overlay',
                  opacity: 0.6,
                }}
              />
              {/* Linear light flare streak */}
              <div 
                className="absolute inset-0 pointer-events-none rounded-[32px] transition-opacity duration-500 ambient-flare-animation"
                style={{
                  background: 'linear-gradient(105deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0) 40%, rgba(255,255,255,0.2) 48%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0.2) 52%, rgba(255,255,255,0) 60%, rgba(255,255,255,0) 100%)',
                  backgroundSize: '200% 200%',
                  mixBlendMode: 'overlay',
                  opacity: 0.4,
                }}
              />

              <div className="flex justify-between items-start w-full relative z-10">
                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Member Card</span>
                  <span className="text-[20px] font-extrabold uppercase tracking-tight mt-1">Corgi Cafe</span>
                </div>
                <div className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border border-white/10">
                  Level {customer.tier}
                </div>
              </div>

              {/* Scannable QR Code */}
              <div className="my-6 flex justify-center relative z-10">
                <div className="bg-white p-3 rounded-[24px] shadow-[0_8px_16px_rgba(0,0,0,0.06)] border border-black/5">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrCode)}`}
                    alt="Member QR Code"
                    className="w-[160px] h-[160px] object-contain rounded-lg"
                  />
                </div>
              </div>

              <div 
                className="flex justify-between items-end w-full pt-2 border-t mt-2 relative z-10" 
                style={{ borderColor: customer.tier.toLowerCase() === 'vip' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }}
              >
                <div className="flex flex-col text-left">
                  <span className="text-[9px] font-bold uppercase tracking-wider opacity-60">Card Holder</span>
                  <span className="text-sm font-bold tracking-wide mt-0.5">{customer.name}</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-[9px] font-bold uppercase tracking-wider opacity-60">Balance</span>
                  <span className="text-[18px] font-black tracking-tight flex items-center gap-1 mt-0.5 justify-end">
                    <Coins className="w-4 h-4" />
                    {customer.points.toFixed(0)} PTS
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <Scene3D 
              tier={customer.tier}
              name={customer.name}
              points={customer.points}
              qrCode={qrCode}
            />
          )}
        </div>

        {/* Dashboard Content */}
        <div className="max-w-[440px] mx-auto px-6 mt-8 flex flex-col gap-6">
          
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

          {/* Allergy notes Update Form */}
          <div className="bg-white p-5 rounded-[24px] border border-gray-100 flex flex-col text-left shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-5 h-5 text-[#EE635E]" />
              <span className="text-sm font-bold text-gray-800">Guest Health & Profile</span>
            </div>
            
            <div className="flex flex-col gap-3">
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
                className="w-full bg-[#EE635E] hover:opacity-90 disabled:opacity-60 text-white py-3 rounded-full font-semibold text-sm transition-all active:scale-[0.99] mt-2 cursor-pointer"
              >
                {isUpdatingProfile ? 'Saving profile...' : 'Save Profile Changes'}
              </button>
            </div>
          </div>

          {/* Chronological Points Transaction History */}
          <div className="bg-white p-5 rounded-[24px] border border-gray-100 flex flex-col text-left shadow-sm">
            <div className="flex items-center gap-2 mb-4 border-b border-gray-50 pb-2.5">
              <History className="w-5 h-5 text-gray-700" />
              <span className="text-sm font-bold text-gray-800">Points History</span>
            </div>

            {transactions.length === 0 ? (
              <div className="py-8 flex flex-col items-center justify-center text-center">
                <Coins className="w-8 h-8 text-gray-300 mb-2" />
                <span className="text-xs font-semibold text-gray-400">No transactions recorded yet</span>
              </div>
            ) : (
              <div className="flex flex-col gap-4 max-h-[280px] overflow-y-auto pr-1">
                {transactions.map((tx) => {
                  const isEarn = tx.type === 'earn';
                  const dateLabel = new Date(tx.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                  return (
                    <div key={tx.id} className="flex justify-between items-center border-b border-gray-50 pb-3 last:border-b-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          isEarn ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'
                        }`}>
                          {isEarn ? '+' : '-'}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-gray-800">
                            {isEarn ? 'Points Earned' : 'Points Spent'}
                          </span>
                          <span className="text-[10px] text-gray-400 font-semibold mt-0.5">{dateLabel}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className={`text-sm font-black ${
                          isEarn ? 'text-emerald-600' : 'text-orange-600'
                        }`}>
                          {isEarn ? '+' : '-'}{tx.points.toFixed(0)} PTS
                        </span>
                        {tx.orderId && (
                          <span className="text-[9px] font-bold text-gray-450 uppercase mt-0.5">Order #{tx.orderId.slice(-6)}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogoutClick}
            className="w-full border border-gray-200 hover:bg-gray-50 text-gray-500 py-3 rounded-full font-semibold text-sm transition-all active:scale-[0.99] flex items-center justify-center gap-2 mt-4 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Log out from account</span>
          </button>
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

function LoyaltyCard3D({ 
  tier, 
  name, 
  points, 
  qrCode,
  isHovered,
  setIsHovered
}: { 
  tier: string; 
  name: string; 
  points: number; 
  qrCode: string;
  isHovered: boolean;
  setIsHovered: (h: boolean) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);

  const getSideColor = (t: string) => {
    const low = t.toLowerCase();
    if (low === 'silver') return '#a9a9a9';
    if (low === 'gold') return '#b38728';
    if (low === 'vip') return '#2a203f';
    return '#9f4924'; // Bronze
  };

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 648;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      // Draw background metallic gradient
      const grad = ctx.createLinearGradient(0, 0, 1024, 648);
      const t = tier.toLowerCase();
      if (t === 'silver') {
        grad.addColorStop(0, '#d3d3d3');
        grad.addColorStop(0.3, '#ffffff');
        grad.addColorStop(0.6, '#a9a9a9');
        grad.addColorStop(1, '#909090');
      } else if (t === 'gold') {
        grad.addColorStop(0, '#c39c43');
        grad.addColorStop(0.3, '#fbf5b7');
        grad.addColorStop(0.6, '#b38728');
        grad.addColorStop(1, '#aa771c');
      } else if (t === 'vip') {
        grad.addColorStop(0, '#101018');
        grad.addColorStop(0.5, '#050508');
        grad.addColorStop(1, '#1a1a26');
      } else { // Bronze (brighter, premium rose-bronze)
        grad.addColorStop(0, '#e59f7c');
        grad.addColorStop(0.35, '#f7d0bd');
        grad.addColorStop(0.7, '#bc6c47');
        grad.addColorStop(1, '#9f4924');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1024, 648);

      // Brushed metal texture lines
      ctx.strokeStyle = t === 'vip' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 1024; i += 6) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + (Math.random() - 0.5) * 60, 648);
        ctx.stroke();
      }

      // Draw header info
      ctx.fillStyle = t === 'vip' ? '#f8fafc' : '#3c1c0a';
      ctx.font = 'bold 32px sans-serif';
      ctx.fillText('MEMBER CARD', 60, 90);

      ctx.font = 'extrabold 48px sans-serif';
      ctx.fillText('CORGI CAFE', 60, 160);

      ctx.font = 'bold 28px sans-serif';
      ctx.fillText(`LEVEL ${tier.toUpperCase()}`, 780, 90);

      // Cardholder
      ctx.font = 'bold 20px sans-serif';
      ctx.fillStyle = t === 'vip' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)';
      ctx.fillText('CARD HOLDER', 60, 510);
      ctx.font = 'bold 32px sans-serif';
      ctx.fillStyle = t === 'vip' ? '#ffffff' : '#3c1c0a';
      ctx.fillText(name.toUpperCase(), 60, 570);

      // Balance
      ctx.font = 'bold 20px sans-serif';
      ctx.fillStyle = t === 'vip' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)';
      ctx.fillText('BALANCE', 750, 510);
      ctx.font = 'black 42px sans-serif';
      ctx.fillStyle = t === 'vip' ? '#ffffff' : '#3c1c0a';
      ctx.fillText(`${points.toFixed(0)} PTS`, 750, 570);
    };

    render();

    const tex = new THREE.CanvasTexture(canvas);
    setTexture(tex);

    // Load QR Code onto the canvas texture dynamically
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrCode)}`;
    img.onload = () => {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(387, 199, 250, 250, 24);
      } else {
        ctx.rect(387, 199, 250, 250);
      }
      ctx.fill();
      ctx.drawImage(img, 412, 224, 200, 200);
      tex.needsUpdate = true;
    };
  }, [tier, name, points, qrCode]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();
    if (isHovered) {
      // Slower, heavier tracking with inertia
      meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, state.pointer.x * 0.25, 0.04);
      meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, -state.pointer.y * 0.2, 0.04);
      meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, 0, 0.04);
    } else {
      // Slower ambient floating loop
      meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, Math.sin(t * 0.7) * 0.1, 0.03);
      meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, Math.cos(t * 0.7) * 0.06, 0.03);
      meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, Math.sin(t * 1.0) * 0.03, 0.03);
    }
  });

  return (
    <mesh 
      ref={meshRef} 
      onPointerOver={() => setIsHovered(true)} 
      onPointerOut={() => setIsHovered(false)}
    >
      <boxGeometry args={[2.8, 1.77, 0.08]} />
      {texture ? (
        <>
          {/* Edge materials for realistic 3D thickness */}
          <meshPhysicalMaterial color={getSideColor(tier)} metalness={0.9} roughness={0.2} />
          <meshPhysicalMaterial color={getSideColor(tier)} metalness={0.9} roughness={0.2} />
          <meshPhysicalMaterial color={getSideColor(tier)} metalness={0.9} roughness={0.2} />
          <meshPhysicalMaterial color={getSideColor(tier)} metalness={0.9} roughness={0.2} />
          {/* Front */}
          <meshPhysicalMaterial 
            map={texture}
            metalness={tier.toLowerCase() === 'vip' ? 0.95 : 0.85}
            roughness={0.32}
            clearcoat={1.0}
            clearcoatRoughness={0.1}
          />
          {/* Back */}
          <meshPhysicalMaterial 
            map={texture}
            metalness={tier.toLowerCase() === 'vip' ? 0.95 : 0.85}
            roughness={0.32}
            clearcoat={1.0}
            clearcoatRoughness={0.1}
          />
        </>
      ) : (
        <meshStandardMaterial color={getSideColor(tier)} />
      )}
    </mesh>
  );
}

function Scene3D({ 
  tier, 
  name, 
  points, 
  qrCode 
}: { 
  tier: string; 
  name: string; 
  points: number; 
  qrCode: string;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="w-full h-[320px] flex items-center justify-center relative cursor-grab active:cursor-grabbing"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Canvas camera={{ position: [0, 0, 3.2], fov: 45 }}>
        {/* Soft, bright ambient and studio directional lights */}
        <ambientLight intensity={1.2} />
        <directionalLight position={[10, 10, 10]} intensity={1.5} />
        <directionalLight position={[-10, -10, 5]} intensity={0.4} color="#ffffff" />
        <LoyaltyCard3D 
          tier={tier}
          name={name}
          points={points}
          qrCode={qrCode}
          isHovered={isHovered}
          setIsHovered={setIsHovered}
        />
      </Canvas>
    </div>
  );
}
