import React, { useState } from 'react';
import { PackageSearch, Download, Search, MapPin, ChevronDown, Check, Loader2, ArrowUpDown, ArrowUp, ArrowDown, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AddItemModal, { StockItemData } from './AddItemModal';

type StockStatus = 'healthy' | 'low' | 'out';
type Category = 'merch' | 'kitchen' | 'bar';

interface StockItem {
  id: string;
  sku: string;
  name: string;
  category: Category;
  totalStock: number;
  minThreshold: number;
  status: StockStatus;
  locations: {
    main: number;
    gothic: number;
    eixample: number;
    sagrada: number;
  };
}

const MOCK_INVENTORY: StockItem[] = [
  { id: '1', sku: 'M-MUG-01', name: 'Corgi Signature Mug', category: 'merch', totalStock: 45, minThreshold: 50, status: 'low', locations: { main: 20, gothic: 5, eixample: 10, sagrada: 10 } },
  { id: '2', sku: 'M-TEE-02', name: 'Corgi Staff T-Shirt (M)', category: 'merch', totalStock: 120, minThreshold: 30, status: 'healthy', locations: { main: 100, gothic: 5, eixample: 10, sagrada: 5 } },
  { id: '3', sku: 'K-MILK-01', name: 'Oat Milk (Barista Edition) 1L', category: 'kitchen', totalStock: 12, minThreshold: 24, status: 'out', locations: { main: 12, gothic: 0, eixample: 0, sagrada: 0 } },
  { id: '4', sku: 'B-CFB-01', name: 'Corgi Blend Coffee Beans 1kg', category: 'bar', totalStock: 85, minThreshold: 20, status: 'healthy', locations: { main: 50, gothic: 10, eixample: 15, sagrada: 10 } },
  { id: '5', sku: 'B-SYR-01', name: 'Vanilla Syrup 1L', category: 'bar', totalStock: 15, minThreshold: 10, status: 'healthy', locations: { main: 5, gothic: 3, eixample: 4, sagrada: 3 } },
  { id: '6', sku: 'M-BAG-01', name: 'Corgi Tote Bag', category: 'merch', totalStock: 8, minThreshold: 15, status: 'low', locations: { main: 8, gothic: 0, eixample: 0, sagrada: 0 } },
  { id: '7', sku: 'K-EGG-01', name: 'Free Range Eggs (Dozen)', category: 'kitchen', totalStock: 150, minThreshold: 50, status: 'healthy', locations: { main: 100, gothic: 20, eixample: 15, sagrada: 15 } },
  { id: '8', sku: 'B-MTCH-01', name: 'Ceremonial Matcha 500g', category: 'bar', totalStock: 3, minThreshold: 5, status: 'low', locations: { main: 2, gothic: 1, eixample: 0, sagrada: 0 } },
  { id: '9', sku: 'K-BREAD-01', name: 'Sourdough Loaf', category: 'kitchen', totalStock: 0, minThreshold: 10, status: 'out', locations: { main: 0, gothic: 0, eixample: 0, sagrada: 0 } },
  { id: '10', sku: 'M-PIN-01', name: 'Enamel Corgi Pin', category: 'merch', totalStock: 250, minThreshold: 50, status: 'healthy', locations: { main: 150, gothic: 30, eixample: 40, sagrada: 30 } },
  { id: '11', sku: 'B-CHAI-01', name: 'Spiced Chai Mix 1kg', category: 'bar', totalStock: 18, minThreshold: 15, status: 'healthy', locations: { main: 10, gothic: 2, eixample: 4, sagrada: 2 } },
  { id: '12', sku: 'K-AVO-01', name: 'Hass Avocados (Box)', category: 'kitchen', totalStock: 5, minThreshold: 10, status: 'low', locations: { main: 5, gothic: 0, eixample: 0, sagrada: 0 } },
  { id: '13', sku: 'B-CUP-01', name: 'Takeaway Cups 8oz', category: 'bar', totalStock: 5000, minThreshold: 1000, status: 'healthy', locations: { main: 3000, gothic: 500, eixample: 800, sagrada: 700 } },
  { id: '14', sku: 'M-HAT-01', name: 'Corgi Dad Cap', category: 'merch', totalStock: 12, minThreshold: 20, status: 'low', locations: { main: 10, gothic: 0, eixample: 2, sagrada: 0 } },
  { id: '15', sku: 'K-FLR-01', name: 'All-Purpose Flour 25kg', category: 'kitchen', totalStock: 8, minThreshold: 5, status: 'healthy', locations: { main: 8, gothic: 0, eixample: 0, sagrada: 0 } },
  { id: '16', sku: 'B-LID-01', name: 'Cup Lids 8oz/12oz', category: 'bar', totalStock: 4500, minThreshold: 1000, status: 'healthy', locations: { main: 2500, gothic: 500, eixample: 800, sagrada: 700 } },
  { id: '17', sku: 'M-SOCKS-01', name: 'Corgi Print Socks', category: 'merch', totalStock: 85, minThreshold: 30, status: 'healthy', locations: { main: 50, gothic: 10, eixample: 15, sagrada: 10 } },
  { id: '18', sku: 'K-BUT-01', name: 'Unsalted Butter 1kg', category: 'kitchen', totalStock: 4, minThreshold: 10, status: 'low', locations: { main: 4, gothic: 0, eixample: 0, sagrada: 0 } },
  { id: '19', sku: 'B-COCO-01', name: 'Hot Chocolate Powder 2kg', category: 'bar', totalStock: 22, minThreshold: 10, status: 'healthy', locations: { main: 12, gothic: 3, eixample: 4, sagrada: 3 } },
  { id: '20', sku: 'K-BACON-01', name: 'Smoked Bacon 5kg', category: 'kitchen', totalStock: 0, minThreshold: 5, status: 'out', locations: { main: 0, gothic: 0, eixample: 0, sagrada: 0 } },
  { id: '21', sku: 'B-STRAW-01', name: 'Paper Straws (Pack)', category: 'bar', totalStock: 150, minThreshold: 50, status: 'healthy', locations: { main: 100, gothic: 10, eixample: 20, sagrada: 20 } },
  { id: '22', sku: 'M-HOOD-01', name: 'Corgi Hoodie (L)', category: 'merch', totalStock: 18, minThreshold: 20, status: 'low', locations: { main: 15, gothic: 1, eixample: 1, sagrada: 1 } },
  { id: '23', sku: 'K-TOM-01', name: 'Cherry Tomatoes (Box)', category: 'kitchen', totalStock: 12, minThreshold: 15, status: 'low', locations: { main: 12, gothic: 0, eixample: 0, sagrada: 0 } },
  { id: '24', sku: 'B-SMLK-01', name: 'Soy Milk 1L', category: 'bar', totalStock: 48, minThreshold: 24, status: 'healthy', locations: { main: 30, gothic: 5, eixample: 8, sagrada: 5 } },
  { id: '25', sku: 'K-CHZ-01', name: 'Cheddar Cheese Block', category: 'kitchen', totalStock: 25, minThreshold: 10, status: 'healthy', locations: { main: 15, gothic: 3, eixample: 4, sagrada: 3 } },
];

export default function StockTable({ onAdd }: { onAdd?: () => void }) {
  const [filter, setFilter] = useState<Category | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [selectedItem, setSelectedItem] = useState<StockItemData | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [exportState, setExportState] = useState<'idle' | 'exporting' | 'done'>('idle');

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedItems = React.useMemo(() => {
    let sortableItems = [...MOCK_INVENTORY];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue: any = a[sortConfig.key as keyof StockItem];
        let bValue: any = b[sortConfig.key as keyof StockItem];
        
        // Handle nested locations
        if (['main', 'gothic', 'eixample', 'sagrada'].includes(sortConfig.key)) {
          aValue = a.locations[sortConfig.key as keyof typeof a.locations];
          bValue = b.locations[sortConfig.key as keyof typeof b.locations];
        } else if (sortConfig.key === 'status') {
          // simple mapping for status priority: out < low < healthy
          const statusVal = { out: 0, low: 1, healthy: 2 };
          aValue = statusVal[a.status];
          bValue = statusVal[b.status];
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [sortConfig]);

  const filteredItems = sortedItems.filter(item => {
    const matchesFilter = filter === 'all' || item.category === filter;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleExportCSV = async () => {
    if (exportState !== 'idle') return;
    setExportState('exporting');
    
    // Simulate generation delay for smooth UI
    await new Promise(resolve => setTimeout(resolve, 500));

    const headers = [
      'SKU', 'Name', 'Category', 'Status', 'Total Stock', 
      'Min Threshold', 'Main WH', 'Gótico', 'Eixample', 'Sagrada'
    ];

    const rows = filteredItems.map(item => [
      item.sku,
      `"${item.name}"`,
      item.category,
      item.status,
      item.totalStock,
      item.minThreshold,
      item.locations.main,
      item.locations.gothic,
      item.locations.eixample,
      item.locations.sagrada
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `inventory_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setExportState('done');
    await new Promise(resolve => setTimeout(resolve, 1000));
    setExportState('idle');
  };

  const getStatusBadge = (status: StockStatus) => {
    switch (status) {
      case 'healthy':
        return <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div><span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Healthy</span></span>;
      case 'low':
        return <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]"></div><span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Low Stock</span></span>;
      case 'out':
        return <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-red-500"></div><span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Critical</span></span>;
    }
  };

  const getCategoryLabel = (cat: Category) => {
    switch(cat) {
      case 'merch': return 'Merch';
      case 'kitchen': return 'Kitchen';
      case 'bar': return 'Bar';
    }
  }

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig?.key !== columnKey) return <ArrowUpDown size={12} className="ml-1 opacity-0 group-hover:opacity-50 transition-opacity" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={12} className="ml-1 text-gray-800" /> : <ArrowDown size={12} className="ml-1 text-gray-800" />;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col gap-4 mb-6">
        {/* Row 1: Search, Locations, Add Item */}
        <div className="flex flex-wrap sm:flex-nowrap justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative group shrink-0 w-full sm:w-auto">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input 
                type="text" 
                placeholder="Search SKU or item name..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-[270px] bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-[13px] font-semibold text-gray-800 outline-none hover:border-gray-300 focus:border-corgi focus:ring-4 focus:ring-corgi/10 transition-all placeholder:font-medium placeholder:text-gray-400"
              />
            </div>
            
            <div className="relative shrink-0 hidden sm:block">
              <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <select 
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="appearance-none bg-white border border-gray-200 rounded-xl pl-9 pr-8 py-2 text-[13px] font-semibold text-gray-800 outline-none hover:border-gray-300 focus:border-corgi focus:ring-4 focus:ring-corgi/10 transition-all cursor-pointer"
              >
                <option value="all">All Locations</option>
                <option value="gotico">Gothic</option>
                <option value="sagrada">Sagrada</option>
                <option value="arc">Arc de Triumph</option>
                <option value="eixample">Eixample</option>
                <option value="gracia">Gracia</option>
              </select>
              <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
          
          {onAdd && (
            <button 
              onClick={onAdd}
              className="flex items-center justify-center gap-1.5 w-full sm:w-auto px-4 py-2 bg-black text-white text-[13px] font-bold rounded-xl shadow-sm transition-all cursor-pointer hover:bg-gray-800 hover:-translate-y-0.5 active:translate-y-0 shrink-0"
            >
              <Plus size={16} strokeWidth={2.5} />
              Add Item
            </button>
          )}
        </div>
        
        {/* Row 2: Tabs, Export */}
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-0.5 h-9 bg-gray-50/80 p-1 rounded-xl border border-gray-200/60 shrink-0">
            {(['all', 'merch', 'bar', 'kitchen'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`cursor-pointer whitespace-nowrap h-7 flex items-center justify-center px-4 text-[13px] font-semibold capitalize rounded-lg transition-all duration-200 ${filter === cat ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'}`}
              >
                {cat}
              </button>
            ))}
          </div>
          <button 
            onClick={handleExportCSV}
            disabled={exportState !== 'idle'}
            title="Export to CSV"
            className="relative overflow-hidden flex items-center justify-center px-4 w-auto h-9 min-w-[130px] bg-white border border-gray-200 rounded-xl text-[13px] font-bold text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors cursor-pointer disabled:opacity-90 disabled:cursor-default shrink-0"
          >
            <AnimatePresence mode="wait">
              {exportState === 'idle' && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-2"
                >
                  <Download size={14} />
                  <span>Export to CSV</span>
                </motion.div>
              )}
              {exportState === 'exporting' && (
                <motion.div
                  key="exporting"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-2 text-corgi"
                >
                  <Loader2 size={14} className="animate-spin" />
                  <span>Exporting...</span>
                </motion.div>
              )}
              {exportState === 'done' && (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-2 text-green-600"
                >
                  <Check size={14} strokeWidth={3} />
                  <span>Done</span>
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto rounded-xl bg-white border border-gray-100">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-white border-b border-gray-50 sticky top-0 z-10">
              <th className="px-5 py-4 text-[10px] font-bold text-gray-400 hover:text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-50/50 transition-colors group" onClick={() => handleSort('name')}>
                <div className="flex items-center">Item Details <SortIcon columnKey="name" /></div>
              </th>
              <th className="px-5 py-4 text-[10px] font-bold text-gray-400 hover:text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-50/50 transition-colors group" onClick={() => handleSort('status')}>
                <div className="flex items-center">Status <SortIcon columnKey="status" /></div>
              </th>
              <th className="px-5 py-4 text-[10px] font-bold text-gray-400 hover:text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-50/50 transition-colors group" onClick={() => handleSort('totalStock')}>
                <div className="flex items-center">Total Stock <SortIcon columnKey="totalStock" /></div>
              </th>
              <th className="px-5 py-4 text-[10px] font-bold text-gray-400 hover:text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-50/50 transition-colors group" onClick={() => handleSort('main')}>
                <div className="flex items-center">Main WH <SortIcon columnKey="main" /></div>
              </th>
              <th className="px-5 py-4 text-[10px] font-bold text-gray-400 hover:text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-50/50 transition-colors group" onClick={() => handleSort('gothic')}>
                <div className="flex items-center">Gótico <SortIcon columnKey="gothic" /></div>
              </th>
              <th className="px-5 py-4 text-[10px] font-bold text-gray-400 hover:text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-50/50 transition-colors group" onClick={() => handleSort('eixample')}>
                <div className="flex items-center">Eixample <SortIcon columnKey="eixample" /></div>
              </th>
              <th className="px-5 py-4 text-[10px] font-bold text-gray-400 hover:text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-50/50 transition-colors group" onClick={() => handleSort('sagrada')}>
                <div className="flex items-center">Sagrada <SortIcon columnKey="sagrada" /></div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            <AnimatePresence>
              {filteredItems.map(item => (
                <motion.tr 
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  key={item.id} 
                  onClick={() => setSelectedItem(item as unknown as StockItemData)}
                  className="hover:bg-gray-50/80 transition-colors group cursor-pointer"
                >
                <td className="px-5 py-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-gray-900 text-sm">{item.name}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-mono font-medium text-gray-400">{item.sku}</span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{getCategoryLabel(item.category)}</span>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3">
                  {getStatusBadge(item.status)}
                </td>
                <td className="px-5 py-3">
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-900 text-sm">{item.totalStock}</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">Min: {item.minThreshold}</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-sm font-semibold text-gray-600">{item.locations.main}</td>
                <td className="px-5 py-3 text-sm font-semibold text-gray-600">{item.locations.gothic}</td>
                <td className="px-5 py-3 text-sm font-semibold text-gray-600">{item.locations.eixample}</td>
                <td className="px-5 py-3 text-sm font-semibold text-gray-600">{item.locations.sagrada}</td>
                </motion.tr>
              ))}
            </AnimatePresence>
            {filteredItems.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500 font-medium">
                  No inventory items found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AddItemModal 
        isOpen={!!selectedItem} 
        onClose={() => setSelectedItem(null)} 
        initialItem={selectedItem}
      />
    </div>
  );
}
