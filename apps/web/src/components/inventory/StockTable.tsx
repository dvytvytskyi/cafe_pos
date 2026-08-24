import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PackageSearch, Download, Search, MapPin, ChevronDown, Check, Loader2, ArrowUpDown, ArrowUp, ArrowDown, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AddItemModal, { StockItemData } from './AddItemModal';
import {
  getInventoryAsync,
  getInventoryLocationsAsync,
  locationStocksToMap,
  stockStatusFromQuantity,
  type MerchItem,
} from '@/lib/inventory';
import type { LocationSummary } from '@/lib/locations';

type StockStatus = 'healthy' | 'low' | 'out';
type Category = 'merch' | 'kitchen' | 'bar';

interface StockItem {
  id: string;
  sku: string;
  name: string;
  category: Category;
  unit: string;
  totalStock: number;
  minThreshold: number;
  status: StockStatus;
  locationStocks: Record<string, number>;
}

function mapMerchToStock(item: MerchItem, locationIds: string[]): StockItem {
  const stocks = locationStocksToMap(item);
  for (const id of locationIds) {
    if (stocks[id] === undefined) stocks[id] = 0;
  }
  const minThreshold = item.minStockLevel ?? 10;
  const category = (item.category ?? 'merch') as Category;
  return {
    id: item.id,
    sku: item.sku,
    name: item.name,
    category,
    unit: item.unit ?? 'pcs',
    totalStock: item.quantity,
    minThreshold,
    status: stockStatusFromQuantity(item.quantity, minThreshold),
    locationStocks: stocks,
  };
}

