'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  QrCode,
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
  ShoppingBag,
  ArrowLeft,
  Download
} from 'lucide-react';

export default function LoyaltyPage() {
  const router = useRouter();
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
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isAppleWalletOpen, setIsAppleWalletOpen] = useState(false);
  const [isAddingToWallet, setIsAddingToWallet] = useState(false);
  const [walletAdded, setWalletAdded] = useState(false);
  const [calcSpend, setCalcSpend] = useState(15);
  const [selectedSticker, setSelectedSticker] = useState<{
    id: number;
    name: string;
    desc: string;
    path: string;
    unlocked: boolean;
  } | null>(null);

  const handleDownloadPass = () => {
    setIsAddingToWallet(true);
    setTimeout(() => {
      setIsAddingToWallet(false);
      setWalletAdded(true);
      const dummyPassContent = "PKPASS DUMMY BINARY DATA FOR CORGI CAFE LOYALTY CARD";
      const blob = new Blob([dummyPassContent], { type: 'application/vnd.apple.pkpass' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'corgi_loyalty_card.pkpass';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 1500);
  };

  // Fetch loyalty status and transaction history
  const loadLoyaltyData = async () => {
    try {
      const loy = await getLoyalty();
      setLoyalty(loy);
      setEditName(loy.customer.name || profileName || '');
      setEditAllergy(loy.customer.allergyNotes || '');
    } catch (err) {
      console.warn('Backend loyalty API failed, using mock profile state:', err);
      // Fallback mock loyalty state
      const mockLoyalty: GuestLoyaltyResponse = {
        customer: {
          id: 'mock-cust-1',
          name: profileName || 'афіа',
          phone: '+34600111222',
          email: 'afia@corgicafe.com',
          allergyNotes: 'None',
          points: 120,
          ltv: 0,
          tier: 'Bronze',
          phoneVerified: true,
        },
        config: {
          bronzeRate: 0.05,
          silverRate: 0.07,
          goldRate: 0.10,
          vipRate: 0.12,
          silverThreshold: 5,
          goldThreshold: 20,
          vipThreshold: 100,
        },
        nextTier: 'Explorer',
        pointsToNextTier: 5,
        qrCode: 'MEMBER-MOCK-12345678',
      };
      setLoyalty(mockLoyalty);
      setEditName(mockLoyalty.customer.name);
      setEditAllergy(mockLoyalty.customer.allergyNotes || '');
    }

    try {
      const txs = await getLoyaltyTransactions();
      if (txs.length === 0) {
        throw new Error('Empty');
      }
      setTransactions(txs);
    } catch {
      setTransactions([
        {
          id: 'mock-1',
          type: 'earn',
          points: 120,
          createdAt: new Date(Date.now() - 1 * 3600000).toISOString(),
          orderId: 'order-c0f1ee01'
        },
        {
          id: 'mock-2',
          type: 'spend',
          points: 45,
          createdAt: new Date(Date.now() - 18 * 3600000).toISOString(),
          orderId: 'order-ba2ea451'
        },
        {
          id: 'mock-3',
          type: 'earn',
          points: 80,
          createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
          orderId: 'order-3a7b8c9d'
        }
      ]);
    }
  };

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setIsApplyingPromo(true);
    setPromoError(null);
    setPromoSuccess(false);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 850));
    const code = promoCode.trim().toUpperCase();

    if (code.length !== 8) {
      setPromoError('Code must consist of exactly 8 characters.');
      setIsApplyingPromo(false);
      return;
    }

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
        setPromoSuccess(true);
        setPromoCode('');
        setTimeout(() => {
          setIsAddPointsOpen(false);
          setPromoSuccess(false);
        }, 1500);
      }
    } else {
      setPromoError('Invalid promo code. Try "CORGI100" or "COFFEE50"!');
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
        localStorage.removeItem('corgi_logged_out');
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
      localStorage.removeItem('corgi_logged_out');
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
      if (typeof window !== 'undefined') {
        localStorage.setItem('corgi_logged_out', 'true');
        localStorage.removeItem('corgi_mock_user');
        localStorage.removeItem('corgi_guest_session_token');
      }
      await logoutGuest();
      await refreshAuth();
    }
  };



  const getPublicStickerUrl = (path: string) => {
    if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
      return window.location.origin + path;
    }
    return `https://raw.githubusercontent.com/dvytvytskyi/cafe_pos/main/apps/guest/public${path}`;
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

  // Helper to determine tier name based on LTV
  const getTierName = (ltv: number) => {
    if (ltv < 5) return 'Friend';
    if (ltv < 10) return 'Explorer';
    if (ltv < 20) return 'Member';
    if (ltv < 50) return 'Expert';
    if (ltv < 100) return 'VIP';
    return 'Legend';
  };

  // Helper to get tier points multiplier rate based on LTV
  const getTierRate = (ltv: number) => {
    if (ltv < 5) return 0.05;
    if (ltv < 10) return 0.07;
    if (ltv < 20) return 0.08;
    if (ltv < 50) return 0.10;
    if (ltv < 100) return 0.12;
    return 0.15; // Legend rate: 15%
  };

  // Helper to get segmented progress percentage for 6 stages
  const getProgressPercent = (ltv: number) => {
    const milestones = [0, 5, 10, 20, 50, 100, 200];
    for (let i = 0; i < milestones.length - 1; i++) {
      if (ltv >= milestones[i] && ltv <= milestones[i+1]) {
        const segmentBase = i * (100 / 6);
        const segmentProgress = ((ltv - milestones[i]) / (milestones[i+1] - milestones[i])) * (100 / 6);
        return segmentBase + segmentProgress;
      }
    }
    return 100;
  };
  if (isLoggedIn && loyalty) {
    const { customer, config, nextTier, pointsToNextTier, qrCode } = loyalty;
    const tierName = getTierName(customer.ltv);
    const tierRate = getTierRate(customer.ltv);
    const progressPercent = getProgressPercent(customer.ltv);

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
        <div className="bg-gradient-to-b from-[#FDBD38] to-[#FDB01A] text-gray-900 px-6 pt-6 pb-20 rounded-b-[36px] relative">
          <div className="max-w-[440px] mx-auto flex items-center justify-between">
            {/* Back Button (matching other pages) */}
            <button 
              onClick={() => router.push('/')}
              className="w-10 h-10 bg-white/95 rounded-full flex items-center justify-center shadow-sm shadow-black/5 hover:bg-white transition-all text-gray-900 active:scale-95 flex-shrink-0"
              title="Back to Home"
            >
              <ArrowLeft className="w-5 h-5 text-gray-900" strokeWidth={2.2} />
            </button>

            {/* Welcome Greeting (Clickable to open profile settings) */}
            <div 
              onClick={() => setIsProfileOpen(true)}
              className="flex flex-col text-center cursor-pointer hover:opacity-80 transition-opacity active:scale-[0.98] select-none mx-2 min-w-0 flex-1"
              title="Open Profile Settings"
            >
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">Loyalty Club</span>
              <h1 className="text-xl font-bold mt-0.5 tracking-tight leading-none truncate text-white">
                Hello, {profileName || customer.name}!
              </h1>
            </div>

            {/* Support / Help Icon (matching other pages) */}
            <button
              onClick={() => alert("Support: support@corgicafe.com")}
              className="w-10 h-10 bg-white/95 rounded-full flex items-center justify-center shadow-sm shadow-black/5 hover:bg-white transition-all text-gray-900 active:scale-95 flex-shrink-0"
              title="Support"
            >
              <AlertCircle className="w-5 h-5 text-gray-900" strokeWidth={2.2} />
            </button>
          </div>
        </div>

        {/* Flipping 3D QR Card */}
        <div className="px-6 -mt-10 relative z-10 max-w-[440px] mx-auto">
          <div 
            className="w-full h-[240px] relative cursor-pointer"
            style={{ perspective: '1000px' }}
          >
            <div 
              className={`w-full h-full relative transition-transform duration-700 [transform-style:preserve-3d] ${
                isCardFlipped ? '[transform:rotateY(180deg)]' : ''
              }`}
            >
              {/* Front Side: Profile Info Card */}
              <div 
                className="absolute inset-0 w-full h-full bg-white rounded-[24px] p-5 pt-[10px] shadow-none border border-gray-100 flex flex-col justify-between [backface-visibility:hidden] relative"
              >
                {/* Left Status Info (Absolute positioned) */}
                <div className="absolute top-7 left-5 text-left flex flex-col pointer-events-none">
                  <span className="text-sm font-bold text-gray-800 tracking-tight uppercase leading-none">{tierName}</span>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-1">Profile</span>
                </div>

                {/* Right Spent Info (Absolute positioned) */}
                <div className="absolute top-7 right-5 text-right flex flex-col pointer-events-none">
                  <span className="text-sm font-bold text-[#FDBD38] tracking-tight leading-none">{customer.ltv.toFixed(0)}€</span>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-1">Spent</span>
                </div>

                {/* Central Block: Photo, Name, and ID (One unit, shifted upwards) */}
                <div className="flex-1 flex flex-col items-center justify-start mt-1">
                  {/* Photo (w-24 h-24) */}
                  <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white shadow-md mb-1.5 flex-shrink-0">
                    <img 
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80" 
                      alt="Profile Avatar"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {/* Name */}
                  <h2 className="text-base font-bold text-gray-900 tracking-tight uppercase leading-tight mb-0.5">
                    {profileName || customer.name}
                  </h2>
                  {/* ID */}
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider leading-none">
                    Loyalty ID: #{customer.id.slice(-8).toUpperCase()}
                  </span>
                </div>

                {/* Footer Buttons: Add Points, History, and QR Code Toggle */}
                <div className="flex gap-2 relative z-10 w-full items-center">
                  <button
                    onClick={() => setIsAddPointsOpen(true)}
                    className="flex-1 bg-[#FDBD38] hover:bg-[#e5a420] text-white py-2.5 rounded-[12px] font-bold text-xs transition-all active:scale-[0.98] flex items-center justify-center gap-1 cursor-pointer border border-[#FDBD38] hover:border-[#e5a420]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Points</span>
                  </button>
                  <button
                    onClick={() => setIsHistoryOpen(true)}
                    className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 py-2.5 rounded-[12px] font-bold text-xs transition-all active:scale-[0.98] flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <History className="w-3.5 h-3.5 text-gray-500" />
                    <span>History</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsCardFlipped(true);
                      setIsAddPointsOpen(false);
                    }}
                    className="w-9 h-9 bg-[#FDBD38] hover:bg-[#e5a420] text-white rounded-[12px] flex items-center justify-center flex-shrink-0 border border-[#FDBD38] hover:border-[#e5a420] active:scale-[0.95] transition-all cursor-pointer"
                    title="Show QR Code"
                  >
                    <QrCode className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              {/* Back Side: QR Code Card */}
              <div 
                onClick={() => setIsCardFlipped(false)}
                className="absolute inset-0 w-full h-full bg-white rounded-[24px] p-5 shadow-none border border-gray-100 flex flex-col items-center justify-between [backface-visibility:hidden] [transform:rotateY(180deg)]"
              >
                <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Scannable Member Code</span>
                
                {/* QR Code */}
                <div className="my-1.5 bg-gray-50 p-2.5 rounded-[20px] shadow-inner">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrCode)}`}
                    alt="Member QR Code"
                    className="w-[110px] h-[110px] object-contain rounded-lg"
                  />
                </div>

                {/* Loyalty points details */}
                <div className="w-full flex justify-between items-center border-t border-gray-100 pt-2.5">
                  <div className="flex flex-col text-left">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Member Tier</span>
                    <span className="text-base font-bold text-gray-800 uppercase tracking-tight leading-none mt-1">{tierName}</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Balance</span>
                    <span className="text-lg font-extrabold text-gray-800 flex items-center justify-end leading-none mt-1">
                      {customer.points.toFixed(2)}€
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Apple Wallet Action Button */}
        <div className="max-w-[440px] mx-auto mt-4 px-6 select-none">
          <button
            onClick={() => {
              setIsAppleWalletOpen(true);
              setWalletAdded(false);
            }}
            className="w-full bg-black hover:bg-zinc-955 text-white rounded-[18px] py-3.5 px-4 flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] font-bold text-sm cursor-pointer border border-zinc-800 shadow-sm"
          >
            <svg className="w-5 h-5 text-white fill-current" viewBox="0 0 512 512">
              <path d="M433 162.24H79c-34.62 0-63 28.38-63 63v176.53c0 34.62 28.38 63 63 63h354c34.62 0 63-28.38 63-63V225.24c0-34.62-28.38-63-63-63zm-4.7 248.53H83.7a28.31 28.31 0 01-28.3-28.3V252.1a28.31 28.31 0 0128.3-28.3H428.3a28.31 28.31 0 0128.3 28.3v130.37a28.31 28.31 0 01-28.3 28.3zM418.57 60H93.43c-31 0-56.32 25.32-56.32 56.32v8.92c0 8.5 6.9 15.4 15.4 15.4h399c8.5 0 15.4-6.9 15.4-15.4v-8.92C474.89 85.32 449.57 60 418.57 60z"/>
            </svg>
            <span>Add to Apple Wallet</span>
          </button>
        </div>

        {/* Dashboard Content Container */}
        <div className="w-full bg-transparent mt-4 py-4 px-6">
          <div className="max-w-[440px] mx-auto flex flex-col gap-8">
            
            {/* Stepper Progress Timeline (6 stages) inside a flat white frame */}
            <div className="bg-white rounded-[24px] border border-gray-100 p-5 shadow-none flex flex-col text-left mb-2">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-sm font-bold text-gray-800">Tier Progress</span>
                <span className="text-xs font-bold text-[#FDBD38]">
                  {(tierRate * 100).toFixed(0)}% Cashback Rate
                </span>
              </div>

              {/* Progress Line and Nodes */}
              <div className="relative w-full py-4 mt-1">
                {/* Horizontal Background Line */}
                <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200/80 -translate-y-1/2 rounded-full" />
                
                {/* Active Colored Progress Line */}
                <div 
                  className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-[#FDBD38] to-[#FDB01A] -translate-y-1/2 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />

                {/* Stepper Nodes */}
                <div className="absolute inset-0 flex justify-between items-center">
                  {[5, 10, 20, 50, 100, 200].map((milestone, idx) => {
                    const isReached = customer.ltv >= milestone;
                    const isCurrent = customer.ltv < milestone && (idx === 0 || customer.ltv >= [5, 10, 20, 50, 100, 200][idx - 1]);
                    
                    return (
                      <div key={milestone} className="relative flex flex-col items-center">
                        {/* Node Circle */}
                        <div 
                          className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-500 z-10 flex items-center justify-center ${
                            isReached 
                              ? 'border-[#FDBD38] bg-[#FDBD38]' 
                              : isCurrent 
                                ? 'border-[#FDBD38] bg-white ring-4 ring-[#FDBD38]/20 scale-110' 
                                : 'border-gray-200 bg-white'
                          }`}
                        />
                        
                        {/* Node Label Below */}
                        <div className="absolute top-5 flex flex-col items-center whitespace-nowrap select-none">
                          <span className={`text-[9px] font-bold tracking-tight uppercase ${
                            isReached || isCurrent ? 'text-gray-855' : 'text-gray-400'
                          }`}>
                            {['Friend', 'Explorer', 'Member', 'Expert', 'VIP', 'Legend'][idx]}
                          </span>
                          <span className="text-[7.5px] font-bold text-gray-400/85 mt-0.5">
                            {milestone}€
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Extra spacing for absolute elements */}
              <div className="h-6" />

              {/* Range Details Label */}
              <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 mt-3 pt-1 border-t border-gray-100/50">
                <span>Spent: {customer.ltv.toFixed(2)}€</span>
                {customer.ltv < 200 ? (
                  <span>
                    {(() => {
                      const milestones = [5, 10, 20, 50, 100, 200];
                      const nextM = milestones.find(m => m > customer.ltv) || 200;
                      const nextLabel = ['Friend', 'Explorer', 'Member', 'Expert', 'VIP', 'Legend'][milestones.indexOf(nextM)];
                      return `${(nextM - customer.ltv).toFixed(2)}€ to ${nextLabel}`;
                    })()}
                  </span>
                ) : (
                  <span>Max Level Reached!</span>
                )}
              </div>

              {/* Divider between progress and stickers (matching container padding) */}
              <div className="border-t border-gray-100 my-6" />

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

            {/* Minimal Log Out Button at the bottom of the main screen */}
            <div className="flex justify-center mt-2 mb-4 select-none">
              <button
                onClick={handleLogoutClick}
                className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-[#EE635E] active:scale-95 transition-all cursor-pointer py-2 px-4 rounded-full hover:bg-rose-50/50"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
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
              <span className="font-bold text-sm text-gray-800 tracking-widest uppercase">My Profile</span>
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
              <div className="flex flex-col items-center text-center bg-gray-50/40 p-5 rounded-[24px] border border-gray-100">
                <div className="relative mb-3">
                  <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-md">
                    <img 
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80" 
                      alt="Profile Avatar"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="absolute -bottom-1 -right-1 bg-[#FDBD38] text-white text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border border-white shadow-sm">
                    {getTierName(customer.ltv)}
                  </span>
                </div>
                <h3 className="font-bold text-lg text-gray-800 uppercase tracking-tight">{profileName || customer.name}</h3>
                <span className="text-[10px] font-bold text-gray-400 mt-0.5">{customer.points.toFixed(2)}€ Balance</span>
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
              {/* Cashback Calculator Helper */}
              <div className="flex flex-col text-left mb-6">
                <span className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-4 block">Cashback Calculator</span>
                <div className="bg-amber-50/50 p-5 rounded-[24px] border border-amber-100/50 text-xs leading-relaxed text-[#c29124]">
                  <p className="font-semibold">Calculate how much cashback you will earn in Euros on your next purchase:</p>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="font-bold text-sm text-gray-800">Spent €</span>
                    <input 
                      type="number" 
                      value={calcSpend} 
                      onChange={(e) => setCalcSpend(Number(e.target.value) || 0)}
                      className="w-20 bg-white border border-gray-250 rounded-lg py-1 px-2 text-center font-bold text-gray-800 focus:outline-none focus:border-[#FDBD38]"
                    />
                    <span className="font-bold text-sm text-gray-800">➔</span>
                    <span className="font-bold text-sm text-[#c29124] flex items-center gap-0.5">
                      {(calcSpend * tierRate).toFixed(2)}€
                    </span>
                  </div>
                </div>
              </div>

              {/* Minimal Log Out Button at the bottom */}
              <div className="flex justify-center mt-2 mb-8 select-none">
                <button
                  onClick={handleLogoutClick}
                  className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-[#EE635E] active:scale-95 transition-all cursor-pointer py-2 px-4 rounded-full hover:bg-rose-50/50"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out</span>
                </button>
              </div>

            </div>
          </div>
        </div>

        {/* Beautiful Add Points Promo Code Modal */}
        {isAddPointsOpen && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[3px] p-4 animate-fadeIn"
            onClick={() => {
              setIsAddPointsOpen(false);
              setPromoError(null);
              setPromoSuccess(false);
              setPromoCode('');
            }}
          >
            <div 
              className="w-full max-w-[340px] bg-white rounded-[28px] p-6 shadow-2xl relative border border-gray-100 flex flex-col items-center animate-scaleUp"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button 
                onClick={() => {
                  setIsAddPointsOpen(false);
                  setPromoError(null);
                  setPromoSuccess(false);
                  setPromoCode('');
                }}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-all active:scale-90 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Title Header */}
              <div className="text-center mt-2 mb-4 w-full">
                <span className="text-base font-bold text-gray-800 uppercase tracking-wider block">Add Balance</span>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1 block">Enter Alphanumeric Code</span>
              </div>

              {/* Description */}
              <p className="text-[11px] text-gray-400 text-center font-bold mb-4 leading-relaxed px-1">
                Enter your 8-character promo code (letters and digits) to instantly claim your reward.
              </p>

              {/* Success / Error Inline Messages */}
              {promoSuccess && (
                <div className="w-full bg-emerald-50 text-emerald-600 rounded-[12px] p-3 text-[11px] font-bold mb-4 text-center border border-emerald-100 flex items-center justify-center gap-1.5 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>Success! Balance claimed successfully.</span>
                </div>
              )}
              {promoError && (
                <div className="w-full bg-rose-50 text-rose-600 rounded-[12px] p-3 text-[11px] font-bold mb-4 text-center border border-rose-100 flex items-center justify-center gap-1.5 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                  <span>{promoError}</span>
                </div>
              )}

              {/* Character Input (Divided into 8 visual slots) */}
              <div className="w-full flex flex-col gap-2">
                <div className="flex justify-between gap-1 w-full my-2 relative">
                  {/* Visual Slots */}
                  {Array.from({ length: 8 }).map((_, idx) => {
                    const char = promoCode[idx] || '';
                    const isFocused = idx === promoCode.length && !isApplyingPromo && !promoSuccess;
                    return (
                      <div 
                        key={idx}
                        className={`w-8 h-10 rounded-[10px] border-2 flex items-center justify-center text-sm font-bold text-gray-805 transition-all relative ${
                          char 
                            ? 'border-[#FDBD38] bg-amber-50/10' 
                            : isFocused 
                              ? 'border-[#FDBD38] ring-2 ring-[#FDBD38]/20 bg-white' 
                              : 'border-gray-100 bg-gray-50/30'
                        }`}
                      >
                        {char}
                        {/* Blinking cursor */}
                        {isFocused && (
                          <span className="w-[1.5px] h-4 bg-[#FDBD38] animate-pulse" />
                        )}
                      </div>
                    );
                  })}
                  {/* Hidden Overlay Input */}
                  <input 
                    type="text" 
                    maxLength={8}
                    value={promoCode}
                    onChange={(e) => {
                      setPromoError(null);
                      setPromoCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
                    }}
                    disabled={isApplyingPromo || promoSuccess}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-text select-text"
                    autoFocus
                  />
                </div>
                
                {/* Character length indicator */}
                <div className="flex justify-between items-center text-[9px] font-bold text-gray-400 px-1 mt-0.5">
                  <span>Try: CORGI100 / COFFEE50</span>
                  <span className={promoCode.length === 8 ? 'text-emerald-500' : ''}>
                    {promoCode.length}/8 chars
                  </span>
                </div>
              </div>

              {/* Submit Action Button */}
              <button 
                onClick={handleApplyPromo}
                disabled={isApplyingPromo || promoCode.length !== 8 || promoSuccess}
                className="w-full bg-[#FDBD38] hover:bg-[#e5a420] disabled:bg-gray-100 disabled:text-gray-300 text-white py-3 rounded-[16px] font-bold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer mt-5"
              >
                {isApplyingPromo ? (
                  <span>Claiming...</span>
                ) : (
                  <span>Claim Balance</span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Points History Drawer Sheet (80dvh slide-up from bottom) */}
        <div className={`fixed inset-0 z-50 flex justify-center items-end bg-black/40 transition-opacity duration-300 ${
          isHistoryOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}>
          <div className={`w-full max-w-[480px] h-[80dvh] bg-white rounded-t-[32px] overflow-hidden flex flex-col shadow-2xl relative transition-transform duration-300 ease-out transform ${
            isHistoryOpen ? 'translate-y-0' : 'translate-y-full'
          }`}>
            {/* Drawer Header */}
            <div className="px-6 pt-8 pb-4 border-b border-gray-100 flex items-start justify-between flex-shrink-0 bg-white">
              <div className="flex flex-col text-left">
                <span className="text-xl font-bold text-gray-900 uppercase tracking-tight">Balance History</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Your transaction logs</span>
              </div>
              <button 
                onClick={() => setIsHistoryOpen(false)}
                className="text-gray-800 hover:text-gray-900 transition-colors p-1 cursor-pointer active:scale-90"
                title="Close"
              >
                <X className="w-5 h-5" strokeWidth={2.2} />
              </button>
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
                            isEarn ? 'bg-amber-50 text-[#c29124]' : 'bg-gray-50 text-gray-700'
                          }`}>
                            {isEarn ? '+' : '-'}
                          </div>
                          <div className="flex flex-col text-left">
                            <span className="text-xs font-bold text-gray-800">
                              {isEarn ? 'Cashback Earned' : 'Balance Redeemed'}
                            </span>
                            <span className="text-[10px] text-gray-400 font-bold mt-0.5">{dateLabel}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className={`text-sm font-bold ${
                            isEarn ? 'text-[#c29124]' : 'text-gray-700'
                          }`}>
                            {isEarn ? '+' : '-'}{tx.points.toFixed(2)}€
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

              <h3 className="text-base font-bold text-gray-800 tracking-tight mb-1 uppercase">{selectedSticker.name}</h3>
              
              <div className="mb-4">
                {selectedSticker.unlocked ? (
                  <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-emerald-100">
                    Unlocked 🎉
                  </span>
                ) : (
                  <span className="bg-gray-100 text-gray-500 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-gray-200">
                    Locked 🔒
                  </span>
                )}
              </div>

              <p className="text-xs font-semibold text-gray-500 leading-relaxed max-w-[240px] mb-4">
                {selectedSticker.desc}
              </p>

              {/* Telegram and WhatsApp Add/Share Buttons for Unlocked Stickers */}
              {selectedSticker.unlocked && (
                <div className="flex flex-col gap-2.5 w-full mb-4">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Add to Chats</span>
                  <div className="flex gap-3 w-full">
                    {/* Add to Telegram Button (Opens actual Sticker Set dialog) */}
                    <button
                      onClick={() => {
                        window.open('https://t.me/addstickers/BestCorgi', '_blank');
                      }}
                      className="flex-1 bg-[#0088cc] hover:bg-[#0077b5] text-white py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer shadow-sm shadow-blue-500/10"
                      title="Add Corgi Sticker Set to Telegram keyboard"
                    >
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.11.02-1.93 1.23-5.46 3.62-.51.35-.98.53-1.39.51-.46-.01-1.35-.26-2.01-.48-.81-.27-1.46-.42-1.4-.88.03-.24.36-.49.99-.75 3.88-1.69 6.46-2.8 7.74-3.32 3.7-1.5 4.46-1.76 4.96-1.77.11 0 .36.03.52.16.13.1.17.24.19.34.02.11.02.26.01.37z"/>
                      </svg>
                      <span>Telegram</span>
                    </button>

                    {/* Add to WhatsApp Button (Explains instructions for adding downloaded sticker) */}
                    <button
                      onClick={() => {
                        alert("How to add to WhatsApp:\n\n1. Tap 'Download Sticker File' below to save the transparent PNG image.\n2. Send this image file to any WhatsApp chat.\n3. Tap on the sent image in WhatsApp and select 'Add to Favorites' to save it to your WhatsApp Sticker keyboard!");
                      }}
                      className="flex-1 bg-[#25D366] hover:bg-[#20ba5a] text-white py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer shadow-sm shadow-green-500/10"
                      title="Learn how to add sticker to WhatsApp keyboard"
                    >
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.454 5.709 1.455h.008c6.56 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413"/>
                      </svg>
                      <span>WhatsApp</span>
                    </button>
                  </div>
                  
                  {/* Download Sticker File (Full Width) */}
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = selectedSticker.path;
                      link.download = `${selectedSticker.name.toLowerCase().replace(/\s+/g, '_')}.png`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="w-full bg-[#FDBD38]/10 hover:bg-[#FDBD38]/15 text-[#b08115] py-3 rounded-[16px] font-bold text-xs flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer border-none shadow-none"
                    title="Download Sticker Image File"
                  >
                    <Download className="w-4 h-4 text-[#b08115]" />
                    <span>Download Sticker File</span>
                  </button>
                </div>
              )}

              <button
                onClick={() => setSelectedSticker(null)}
                className="w-full bg-[#FDBD38] hover:opacity-90 text-white py-3 rounded-full font-bold text-sm transition-all active:scale-[0.99] cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        )}

        {/* Apple Wallet Mockup Pass Modal */}
        {isAppleWalletOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 animate-fadeIn">
            <div className="w-full max-w-[340px] bg-[#1c1c1e] rounded-[28px] p-6 border border-zinc-800 flex flex-col items-center relative animate-scaleUp text-white shadow-2xl">
              
              {/* Close Button */}
              <button 
                onClick={() => {
                  setIsAppleWalletOpen(false);
                  setWalletAdded(false);
                }}
                className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 absolute top-4 right-4 transition-all active:scale-90 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Pass Header */}
              <div className="w-full flex items-center gap-2.5 mb-6 border-b border-zinc-800 pb-4 mt-2">
                <div className="w-7 h-7 bg-[#FDBD38] rounded-full flex items-center justify-center text-gray-950 font-bold text-xs">
                  C
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest leading-none">Corgi Cafe</span>
                  <span className="text-xs font-bold text-white mt-0.5">Loyalty Card</span>
                </div>
              </div>

              {/* Pass Body Fields */}
              <div className="w-full grid grid-cols-2 gap-y-4 gap-x-2 text-left mb-6">
                <div>
                  <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider block">Member</span>
                  <span className="text-sm font-bold text-white truncate block">{profileName || customer.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider block">Tier</span>
                  <span className="text-sm font-bold text-[#FDBD38] uppercase block">{tierName}</span>
                </div>
                <div>
                  <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider block">Balance</span>
                  <span className="text-base font-extrabold text-white block">{customer.points.toFixed(2)}€</span>
                </div>
                <div className="text-right">
                  <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider block">Loyalty ID</span>
                  <span className="text-xs font-mono text-zinc-400 block">{customer.id.toUpperCase()}</span>
                </div>
              </div>

              {/* Centered Pass QR Code */}
              <div className="bg-white p-4 rounded-[20px] mb-6 shadow-inner flex flex-col items-center">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCode)}`}
                  alt="Wallet Pass QR"
                  className="w-[120px] h-[120px] object-contain rounded-lg"
                />
                <span className="text-[8px] font-bold text-zinc-400 mt-2 tracking-widest uppercase">Scan at counter</span>
              </div>

              {/* Download / Action Button */}
              {walletAdded ? (
                <div className="w-full bg-emerald-500 text-white py-3.5 rounded-full font-bold text-sm flex items-center justify-center gap-2 animate-fadeIn border border-emerald-400">
                  <CheckCircle2 className="w-4.5 h-4.5 text-white" />
                  <span>Added to Apple Wallet</span>
                </div>
              ) : (
                <button
                  onClick={handleDownloadPass}
                  disabled={isAddingToWallet}
                  className="w-full bg-[#FDBD38] hover:bg-[#e5a420] text-gray-950 disabled:bg-zinc-800 disabled:text-zinc-500 py-3.5 rounded-full font-bold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isAddingToWallet ? (
                    <>
                      <div className="w-4 h-4 border-2 border-gray-950 border-t-transparent rounded-full animate-spin" />
                      <span>Adding to Wallet...</span>
                    </>
                  ) : (
                    <>
                      <span>Download Wallet Pass</span>
                    </>
                  )}
                </button>
              )}
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
            <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Complete Profile</h1>
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
          <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Loyalty Program</h1>
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
                  <span className="block font-bold text-sm text-amber-950 mt-0.5 select-all">{devCode}</span>
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

