 'use client';

import React, { useState, useEffect } from 'react';
import { User, Users, Settings, Shield, Map, FileText, Check, Printer, Plus, Edit2, Trash2, X, Copy, Clock, AlertTriangle, Star, Tag, Gift, Coins, HardDrive, Search } from 'lucide-react';
import TablesView from './TablesView';
import ReputationView from './ReputationView';
import ProfileSettingsPanel from '@/components/settings/ProfileSettingsPanel';
import PosSettingsPanel from '@/components/settings/PosSettingsPanel';
import PrintersPanel from '@/components/settings/PrintersPanel';
import TaxesPanel from '@/components/settings/TaxesPanel';
import AuditPanel from '@/components/settings/AuditPanel';
import BackupsPanel from '@/components/settings/BackupsPanel';
import TeamSettingsPanel from '@/components/settings/TeamSettingsPanel';
import GeneralNotificationsPanel from '@/components/settings/GeneralNotificationsPanel';
import { getDiscountPresetsAsync, createDiscountPresetAsync, updateDiscountPresetAsync, deleteDiscountPresetAsync, DiscountPreset } from '@/lib/discounts';
import { getPromotionsAsync, createPromotionAsync, updatePromotionAsync, deletePromotionAsync, Promotion } from '@/lib/promotions';
import { getPosSettingsAsync, savePosSettingsAsync, type PosSettings } from '@/lib/pos-settings';
import { GiftCard, getGiftCardsAsync, createGiftCardAsync, setGiftCardStatusAsync } from '@/lib/giftcards';
import { getGuestsAsync, getLoyaltyConfigAsync, saveLoyaltyConfigAsync, type Guest, type LoyaltyConfig } from '@/lib/crm';

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
  const [guests, setGuests] = useState<Guest[]>([]);

  // Add Promo States
  const [isAddingPromo, setIsAddingPromo] = useState(false);
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null);
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

  // Receipt header/footer via POS settings API (taxes via TaxesPanel)
  const [posSettings, setPosSettings] = useState<PosSettings | null>(null);
  const [receiptSaving, setReceiptSaving] = useState(false);
  const [giftCardSearchQuery, setGiftCardSearchQuery] = useState('');

  useEffect(() => {
    getDiscountPresetsAsync().then(setDiscountPresets).catch(console.error);
    getPromotionsAsync().then(setPromotions).catch(console.error);
    getGiftCardsAsync().then(setGiftCards).catch(console.error);
    getGuestsAsync().then(setGuests).catch(console.error);
    getLoyaltyConfigAsync().then(setLoyaltyConfig).catch(console.error);
    getPosSettingsAsync().then(setPosSettings).catch(console.error);

    const savedMenu = localStorage.getItem('corgi_active_menu');
    if (savedMenu) {
      setActiveMenu(savedMenu);
    }
  }, []);

  const reloadDiscountPresets = () => {
    getDiscountPresetsAsync().then(setDiscountPresets).catch(console.error);
  };

  const reloadPromotions = () => {
    getPromotionsAsync().then(setPromotions).catch(console.error);
  };

  const saveReceiptLayout = async (patch: Partial<PosSettings>) => {
    if (!posSettings) return;
    setReceiptSaving(true);
    try {
      const saved = await savePosSettingsAsync({ ...posSettings, ...patch });
      setPosSettings(saved);
    } catch (e) {
      console.error(e);
    } finally {
      setReceiptSaving(false);
    }
  };

  const handleMenuChange = (id: string) => {
    if (activeMenu === 'tables' && isTablesDirty) {
      setPendingMenuId(id);
    } else {
      setActiveMenu(id);
      localStorage.setItem('corgi_active_menu', id);
    }
  };

  const menuSections = [
    {
      title: 'ACCOUNT',
      items: [
        { id: 'profile', icon: User, label: 'My Profile' },
        { id: 'general', icon: Settings, label: 'General' },
        { id: 'audit', icon: Shield, label: 'Audit Trail' },
        { id: 'backups', icon: HardDrive, label: 'Backups' },
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
        {activeMenu === 'profile' && <ProfileSettingsPanel />}

        {activeMenu === 'audit' && (
          <div className="max-w-5xl mt-2">
            <AuditPanel />
          </div>
        )}

        {activeMenu === 'backups' && (
          <div className="max-w-5xl mt-2">
            <BackupsPanel />
          </div>
        )}

        {/* --- GENERAL VIEW (Notifications & Appearance) --- */}
        {activeMenu === 'general' && (
          <div className="max-w-3xl flex flex-col gap-10 mt-2">
            
            <GeneralNotificationsPanel />

            <PosSettingsPanel />

          </div>
        )}

        {activeMenu === 'team' && (
          <TeamSettingsPanel />
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
        {!['profile', 'general', 'team', 'tables', 'reputation', 'discounts', 'devices', 'receipts', 'audit', 'backups'].includes(activeMenu) && (
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
          <>
            <PrintersPanel />
            <div className="max-w-4xl mt-4 p-6 border border-gray-100 rounded-3xl bg-gray-50/40 text-sm text-gray-600 font-medium">
              POS terminals register automatically when staff sign in with PIN on each device. Printer and receipt routing is configured above.
            </div>
          </>
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
                      value={posSettings?.receiptHeader ?? ''}
                      disabled={!posSettings || receiptSaving}
                      onChange={(e) => {
                        const header = e.target.value;
                        setPosSettings((prev) => (prev ? { ...prev, receiptHeader: header } : prev));
                      }}
                      onBlur={() => {
                        if (posSettings) saveReceiptLayout({ receiptHeader: posSettings.receiptHeader });
                      }}
                      className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-200 transition-all" 
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase">Receipt Footer Text</label>
                    <input 
                      type="text" 
                      value={posSettings?.receiptFooter ?? ''}
                      disabled={!posSettings || receiptSaving}
                      onChange={(e) => {
                        const footer = e.target.value;
                        setPosSettings((prev) => (prev ? { ...prev, receiptFooter: footer } : prev));
                      }}
                      onBlur={() => {
                        if (posSettings) saveReceiptLayout({ receiptFooter: posSettings.receiptFooter });
                      }}
                      className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-200 transition-all" 
                    />
                  </div>

                  <TaxesPanel />
                </div>
              </div>

              {/* Legal & VERI*FACTU Panel */}
              <div className="border border-gray-100 rounded-3xl p-6 bg-white shadow-sm space-y-6">
                <h3 className="font-bold text-gray-950 text-base border-b border-gray-50 pb-3">Legal Compliances</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-red-50/30 border border-red-100/50 rounded-2xl">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-gray-900">VERI*FACTU (Spain)</span>
                      <span className="text-[10px] text-gray-400 font-semibold">Immutable fiscal ledger sync for completed paid orders.</span>
                    </div>
                    <button
                      type="button"
                      disabled={!posSettings || receiptSaving}
                      onClick={() => {
                        if (!posSettings) return;
                        const next = !posSettings.verifactuEnabled;
                        setPosSettings({ ...posSettings, verifactuEnabled: next });
                        saveReceiptLayout({ verifactuEnabled: next });
                      }}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase border ${
                        posSettings?.verifactuEnabled
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-gray-100 text-gray-500 border-gray-200'
                      }`}
                    >
                      {posSettings?.verifactuEnabled ? 'Active' : 'Disabled'}
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
                    data-testid={`discounts-subtab-${subTab.id}`}
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
                    onClick={async () => {
                      try {
                        await createDiscountPresetAsync('New Discount', 10);
                        reloadDiscountPresets();
                      } catch (e) {
                        console.error(e);
                      }
                    }}
                    className="px-5 py-2.5 bg-[#EE635E] hover:bg-[#d94f4a] text-white rounded-xl text-sm font-bold shadow-sm transition-colors flex items-center gap-2 cursor-pointer active:scale-95"
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
                            onChange={async (e) => {
                              const name = e.target.value;
                              setDiscountPresets((prev) => prev.map((p, i) => (i === idx ? { ...p, name } : p)));
                              try {
                                await updateDiscountPresetAsync(preset.id, { name });
                              } catch (err) {
                                console.error(err);
                                reloadDiscountPresets();
                              }
                            }}
                            className="w-full bg-gray-50 border border-transparent rounded-xl px-3 py-2 text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-200 transition-all" 
                          />
                        </div>
                        <button 
                          onClick={async () => {
                            try {
                              await deleteDiscountPresetAsync(preset.id);
                              reloadDiscountPresets();
                            } catch (err) {
                              console.error(err);
                            }
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
                            onChange={async (e) => {
                              const value = parseInt(e.target.value, 10) || 0;
                              setDiscountPresets((prev) => prev.map((p, i) => (i === idx ? { ...p, value } : p)));
                              try {
                                await updateDiscountPresetAsync(preset.id, { value });
                              } catch (err) {
                                console.error(err);
                                reloadDiscountPresets();
                              }
                            }}
                            className="w-full bg-gray-50 border border-transparent rounded-xl px-3 py-2 text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-200 transition-all" 
                          />
                        </div>
                        
                        <div className="flex flex-col gap-1 flex-1">
                          <label className="text-xs font-bold text-gray-500 uppercase">Color Tag</label>
                          <select
                            value={preset.color}
                            onChange={async (e) => {
                              const color = e.target.value;
                              setDiscountPresets((prev) =>
                                prev.map((p, i) => (i === idx ? { ...p, color } : p))
                              );
                              try {
                                await updateDiscountPresetAsync(preset.id, { color });
                              } catch (err) {
                                console.error(err);
                                reloadDiscountPresets();
                              }
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
                      setEditingPromoId(null);
                      setPromoName('');
                      setPromoPercent(20);
                      setPromoDays([1, 2, 3, 4, 5]);
                      setPromoStartHour(18);
                      setPromoEndHour(20);
                      setPromoItems('');
                      setIsAddingPromo(true);
                    }}
                    className="px-5 py-2.5 bg-[#EE635E] hover:bg-[#d94f4a] text-white rounded-xl text-sm font-bold shadow-sm transition-colors flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Plus size={16} /> Add Promotion
                  </button>
                </div>

                {(isAddingPromo || editingPromoId) && (
                  <div className="p-6 border border-darker-beige/40 rounded-3xl bg-beige/15 shadow-sm mb-6 flex flex-col gap-4 animate-in fade-in duration-200">
                    <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                      <h3 className="font-bold text-gray-950 text-sm">{editingPromoId ? 'Edit Scheduled Promotion' : 'Create Scheduled Promotion'}</h3>
                      <button onClick={() => { setIsAddingPromo(false); setEditingPromoId(null); }} className="text-gray-450 hover:text-gray-700"><X size={16}/></button>
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
                        onClick={async () => {
                          if (!promoName.trim()) return;
                          try {
                            const payload = {
                              name: promoName.trim(),
                              discountPercent: promoPercent,
                              activeDays: promoDays,
                              startHour: promoStartHour,
                              endHour: promoEndHour,
                              targetItems: promoItems.trim() ? promoItems.split(',').map(s => s.trim()).filter(Boolean) : undefined,
                            };
                            if (editingPromoId) {
                              await updatePromotionAsync(editingPromoId, payload);
                            } else {
                              await createPromotionAsync(payload);
                            }
                            reloadPromotions();
                            setIsAddingPromo(false);
                            setEditingPromoId(null);
                          } catch (err) {
                            console.error(err);
                          }
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
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-100 text-purple-700 border border-purple-200">
                              Active Promo
                            </span>
                            <h3 className="font-bold text-base text-gray-950 mt-1.5">{promo.name}</h3>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                setEditingPromoId(promo.id);
                                setIsAddingPromo(false);
                                setPromoName(promo.name);
                                setPromoPercent(promo.discountPercent);
                                setPromoDays(promo.activeDays);
                                setPromoStartHour(promo.startHour);
                                setPromoEndHour(promo.endHour);
                                setPromoItems((promo.targetItems ?? []).join(', '));
                              }}
                              className="p-1.5 text-gray-450 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={async () => {
                                try {
                                  await deletePromotionAsync(promo.id);
                                  reloadPromotions();
                                } catch (err) {
                                  console.error(err);
                                }
                              }}
                              className="p-1.5 text-gray-450 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1.5 text-xs font-semibold text-gray-600">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-gray-850">Discount:</span>
                            <span className="font-bold text-saturated-green text-sm">{promo.discountPercent}% OFF</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-gray-850">Schedule:</span>
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
              <div data-testid="giftcards-panel">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Gift Cards</h2>
                    <p className="text-xs text-gray-400 font-semibold mt-1">Issue, check balances, and deactivate digital gift cards for customers.</p>
                  </div>
                  <button 
                    data-testid="giftcards-issue-btn"
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
                            data-testid="giftcards-generate-btn"
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
                          <span className="font-bold text-gray-900 tracking-wider text-base">{newlyCreatedGiftCard.code}</span>
                          <button
                            onClick={() => navigator.clipboard.writeText(newlyCreatedGiftCard.code)}
                            className="text-gray-450 hover:text-gray-700 flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                          >
                            <Copy size={14} /> Copy
                          </button>
                        </div>
                        <div className="text-xs font-semibold text-gray-500 mt-1">
                          Value: <span className="font-bold text-gray-850">€{newlyCreatedGiftCard.initialBalance.toFixed(2)}</span> • Expires: {new Date(newlyCreatedGiftCard.expiryDate).toLocaleDateString()}
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
                      <tr className="border-b border-gray-100 bg-gray-50/50 text-[10px] font-bold uppercase text-gray-400 tracking-wider">
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
                              <td className="px-6 py-4 font-bold text-gray-900 tracking-wide" data-testid={`giftcard-code-${gc.id}`}>{gc.code}</td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                                  gc.status === 'active' 
                                    ? 'bg-green/10 text-saturated-green border-green/20' 
                                    : gc.status === 'redeemed'
                                    ? 'bg-purple-100 text-purple-700 border-purple-200'
                                    : 'bg-red-50 text-red-650 border-red-100'
                                }`}>
                                  {gc.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-bold">
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
                                  data-testid={`giftcard-toggle-${gc.id}`}
                                  onClick={() => {
                                    if (gc.status !== 'active' && gc.status !== 'disabled') return;
                                    const next = gc.status === 'active' ? 'disabled' : 'active';
                                    setGiftCardStatusAsync(gc.id, next)
                                      .then(() => getGiftCardsAsync().then(setGiftCards))
                                      .catch(console.error);
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

            {/* LOYALTY RULES SUB-TAB */}
            {discountsSubTab === 'loyalty' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Loyalty Program Tiers</h2>
                    <p className="text-xs text-gray-400 font-semibold mt-1">Configure cashback percentage rates and LTV (Lifetime Value) thresholds for customer loyalty tiers.</p>
                  </div>
                  <button 
                    onClick={async () => {
                      try {
                        const saved = await saveLoyaltyConfigAsync(loyaltyConfig);
                        setLoyaltyConfig(saved);
                        alert('Loyalty configuration saved successfully!');
                      } catch (err) {
                        console.error(err);
                        alert('Failed to save loyalty configuration.');
                      }
                    }}
                    className="px-5 py-2.5 bg-[#EE635E] hover:bg-[#d94f4a] text-white rounded-xl text-sm font-bold shadow-sm transition-colors flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Check size={16} /> Save Rules
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Bronze Tier Card */}
                  <div className="p-6 border border-gray-100 rounded-3xl bg-white shadow-sm flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-700 flex items-center justify-center font-bold">B</div>
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
                            className="w-full bg-gray-50 border border-transparent rounded-xl pl-3 pr-8 py-2.5 text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-200 transition-all" 
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
                      <div className="w-10 h-10 rounded-2xl bg-gray-100 text-gray-700 flex items-center justify-center font-bold">S</div>
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
                            className="w-full bg-gray-50 border border-transparent rounded-xl pl-3 pr-8 py-2.5 text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-200 transition-all" 
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
                            className="w-full bg-gray-50 border border-transparent rounded-xl pl-3 pr-8 py-2.5 text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-200 transition-all" 
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">€</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Gold Tier Card */}
                  <div className="p-6 border border-gray-100 rounded-3xl bg-white shadow-sm flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center font-bold">G</div>
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
                            className="w-full bg-gray-50 border border-transparent rounded-xl pl-3 pr-8 py-2.5 text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-200 transition-all" 
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
                            className="w-full bg-gray-50 border border-transparent rounded-xl pl-3 pr-8 py-2.5 text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-200 transition-all" 
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">€</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* VIP Tier Card */}
                  <div className="p-6 border border-gray-100 rounded-3xl bg-white shadow-sm flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-purple-950/20 text-purple-900 flex items-center justify-center font-bold">V</div>
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
                            className="w-full bg-gray-50 border border-transparent rounded-xl pl-3 pr-8 py-2.5 text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-200 transition-all" 
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
                            className="w-full bg-gray-50 border border-transparent rounded-xl pl-3 pr-8 py-2.5 text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-200 transition-all" 
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
        )}

      </div>

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