export default function StockTable({
  onAdd,
  refreshKey = 0,
}: {
  onAdd?: () => void;
  refreshKey?: number;
}) {
  const [items, setItems] = useState<StockItem[]>([]);
  const [locations, setLocations] = useState<LocationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Category | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [selectedItem, setSelectedItem] = useState<StockItemData | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [exportState, setExportState] = useState<'idle' | 'exporting' | 'done'>('idle');

  const loadItems = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [data, locs] = await Promise.all([getInventoryAsync(), getInventoryLocationsAsync()]);
      setLocations(locs);
      setItems(data.map((item) => mapMerchToStock(item, locs.map((l) => l.id))));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems, refreshKey]);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedItems = useMemo(() => {
    let sortableItems = [...items];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue: number | string;
        let bValue: number | string;
        if (sortConfig.key === 'name' || sortConfig.key === 'status' || sortConfig.key === 'totalStock') {
          aValue = a[sortConfig.key as 'name' | 'status' | 'totalStock'];
          bValue = b[sortConfig.key as 'name' | 'status' | 'totalStock'];
        } else {
          aValue = a.locationStocks[sortConfig.key] ?? 0;
          bValue = b.locationStocks[sortConfig.key] ?? 0;
        }
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [sortConfig, items]);

  const filteredItems = sortedItems.filter((item) => {
    const matchesFilter = filter === 'all' || item.category === filter;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLocation =
      locationFilter === 'all' || (item.locationStocks[locationFilter] ?? 0) > 0;
    return matchesFilter && matchesSearch && matchesLocation;
  });

  const handleExportCSV = async () => {
    if (exportState !== 'idle') return;
    setExportState('exporting');
    await new Promise((resolve) => setTimeout(resolve, 500));

    const headers = [
      'SKU',
      'Name',
      'Category',
      'Unit',
      'Status',
      'Total Stock',
      'Min Threshold',
      ...locations.map((l) => l.name),
    ];

    const rows = filteredItems.map((item) => [
      item.sku,
      `"${item.name}"`,
      item.category,
      item.unit,
      item.status,
      item.totalStock,
      item.minThreshold,
      ...locations.map((l) => item.locationStocks[l.id] ?? 0),
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `inventory_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setExportState('done');
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setExportState('idle');
  };

  const getStatusBadge = (status: StockStatus) => {
    switch (status) {
      case 'healthy':
        return (
          <span className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Healthy</span>
          </span>
        );
      case 'low':
        return (
          <span className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#EE635E]"></div>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Low Stock</span>
          </span>
        );
      case 'out':
        return (
          <span className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Critical</span>
          </span>
        );
    }
  };

  const getCategoryLabel = (cat: Category) => {
    switch (cat) {
      case 'merch':
        return 'Merch';
      case 'kitchen':
        return 'Kitchen';
      case 'bar':
        return 'Bar';
    }
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig?.key !== columnKey)
      return <ArrowUpDown size={12} className="ml-1 opacity-0 group-hover:opacity-50 transition-opacity" />;
    return sortConfig.direction === 'asc' ? (
      <ArrowUp size={12} className="ml-1 text-gray-800" />
    ) : (
      <ArrowDown size={12} className="ml-1 text-gray-800" />
    );
  };

  const colSpan = 3 + locations.length;

  return (
    <div className="flex flex-col h-full" data-testid="inventory-stock-table">
      <div className="flex flex-col gap-4 mb-6">
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
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
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

        <div className="flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-0.5 h-9 bg-gray-50/80 p-1 rounded-xl border border-gray-200/60 shrink-0">
            {(['all', 'merch', 'bar', 'kitchen'] as const).map((cat) => (
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
            onClick={() => void handleExportCSV()}
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
        {loading && (
          <div className="flex items-center justify-center py-16 text-gray-500 gap-2">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm font-medium">Loading inventory…</span>
          </div>
        )}
        {!loading && loadError && (
          <div className="px-6 py-12 text-center text-red-500 font-medium">{loadError}</div>
        )}
        {!loading && !loadError && (
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-white border-b border-gray-50 sticky top-0 z-10">
                <th
                  className="px-5 py-4 text-[10px] font-bold text-gray-400 hover:text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-50/50 transition-colors group"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center">
                    Item Details <SortIcon columnKey="name" />
                  </div>
                </th>
                <th
                  className="px-5 py-4 text-[10px] font-bold text-gray-400 hover:text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-50/50 transition-colors group"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center">
                    Status <SortIcon columnKey="status" />
                  </div>
                </th>
                <th
                  className="px-5 py-4 text-[10px] font-bold text-gray-400 hover:text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-50/50 transition-colors group"
                  onClick={() => handleSort('totalStock')}
                >
                  <div className="flex items-center">
                    Total Stock <SortIcon columnKey="totalStock" />
                  </div>
                </th>
                {locations.map((loc) => (
                  <th
                    key={loc.id}
                    className="px-5 py-4 text-[10px] font-bold text-gray-400 hover:text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-50/50 transition-colors group"
                    onClick={() => handleSort(loc.id)}
                  >
                    <div className="flex items-center">
                      {loc.name} <SortIcon columnKey={loc.id} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <AnimatePresence>
                {filteredItems.map((item) => (
                  <motion.tr
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    key={item.id}
                    data-testid={`inventory-row-${item.sku}`}
                    onClick={() =>
                      setSelectedItem({
                        id: item.id,
                        sku: item.sku,
                        name: item.name,
                        category: item.category,
                        unit: item.unit,
                        minThreshold: item.minThreshold,
                        locationStocks: item.locationStocks,
                      })
                    }
                    className="hover:bg-gray-50/80 transition-colors group cursor-pointer"
                  >
                    <td className="px-5 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-gray-900 text-sm">{item.name}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-mono font-medium text-gray-400">{item.sku}</span>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            {getCategoryLabel(item.category)}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">{getStatusBadge(item.status)}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900 text-sm">{item.totalStock}</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">
                          Min: {item.minThreshold}
                        </span>
                      </div>
                    </td>
                    {locations.map((loc) => (
                      <td key={loc.id} className="px-5 py-3 text-sm font-semibold text-gray-600">
                        {item.locationStocks[loc.id] ?? 0}
                      </td>
                    ))}
                  </motion.tr>
                ))}
              </AnimatePresence>
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={colSpan} className="px-6 py-12 text-center text-gray-500 font-medium">
                    No inventory items found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <AddItemModal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        initialItem={selectedItem}
        onSaved={loadItems}
      />
    </div>
  );
}
