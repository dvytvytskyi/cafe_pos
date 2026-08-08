import React, { useState, useEffect } from 'react';
import { X, PackageSearch, ArrowRightLeft, ChevronDown, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  createStockTransferAsync,
  getInventoryAsync,
  locationIdFromLabel,
  type MerchItem,
} from '@/lib/inventory';

type NewTransferModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
};

export default function NewTransferModal({ isOpen, onClose, onCreated }: NewTransferModalProps) {
  const [items, setItems] = useState<MerchItem[]>([]);
  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [fromLocation, setFromLocation] = useState('Main WH');
  const [toLocation, setToLocation] = useState('Sagrada');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setItemId('');
      setQuantity('1');
      setFromLocation('Main WH');
      setToLocation('Sagrada');
      setError(null);
      getInventoryAsync()
        .then(setItems)
        .catch(() => setItems([]));
    }
  }, [isOpen]);

  const handleCreate = async () => {
    if (!itemId) {
      setError('Select an item');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createStockTransferAsync({
        itemId,
        quantity: Number.parseInt(quantity, 10),
        sourceLocationId: locationIdFromLabel(fromLocation),
        targetLocationId: locationIdFromLabel(toLocation),
        createdByName: 'Staff',
      });
      onCreated?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create transfer');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

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
          data-testid="new-transfer-modal"
        >
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0">
            <h2 className="text-xl font-bold text-gray-900">Create New Transfer</h2>
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
                  Select Item
                </h3>
                
                <div className="flex gap-5">
                  <div className="flex-1">
                    <label className="label-corgi mb-2 block">Search Item</label>
                    <div className="relative">
                      <select 
                        value={itemId}
                        onChange={(e) => setItemId(e.target.value)}
                        data-testid="transfer-item-select"
                        className="input-corgi appearance-none cursor-pointer pr-10 w-full"
                      >
                        <option value="" disabled>Select an item to transfer...</option>
                        {items.map((inv) => (
                          <option key={inv.id} value={inv.id}>
                            {inv.name} ({inv.sku}) — {inv.quantity} in stock
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  
                  <div className="w-32 shrink-0">
                    <label className="label-corgi mb-2 block">Quantity</label>
                    <input 
                      type="number" 
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      data-testid="transfer-quantity-input"
                      placeholder="e.g. 10"
                      className="input-corgi w-full"
                    />
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider flex items-center gap-2">
                  <ArrowRightLeft size={16} className="text-corgi" />
                  Transfer Route
                </h3>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="label-corgi mb-2 block">From Location</label>
                    <div className="relative">
                      <select 
                        value={fromLocation}
                        onChange={(e) => setFromLocation(e.target.value)}
                        data-testid="transfer-from-select"
                        className="input-corgi appearance-none cursor-pointer pr-10"
                      >
                        <option value="Main WH">Main WH</option>
                        <option value="Gótico">Gótico</option>
                        <option value="Eixample">Eixample</option>
                        <option value="Sagrada">Sagrada</option>
                      </select>
                      <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  
                  <ArrowRightLeft className="w-5 h-5 text-gray-300 shrink-0 mt-8" />
                  
                  <div className="flex-1">
                    <label className="label-corgi mb-2 block">To Location</label>
                    <div className="relative">
                      <select 
                        value={toLocation}
                        onChange={(e) => setToLocation(e.target.value)}
                        data-testid="transfer-to-select"
                        className="input-corgi appearance-none cursor-pointer pr-10"
                      >
                        <option value="Main WH">Main WH</option>
                        <option value="Gótico">Gótico</option>
                        <option value="Eixample">Eixample</option>
                        <option value="Sagrada">Sagrada</option>
                      </select>
                      <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </section>

              {error && (
                <p className="text-sm font-medium text-red-500" data-testid="transfer-error">{error}</p>
              )}
            </div>
          </div>

          <div className="px-8 py-5 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 shrink-0">
            <button 
              onClick={onClose}
              className="btn-secondary-corgi"
            >
              Cancel
            </button>
            <button 
              onClick={handleCreate}
              disabled={saving}
              data-testid="transfer-create-btn"
              className="btn-primary-corgi whitespace-nowrap min-w-[128px] flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : null}
              Create Transfer
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
