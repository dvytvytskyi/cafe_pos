import React, { useState, useEffect, useCallback } from 'react';
import { ArrowRight, Truck, CheckCircle2, Clock, ArrowUpDown, ArrowUp, ArrowDown, Plus, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TransferDetailsModal, { TransferData } from './TransferDetailsModal';
import {
  completeStockTransferAsync,
  getStockTransfersAsync,
  locationLabelFromId,
  type StockTransferRecord,
} from '@/lib/inventory';

type Transfer = TransferData;

function mapTransfer(record: StockTransferRecord): Transfer {
  const date = new Date(record.createdAt).toLocaleString('en-GB', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  return {
    id: record.id,
    date,
    item: record.item.name,
    sku: record.item.sku,
    quantity: record.quantity,
    from: locationLabelFromId(record.sourceLocationId),
    to: locationLabelFromId(record.targetLocationId),
    status: record.status,
    user: record.createdByName ?? 'Staff',
  };
}

export default function LogisticsTransfers({
  onAdd,
  refreshKey = 0,
}: {
  onAdd?: () => void;
  refreshKey?: number;
}) {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Transfer | null, direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });

  const loadTransfers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getStockTransfersAsync();
      setTransfers(data.map(mapTransfer));
    } catch {
      setTransfers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTransfers();
  }, [loadTransfers, refreshKey]);

  const handleSort = (key: keyof Transfer) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedTransfers = [...transfers].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleUpdateStatus = async (id: string, newStatus: Transfer['status']) => {
    if (newStatus !== 'completed') {
      setTransfers(transfers.map(t => t.id === id ? { ...t, status: newStatus } : t));
      if (selectedTransfer?.id === id) {
        setSelectedTransfer({ ...selectedTransfer, status: newStatus });
      }
      return;
    }

    const fullRecord = transfers.find(t => t.id === id);
    if (!fullRecord) return;

    try {
      await completeStockTransferAsync(id);
      await loadTransfers();
      if (selectedTransfer?.id === id) {
        setSelectedTransfer({ ...selectedTransfer, status: 'completed' });
      }
    } catch (err) {
      console.error('Failed to complete transfer', err);
    }
  };
  const getStatusBadge = (status: Transfer['status']) => {
    switch (status) {
      case 'completed':
        return <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div><span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Delivered</span></span>;
      case 'in_transit':
        return <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div><span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">In Transit</span></span>;
      case 'pending':
        return <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]"></div><span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Pending</span></span>;
    }
  };

  return (
    <div className="flex flex-col h-full" data-testid="inventory-transfers-table">
      {onAdd && (
        <div className="flex justify-end mb-6">
          <button 
            onClick={onAdd}
            data-testid="new-transfer-open-btn"
            className="flex items-center gap-1.5 px-4 py-2 bg-black text-white text-[13px] font-bold rounded-xl shadow-sm transition-all cursor-pointer hover:bg-gray-800 hover:-translate-y-0.5 active:translate-y-0 shrink-0"
          >
            <Plus size={16} strokeWidth={2.5} />
            New Transfer
          </button>
        </div>
      )}
      <div className="flex-1 overflow-auto rounded-xl bg-white border border-gray-100">
        {loading && (
          <div className="flex items-center justify-center py-16 text-gray-500 gap-2">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm font-medium">Loading transfers…</span>
          </div>
        )}
        {!loading && (
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-white border-b border-gray-50 sticky top-0 z-10">
              <th className="px-5 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-50/50 transition-colors group" onClick={() => handleSort('id')}>
                <div className="flex items-center gap-2">
                  Transfer ID & Date
                  {sortConfig.key === 'id' ? (
                    sortConfig.direction === 'asc' ? <ArrowUp size={12} className="text-corgi" /> : <ArrowDown size={12} className="text-corgi" />
                  ) : (
                    <ArrowUpDown size={12} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              </th>
              <th className="px-5 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-50/50 transition-colors group" onClick={() => handleSort('item')}>
                <div className="flex items-center gap-2">
                  Item Details
                  {sortConfig.key === 'item' ? (
                    sortConfig.direction === 'asc' ? <ArrowUp size={12} className="text-corgi" /> : <ArrowDown size={12} className="text-corgi" />
                  ) : (
                    <ArrowUpDown size={12} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              </th>
              <th className="px-5 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-50/50 transition-colors group" onClick={() => handleSort('from')}>
                <div className="flex items-center gap-2">
                  Route
                  {sortConfig.key === 'from' ? (
                    sortConfig.direction === 'asc' ? <ArrowUp size={12} className="text-corgi" /> : <ArrowDown size={12} className="text-corgi" />
                  ) : (
                    <ArrowUpDown size={12} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              </th>
              <th className="px-5 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-50/50 transition-colors group" onClick={() => handleSort('status')}>
                <div className="flex items-center gap-2">
                  Status
                  {sortConfig.key === 'status' ? (
                    sortConfig.direction === 'asc' ? <ArrowUp size={12} className="text-corgi" /> : <ArrowDown size={12} className="text-corgi" />
                  ) : (
                    <ArrowUpDown size={12} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              </th>
              <th className="px-5 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-50/50 transition-colors group text-right" onClick={() => handleSort('user')}>
                <div className="flex items-center justify-end gap-2">
                  {sortConfig.key === 'user' ? (
                    sortConfig.direction === 'asc' ? <ArrowUp size={12} className="text-corgi" /> : <ArrowDown size={12} className="text-corgi" />
                  ) : (
                    <ArrowUpDown size={12} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                  Initiated By
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            <AnimatePresence>
              {sortedTransfers.map(transfer => (
                <motion.tr 
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  key={transfer.id} 
                  data-testid={`transfer-row-${transfer.sku}`}
                  onClick={() => setSelectedTransfer(transfer)}
                  className="hover:bg-gray-50/80 transition-colors group cursor-pointer"
                >
                <td className="px-5 py-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-gray-900 text-sm">{transfer.id.slice(0, 8).toUpperCase()}</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">{transfer.date}</span>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-gray-900 text-sm">{transfer.item}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-mono font-medium text-gray-400">{transfer.sku}</span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Qty: <span className="text-gray-600">{transfer.quantity}</span></span>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{transfer.from}</span>
                    <ArrowRight className="w-3 h-3 text-gray-300" />
                    <span className="text-[10px] font-bold text-gray-900 uppercase tracking-wider bg-gray-100 px-2 py-0.5 rounded border border-gray-200">{transfer.to}</span>
                  </div>
                </td>
                <td className="px-5 py-3">
                  {getStatusBadge(transfer.status)}
                </td>
                <td className="px-5 py-3 text-right">
                  <span className="text-sm font-semibold text-gray-600">{transfer.user}</span>
                </td>
              </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
        )}
      </div>

      <TransferDetailsModal 
        isOpen={!!selectedTransfer} 
        transfer={selectedTransfer}
        onClose={() => setSelectedTransfer(null)}
        onUpdateStatus={handleUpdateStatus}
      />
    </div>
  );
}
