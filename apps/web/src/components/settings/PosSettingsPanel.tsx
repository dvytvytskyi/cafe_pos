'use client';

import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import {
  getPosSettingsAsync,
  savePosSettingsAsync,
  ALLOWED_CURRENCIES,
  ALLOWED_LANGUAGES,
  type PosSettings,
  PosSettingsApiError,
} from '@/lib/pos-settings';

const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  uk: 'Ukrainian',
};

export default function PosSettingsPanel() {
  const [settings, setSettings] = useState<PosSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPosSettingsAsync()
      .then((data) => {
        if (!cancelled) setSettings(data);
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const updateField = <K extends keyof PosSettings>(key: K, value: PosSettings[K]) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
    setHasChanges(true);
    setSaveError(null);
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaveError(null);
    try {
      const saved = await savePosSettingsAsync(settings);
      setSettings(saved);
      setHasChanges(false);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 1500);
    } catch (err) {
      setSaveError(err instanceof PosSettingsApiError ? err.message : 'Failed to save POS settings');
    }
  };

  if (loading || !settings) {
    return (
      <div className="text-sm text-gray-500 mt-4" data-testid="pos-settings-loading">
        Loading POS settings…
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-8 pb-4 border-b border-gray-100 mt-4">POS Settings</h2>

      <div className="grid grid-cols-2 gap-x-6 gap-y-5">
        <div className="flex flex-col gap-2">
          <label className="text-[14px] font-medium text-gray-800">System Currency</label>
          <select
            data-testid="pos-settings-currency"
            value={settings.currency}
            onChange={(e) => updateField('currency', e.target.value)}
            className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 text-[14px] font-medium text-gray-800 outline-none focus:ring-4 focus:ring-corgi/10 focus:border-corgi"
          >
            {ALLOWED_CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[14px] font-medium text-gray-800">Default Language</label>
          <select
            data-testid="pos-settings-language"
            value={settings.language}
            onChange={(e) => updateField('language', e.target.value)}
            className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 text-[14px] font-medium text-gray-800 outline-none focus:ring-4 focus:ring-corgi/10 focus:border-corgi"
          >
            {ALLOWED_LANGUAGES.map((code) => (
              <option key={code} value={code}>
                {LANGUAGE_LABELS[code] ?? code}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2 col-span-2">
          <label className="text-[14px] font-medium text-gray-800">Receipt Header</label>
          <input
            data-testid="pos-settings-receipt-header"
            value={settings.receiptHeader}
            onChange={(e) => updateField('receiptHeader', e.target.value)}
            className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 text-[14px] font-medium text-gray-800 outline-none focus:ring-4 focus:ring-corgi/10 focus:border-corgi"
          />
        </div>

        <div className="flex flex-col gap-2 col-span-2">
          <label className="text-[14px] font-medium text-gray-800">Receipt Footer</label>
          <input
            data-testid="pos-settings-receipt-footer"
            value={settings.receiptFooter}
            onChange={(e) => updateField('receiptFooter', e.target.value)}
            className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 text-[14px] font-medium text-gray-800 outline-none focus:ring-4 focus:ring-corgi/10 focus:border-corgi"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[14px] font-medium text-gray-800">Happy Hour Discount (%)</label>
          <input
            type="number"
            min={0}
            max={100}
            data-testid="pos-settings-happy-hour"
            value={settings.happyHourDiscount}
            onChange={(e) => updateField('happyHourDiscount', Number(e.target.value))}
            className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 text-[14px] font-medium text-gray-800 outline-none focus:ring-4 focus:ring-corgi/10 focus:border-corgi"
          />
        </div>

        <div className="flex items-center justify-between py-2">
          <span className="text-[14px] font-medium text-gray-800">Auto-print receipts</span>
          <button
            type="button"
            data-testid="pos-settings-auto-print"
            onClick={() => updateField('autoPrintReceipts', !settings.autoPrintReceipts)}
            className={`w-11 h-6 rounded-full p-1 transition-colors relative ${settings.autoPrintReceipts ? 'bg-[#EE635E]' : 'bg-gray-200'}`}
          >
            <div
              className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${settings.autoPrintReceipts ? 'translate-x-5' : 'translate-x-0'}`}
            />
          </button>
        </div>
      </div>

      {saveError && (
        <p className="text-sm text-red-500 mt-4" role="alert" data-testid="pos-settings-save-error">
          {saveError}
        </p>
      )}

      <div
        data-testid="pos-settings-save-bar"
        data-visible={hasChanges ? 'true' : 'false'}
        className={`flex justify-end gap-3 mt-8 pt-6 border-t border-gray-100 transition-all ${
          hasChanges ? 'opacity-100' : 'opacity-0 pointer-events-none h-0 overflow-hidden mt-0 pt-0 border-0'
        }`}
      >
        <button
          type="button"
          onClick={() => {
            setHasChanges(false);
            getPosSettingsAsync().then(setSettings).catch(console.error);
          }}
          className="px-6 py-3 bg-white border border-gray-200 text-gray-600 text-[14px] font-bold rounded-full"
        >
          Cancel
        </button>
        <button
          type="button"
          data-testid="pos-settings-save-btn"
          onClick={handleSave}
          className={`px-6 py-3 text-white text-[14px] font-bold rounded-full flex items-center gap-2 ${
            isSaved ? 'bg-green-500' : 'bg-[#EE635E] hover:bg-[#d94f4a]'
          }`}
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
  );
}
