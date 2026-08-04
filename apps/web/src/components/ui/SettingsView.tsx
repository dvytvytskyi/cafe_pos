 'use client';

import React, { useState, useRef, useEffect } from 'react';
import { User, Users, Settings, CheckSquare, Bell, Smartphone, Monitor, Mail, Shield, CreditCard, LayoutTemplate, Map, FileText, Component, ChevronDown, Check, Printer, QrCode, MoreHorizontal, Search, Plus, Edit2, Key, Trash2, X, ArrowLeft, Copy, Phone, Calendar, Briefcase, Clock, Lock, TrendingUp, Receipt, DollarSign, AlertTriangle, Star, Tag, Gift, Coins } from 'lucide-react';
import TablesView from './TablesView';
import ReputationView from './ReputationView';
import { getDiscountPresets, saveDiscountPresets, DiscountPreset } from '@/lib/discounts';
import { getPromotions, savePromotions, Promotion } from '@/lib/promotions';
import { getGiftCards, saveGiftCards, createGiftCard, GiftCard, getGiftCardsAsync, createGiftCardAsync } from '@/lib/giftcards';
import { getGuests, getLoyaltyConfig, saveLoyaltyConfig, LoyaltyConfig } from '@/lib/crm';

export default function SettingsView() {
  const [activeMenu, setActiveMenu] = useState('profile');
  const [isTablesDirty, setIsTablesDirty] = useState(false);
  const [pendingMenuId, setPendingMenuId] = useState<string | null>(null);
  const [tablesViewKey, setTablesViewKey] = useState(0);
  const [discountPresets, setDiscountPresets] = useState<DiscountPreset[]>([]);

  // Section 7.2 Marketing States
  const [discountsSubTab, setDiscountsSubTab] = useState<'presets' | 'promotions' | 'giftcards' | 'loyalty'>('presets');
  const [loyaltyConfig, setLoyaltyConfig] = useState<LoyaltyConfig>({
    bronzeRate: 0.05,
    silverRate: 0.08,
    goldRate: 0.10,
    vipRate: 0.15,
    silverThreshold: 75,
    goldThreshold: 150,
    vipThreshold: 300
  });
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
  const [guests, setGuests] = useState<any[]>([]);

  // Add Promo States
  const [isAddingPromo, setIsAddingPromo] = useState(false);
  const [promoName, setPromoName] = useState('');
  const [promoPercent, setPromoPercent] = useState(20);
  const [promoDays, setPromoDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [promoStartHour, setPromoStartHour] = useState(18);
  const [promoEndHour, setPromoEndHour] = useState(20);
  const [promoItems, setPromoItems] = useState('');

  // Issue Gift Card States
  const [isGeneratingGiftCard, setIsGeneratingGiftCard] = useState(false);
  const [giftCardBalance, setGiftCardBalance] = useState(50);
  const [giftCardGuestId, setGiftCardGuestId] = useState('');
  const [newlyCreatedGiftCard, setNewlyCreatedGiftCard] = useState<GiftCard | null>(null);

  // Printer & Device States
  const [printers, setPrinters] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [receiptConfig, setReceiptConfig] = useState<any>({
    header: 'Welcome to Corgi Cafe!',
    footer: 'Barcelona. Thank you for your visit!',
    ivaFood: 10,
    ivaAlcohol: 21,
    veriFactuActive: true,
    invoicePrefix: 'FAC-2026-'
  });
  const [giftCardSearchQuery, setGiftCardSearchQuery] = useState('');

  useEffect(() => {
    setDiscountPresets(getDiscountPresets());
    setPromotions(getPromotions());
    getGiftCardsAsync().then(setGiftCards).catch(console.error);
    setGuests(getGuests());
    setLoyaltyConfig(getLoyaltyConfig());

    const storedPrinters = localStorage.getItem('corgi_printers');
    if (storedPrinters) {
      setPrinters(JSON.parse(storedPrinters));
    } else {
      const defaultPrinters = [
        { id: 'pr-1', name: 'Bar Printer', ip: '192.168.1.151', type: 'bar', status: 'online' },
        { id: 'pr-2', name: 'Kitchen Printer', ip: '192.168.1.150', type: 'kitchen', status: 'online' },
        { id: 'pr-3', name: 'Cash Register Printer', ip: '192.168.1.152', type: 'receipt', status: 'online' }
      ];
      localStorage.setItem('corgi_printers', JSON.stringify(defaultPrinters));
      setPrinters(defaultPrinters);
    }

    const storedDevices = localStorage.getItem('corgi_devices');
    if (storedDevices) {
      setDevices(JSON.parse(storedDevices));
    } else {
      const defaultDevices = [
        { id: 'dev-1', name: 'POS Main Terminal', model: 'iPad Pro 12.9', location: 'Main Counter', status: 'active' },
        { id: 'dev-2', name: 'Waiter Tablet A', model: 'Samsung Galaxy Tab S8', location: 'Terrace', status: 'active' }
      ];
      localStorage.setItem('corgi_devices', JSON.stringify(defaultDevices));
      setDevices(defaultDevices);
    }

    const storedReceipt = localStorage.getItem('corgi_receipt_config');
    if (storedReceipt) {
      setReceiptConfig(JSON.parse(storedReceipt));
    }

    const savedMenu = localStorage.getItem('corgi_active_menu');
    if (savedMenu) {
      setActiveMenu(savedMenu);
    }
  }, []);

  const handleMenuChange = (id: string) => {
    if (activeMenu === 'tables' && isTablesDirty) {
      setPendingMenuId(id);
    } else {
      setActiveMenu(id);
      localStorage.setItem('corgi_active_menu', id);
    }
  };
  
  // Toggles state
  const [toggles, setToggles] = useState({
    mobilePush: true,
    desktopPush: true,
    email: false,
    twoFactor: true,
  });

  // Checkboxes state
  const [checkboxes, setCheckboxes] = useState({
    productivity: true,
    newEvent: true,
    newTeam: true,
  });

  const [phoneCountry, setPhoneCountry] = useState('+380');

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState(false);

  const [hasChanges, setHasChanges] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>("https://i.pravatar.cc/150?u=corgi");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [openActionMenuId, setOpenActionMenuId] = useState<number | null>(null);
  const [isInviteView, setIsInviteView] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null);
  const [memberViewTab, setMemberViewTab] = useState<'general' | 'permissions' | 'activity'>('general');
  const [inviteRole, setInviteRole] = useState('Manager');
  const [accessDuration, setAccessDuration] = useState('No limit');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteEmailError, setInviteEmailError] = useState('');
  
  const [resetModalMemberId, setResetModalMemberId] = useState<number | null>(null);
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  
  const [teamMembers, setTeamMembers] = useState([
    { id: 1, name: "Alexander Vytvytskyi", email: "alex@corgipos.com", role: "Super Admin", location: "All Locations", status: "Active", avatar: "https://i.pravatar.cc/150?u=corgi" },
    { id: 2, name: "Maria Garcia", email: "maria@corgipos.com", role: "Manager", location: "Downtown Cafe", status: "Active", avatar: "https://i.pravatar.cc/150?u=maria" },
    { id: 3, name: "John Smith", email: "john@corgipos.com", role: "Waiter", location: "Downtown Cafe", status: "Active", avatar: "https://i.pravatar.cc/150?u=john" },
    { id: 4, name: "Sarah Lee", email: "sarah@corgipos.com", role: "Cashier", location: "Uptown Branch", status: "Active", avatar: "https://i.pravatar.cc/150?u=sarah" },
  ]);

  // Permissions state
  const [isRoleSetupMode, setIsRoleSetupMode] = useState(false);
  const [hasRoleChanges, setHasRoleChanges] = useState(false);
  const [roleDefaults, setRoleDefaults] = useState<Record<string, string[]>>({
    "Take new orders": ['Waiter', 'Manager', 'Franchise', 'Admin', 'Super Admin'],
    "Accept payments": ['Manager', 'Franchise', 'Admin', 'Super Admin'],
    "Apply discounts": ['Manager', 'Franchise', 'Admin', 'Super Admin'],
    "Refunds & Voids": ['Manager', 'Franchise', 'Admin', 'Super Admin'],
    "View Kitchen Display": ['Kitchen', 'Manager', 'Franchise', 'Admin', 'Super Admin'],
    "Edit menu items": ['Manager', 'Franchise', 'Admin', 'Super Admin'],
    "Manage inventory": ['Kitchen', 'Manager', 'Franchise', 'Admin', 'Super Admin'],
    "View financial reports": ['Franchise', 'Admin', 'Super Admin'],
    "Manage team & roles": ['Franchise', 'Admin', 'Super Admin'],
    "Manage marketing & CRM": ['Marketing', 'Franchise', 'Admin', 'Super Admin'],
    "Global system settings": ['Super Admin'],
  });
  const [userPermissions, setUserPermissions] = useState<Record<string, boolean>>({});

  // Close action menu on click outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (openActionMenuId !== null) {
        setOpenActionMenuId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openActionMenuId]);

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      setHasChanges(false);
    }, 1500);
  };

  const handleSendInvitation = () => {
    if (!inviteEmail) {
      setInviteEmailError('Email is required');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(inviteEmail)) {
      setInviteEmailError('Please enter a valid email address');
      return;
    }

    const newMember = {
      id: Date.now(),
      name: "Pending Invitation",
      email: inviteEmail,
      role: inviteRole,
      location: "All Locations",
      status: "Pending",
      avatar: "https://i.pravatar.cc/150?u=" + inviteEmail
    };

    setTeamMembers([newMember, ...teamMembers]);
    setIsInviteView(false);
    setInviteEmail('');
    setInviteEmailError('');
  };

  const handleConfirmReset = () => {
    const link = `https://corgipos.com/reset/${Math.random().toString(36).substring(2, 10)}`;
    setResetLink(link);
    navigator.clipboard.writeText(link);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const renderPermissionsTable = () => (
    <div className="border border-gray-100 rounded-2xl bg-white overflow-hidden shadow-sm">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-50/50 border-b border-gray-100">
            <th className="px-6 py-4 text-[13px] font-bold text-gray-400 w-[22%]">Access Rights</th>
            {['Waiter', 'Kitchen', 'Manager', 'Franchise', 'Marketing', 'Admin', 'Super Admin'].map(role => {
              const isColActive = isRoleSetupMode || inviteRole === role;
              const highlightBg = isRoleSetupMode ? 'bg-purple-50/50' : 'bg-orange-50/50';
              const highlightColor = isRoleSetupMode ? 'bg-purple-600 border-purple-600' : 'bg-corgi border-corgi';
              const highlightText = isRoleSetupMode ? 'text-purple-600' : 'text-corgi';

              return (
                <th 
                  key={role}
                  onClick={() => !isRoleSetupMode && setInviteRole(role)}
                  className={`px-2 py-4 text-center transition-all duration-500 ease-out ${!isRoleSetupMode && 'cursor-pointer hover:bg-gray-50'} ${isColActive && !isRoleSetupMode ? highlightBg : ''}`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all duration-500 ${isColActive ? `${highlightColor} scale-125` : 'border-gray-300 scale-100'}`}>
                      {isColActive && <div className="w-1.5 h-1.5 bg-white rounded-full animate-in zoom-in spin-in-12 duration-300" />}
                    </div>
                    <span className={`text-[12px] font-bold transition-all duration-500 ${isColActive ? `${highlightText} scale-105` : 'text-gray-600'}`}>{role}</span>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 text-[14px]">
          {/* POS & Orders */}
          <tr className="bg-gray-50/30">
            <td colSpan={8} className="px-6 py-3 text-[12px] font-bold text-gray-500 uppercase tracking-wider">
              <div className="flex items-center gap-2"><LayoutTemplate size={14}/> POS & Orders</div>
            </td>
          </tr>
          {[
            "Take new orders",
            "Accept payments",
            "Apply discounts",
            "Refunds & Voids",
            "View Kitchen Display",
          ].map((permName, i) => (
            <tr key={i} className="hover:bg-gray-50/30 transition-colors group">
              <td className="px-6 py-4 font-medium text-gray-700">{permName}</td>
              {['Waiter', 'Kitchen', 'Manager', 'Franchise', 'Marketing', 'Admin', 'Super Admin'].map(role => {
                const isColActive = isRoleSetupMode || inviteRole === role;
                const isPermChecked = isRoleSetupMode ? (roleDefaults[permName] || []).includes(role) : (role === inviteRole ? userPermissions[permName] : (roleDefaults[permName] || []).includes(role));
                
                const highlightBgRow = isRoleSetupMode ? 'group-hover:bg-purple-50/20' : (inviteRole === role ? 'bg-orange-50/20' : '');
                const activeHighlight = isRoleSetupMode ? 'bg-purple-600' : 'bg-corgi';
                const checkedBg = isColActive ? activeHighlight : 'bg-gray-300';

                return (
                  <td key={role} className={`px-2 py-3 text-center transition-all duration-500 ease-out ${highlightBgRow}`}>
                    <button 
                      disabled={!isColActive}
                      onClick={() => {
                        if (isRoleSetupMode) {
                          setRoleDefaults(prev => {
                            const roles = prev[permName] || [];
                            return { ...prev, [permName]: roles.includes(role) ? roles.filter(r => r !== role) : [...roles, role] };
                          });
                          setHasRoleChanges(true);
                        } else if (role === inviteRole) {
                          setUserPermissions(prev => ({ ...prev, [permName]: !prev[permName] }));
                        }
                      }}
                      className={`mx-auto w-5 h-5 rounded flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isColActive ? 'cursor-pointer hover:scale-110 active:scale-95' : 'cursor-default'} ${isPermChecked ? `${checkedBg} text-white shadow-sm ${isColActive ? 'scale-110' : 'scale-90 opacity-60'}` : `border border-gray-200 bg-gray-50 ${isColActive ? 'hover:border-gray-300 scale-100' : 'scale-90 opacity-40'}`}`}
                    >
                      {isPermChecked && <Check size={12} strokeWidth={3} className="transition-all duration-300" />}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}

          {/* Management */}
          <tr className="bg-gray-50/30">
            <td colSpan={8} className="px-6 py-3 text-[12px] font-bold text-gray-500 uppercase tracking-wider">
              <div className="flex items-center gap-2"><Shield size={14}/> Management</div>
            </td>
          </tr>
          {[
            "Access settings",
            "Manage menu items",
            "View sales reports",
            "Export data",
            "Manage team & roles",
          ].map((permName, i) => (
            <tr key={i} className="hover:bg-gray-50/30 transition-colors group">
              <td className="px-6 py-4 font-medium text-gray-700">{permName}</td>
              {['Waiter', 'Kitchen', 'Manager', 'Franchise', 'Marketing', 'Admin', 'Super Admin'].map(role => {
                const isColActive = isRoleSetupMode || inviteRole === role;
                const isPermChecked = isRoleSetupMode ? (roleDefaults[permName] || []).includes(role) : (role === inviteRole ? userPermissions[permName] : (roleDefaults[permName] || []).includes(role));
                
                const highlightBgRow = isRoleSetupMode ? 'group-hover:bg-purple-50/20' : (inviteRole === role ? 'bg-orange-50/20' : '');
                const activeHighlight = isRoleSetupMode ? 'bg-purple-600' : 'bg-corgi';
                const checkedBg = isColActive ? activeHighlight : 'bg-gray-300';

                return (
                  <td key={role} className={`px-2 py-3 text-center transition-all duration-500 ease-out ${highlightBgRow}`}>
                    <button 
                      disabled={!isColActive}
                      onClick={() => {
                        if (isRoleSetupMode) {
                          setRoleDefaults(prev => {
                            const roles = prev[permName] || [];
                            return { ...prev, [permName]: roles.includes(role) ? roles.filter(r => r !== role) : [...roles, role] };
                          });
                          setHasRoleChanges(true);
                        } else if (role === inviteRole) {
                          setUserPermissions(prev => ({ ...prev, [permName]: !prev[permName] }));
                        }
                      }}
                      className={`mx-auto w-5 h-5 rounded flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isColActive ? 'cursor-pointer hover:scale-110 active:scale-95' : 'cursor-default'} ${isPermChecked ? `${checkedBg} text-white shadow-sm ${isColActive ? 'scale-110' : 'scale-90 opacity-60'}` : `border border-gray-200 bg-gray-50 ${isColActive ? 'hover:border-gray-300 scale-100' : 'scale-90 opacity-40'}`}`}
                    >
                      {isPermChecked && <Check size={12} strokeWidth={3} className="transition-all duration-300" />}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setHasChanges(true);
      const url = URL.createObjectURL(e.target.files[0]);
      setAvatarUrl(url);
    }
  };

  const handleRemoveAvatar = () => {
    if (avatarUrl) {
      setHasChanges(true);
      setAvatarUrl(null);
    }
  };

  const validateEmail = (val: string) => {
    if (!val) {
      setEmailError(false);
      return;
    }
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    setEmailError(!isValid);
  };

  const toggleSwitch = (key: keyof typeof toggles) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleCheck = (key: keyof typeof checkboxes) => {
    setCheckboxes(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const menuSections = [
    {
      title: 'ACCOUNT',
      items: [
        { id: 'profile', icon: User, label: 'My Profile' },
        { id: 'general', icon: Settings, label: 'General' },
      ]
    },
    {
      title: 'WORKSPACE / TEAM',
      items: [
        { id: 'team', icon: Users, label: 'Team & Roles' },
      ]
    },
    {
      title: 'CAFE / POS',
      items: [
        { id: 'tables', icon: Map, label: 'Tables & QR Codes' },
        { id: 'devices', icon: Printer, label: 'Devices & Printers' },
        { id: 'receipts', icon: FileText, label: 'Receipts & Taxes' },
        { id: 'discounts', icon: Tag, label: 'Discounts & Promos' },
      ]
    },
    {
      title: 'INTEGRATIONS',
      items: [
        { id: 'reputation', icon: Star, label: 'Reputation & Reviews' },
      ]
    }
  ];

  return (
    <div className="bg-white rounded-[32px] p-6 shadow-sm flex-1 flex overflow-hidden">
      
      {/* Left Column: Settings Menu */}
      <div className="w-64 shrink-0 flex flex-col gap-8 pr-6 border-r border-gray-100 overflow-y-auto">
        {menuSections.map((section, idx) => (
          <div key={idx} className="flex flex-col gap-2">
            <h3 className="text-[11px] font-bold text-gray-400 tracking-wider mb-2 ml-3">
              {section.title}
            </h3>
            <div className="flex flex-col gap-1">
              {section.items.map(item => {
                const Icon = item.icon;
                const isActive = activeMenu === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleMenuChange(item.id)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-[14px] font-medium cursor-pointer ${
                      isActive 
                        ? 'bg-gray-50 text-black' 
                        : 'text-gray-500 hover:bg-gray-50/50 hover:text-gray-800'
                    }`}
                  >
                    <Icon size={18} className={isActive ? 'text-black' : 'text-gray-400'} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Right Column: Content */}
      <div className="flex-1 overflow-y-auto px-10 pb-10">

        {/* --- PROFILE VIEW --- */}
        {activeMenu === 'profile' && (
          <div className="max-w-3xl flex flex-col gap-10 mt-2">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-8 pb-4 border-b border-gray-100">My Profile</h2>
              
              {/* Avatar Section */}
              <div className="flex items-center gap-6 mb-10 pb-8 border-b border-gray-100">
                <div className="relative group cursor-pointer" onClick={handleUploadClick}>
                  <div className="w-20 h-20 rounded-full bg-orange-100 border-4 border-white shadow-sm flex items-center justify-center overflow-hidden">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="User Avatar" className="w-full h-full object-cover group-hover:opacity-30 transition-opacity" />
                    ) : (
                      <User size={32} className="text-gray-400 group-hover:opacity-0 transition-opacity" />
                    )}
                  </div>
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-[11px] font-bold tracking-wider">CHANGE</span>
                  </div>
                  <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-lg font-bold text-gray-800">New User</h3>
                  <p className="text-[13px] font-medium text-gray-500">No role assigned • No location</p>
                  <div className="flex gap-3 mt-3">
                    <button 
                      onClick={handleUploadClick}
                      className="px-5 py-2 bg-corgi text-white text-[13px] font-semibold rounded-full hover:bg-orange-600 transition-colors shadow-sm cursor-pointer"
                    >
                      Upload New
                    </button>
                    <button 
                      onClick={handleRemoveAvatar}
                      className="px-5 py-2 bg-gray-100 text-gray-600 text-[13px] font-semibold rounded-full hover:bg-gray-200 transition-colors cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                <div className="flex flex-col gap-2">
                  <label className="text-[14px] font-medium text-gray-800">First Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. John" 
                    onChange={(e) => {
                      setHasChanges(true);
                      // Allow only English letters (A-Z, a-z), no spaces or special chars
                      e.target.value = e.target.value.replace(/[^A-Za-z]/g, '');
                    }}
                    className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 text-[14px] font-medium text-gray-800 outline-none focus:ring-4 focus:ring-corgi/10 focus:border-corgi transition-all" 
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[14px] font-medium text-gray-800">Last Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Doe" 
                    onChange={() => setHasChanges(true)}
                    className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 text-[14px] font-medium text-gray-800 outline-none focus:ring-4 focus:ring-corgi/10 focus:border-corgi transition-all" 
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[14px] font-medium text-gray-800">Email Address</label>
                  <div className="relative">
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => {
                        setHasChanges(true);
                        const val = e.target.value.replace(/\s/g, ''); // Prevent spaces completely
                        setEmail(val);
                        if (emailError) {
                          const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
                          setEmailError(!isValid);
                        }
                      }}
                      onBlur={(e) => validateEmail(e.target.value)}
                      placeholder="e.g. name@example.com" 
                      className={`w-full bg-gray-50 border rounded-2xl px-4 py-3.5 text-[14px] font-medium text-gray-800 outline-none focus:ring-4 transition-all ${
                        emailError 
                          ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20 text-red-900' 
                          : 'border-gray-100 focus:border-corgi focus:ring-corgi/10'
                      }`} 
                    />
                  </div>
                  {emailError && (
                    <span className="text-[12px] font-medium text-red-500 ml-1">Please enter a valid email address with an @ sign.</span>
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
                      placeholder={phoneCountry === '+380' || phoneCountry === '+34' ? "XX XXX XXXX" : "XXX XXX XXXX"}
                      onChange={(e) => {
                        setHasChanges(true);
                        let val = e.target.value.replace(/\D/g, '');
                        const maxDigits = phoneCountry === '+380' || phoneCountry === '+34' ? 9 : 10;
                        val = val.slice(0, maxDigits);
                        
                        if (val.length > 0) {
                          if (maxDigits === 9) {
                            const match = val.match(/^(\d{0,2})(\d{0,3})(\d{0,4})$/);
                            if (match) {
                              val = !match[2] ? match[1] : `${match[1]} ${match[2]}${match[3] ? ` ${match[3]}` : ''}`;
                            }
                          } else {
                            const match = val.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
                            if (match) {
                              val = !match[2] ? match[1] : `${match[1]} ${match[2]}${match[3] ? ` ${match[3]}` : ''}`;
                            }
                          }
                        }
                        e.target.value = val;
                      }}
                      className="bg-transparent flex-1 px-4 py-3.5 text-[14px] font-medium text-gray-800 outline-none" 
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2 col-span-2">
                  <label className="text-[14px] font-medium text-gray-800">Bio / Notes</label>
                  <textarea 
                    rows={3} 
                    placeholder="Add some notes about this user..." 
                    onChange={() => setHasChanges(true)}
                    className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 text-[14px] font-medium text-gray-800 outline-none focus:ring-4 focus:ring-corgi/10 focus:border-corgi transition-all resize-none leading-relaxed" 
                  />
                </div>
              </div>

              <div 
                className={`flex justify-end gap-3 overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${
                  hasChanges 
                    ? 'max-h-24 opacity-100 mt-8 pt-6 border-t border-gray-100 translate-y-0 pointer-events-auto' 
                    : 'max-h-0 opacity-0 mt-0 pt-0 border-transparent translate-y-4 pointer-events-none'
                }`}
              >
                <button 
                  onClick={() => setHasChanges(false)}
                  disabled={isSaved}
                  className="px-6 py-3 bg-white border border-gray-200 text-gray-600 text-[14px] font-bold rounded-full hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  disabled={isSaved}
                  className={`px-6 py-3 text-white text-[14px] font-bold rounded-full transition-all flex items-center justify-center gap-2 ${
                    isSaved 
                      ? 'bg-green-500 hover:bg-green-600 w-32 shadow-sm' 
                      : 'bg-black hover:bg-gray-800 shadow-md hover:shadow-lg w-[140px]'
                  } cursor-pointer disabled:cursor-default`}
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
            </div>
          </div>
        )}

        {/* --- GENERAL VIEW (Notifications & Appearance) --- */}
        {activeMenu === 'general' && (
          <div className="max-w-3xl flex flex-col gap-10 mt-2">
            
            {/* Section: My Notifications */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-8 pb-4 border-b border-gray-100">My Notifications</h2>
              
              <div className="flex flex-col gap-8">
                
                {/* Checkboxes Row */}
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-3">
                    <span className="text-[15px] font-medium text-gray-800">Notify me when...</span>
                    
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div 
                        onClick={() => toggleCheck('productivity')}
                        className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${checkboxes.productivity ? 'bg-corgi' : 'bg-gray-200 group-hover:bg-gray-300'}`}
                      >
                        {checkboxes.productivity && <CheckSquare size={14} className="text-white" strokeWidth={3} />}
                      </div>
                      <span className="text-[14px] text-gray-500 group-hover:text-gray-800 transition-colors">Daily productivity update</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div 
                        onClick={() => toggleCheck('newEvent')}
                        className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${checkboxes.newEvent ? 'bg-corgi' : 'bg-gray-200 group-hover:bg-gray-300'}`}
                      >
                        {checkboxes.newEvent && <CheckSquare size={14} className="text-white" strokeWidth={3} />}
                      </div>
                      <span className="text-[14px] text-gray-500 group-hover:text-gray-800 transition-colors">New event created</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div 
                        onClick={() => toggleCheck('newTeam')}
                        className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${checkboxes.newTeam ? 'bg-corgi' : 'bg-gray-200 group-hover:bg-gray-300'}`}
                      >
                        {checkboxes.newTeam && <CheckSquare size={14} className="text-white" strokeWidth={3} />}
                      </div>
                      <span className="text-[14px] text-gray-500 group-hover:text-gray-800 transition-colors">When added on new team</span>
                    </label>
                  </div>
                  
                  <button className="text-[13px] font-medium text-blue-600 hover:text-blue-800 transition-colors cursor-pointer pt-1">
                    About notifications?
                  </button>
                </div>

                {/* Toggle Rows */}
                <div className="flex justify-between items-center py-1">
                  <div className="flex flex-col gap-1">
                    <span className="text-[15px] font-medium text-gray-800">Mobile push notifications</span>
                    <span className="text-[13px] text-gray-400">Receive push notification whenever your organisation requires your attentions</span>
                  </div>
                  <button 
                    onClick={() => toggleSwitch('mobilePush')}
                    className={`w-11 h-6 rounded-full p-1 transition-colors cursor-pointer relative flex items-center ${toggles.mobilePush ? 'bg-corgi' : 'bg-gray-200'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${toggles.mobilePush ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className="flex justify-between items-center py-1">
                  <div className="flex flex-col gap-1">
                    <span className="text-[15px] font-medium text-gray-800">Desktop Notification</span>
                    <span className="text-[13px] text-gray-400">Receive desktop notification whenever your organisation requires your attentions</span>
                  </div>
                  <button 
                    onClick={() => toggleSwitch('desktopPush')}
                    className={`w-11 h-6 rounded-full p-1 transition-colors cursor-pointer relative flex items-center ${toggles.desktopPush ? 'bg-corgi' : 'bg-gray-200'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${toggles.desktopPush ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className="flex justify-between items-center py-1">
                  <div className="flex flex-col gap-1">
                    <span className="text-[15px] font-medium text-gray-800">Email Notification</span>
                    <span className="text-[13px] text-gray-400">Receive email whenever your organisation requires your attentions</span>
                  </div>
                  <button 
                    onClick={() => toggleSwitch('email')}
                    className={`w-11 h-6 rounded-full p-1 transition-colors cursor-pointer relative flex items-center ${toggles.email ? 'bg-corgi' : 'bg-gray-200'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${toggles.email ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

              </div>
            </div>

            {/* Section: My Settings */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-8 pb-4 border-b border-gray-100 mt-4">My Settings</h2>
              
              <div className="flex flex-col gap-8">
                
                <div className="flex justify-between items-center py-1">
                  <div className="flex flex-col gap-1">
                    <span className="text-[15px] font-medium text-gray-800">Appearance</span>
                    <span className="text-[13px] text-gray-400">Customize how Corgi POS looks on your device.</span>
                  </div>
                  <div className="relative shrink-0">
                    <select className="bg-gray-50 border border-gray-100 text-gray-600 text-[13px] font-medium rounded-lg pl-4 pr-9 py-2 cursor-pointer outline-none hover:bg-gray-100 transition-colors appearance-none w-full">
                      <option>Light</option>
                      <option>Dark</option>
                      <option>System</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div className="flex justify-between items-center py-1">
                  <div className="flex flex-col gap-1 pr-10">
                    <span className="text-[15px] font-medium text-gray-800">Two-factor authentication</span>
                    <span className="text-[13px] text-gray-400">Keep your account secure by enabling 2FA via SMS or using a temporary one-time passcode (TOTP).</span>
                  </div>
                  <button 
                    onClick={() => toggleSwitch('twoFactor')}
                    className={`w-11 h-6 rounded-full p-1 transition-colors cursor-pointer relative flex items-center shrink-0 ${toggles.twoFactor ? 'bg-corgi' : 'bg-gray-200'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${toggles.twoFactor ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className="flex justify-between items-center py-1">
                  <div className="flex flex-col gap-1">
                    <span className="text-[15px] font-medium text-gray-800">Language</span>
                    <span className="text-[13px] text-gray-400">Customize how Corgi POS looks on your device.</span>
                  </div>
                  <div className="relative shrink-0">
                    <select className="bg-gray-50 border border-gray-100 text-gray-600 text-[13px] font-medium rounded-lg pl-4 pr-9 py-2 cursor-pointer outline-none hover:bg-gray-100 transition-colors appearance-none w-full">
                      <option>English</option>
                      <option>Ukrainian</option>
                      <option>Spanish</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* --- TEAM & ROLES VIEW --- */}
        {activeMenu === 'team' && (
          <div className="w-full max-w-full flex flex-col gap-8 mt-2 animate-in fade-in slide-in-from-right-4 duration-500">
            {!isInviteView && !editingMemberId ? (
              <>
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                  <h2 className="text-xl font-bold text-gray-900">Team & Roles</h2>
                  <button 
                    onClick={() => setIsInviteView(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-black text-white text-[13px] font-bold rounded-full hover:bg-gray-800 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                  >
                    <Plus size={16} />
                    Invite Member
                  </button>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input 
                      type="text" 
                      placeholder="Search by name or email..." 
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-11 pr-4 py-3 text-[14px] font-medium text-gray-800 outline-none hover:border-gray-200 hover:bg-white focus:ring-4 focus:ring-corgi/10 focus:border-corgi transition-all cursor-text"
                    />
                  </div>
                  <div className="relative shrink-0 group">
                    <select className="bg-gray-50 border border-gray-100 text-gray-600 text-[14px] font-medium rounded-xl pl-4 pr-10 py-3 cursor-pointer outline-none hover:border-gray-200 hover:bg-white focus:ring-4 focus:ring-corgi/10 focus:border-corgi transition-all appearance-none">
                      <option>All Roles</option>
                      <option>Admin</option>
                      <option>Manager</option>
                      <option>Waiter</option>
                      <option>Cashier</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none transition-transform group-hover:text-gray-600" />
                  </div>
                </div>

                <div className="border border-gray-100 rounded-2xl bg-white relative">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50 border-b border-gray-100">
                        <th className="px-6 py-4 text-[12px] font-bold text-gray-400 tracking-wider uppercase">Member</th>
                        <th className="px-6 py-4 text-[12px] font-bold text-gray-400 tracking-wider uppercase">Role</th>
                        <th className="px-6 py-4 text-[12px] font-bold text-gray-400 tracking-wider uppercase">Status</th>
                        <th className="px-6 py-4 text-[12px] font-bold text-gray-400 tracking-wider uppercase">Location</th>
                        <th className="px-6 py-4 text-[12px] font-bold text-gray-400 tracking-wider uppercase text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {teamMembers.map((member) => (
                        <tr 
                          key={member.id} 
                          onClick={() => {
                            setEditingMemberId(member.id);
                            setInviteRole(member.role);
                            setMemberViewTab('general');
                          }}
                          className="hover:bg-gray-50/70 transition-all duration-200 group cursor-pointer"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <img src={member.avatar} alt={member.name} className="w-10 h-10 rounded-full border border-gray-100 object-cover" />
                              <div className="flex flex-col">
                                <span className={`text-[14px] font-bold ${member.status === 'Pending' ? 'text-gray-500 italic' : 'text-gray-900'}`}>{member.name}</span>
                                <span className="text-[13px] text-gray-500">{member.email}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[12px] font-bold ${
                              member.role === 'Super Admin' ? 'bg-purple-100 text-purple-700' :
                              member.role === 'Manager' ? 'bg-blue-100 text-blue-700' :
                              member.role === 'Waiter' ? 'bg-orange-100 text-orange-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {member.role}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[12px] font-bold ${
                              member.status === 'Active' ? 'bg-green-50 text-green-700 border border-green-200/50' :
                              member.status === 'Pending' ? 'bg-orange-50 text-corgi border border-orange-200/50 border-dashed' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {member.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-[14px] text-gray-600 font-medium">
                            {member.location}
                          </td>
                          <td className="px-6 py-4 text-right relative">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenActionMenuId(openActionMenuId === member.id ? null : member.id);
                              }}
                              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ml-auto active:scale-95 ${
                                openActionMenuId === member.id 
                                  ? 'bg-white border-gray-200 shadow-sm text-gray-800 opacity-100 border' 
                                  : 'text-gray-400 hover:text-gray-800 hover:bg-white border border-transparent hover:border-gray-200 hover:shadow-sm opacity-0 group-hover:opacity-100'
                              }`}
                            >
                              <MoreHorizontal size={16} />
                            </button>

                            {/* Dropdown Menu */}
                            {openActionMenuId === member.id && (
                              <div 
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-12 top-10 w-48 bg-white border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-200 text-left"
                              >
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingMemberId(member.id);
                                    setInviteRole(member.role);
                                    setMemberViewTab('general');
                                    setOpenActionMenuId(null);
                                  }}
                                  className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-xl transition-colors cursor-pointer"
                                >
                                  <Edit2 size={14} className="text-gray-400" />
                                  Edit Member
                                </button>
                                <button 
                                  onClick={() => {
                                    setResetModalMemberId(member.id);
                                    setResetLink(null);
                                    setOpenActionMenuId(null);
                                  }}
                                  className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-xl transition-colors cursor-pointer"
                                >
                                  <Key size={14} className="text-gray-400" />
                                  Reset Password
                                </button>
                                <div className="h-px bg-gray-100 my-1 mx-2"></div>
                                <button className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer">
                                  <Trash2 size={14} className="text-red-400" />
                                  Deactivate User
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : isInviteView ? (
              <div className="flex flex-col gap-8 w-full animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setIsInviteView(false)}
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
                      onClick={() => {
                        setIsRoleSetupMode(!isRoleSetupMode);
                        if (isRoleSetupMode) setHasRoleChanges(false);
                      }}
                      className={`flex items-center gap-2 px-4 py-2 text-[13px] font-bold rounded-xl transition-all cursor-pointer ${
                        isRoleSetupMode 
                          ? 'bg-purple-100 text-purple-700 hover:bg-purple-200 shadow-sm' 
                          : 'bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Settings size={16} />
                      {isRoleSetupMode ? (hasRoleChanges ? 'Save & Exit Setup Mode' : 'Exit Setup Mode') : 'Setup Default Roles'}
                    </button>

                    {!isRoleSetupMode && (
                      <>
                        <button 
                          onClick={() => setIsInviteView(false)}
                          className="px-4 py-2 text-[13px] font-bold text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={handleSendInvitation}
                          className={`px-5 py-2 text-[13px] font-bold rounded-xl transition-colors duration-500 ease-in-out shadow-sm hover:shadow-md cursor-pointer flex items-center gap-2 ${
                            inviteEmail && !inviteEmailError && inviteRole
                              ? 'bg-[#FFB800] text-black hover:bg-[#E5A600]'
                              : 'bg-black text-white hover:bg-gray-800'
                          }`}
                        >
                          <Mail size={16} />
                          Send Invitation
                        </button>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col gap-8 w-full">
                  {!isRoleSetupMode && (
                    <div className="flex items-end gap-6 max-w-4xl">
                      <div className="flex flex-col gap-2 flex-1 relative">
                        <label className="text-[13px] font-bold text-gray-700">Email Address</label>
                        <input 
                          type="email" 
                          value={inviteEmail}
                          onChange={(e) => {
                            setInviteEmail(e.target.value);
                            if (e.target.value && !e.target.value.includes('@')) {
                              setInviteEmailError('Please enter a valid email address with an @ sign.');
                            } else {
                              setInviteEmailError('');
                            }
                          }}
                          placeholder="e.g., alex@corgipos.com" 
                          className={`w-full border rounded-xl px-4 py-3 text-[14px] font-medium outline-none transition-all ${
                            inviteEmailError 
                              ? 'border-red-500 bg-red-50/30 text-red-900 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' 
                              : 'bg-gray-50 border-gray-100 hover:border-gray-200 hover:bg-white focus:bg-white focus:border-corgi focus:ring-4 focus:ring-corgi/10 text-gray-800'
                          }`}
                        />
                        {inviteEmailError && (
                          <span className="text-[13px] text-red-500 absolute -bottom-6 left-1">
                            {inviteEmailError}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 flex-[0.7]">
                        <label className="text-[13px] font-bold text-gray-700">Select Role</label>
                        <div className="relative group">
                          <select 
                            value={inviteRole}
                            onChange={(e) => setInviteRole(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-4 pr-10 py-3 text-[14px] font-medium text-gray-800 outline-none hover:border-gray-200 hover:bg-white focus:ring-4 focus:ring-corgi/10 focus:border-corgi transition-all appearance-none cursor-pointer"
                          >
                            {['Waiter', 'Kitchen', 'Manager', 'Franchise', 'Marketing', 'Admin', 'Super Admin'].map(role => (
                              <option key={role} value={role}>{role}</option>
                            ))}
                          </select>
                          <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none transition-transform group-hover:text-gray-600" />
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 flex-[0.7]">
                        <label className="text-[13px] font-bold text-gray-700">Access Duration</label>
                        <div className="relative group">
                          <select 
                            value={accessDuration}
                            onChange={(e) => setAccessDuration(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-4 pr-10 py-3 text-[14px] font-medium text-gray-800 outline-none hover:border-gray-200 hover:bg-white focus:ring-4 focus:ring-corgi/10 focus:border-corgi transition-all appearance-none cursor-pointer"
                          >
                            <option value="1 Day">1 Day</option>
                            <option value="7 Days">7 Days</option>
                            <option value="30 Days">30 Days</option>
                            <option value="1 Year">1 Year</option>
                            <option value="No limit">No Limit</option>
                          </select>
                          <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none transition-transform group-hover:text-gray-600" />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-3">
                    <label className="text-[13px] font-bold text-gray-700">
                      {isRoleSetupMode ? 'Configure Permissions for All Roles' : 'Assign Role & Permissions'}
                      {isRoleSetupMode && <span className="ml-2 text-purple-600 font-medium text-[12px] bg-purple-50 px-2 py-0.5 rounded-md">Setup Mode Active</span>}
                    </label>
                    
                    {renderPermissionsTable()}
                  </div>
                </div>
              </div>
            ) : editingMemberId ? (() => {
              const member = teamMembers.find(m => m.id === editingMemberId);
              if (!member) return null;
              
              return (
                <div className="flex flex-col gap-6 w-full animate-in fade-in slide-in-from-right-4 duration-500">
                  {/* Employee Header */}
                  <div className="flex items-center gap-4 pb-6 border-b border-gray-100">
                    <button 
                      onClick={() => setEditingMemberId(null)}
                      className="w-10 h-10 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-800 hover:bg-gray-100 transition-colors cursor-pointer shrink-0"
                    >
                      <ArrowLeft size={20} />
                    </button>
                    
                    <img src={member.avatar} alt={member.name} className="w-16 h-16 rounded-full border-2 border-white shadow-sm object-cover" />
                    
                    <div className="flex flex-col flex-1">
                      <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold text-gray-900">{member.name}</h2>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[12px] font-bold ${
                          member.status === 'Active' ? 'bg-green-50 text-green-700 border border-green-200/50' :
                          'bg-orange-50 text-corgi border border-orange-200/50 border-dashed'
                        }`}>
                          {member.status}
                        </span>
                      </div>
                      <p className="text-[14px] text-gray-500">{member.role} • {member.location}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => {
                          setResetModalMemberId(member.id);
                          setResetLink(null);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 text-gray-700 text-[13px] font-bold rounded-xl hover:bg-gray-100 transition-all cursor-pointer shadow-sm"
                      >
                        <Key size={16} />
                        Reset Password
                      </button>
                      <button className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 text-[13px] font-bold rounded-xl hover:bg-red-100 transition-all cursor-pointer shadow-sm">
                        <Trash2 size={16} />
                        Deactivate
                      </button>
                    </div>
                  </div>

                  {/* Tabs Navigation */}
                  <div className="flex gap-8 border-b border-gray-100 px-2">
                    {['general', 'permissions', 'activity'].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setMemberViewTab(tab as any)}
                        className={`pb-4 text-[14px] font-bold transition-all relative cursor-pointer ${memberViewTab === tab ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
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
                  
                  {/* Content Placeholder */}
                  <div className="py-4">
                    {memberViewTab === 'general' && (
                      <div className="flex flex-col gap-8 animate-in fade-in duration-300 pt-2">
                        <div className="grid grid-cols-2 gap-x-8 gap-y-6 max-w-4xl">
                          {/* Contact Info */}
                          <div className="flex flex-col gap-2">
                            <label className="text-[13px] font-bold text-gray-700">Email Address</label>
                            <input type="email" defaultValue={member.email} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-[14px] font-medium text-gray-800 outline-none hover:bg-white hover:border-gray-200 focus:bg-white focus:ring-4 focus:ring-corgi/10 focus:border-corgi transition-all" />
                          </div>
                          <div className="flex flex-col gap-2">
                            <label className="text-[13px] font-bold text-gray-700">Phone Number</label>
                            <input type="tel" defaultValue="+380 99 123 4567" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-[14px] font-medium text-gray-800 outline-none hover:bg-white hover:border-gray-200 focus:bg-white focus:ring-4 focus:ring-corgi/10 focus:border-corgi transition-all" />
                          </div>

                          {/* Work Details */}
                          <div className="flex flex-col gap-2">
                            <label className="text-[13px] font-bold text-gray-700">Primary Location</label>
                            <div className="relative group">
                              <select defaultValue={member.location} className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-4 pr-10 py-3 text-[14px] font-medium text-gray-800 outline-none hover:border-gray-200 hover:bg-white focus:ring-4 focus:ring-corgi/10 focus:border-corgi transition-all appearance-none cursor-pointer">
                                <option value="All Locations">All Locations</option>
                                <option value="Downtown Cafe">Downtown Cafe</option>
                                <option value="Uptown Branch">Uptown Branch</option>
                              </select>
                              <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none transition-transform group-hover:text-gray-600" />
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <label className="text-[13px] font-bold text-gray-700">Assigned Role</label>
                            <div className="relative group">
                              <select 
                                value={inviteRole}
                                onChange={(e) => setInviteRole(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-4 pr-10 py-3 text-[14px] font-medium text-gray-800 outline-none hover:border-gray-200 hover:bg-white focus:ring-4 focus:ring-corgi/10 focus:border-corgi transition-all appearance-none cursor-pointer"
                              >
                                {['Waiter', 'Kitchen', 'Manager', 'Franchise', 'Marketing', 'Admin', 'Super Admin'].map(role => (
                                  <option key={role} value={role}>{role}</option>
                                ))}
                              </select>
                              <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none transition-transform group-hover:text-gray-600" />
                            </div>
                          </div>

                          {/* POS PIN */}
                          <div className="flex flex-col gap-2">
                            <label className="text-[13px] font-bold text-gray-700">POS Login PIN (4 Digits)</label>
                            <div className="relative group">
                              <input type="password" defaultValue="1234" maxLength={4} className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-4 pr-10 py-3 text-[14px] font-bold tracking-[0.5em] text-gray-800 outline-none hover:bg-white hover:border-gray-200 focus:bg-white focus:ring-4 focus:ring-corgi/10 focus:border-corgi transition-all" />
                              <button className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer">
                                <Edit2 size={14} />
                              </button>
                            </div>
                            <span className="text-[12px] text-gray-500">Used for fast access on iPad / Mobile POS apps.</span>
                          </div>
                        </div>
                        
                        <div className="flex justify-end pt-4 border-t border-gray-100 max-w-4xl">
                          <button className="px-6 py-2.5 bg-black text-white text-[14px] font-bold rounded-xl hover:bg-gray-800 shadow-sm transition-all cursor-pointer">
                            Save Changes
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {memberViewTab === 'permissions' && (
                      <div className="flex flex-col gap-6 animate-in fade-in duration-300 pt-2">
                        <div className="flex flex-col gap-1 mb-2">
                          <h3 className="text-[15px] font-bold text-gray-900">Custom Permissions Override</h3>
                          <p className="text-[13px] text-gray-500">You can override specific permissions just for this user without affecting the base role.</p>
                        </div>
                        {renderPermissionsTable()}
                        <div className="flex justify-end pt-4 border-t border-gray-100">
                          <button className="px-6 py-2.5 bg-black text-white text-[14px] font-bold rounded-xl hover:bg-gray-800 shadow-sm transition-all cursor-pointer">
                            Update Permissions
                          </button>
                        </div>
                      </div>
                    )}

                    {memberViewTab === 'activity' && (
                      <div className="flex flex-col gap-8 animate-in fade-in duration-300 pt-2">
                        {/* Mini Dashboard */}
                        <div className="grid grid-cols-3 gap-4">
                          <div className="p-5 rounded-2xl border border-gray-100 bg-white shadow-sm flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-gray-500 mb-2">
                              <Receipt size={16} />
                              <span className="text-[13px] font-bold">Total Orders</span>
                            </div>
                            <span className="text-2xl font-bold text-gray-900">124</span>
                            <span className="text-[12px] text-green-600 font-medium flex items-center gap-1"><TrendingUp size={12}/> +12% this month</span>
                          </div>
                          
                          <div className="p-5 rounded-2xl border border-gray-100 bg-white shadow-sm flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-gray-500 mb-2">
                              <DollarSign size={16} />
                              <span className="text-[13px] font-bold">Revenue Generated</span>
                            </div>
                            <span className="text-2xl font-bold text-gray-900">$4,520</span>
                            <span className="text-[12px] text-green-600 font-medium flex items-center gap-1"><TrendingUp size={12}/> +5% this month</span>
                          </div>

                          <div className="p-5 rounded-2xl border border-gray-100 bg-white shadow-sm flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-gray-500 mb-2">
                              <Clock size={16} />
                              <span className="text-[13px] font-bold">Avg. Shift Duration</span>
                            </div>
                            <span className="text-2xl font-bold text-gray-900">7.5h</span>
                            <span className="text-[12px] text-gray-400 font-medium">Over the last 30 days</span>
                          </div>
                        </div>

                        {/* Activity Log */}
                        <div className="flex flex-col border border-gray-100 rounded-2xl bg-white shadow-sm overflow-hidden">
                          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="text-[14px] font-bold text-gray-900">Recent Activity</h3>
                          </div>
                          <div className="divide-y divide-gray-50">
                            <div className="px-5 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                              <div className="flex items-center gap-4">
                                <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-corgi">
                                  <Clock size={14} />
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[14px] font-bold text-gray-900">Closed Shift</span>
                                  <span className="text-[13px] text-gray-500">Terminal 2 • Downtown Cafe</span>
                                </div>
                              </div>
                              <span className="text-[13px] font-medium text-gray-400">Today, 5:00 PM</span>
                            </div>
                            
                            <div className="px-5 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                              <div className="flex items-center gap-4">
                                <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                                  <ArrowLeft size={14} />
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[14px] font-bold text-gray-900">Refunded Order #1042</span>
                                  <span className="text-[13px] text-gray-500">Amount: $12.50 • Reason: Customer Complaint</span>
                                </div>
                              </div>
                              <span className="text-[13px] font-medium text-gray-400">Today, 2:15 PM</span>
                            </div>

                            <div className="px-5 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                              <div className="flex items-center gap-4">
                                <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                                  <LayoutTemplate size={14} />
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[14px] font-bold text-gray-900">Opened Shift</span>
                                  <span className="text-[13px] text-gray-500">Terminal 2 • Downtown Cafe</span>
                                </div>
                              </div>
                              <span className="text-[13px] font-medium text-gray-400">Today, 9:00 AM</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })() : null}
          </div>
        )}
        
        {activeMenu === 'tables' && (
          <TablesView 
            key={tablesViewKey} 
            onDirtyChange={(dirty) => setIsTablesDirty(dirty)} 
          />
        )}

        {activeMenu === 'reputation' && (
          <ReputationView />
        )}

        {/* Placeholder for other views */}
        {!['profile', 'general', 'team', 'tables', 'reputation', 'discounts', 'devices', 'receipts'].includes(activeMenu) && (
          <div className="max-w-3xl flex flex-col items-center justify-center gap-4 mt-20 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center">
              <Settings size={32} className="text-gray-300" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Coming Soon</h2>
            <p className="text-[14px] text-gray-500 max-w-sm">This section of the settings is still under development for the Corgi POS platform.</p>
          </div>
        )}

        {/* DEVICES VIEW */}
        {activeMenu === 'devices' && (
          <div className="max-w-4xl flex flex-col gap-8 mt-2">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Devices & Printers</h2>
              <p className="text-xs text-gray-400 font-semibold mt-1">Manage physical hardware connections, touch terminals, and receipt routing printers.</p>
            </div>

            {/* Printers Section */}
            <div className="border border-gray-100 rounded-3xl p-6 bg-white shadow-sm space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Network IP Printers</h3>
                  <p className="text-[11px] text-gray-400 font-semibold">Configured printers for kitchen, bar, and receipt print jobs.</p>
                </div>
                <button 
                  onClick={() => {
                    const name = prompt('Enter Printer Name:');
                    if (!name) return;
                    const ip = prompt('Enter IP Address (e.g. 192.168.1.160):', '192.168.1.');
                    if (!ip) return;
                    const type = prompt('Enter Type (kitchen, bar, receipt):', 'kitchen') || 'kitchen';
                    
                    const newPrinters = [...printers, { id: 'pr-' + Date.now(), name, ip, type, status: 'online' }];
                    setPrinters(newPrinters);
                    localStorage.setItem('corgi_printers', JSON.stringify(newPrinters));
                  }}
                  className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={14} /> Add Printer
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {printers.map(printer => (
                  <div key={printer.id} className="border border-gray-100 rounded-2xl p-4 bg-gray-50/30 flex flex-col justify-between min-h-[140px] relative overflow-hidden">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          printer.type === 'kitchen' ? 'bg-orange-50 text-orange-700' :
                          printer.type === 'bar' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {printer.type}
                        </span>
                        <span className="w-2 h-2 rounded-full bg-green-500" title="Online"></span>
                      </div>
                      <h4 className="font-bold text-gray-900 text-sm truncate">{printer.name}</h4>
                      <p className="text-[11px] text-gray-400 font-mono mt-1">{printer.ip}</p>
                    </div>

                    <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100/60">
                      <button 
                        onClick={async () => {
                          try {
                            const res = await fetch('/api/printers/test', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ ip: printer.ip })
                            });
                            const data = await res.json();
                            if (res.ok) {
                              alert(`Test print job successfully sent to ${printer.name} at ${printer.ip}!`);
                            } else {
                              alert(`Failed to print to ${printer.name}: ${data.error || 'Unknown error'} ${data.details ? '(' + data.details + ')' : ''}`);
                            }
                          } catch (e: any) {
                            alert(`Error connecting to printer test API: ${e.message}`);
                          }
                        }}
                        className="flex-1 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                      >
                        Test Print
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm(`Remove printer ${printer.name}?`)) {
                            const newPrinters = printers.filter(p => p.id !== printer.id);
                            setPrinters(newPrinters);
                            localStorage.setItem('corgi_printers', JSON.stringify(newPrinters));
                          }
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Registered POS Terminals Section */}
            <div className="border border-gray-100 rounded-3xl p-6 bg-white shadow-sm space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-gray-900 text-base">POS Terminals (App Instances)</h3>
                  <p className="text-[11px] text-gray-400 font-semibold">Registered active touchscreen tablets, POS stations, or handheld devices.</p>
                </div>
                <button 
                  onClick={() => {
                    const name = prompt('Enter Terminal Name:');
                    if (!name) return;
                    const model = prompt('Enter Model (e.g. iPad Air):', 'iPad');
                    if (!model) return;
                    const location = prompt('Enter Location (e.g. Bar Counter):', 'Main Hall');
                    if (!location) return;

                    const newDevices = [...devices, { id: 'dev-' + Date.now(), name, model, location, status: 'active' }];
                    setDevices(newDevices);
                    localStorage.setItem('corgi_devices', JSON.stringify(newDevices));
                  }}
                  className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={14} /> Add Device
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {devices.map(device => (
                  <div key={device.id} className="border border-gray-100 rounded-2xl p-4 bg-gray-50/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-650 flex items-center justify-center shrink-0">
                        <Smartphone size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm">{device.name}</h4>
                        <p className="text-[10px] text-gray-400 font-semibold mt-0.5">{device.model} • {device.location}</p>
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        if (confirm(`Unregister terminal ${device.name}?`)) {
                          const newDevices = devices.filter(d => d.id !== device.id);
                          setDevices(newDevices);
                          localStorage.setItem('corgi_devices', JSON.stringify(newDevices));
                        }
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* RECEIPTS VIEW */}
        {activeMenu === 'receipts' && (
          <div className="max-w-4xl flex flex-col gap-8 mt-2">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Receipts & Taxes</h2>
              <p className="text-xs text-gray-400 font-semibold mt-1">Configure invoice layouts, standard VAT rates, and Spanish VERI*FACTU tax enforcement parameters.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Receipt Layout Form */}
              <div className="md:col-span-2 border border-gray-100 rounded-3xl p-6 bg-white shadow-sm space-y-5">
                <h3 className="font-bold text-gray-950 text-base border-b border-gray-50 pb-3">Layout Customisation</h3>
                
                <div className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase">Receipt Header Text</label>
                    <input 
                      type="text" 
                      value={receiptConfig.header}
                      onChange={(e) => {
                        const newConfig = { ...receiptConfig, header: e.target.value };
                        setReceiptConfig(newConfig);
                        localStorage.setItem('corgi_receipt_config', JSON.stringify(newConfig));
                      }}
                      className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-200 transition-all" 
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase">Receipt Footer Text</label>
                    <input 
                      type="text" 
                      value={receiptConfig.footer}
                      onChange={(e) => {
                        const newConfig = { ...receiptConfig, footer: e.target.value };
                        setReceiptConfig(newConfig);
                        localStorage.setItem('corgi_receipt_config', JSON.stringify(newConfig));
                      }}
                      className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-200 transition-all" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-gray-500 uppercase">IVA / VAT rate Food (%)</label>
                      <input 
                        type="number" 
                        value={receiptConfig.ivaFood}
                        onChange={(e) => {
                          const newConfig = { ...receiptConfig, ivaFood: parseInt(e.target.value) || 0 };
                          setReceiptConfig(newConfig);
                          localStorage.setItem('corgi_receipt_config', JSON.stringify(newConfig));
                        }}
                        className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-2.5 text-sm font-black text-gray-900 outline-none focus:bg-white focus:border-gray-200 transition-all" 
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-gray-500 uppercase">IVA / VAT rate Alcohol (%)</label>
                      <input 
                        type="number" 
                        value={receiptConfig.ivaAlcohol}
                        onChange={(e) => {
                          const newConfig = { ...receiptConfig, ivaAlcohol: parseInt(e.target.value) || 0 };
                          setReceiptConfig(newConfig);
                          localStorage.setItem('corgi_receipt_config', JSON.stringify(newConfig));
                        }}
                        className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-2.5 text-sm font-black text-gray-900 outline-none focus:bg-white focus:border-gray-200 transition-all" 
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase">Factura Invoice Prefix</label>
                    <input 
                      type="text" 
                      value={receiptConfig.invoicePrefix}
                      onChange={(e) => {
                        const newConfig = { ...receiptConfig, invoicePrefix: e.target.value };
                        setReceiptConfig(newConfig);
                        localStorage.setItem('corgi_receipt_config', JSON.stringify(newConfig));
                      }}
                      className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-200 transition-all" 
                    />
                  </div>
                </div>
              </div>

              {/* Legal & VERI*FACTU Panel */}
              <div className="border border-gray-100 rounded-3xl p-6 bg-white shadow-sm space-y-6">
                <h3 className="font-bold text-gray-950 text-base border-b border-gray-50 pb-3">Legal Compliances</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-red-50/30 border border-red-100/50 rounded-2xl">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-gray-900">VERI*FACTU (Spain)</span>
                      <span className="text-[10px] text-gray-400 font-semibold">Agencia Tributaria compliance.</span>
                    </div>
                    
                    <button 
                      onClick={() => {
                        const newConfig = { ...receiptConfig, veriFactuActive: !receiptConfig.veriFactuActive };
                        setReceiptConfig(newConfig);
                        localStorage.setItem('corgi_receipt_config', JSON.stringify(newConfig));
                      }}
                      className={`w-11 h-6 rounded-full transition-all duration-300 relative ${receiptConfig.veriFactuActive ? 'bg-corgi' : 'bg-gray-200'}`}
                    >
                      <div className={`absolute w-5 h-5 rounded-full bg-white top-0.5 transition-all shadow-md ${receiptConfig.veriFactuActive ? 'right-0.5' : 'left-0.5'}`}></div>
                    </button>
                  </div>

                  <div className="text-[11px] text-gray-400 font-medium leading-relaxed bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <span className="font-bold text-gray-700 block mb-1">ℹ️ Spanish Compliance Notice</span>
                    By law (Ley Antifraude 11/2021), this software is prevented from performing dual-entry ledger bookkeeping. All transactions, voided checks, and cancellations are cryptographically linked in an immutable ledger and transmitted directly.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- DISCOUNTS VIEW --- */}
        {activeMenu === 'discounts' && (
          <div className="max-w-4xl flex flex-col gap-8 mt-2">
            
            {/* Sub-tab selection */}
            <div className="flex border-b border-gray-100 pb-px gap-6">
              {[
                { id: 'presets', label: 'Preset Discounts', icon: Tag },
                { id: 'promotions', label: 'Happy Hour Promos', icon: Clock },
                { id: 'giftcards', label: 'Gift Cards', icon: Gift },
                { id: 'loyalty', label: 'Loyalty Rules', icon: Coins }
              ].map(subTab => {
                const SubIcon = subTab.icon;
                const isSubActive = discountsSubTab === subTab.id;
                return (
                  <button
                    key={subTab.id}
                    onClick={() => setDiscountsSubTab(subTab.id as any)}
                    className={`flex items-center gap-2 pb-4 text-[14px] font-bold transition-all relative border-b-2 cursor-pointer ${
                      isSubActive 
                        ? 'border-black text-black' 
                        : 'border-transparent text-gray-400 hover:text-gray-650'
                    }`}
                  >
                    <SubIcon size={16} />
                    {subTab.label}
                  </button>
                );
              })}
            </div>

            {/* PRESETS SUB-TAB */}
            {discountsSubTab === 'presets' && (
              <div>
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Global Discounts</h2>
                    <p className="text-xs text-gray-400 font-semibold mt-1">Manage fixed or percent discount presets applicable to any order checkout.</p>
                  </div>
                  <button 
                    onClick={() => {
                      const newPreset = { id: Date.now().toString(), name: 'New Discount', value: 10, color: 'bg-gray-100 text-gray-700' };
                      const newPresets = [...discountPresets, newPreset];
                      setDiscountPresets(newPresets);
                      saveDiscountPresets(newPresets);
                    }}
                    className="px-5 py-2.5 bg-black text-white rounded-xl text-sm font-bold shadow-sm hover:bg-gray-800 transition-colors flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Plus size={16} /> Add Preset
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {discountPresets.map((preset, idx) => (
                    <div key={preset.id} className="p-5 border border-gray-100 rounded-3xl bg-white shadow-sm flex flex-col gap-4">
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col gap-1 w-full max-w-[200px]">
                          <label className="text-xs font-bold text-gray-500 uppercase">Discount Name</label>
                          <input 
                            type="text" 
                            value={preset.name}
                            onChange={(e) => {
                              const newPresets = [...discountPresets];
                              newPresets[idx].name = e.target.value;
                              setDiscountPresets(newPresets);
                              saveDiscountPresets(newPresets);
                            }}
                            className="w-full bg-gray-50 border border-transparent rounded-xl px-3 py-2 text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-200 transition-all" 
                          />
                        </div>
                        <button 
                          onClick={() => {
                            const newPresets = discountPresets.filter(p => p.id !== preset.id);
                            setDiscountPresets(newPresets);
                            saveDiscountPresets(newPresets);
                          }}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="flex gap-4 items-center">
                        <div className="flex flex-col gap-1 flex-1">
                          <label className="text-xs font-bold text-gray-500 uppercase">Percentage (%)</label>
                          <input 
                            type="number"
                            min="1" max="100"
                            value={preset.value}
                            onChange={(e) => {
                              const newPresets = [...discountPresets];
                              newPresets[idx].value = parseInt(e.target.value) || 0;
                              setDiscountPresets(newPresets);
                              saveDiscountPresets(newPresets);
                            }}
                            className="w-full bg-gray-50 border border-transparent rounded-xl px-3 py-2 text-sm font-black text-gray-900 outline-none focus:bg-white focus:border-gray-200 transition-all" 
                          />
                        </div>
                        
                        <div className="flex flex-col gap-1 flex-1">
                          <label className="text-xs font-bold text-gray-500 uppercase">Color Tag</label>
                          <select
                            value={preset.color}
                            onChange={(e) => {
                              const newPresets = [...discountPresets];
                              newPresets[idx].color = e.target.value;
                              setDiscountPresets(newPresets);
                              saveDiscountPresets(newPresets);
                            }}
                            className="w-full bg-gray-50 border border-transparent rounded-xl px-3 py-2 text-sm font-bold text-gray-700 outline-none focus:bg-white focus:border-gray-200 transition-all appearance-none cursor-pointer"
                          >
                            <option value="bg-gray-100 text-gray-700">Gray</option>
                            <option value="bg-purple-100 text-purple-700">Purple</option>
                            <option value="bg-blue-100 text-blue-700">Blue</option>
                            <option value="bg-green-100 text-green-700">Green</option>
                            <option value="bg-orange-100 text-orange-700">Orange</option>
                            <option value="bg-corgi/20 text-corgi">Corgi</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* HAPPY HOUR PROMOTIONS SUB-TAB */}
            {discountsSubTab === 'promotions' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Smart Promotions (Happy Hour)</h2>
                    <p className="text-xs text-gray-400 font-semibold mt-1">Configure scheduled happy hours. Discounts apply automatically to matching items during configured days and hours.</p>
                  </div>
                  <button 
                    onClick={() => {
                      setPromoName('');
                      setPromoPercent(20);
                      setPromoDays([1, 2, 3, 4, 5]);
                      setPromoStartHour(18);
                      setPromoEndHour(20);
                      setPromoItems('');
                      setIsAddingPromo(true);
                    }}
                    className="px-5 py-2.5 bg-black text-white rounded-xl text-sm font-bold shadow-sm hover:bg-gray-800 transition-colors flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Plus size={16} /> Add Promotion
                  </button>
                </div>

                {isAddingPromo && (
                  <div className="p-6 border border-darker-beige/40 rounded-3xl bg-beige/15 shadow-sm mb-6 flex flex-col gap-4 animate-in fade-in duration-200">
                    <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                      <h3 className="font-bold text-gray-950 text-sm">Create Scheduled Promotion</h3>
                      <button onClick={() => setIsAddingPromo(false)} className="text-gray-450 hover:text-gray-700"><X size={16}/></button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Promo Name</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Friday Cocktails" 
                          value={promoName}
                          onChange={e => setPromoName(e.target.value)}
                          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-850 outline-none focus:border-corgi transition-all"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Discount Percent (%)</label>
                        <input 
                          type="number" 
                          min="1" max="100"
                          value={promoPercent}
                          onChange={e => setPromoPercent(parseInt(e.target.value) || 0)}
                          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-850 outline-none focus:border-corgi transition-all"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-gray-500 uppercase">Active Days</label>
                      <div className="flex gap-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName, idx) => {
                          const isSelected = promoDays.includes(idx);
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setPromoDays(prev => 
                                  prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx]
                                );
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                                isSelected 
                                  ? 'bg-corgi text-white border-corgi' 
                                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              {dayName}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Start Hour (0-23)</label>
                        <input 
                          type="number" 
                          min="0" max="23"
                          value={promoStartHour}
                          onChange={e => setPromoStartHour(parseInt(e.target.value) || 0)}
                          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-850 outline-none focus:border-corgi transition-all"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">End Hour (0-23)</label>
                        <input 
                          type="number" 
                          min="0" max="23"
                          value={promoEndHour}
                          onChange={e => setPromoEndHour(parseInt(e.target.value) || 0)}
                          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-850 outline-none focus:border-corgi transition-all"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-gray-500 uppercase">Target Items (Optional, comma-separated)</label>
                      <textarea 
                        placeholder="e.g. Espresso, Corgi Latte, Avocado Toast. Leave blank for all menu items."
                        value={promoItems}
                        onChange={e => setPromoItems(e.target.value)}
                        className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-gray-850 outline-none focus:border-corgi transition-all h-16 resize-none"
                      />
                    </div>

                    <div className="flex gap-3 justify-end mt-2">
                      <button 
                        onClick={() => setIsAddingPromo(false)}
                        className="px-4 py-2 text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => {
                          if (!promoName.trim()) return;
                          const newPromo: Promotion = {
                            id: `promo-${Date.now()}`,
                            name: promoName.trim(),
                            discountPercent: promoPercent,
                            activeDays: promoDays,
                            startHour: promoStartHour,
                            endHour: promoEndHour,
                            targetItems: promoItems.trim() ? promoItems.split(',').map(s => s.trim()).filter(Boolean) : undefined
                          };
                          const updated = [...promotions, newPromo];
                          setPromotions(updated);
                          savePromotions(updated);
                          setIsAddingPromo(false);
                        }}
                        className="px-4 py-2 text-xs font-bold text-white bg-black hover:bg-gray-800 rounded-xl cursor-pointer"
                      >
                        Save Promotion
                      </button>
                    </div>
                  </div>
                )}

                {promotions.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-gray-200 rounded-3xl text-gray-400 text-sm font-medium bg-gray-50/30">
                    No scheduled promotions configured. Click "Add Promotion" to create one.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {promotions.map(promo => (
                      <div key={promo.id} className="p-5 border border-gray-100 rounded-3xl bg-white shadow-sm flex flex-col justify-between gap-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-purple-100 text-purple-700 border border-purple-200">
                              Active Promo
                            </span>
                            <h3 className="font-bold text-base text-gray-950 mt-1.5">{promo.name}</h3>
                          </div>
                          <button 
                            onClick={() => {
                              const updated = promotions.filter(p => p.id !== promo.id);
                              setPromotions(updated);
                              savePromotions(updated);
                            }}
                            className="p-1.5 text-gray-450 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        <div className="space-y-1.5 text-xs font-semibold text-gray-600">
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-gray-850">Discount:</span>
                            <span className="font-black text-saturated-green text-sm">{promo.discountPercent}% OFF</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-gray-850">Schedule:</span>
                            <span>
                              {promo.activeDays.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')} @ {promo.startHour.toString().padStart(2, '0')}:00 - {promo.endHour.toString().padStart(2, '0')}:00
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-400 leading-normal">
                            <span className="font-bold text-gray-500">Applies to: </span>
                            {promo.targetItems && promo.targetItems.length > 0 ? promo.targetItems.join(', ') : 'All menu items'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* GIFT CARDS SUB-TAB */}
            {discountsSubTab === 'giftcards' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Gift Cards</h2>
                    <p className="text-xs text-gray-400 font-semibold mt-1">Issue, check balances, and deactivate digital gift cards for customers.</p>
                  </div>
                  <button 
                    onClick={() => {
                      setGiftCardBalance(50);
                      setGiftCardGuestId('');
                      setNewlyCreatedGiftCard(null);
                      setIsGeneratingGiftCard(true);
                    }}
                    className="px-5 py-2.5 bg-black text-white rounded-xl text-sm font-bold shadow-sm hover:bg-gray-800 transition-colors flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Plus size={16} /> Issue Gift Card
                  </button>
                </div>

                {isGeneratingGiftCard && (
                  <div className="p-6 border border-darker-beige/40 rounded-3xl bg-beige/15 shadow-sm mb-6 flex flex-col gap-4 animate-in fade-in duration-200">
                    <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                      <h3 className="font-bold text-gray-950 text-sm">Issue New Gift Card</h3>
                      <button onClick={() => setIsGeneratingGiftCard(false)} className="text-gray-450 hover:text-gray-700"><X size={16}/></button>
                    </div>

                    {!newlyCreatedGiftCard ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Initial Balance (€)</label>
                            <input 
                              type="number" 
                              min="5" max="1000"
                              value={giftCardBalance}
                              onChange={e => setGiftCardBalance(parseFloat(e.target.value) || 0)}
                              className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-850 outline-none focus:border-corgi transition-all"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Link Guest (Optional)</label>
                            <select
                              value={giftCardGuestId}
                              onChange={e => setGiftCardGuestId(e.target.value)}
                              className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-800 outline-none focus:border-corgi transition-all cursor-pointer"
                            >
                              <option value="">No Guest (Anonymously)</option>
                              {guests.map(g => (
                                <option key={g.id} value={g.id}>{g.name} ({g.phone})</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="flex gap-3 justify-end mt-2">
                          <button 
                            onClick={() => setIsGeneratingGiftCard(false)}
                            className="px-4 py-2 text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              if (giftCardBalance <= 0) return;
                              createGiftCardAsync(giftCardBalance, giftCardGuestId || undefined).then(newCard => {
                                setNewlyCreatedGiftCard(newCard);
                                getGiftCardsAsync().then(setGiftCards).catch(console.error);
                              }).catch(console.error);
                            }}
                            className="px-4 py-2 text-xs font-bold text-white bg-black hover:bg-gray-800 rounded-xl cursor-pointer"
                          >
                            Generate Card
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-center p-4 bg-white border border-gray-100 rounded-2xl gap-4">
                        <div className="w-12 h-12 rounded-full bg-green/10 text-saturated-green flex items-center justify-center">
                          <Check size={24} strokeWidth={3} />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-950 text-sm">Gift Card Successfully Generated!</h4>
                          <p className="text-xs text-gray-400 mt-1 font-semibold">Copy this code and share it with the customer.</p>
                        </div>
                        <div className="flex items-center gap-3 bg-gray-50 px-4 py-3 rounded-xl border border-gray-100 w-full max-w-sm justify-between">
                          <span className="font-black text-gray-900 tracking-wider text-base">{newlyCreatedGiftCard.code}</span>
                          <button
                            onClick={() => navigator.clipboard.writeText(newlyCreatedGiftCard.code)}
                            className="text-gray-450 hover:text-gray-700 flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                          >
                            <Copy size={14} /> Copy
                          </button>
                        </div>
                        <div className="text-xs font-semibold text-gray-500 mt-1">
                          Value: <span className="font-black text-gray-850">€{newlyCreatedGiftCard.initialBalance.toFixed(2)}</span> • Expires: {new Date(newlyCreatedGiftCard.expiryDate).toLocaleDateString()}
                        </div>
                        <button
                          onClick={() => setIsGeneratingGiftCard(false)}
                          className="w-full max-w-xs mt-2 py-2.5 bg-black hover:bg-gray-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-[0.98]"
                        >
                          Close Window
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-2 mb-4">
                  <Search size={16} className="text-gray-400" />
                  <input
                    type="text"
                    value={giftCardSearchQuery}
                    onChange={e => setGiftCardSearchQuery(e.target.value)}
                    placeholder="Search cards by code or linked customer..."
                    className="bg-transparent border-none outline-none text-xs font-semibold text-gray-850 w-full"
                  />
                </div>

                <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse bg-white">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/50 text-[10px] font-black uppercase text-gray-400 tracking-wider">
                        <th className="px-6 py-4">Card Code</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Balance</th>
                        <th className="px-6 py-4">Customer</th>
                        <th className="px-6 py-4">Expiry Date</th>
                        <th className="px-6 py-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-xs font-semibold text-gray-700">
                      {giftCards
                        .filter(gc => {
                          if (!giftCardSearchQuery) return true;
                          const q = giftCardSearchQuery.trim().toLowerCase();
                          const guestName = guests.find(g => g.id === gc.customerId)?.name.toLowerCase() || '';
                          return gc.code.toLowerCase().includes(q) || guestName.includes(q);
                        })
                        .map(gc => {
                          const linkedGuest = guests.find(g => g.id === gc.customerId);
                          return (
                            <tr key={gc.id} className="hover:bg-gray-50/30 transition-colors">
                              <td className="px-6 py-4 font-black text-gray-900 tracking-wide">{gc.code}</td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                                  gc.status === 'active' 
                                    ? 'bg-green/10 text-saturated-green border-green/20' 
                                    : gc.status === 'redeemed'
                                    ? 'bg-purple-100 text-purple-700 border-purple-200'
                                    : 'bg-red-50 text-red-650 border-red-100'
                                }`}>
                                  {gc.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-black">
                                €{gc.balance.toFixed(2)} <span className="text-[10px] text-gray-400 font-bold">/ €{gc.initialBalance.toFixed(2)}</span>
                              </td>
                              <td className="px-6 py-4 text-gray-500">
                                {linkedGuest ? (
                                  <div className="flex flex-col">
                                    <span className="font-bold text-gray-850">{linkedGuest.name}</span>
                                    <span className="text-[10px] text-gray-400">{linkedGuest.phone}</span>
                                  </div>
                                ) : (
                                  <span className="text-gray-400 italic">None</span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-gray-500">
                                {new Date(gc.expiryDate).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4">
                                <button
                                  onClick={() => {
                                    const updated = giftCards.map(c => {
                                      if (c.id === gc.id) {
                                        return { ...c, status: c.status === 'active' ? 'disabled' as const : 'active' as const };
                                      }
                                      return c;
                                    });
                                    setGiftCards(updated);
                                    saveGiftCards(updated);
                                  }}
                                  className={`text-xs font-bold transition-colors cursor-pointer hover:underline ${gc.status === 'active' ? 'text-red-500' : 'text-green-600'}`}
                                >
                                  {gc.status === 'active' ? 'Disable' : 'Activate'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
          </div>
        )}

      </div>

      {/* --- RESET PASSWORD MODAL --- */}
      {resetModalMemberId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" onClick={() => setResetModalMemberId(null)}></div>
          <div className="relative bg-white rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.12)] w-full max-w-md p-6 animate-in zoom-in-95 fade-in duration-200">
            <button onClick={() => setResetModalMemberId(null)} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
              <X size={18} />
            </button>

            {!resetLink ? (
              <div className="flex flex-col items-center text-center gap-4 pt-2">
                <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center shadow-sm">
                  <Key size={24} className="text-corgi" />
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-xl font-bold text-gray-900">Reset Password?</h3>
                  <p className="text-[14px] text-gray-500 max-w-[280px]">
                    Are you sure you want to reset the password for <span className="font-bold text-gray-800">{teamMembers.find(m => m.id === resetModalMemberId)?.name}</span>? They will be logged out of active sessions.
                  </p>
                </div>
                <div className="flex w-full gap-3 mt-4">
                  <button 
                    onClick={() => setResetModalMemberId(null)}
                    className="flex-1 py-3 px-4 rounded-xl font-bold text-[14px] text-gray-700 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleConfirmReset}
                    className="flex-1 py-3 px-4 rounded-xl font-bold text-[14px] text-white bg-black hover:bg-gray-800 shadow-sm transition-all cursor-pointer"
                  >
                    Yes, Reset
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center gap-4 pt-2">
                <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center shadow-sm">
                  <Check size={28} strokeWidth={3} className="text-green-500" />
                </div>
                <div className="flex flex-col gap-2 w-full">
                  <h3 className="text-xl font-bold text-gray-900">Reset Link Generated!</h3>
                  <p className="text-[14px] text-gray-500 mb-2">
                    The link has been copied to your clipboard and emailed to the user.
                  </p>
                  
                  <div className="flex items-center gap-2 p-1.5 pr-1.5 bg-gray-50 rounded-xl border border-gray-100 w-full">
                    <div className="flex-1 px-3 py-2 overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-medium text-gray-600 text-left">
                      {resetLink}
                    </div>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(resetLink);
                        setIsCopied(true);
                        setTimeout(() => setIsCopied(false), 2000);
                      }}
                      className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[12px] font-bold transition-all cursor-pointer ${isCopied ? 'bg-green-100 text-green-700' : 'bg-white border border-gray-200 text-gray-700 shadow-sm hover:bg-gray-50'}`}
                    >
                      {isCopied ? <Check size={14}/> : <Copy size={14}/>}
                      {isCopied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
                <button 
                  onClick={() => setResetModalMemberId(null)}
                  className="w-full py-3 px-4 mt-2 rounded-xl font-bold text-[14px] text-white bg-black hover:bg-gray-800 shadow-sm transition-all cursor-pointer"
                >
                  Done
                </button>
              </div>
            )}

            {/* LOYALTY RULES SUB-TAB */}
            {discountsSubTab === 'loyalty' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Loyalty Program Tiers</h2>
                    <p className="text-xs text-gray-400 font-semibold mt-1">Configure cashback percentage rates and LTV (Lifetime Value) thresholds for customer loyalty tiers.</p>
                  </div>
                  <button 
                    onClick={() => {
                      saveLoyaltyConfig(loyaltyConfig);
                      alert('Loyalty configuration saved successfully!');
                    }}
                    className="px-5 py-2.5 bg-black text-white rounded-xl text-sm font-bold shadow-sm hover:bg-gray-800 transition-colors flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Check size={16} /> Save Rules
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Bronze Tier Card */}
                  <div className="p-6 border border-gray-100 rounded-3xl bg-white shadow-sm flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-700 flex items-center justify-center font-black">B</div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-sm">Bronze Tier</h3>
                        <p className="text-[10px] text-gray-400 font-semibold">Entry level tier for new customers</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Cashback Rate (%)</label>
                        <div className="relative">
                          <input 
                            type="number" 
                            min="0" max="100" step="0.1"
                            value={parseFloat((loyaltyConfig.bronzeRate * 100).toFixed(1))}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) / 100 || 0;
                              setLoyaltyConfig({ ...loyaltyConfig, bronzeRate: val });
                            }}
                            className="w-full bg-gray-50 border border-transparent rounded-xl pl-3 pr-8 py-2.5 text-sm font-black text-gray-900 outline-none focus:bg-white focus:border-gray-200 transition-all" 
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">%</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">LTV Threshold</label>
                        <div className="relative">
                          <input 
                            type="text" 
                            disabled
                            value="€0.00 (Default)"
                            className="w-full bg-gray-100 border border-transparent rounded-xl px-3 py-2.5 text-sm font-bold text-gray-400 cursor-not-allowed" 
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Silver Tier Card */}
                  <div className="p-6 border border-gray-100 rounded-3xl bg-white shadow-sm flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gray-100 text-gray-700 flex items-center justify-center font-black">S</div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-sm">Silver Tier</h3>
                        <p className="text-[10px] text-gray-400 font-semibold">Mid-tier tier for frequent customers</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Cashback Rate (%)</label>
                        <div className="relative">
                          <input 
                            type="number" 
                            min="0" max="100" step="0.1"
                            value={parseFloat((loyaltyConfig.silverRate * 100).toFixed(1))}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) / 100 || 0;
                              setLoyaltyConfig({ ...loyaltyConfig, silverRate: val });
                            }}
                            className="w-full bg-gray-50 border border-transparent rounded-xl pl-3 pr-8 py-2.5 text-sm font-black text-gray-900 outline-none focus:bg-white focus:border-gray-200 transition-all" 
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">%</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">LTV Threshold (€)</label>
                        <div className="relative">
                          <input 
                            type="number" 
                            min="1"
                            value={loyaltyConfig.silverThreshold}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              setLoyaltyConfig({ ...loyaltyConfig, silverThreshold: val });
                            }}
                            className="w-full bg-gray-50 border border-transparent rounded-xl pl-3 pr-8 py-2.5 text-sm font-black text-gray-900 outline-none focus:bg-white focus:border-gray-200 transition-all" 
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">€</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Gold Tier Card */}
                  <div className="p-6 border border-gray-100 rounded-3xl bg-white shadow-sm flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center font-black">G</div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-sm">Gold Tier</h3>
                        <p className="text-[10px] text-gray-400 font-semibold">Premium tier for highly valuable loyal guests</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Cashback Rate (%)</label>
                        <div className="relative">
                          <input 
                            type="number" 
                            min="0" max="100" step="0.1"
                            value={parseFloat((loyaltyConfig.goldRate * 100).toFixed(1))}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) / 100 || 0;
                              setLoyaltyConfig({ ...loyaltyConfig, goldRate: val });
                            }}
                            className="w-full bg-gray-50 border border-transparent rounded-xl pl-3 pr-8 py-2.5 text-sm font-black text-gray-900 outline-none focus:bg-white focus:border-gray-200 transition-all" 
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">%</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">LTV Threshold (€)</label>
                        <div className="relative">
                          <input 
                            type="number" 
                            min="1"
                            value={loyaltyConfig.goldThreshold}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              setLoyaltyConfig({ ...loyaltyConfig, goldThreshold: val });
                            }}
                            className="w-full bg-gray-50 border border-transparent rounded-xl pl-3 pr-8 py-2.5 text-sm font-black text-gray-900 outline-none focus:bg-white focus:border-gray-200 transition-all" 
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">€</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* VIP Tier Card */}
                  <div className="p-6 border border-gray-100 rounded-3xl bg-white shadow-sm flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-purple-950/20 text-purple-900 flex items-center justify-center font-black">V</div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-sm">VIP Tier</h3>
                        <p className="text-[10px] text-gray-400 font-semibold">Elite tier for top tier brand advocates</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Cashback Rate (%)</label>
                        <div className="relative">
                          <input 
                            type="number" 
                            min="0" max="100" step="0.1"
                            value={parseFloat((loyaltyConfig.vipRate * 100).toFixed(1))}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) / 100 || 0;
                              setLoyaltyConfig({ ...loyaltyConfig, vipRate: val });
                            }}
                            className="w-full bg-gray-50 border border-transparent rounded-xl pl-3 pr-8 py-2.5 text-sm font-black text-gray-900 outline-none focus:bg-white focus:border-gray-200 transition-all" 
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">%</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">LTV Threshold (€)</label>
                        <div className="relative">
                          <input 
                            type="number" 
                            min="1"
                            value={loyaltyConfig.vipThreshold}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              setLoyaltyConfig({ ...loyaltyConfig, vipThreshold: val });
                            }}
                            className="w-full bg-gray-50 border border-transparent rounded-xl pl-3 pr-8 py-2.5 text-sm font-black text-gray-900 outline-none focus:bg-white focus:border-gray-200 transition-all" 
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">€</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- UNSAVED CHANGES MODAL --- */}
      {pendingMenuId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" onClick={() => setPendingMenuId(null)}></div>
          <div className="relative bg-white rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.12)] w-full max-w-sm p-6 animate-in zoom-in-95 fade-in duration-200 text-center">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 text-corgi flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Unsaved Changes</h3>
            <p className="text-gray-500 mb-6 text-sm">You have unsaved changes in your layout. Are you sure you want to leave? Your changes will be lost.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setPendingMenuId(null)}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors cursor-pointer"
              >
                Stay Here
              </button>
              <button 
                onClick={() => {
                  setActiveMenu(pendingMenuId);
                  localStorage.setItem('corgi_active_menu', pendingMenuId);
                  setIsTablesDirty(false);
                  setTablesViewKey(prev => prev + 1);
                  setPendingMenuId(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors cursor-pointer"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
