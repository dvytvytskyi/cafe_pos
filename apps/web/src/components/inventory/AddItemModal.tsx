import React, { useState } from 'react';
import { X, PackageSearch, Castle, Church, Landmark, LayoutGrid, Check, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export type StockItemData = {
  id: string;
  sku: string;
  name: string;
  category: 'merch' | 'kitchen' | 'bar';
  totalStock?: number;
  minThreshold: number;
  locations: {
    main: number;
    gothic: number;
    eixample: number;
    sagrada: number;
  };
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
  
  const [locations, setLocations] = useState({
    main: '0',
    gothic: '0',
    eixample: '0',
    sagrada: '0'
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialItem && isOpen) {
      setName(initialItem.name);
      setSku(initialItem.sku);
      setCategory(initialItem.category);
      setMinThreshold(initialItem.minThreshold.toString());
      setLocations({
        main: initialItem.locations.main.toString(),
        gothic: initialItem.locations.gothic.toString(),
        eixample: initialItem.locations.eixample.toString(),
        sagrada: initialItem.locations.sagrada.toString()
      });
    } else if (isOpen) {
      setName('');
      setSku('');
      setCategory('merch');
      setMinThreshold('10');
      setLocations({ main: '0', gothic: '0', eixample: '0', sagrada: '0' });
    }
  }, [initialItem, isOpen]);

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
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0">
            <h2 className="text-xl font-bold text-gray-900">{initialItem ? 'Edit Item Details' : 'Add New Inventory Item'}</h2>
            <button 
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-gray-50 text-gray-500 flex items-center justify-center hover:bg-gray-100 hover:text-gray-800 transition-colors cursor-pointer border border-transparent hover:border-gray-200 shrink-0"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <div className="space-y-8">
              
              {/* General Info */}
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
                      placeholder="e.g. M-MUG-01"
                      className="input-corgi font-mono"
                    />
                  </div>
                  
                  <div>
                    <label className="label-corgi">Category</label>
                    <div className="relative">
                      <select 
                        value={category}
                        onChange={(e) => setCategory(e.target.value as any)}
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

              {/* Initial Stock Allocation */}
              <section>
                <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider flex items-center gap-2">
                  <LayoutGrid size={16} className="text-corgi" />
                  Initial Stock Allocation
                </h3>
                <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100">
                  <div className="grid grid-cols-2 gap-3">
                    {/* Main WH */}
                    <div className="bg-white border border-gray-100 rounded-xl p-2 pr-3 flex items-center justify-between shadow-sm hover:border-corgi/40 hover:shadow-md transition-all group">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-corgi/10 flex items-center justify-center text-corgi group-hover:bg-corgi group-hover:text-white transition-colors">
                          <LayoutGrid size={16} />
                        </div>
                        <span className="text-[13px] font-bold text-gray-900">Main WH</span>
                      </div>
                      <input 
                        type="number" 
                        value={locations.main}
                        onChange={(e) => setLocations({...locations, main: e.target.value})}
                        className="w-16 bg-gray-50 border border-transparent rounded-lg px-2 py-1.5 text-[14px] font-bold text-gray-900 text-center outline-none focus:border-corgi focus:ring-2 focus:ring-corgi/20 focus:bg-white transition-all"
                      />
                    </div>
                    
                    {/* Gótico */}
                    <div className="bg-white border border-gray-100 rounded-xl p-2 pr-3 flex items-center justify-between shadow-sm hover:border-corgi/40 hover:shadow-md transition-all group">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-corgi/10 flex items-center justify-center text-corgi group-hover:bg-corgi group-hover:text-white transition-colors">
                          <Castle size={16} />
                        </div>
                        <span className="text-[13px] font-bold text-gray-900">Gótico</span>
                      </div>
                      <input 
                        type="number" 
                        value={locations.gothic}
                        onChange={(e) => setLocations({...locations, gothic: e.target.value})}
                        className="w-16 bg-gray-50 border border-transparent rounded-lg px-2 py-1.5 text-[14px] font-bold text-gray-900 text-center outline-none focus:border-corgi focus:ring-2 focus:ring-corgi/20 focus:bg-white transition-all"
                      />
                    </div>
                    
                    {/* Eixample */}
                    <div className="bg-white border border-gray-100 rounded-xl p-2 pr-3 flex items-center justify-between shadow-sm hover:border-corgi/40 hover:shadow-md transition-all group">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-corgi/10 flex items-center justify-center text-corgi group-hover:bg-corgi group-hover:text-white transition-colors">
                          <Landmark size={16} />
                        </div>
                        <span className="text-[13px] font-bold text-gray-900">Eixample</span>
                      </div>
                      <input 
                        type="number" 
                        value={locations.eixample}
                        onChange={(e) => setLocations({...locations, eixample: e.target.value})}
                        className="w-16 bg-gray-50 border border-transparent rounded-lg px-2 py-1.5 text-[14px] font-bold text-gray-900 text-center outline-none focus:border-corgi focus:ring-2 focus:ring-corgi/20 focus:bg-white transition-all"
                      />
                    </div>
                    
                    {/* Sagrada */}
                    <div className="bg-white border border-gray-100 rounded-xl p-2 pr-3 flex items-center justify-between shadow-sm hover:border-corgi/40 hover:shadow-md transition-all group">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-corgi/10 flex items-center justify-center text-corgi group-hover:bg-corgi group-hover:text-white transition-colors">
                          <Church size={16} />
                        </div>
                        <span className="text-[13px] font-bold text-gray-900">Sagrada</span>
                      </div>
                      <input 
                        type="number" 
                        value={locations.sagrada}
                        onChange={(e) => setLocations({...locations, sagrada: e.target.value})}
                        className="w-16 bg-gray-50 border border-transparent rounded-lg px-2 py-1.5 text-[14px] font-bold text-gray-900 text-center outline-none focus:border-corgi focus:ring-2 focus:ring-corgi/20 focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                </div>
              </section>

            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-5 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 shrink-0">
            <button 
              onClick={onClose}
              className="btn-secondary-corgi"
            >
              Cancel
            </button>
            <button 
              onClick={async () => {
                if (initialItem) {
                  onClose();
                  return;
                }
                setSaving(true);
                setSaveError(null);
                try {
                  const { createInventoryItemAsync } = await import('@/lib/inventory');
                  const prefix =
                    category === 'kitchen' ? 'KIT' : category === 'bar' ? 'BAR' : 'MER';
                  const normalizedSku =
                    sku.trim().toUpperCase().match(/^INV-[A-Z]{3}-\d{4}$/)
                      ? sku.trim().toUpperCase()
                      : `INV-${prefix}-${String(Date.now()).slice(-4)}`;
                  await createInventoryItemAsync({
                    name: name.trim(),
                    sku: normalizedSku,
                    price: 0,
                    initialStock: Number.parseInt(locations.main, 10) || 0,
                    minStockLevel: Number.parseInt(minThreshold, 10) || 10,
                  });
                  onSaved?.();
                  onClose();
                } catch (err) {
                  setSaveError(err instanceof Error ? err.message : 'Failed to save item');
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving}
              className="btn-primary-corgi whitespace-nowrap min-w-[128px]"
            >
              {initialItem ? 'Save Changes' : saving ? 'Saving…' : 'Save Item'}
            </button>
          </div>
          {saveError && <p className="px-8 pb-4 text-sm text-red-500">{saveError}</p>}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
