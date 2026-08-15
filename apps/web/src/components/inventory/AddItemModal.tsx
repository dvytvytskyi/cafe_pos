import React, { useState, useEffect } from 'react';
import { X, PackageSearch, LayoutGrid, Check, ChevronDown, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  createInventoryItemAsync,
  updateInventoryItemAsync,
  getInventoryLocationsAsync,
} from '@/lib/inventory';
import type { LocationSummary } from '@/lib/locations';

export type StockItemData = {
  id: string;
  sku: string;
  name: string;
  category: 'merch' | 'kitchen' | 'bar';
  unit: string;
  totalStock?: number;
  minThreshold: number;
  locationStocks: Record<string, number>;
};

type AddItemModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialItem?: StockItemData | null;
  onSaved?: () => void;
};

export default function AddItemModal({ isOpen, onClose, initialItem, onSaved }: AddItemModalProps) {
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState<'merch' | 'kitchen' | 'bar'>('merch');
  const [unit, setUnit] = useState('pcs');
  const [minThreshold, setMinThreshold] = useState('10');
  const [locations, setLocations] = useState<LocationSummary[]>([]);
  const [locationStocks, setLocationStocks] = useState<Record<string, string>>({});
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoadingLocations(true);
    getInventoryLocationsAsync()
      .then((locs) => {
        setLocations(locs);
        const emptyStocks = Object.fromEntries(locs.map((l) => [l.id, '0']));
        if (initialItem) {
          setName(initialItem.name);
          setSku(initialItem.sku);
          setCategory(initialItem.category);
          setUnit(initialItem.unit || 'pcs');
          setMinThreshold(initialItem.minThreshold.toString());
          setLocationStocks(
            Object.fromEntries(
              locs.map((l) => [l.id, String(initialItem.locationStocks[l.id] ?? 0)])
            )
          );
        } else {
          setName('');
          setSku('');
          setCategory('merch');
          setUnit('pcs');
          setMinThreshold('10');
          setLocationStocks(emptyStocks);
        }
      })
      .catch(() => setLocations([]))
      .finally(() => setLoadingLocations(false));
  }, [initialItem, isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const stocks: Record<string, number> = {};
      for (const loc of locations) {
        stocks[loc.id] = Number.parseInt(locationStocks[loc.id] ?? '0', 10) || 0;
      }

      if (initialItem) {
        await updateInventoryItemAsync(initialItem.id, {
          name: name.trim(),
          sku: sku.trim() || undefined,
          price: 0,
          minStockLevel: Number.parseInt(minThreshold, 10) || 10,
          category,
          unit: unit.trim() || 'pcs',
          locationStocks: stocks,
        });
      } else {
        const prefix = category === 'kitchen' ? 'KIT' : category === 'bar' ? 'BAR' : 'MER';
        const normalizedSku =
          sku.trim().toUpperCase().match(/^INV-[A-Z]{3}-\d{4}$/)
            ? sku.trim().toUpperCase()
            : `INV-${prefix}-${String(Date.now()).slice(-4)}`;
        await createInventoryItemAsync({
          name: name.trim(),
          sku: normalizedSku,
          price: 0,
          minStockLevel: Number.parseInt(minThreshold, 10) || 10,
          category,
          unit: unit.trim() || 'pcs',
          locationStocks: stocks,
        });
      }
      onSaved?.();
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-white rounded-3xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        >
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0">
            <h2 className="text-xl font-bold text-gray-900">
              {initialItem ? 'Edit Item Details' : 'Add New Inventory Item'}
            </h2>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-gray-50 text-gray-500 flex items-center justify-center hover:bg-gray-100 hover:text-gray-800 transition-colors cursor-pointer border border-transparent hover:border-gray-200 shrink-0"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <div className="space-y-8">
              <section>
                <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider flex items-center gap-2">
                  <PackageSearch size={16} className="text-corgi" />
                  General Information
                </h3>

                <div className="grid grid-cols-2 gap-5">
                  <div className="col-span-2">
                    <label className="label-corgi">Item Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Corgi Signature Mug"
                      className="input-corgi"
                    />
                  </div>

                  <div>
                    <label className="label-corgi">SKU / Barcode</label>
                    <input
                      type="text"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      placeholder="e.g. INV-MER-0001"
                      readOnly={!!initialItem && !/^INV-[A-Z]{3}-\d{4}$/.test(sku.trim().toUpperCase())}
                      className="input-corgi font-mono"
                    />
                  </div>

                  <div>
                    <label className="label-corgi">Category</label>
                    <div className="relative">
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as typeof category)}
                        className="input-corgi appearance-none cursor-pointer pr-10"
                      >
                        <option value="merch">Merchandise</option>
                        <option value="kitchen">Kitchen Supply</option>
                        <option value="bar">Bar Supply</option>
                      </select>
                      <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="label-corgi">Unit</label>
                    <input
                      type="text"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      placeholder="pcs, kg, L..."
                      className="input-corgi"
                    />
                  </div>

                  <div>
                    <label className="label-corgi">Min. Threshold</label>
                    <input
                      type="number"
                      value={minThreshold}
                      onChange={(e) => setMinThreshold(e.target.value)}
                      placeholder="e.g. 10"
                      className="input-corgi"
                    />
                    <p className="label-hint mt-1">Alert when stock falls below this number</p>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider flex items-center gap-2">
                  <LayoutGrid size={16} className="text-corgi" />
                  Stock by Location
                </h3>
                {loadingLocations ? (
                  <div className="flex items-center gap-2 text-gray-500 py-6 justify-center">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-sm font-medium">Loading locations…</span>
                  </div>
                ) : (
                  <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100">
                    <div className="grid grid-cols-2 gap-3">
                      {locations.map((loc) => (
                        <div
                          key={loc.id}
                          className="bg-white border border-gray-100 rounded-xl p-2 pr-3 flex items-center justify-between shadow-sm hover:border-corgi/40 hover:shadow-md transition-all group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-corgi/10 flex items-center justify-center text-corgi group-hover:bg-corgi group-hover:text-white transition-colors shrink-0">
                              <LayoutGrid size={16} />
                            </div>
                            <span className="text-[13px] font-bold text-gray-900 truncate">{loc.name}</span>
                          </div>
                          <input
                            type="number"
                            min={0}
                            value={locationStocks[loc.id] ?? '0'}
                            onChange={(e) =>
                              setLocationStocks({ ...locationStocks, [loc.id]: e.target.value })
                            }
                            className="w-16 bg-gray-50 border border-transparent rounded-lg px-2 py-1.5 text-[14px] font-bold text-gray-900 text-center outline-none focus:border-corgi focus:ring-2 focus:ring-corgi/20 focus:bg-white transition-all shrink-0"
                          />
                        </div>
                      ))}
                    </div>
                    {locations.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">No locations configured.</p>
                    )}
                  </div>
                )}
              </section>
            </div>
          </div>

          <div className="px-8 py-5 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 shrink-0">
            <button onClick={onClose} className="btn-secondary-corgi">
              Cancel
            </button>
            <button
              onClick={() => void handleSave()}
              disabled={saving || loadingLocations || !name.trim()}
              className="btn-primary-corgi whitespace-nowrap min-w-[128px]"
            >
              {saving ? 'Saving…' : initialItem ? 'Save Changes' : 'Save Item'}
            </button>
          </div>
          {saveError && <p className="px-8 pb-4 text-sm text-red-500">{saveError}</p>}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
