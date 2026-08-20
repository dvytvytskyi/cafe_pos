'use client';

import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import {
  getTaxRatesAsync,
  saveTaxRatesAsync,
  taxRatesToMap,
  type TaxRate,
  TaxApiError,
} from '@/lib/taxes';
import type { TaxSlug } from '@/lib/tax-validation';

type RateForm = Record<TaxSlug, string>;

function ratesToForm(rates: TaxRate[]): RateForm {
  const map = taxRatesToMap(rates);
  return {
    food: String(map.food),
    alcohol: String(map.alcohol),
  };
}

export default function TaxesPanel() {
  const [rates, setRates] = useState<TaxRate[]>([]);
  const [form, setForm] = useState<RateForm>({ food: '10', alcohol: '21' });
  const [loading, setLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getTaxRatesAsync()
      .then((data) => {
        if (cancelled) return;
        setRates(data);
        setForm(ratesToForm(data));
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const updateField = (slug: TaxSlug, value: string) => {
    setForm((prev) => ({ ...prev, [slug]: value }));
    setHasChanges(true);
    setSaveError(null);
  };

  const handleSave = async () => {
    setSaveError(null);
    try {
      const patches: Array<{ slug: TaxSlug; ratePercent: number }> = [
        { slug: 'food', ratePercent: Number.parseFloat(form.food) },
        { slug: 'alcohol', ratePercent: Number.parseFloat(form.alcohol) },
      ];
      const saved = await saveTaxRatesAsync(patches);
      setRates(saved);
      setForm(ratesToForm(saved));
      setHasChanges(false);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 1500);
    } catch (err) {
      setSaveError(err instanceof TaxApiError ? err.message : 'Failed to save tax rates');
    }
  };

  if (loading) {
    return (
      <div className="text-sm text-gray-500" data-testid="taxes-panel-loading">
        Loading tax rates…
      </div>
    );
  }

  return (
    <div data-testid="taxes-panel" className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-gray-500 uppercase">IVA / VAT rate Food (%)</label>
          <input
            type="number"
            min={0}
            max={100}
            step={0.01}
            data-testid="tax-rate-food"
            value={form.food}
            onChange={(e) => updateField('food', e.target.value)}
            className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-200 transition-all"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-gray-500 uppercase">IVA / VAT rate Alcohol (%)</label>
          <input
            type="number"
            min={0}
            max={100}
            step={0.01}
            data-testid="tax-rate-alcohol"
            value={form.alcohol}
            onChange={(e) => updateField('alcohol', e.target.value)}
            className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-200 transition-all"
          />
        </div>
      </div>

      {saveError && (
        <p className="text-sm text-red-600 font-medium" data-testid="taxes-save-error">
          {saveError}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          data-testid="taxes-save-btn"
          onClick={handleSave}
          disabled={!hasChanges}
          className="px-5 py-2.5 bg-black text-white rounded-xl text-sm font-bold shadow-sm hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Save Tax Rates
        </button>
        {isSaved && (
          <span className="flex items-center gap-1 text-sm font-bold text-green-600" data-testid="taxes-saved">
            <Check size={16} /> Saved
          </span>
        )}
      </div>

      <p className="text-[11px] text-gray-400 font-medium">
        Current DB rates: food {taxRatesToMap(rates).food}%, alcohol {taxRatesToMap(rates).alcohol}%
      </p>
    </div>
  );
}
