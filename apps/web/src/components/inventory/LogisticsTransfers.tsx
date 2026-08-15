import React, { useState, useEffect, useCallback } from 'react';
import { ArrowRight, Truck, CheckCircle2, Clock, ArrowUpDown, ArrowUp, ArrowDown, Plus, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TransferDetailsModal, { TransferData } from './TransferDetailsModal';
import {
  completeStockTransferAsync,
  getStockTransfersAsync,
  getInventoryLocationsAsync,
  buildLocationLabelMap,
  locationLabelFromId,
  type StockTransferRecord,
} from '@/lib/inventory';

type Transfer = TransferData;

function mapTransfer(record: StockTransferRecord, labels: Record<string, string>): Transfer {
  const date = new Date(record.createdAt).toLocaleString('en-GB', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  return {
    id: record.id.slice(0, 8).toUpperCase(),
    fullId: record.id,
    date,
    item: record.item.name,
    sku: record.item.sku,
    quantity: record.quantity,
    from: locationLabelFromId(record.sourceLocationId, labels),
    to: locationLabelFromId(record.targetLocationId, labels),
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
  const [sortConfig, setSortConfig] = useState<{ key: keyof Transfer | null; direction: 'asc' | 'desc' }>({
    key: null,
    direction: 'asc',
  });

  const loadTransfers = useCallback(async () => {
    setLoading(true);
    try {
      const [data, locations] = await Promise.all([
        getStockTransfersAsync(),
        getInventoryLocationsAsync(),
      ]);
      const labels = buildLocationLabelMap(locations);
      setTransfers(data.map((r) => mapTransfer(r, labels)));
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
      setTransfers((prev) =>
        prev.map((t) => (t.fullId === id || t.id === id ? { ...t, status: newStatus } : t))
      );
      return;
    }
    const transfer = transfers.find((t) => t.fullId === id || t.id === id);
    const apiId = transfer?.fullId ?? id;
    try {
      await completeStockTransferAsync(apiId);
      await loadTransfers();
    } catch {
      await loadTransfers();
    }
  };

  const SortIcon = ({ columnKey }: { columnKey: keyof Transfer }) => {
    if (sortConfig.key !== columnKey)
      return <ArrowUpDown size={12} className="ml-1 opacity-0 group-hover:opacity-50 transition-opacity" />;
    return sortConfig.direction === 'asc' ? (
      <ArrowUp size={12} className="ml-1 text-gray-800" />
    ) : (
      <ArrowDown size={12} className="ml-1 text-gray-800" />
    );
  };

  return (
    <div className="flex flex-col h-full" data-testid="inventory-logistics-table">
      <div className="flex justify-end mb-4">
        {onAdd && (
          <button
            onClick={onAdd}
            data-testid="new-transfer-open-btn"
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-black text-white text-[13px] font-bold rounded-xl shadow-sm transition-all cursor-pointer hover:bg-gray-800"
          >
            <Plus size={16} strokeWidth={2.5} />
            New Transfer
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto rounded-xl bg-white border border-gray-100">
        {loading && (
          <div className="flex items-center justify-center py-16 text-gray-500 gap-2">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm font-medium">Loading transfers…</span>
          </div>
        )}
        {!loading && (
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-white border-b border-gray-50 sticky top-0 z-10">
                <th
                  className="px-5 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider cursor-pointer group"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center">
                    Transfer ID & Date <SortIcon columnKey="date" />
                  </div>
                </th>
                <th className="px-5 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Item Details
                </th>
                <th className="px-5 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Route
                </th>
                <th className="px-5 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-5 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Initiated By
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sortedTransfers.map((transfer) => (
                <tr
                  key={transfer.fullId}
                  onClick={() => setSelectedTransfer(transfer)}
                  className="hover:bg-gray-50/80 transition-colors cursor-pointer"
                  data-testid={`transfer-row-${transfer.id}`}
                >
                  <td className="px-5 py-4">
                    <div className="font-mono font-bold text-gray-900 text-sm">{transfer.id}</div>
                    <div className="text-[11px] font-medium text-gray-400 mt-0.5 uppercase">{transfer.date}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-bold text-gray-900 text-sm">{transfer.item}</div>
                    <div className="text-[11px] font-mono text-gray-400 mt-0.5">
                      {transfer.sku} · QTY {transfer.quantity}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 text-[13px] font-semibold text-gray-700">
                      <span>{transfer.from}</span>
                      <ArrowRight size={14} className="text-gray-300" />
                      <span>{transfer.to}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {transfer.status === 'completed' && (
                      <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                        <CheckCircle2 size={12} /> Delivered
                      </span>
                    )}
                    {transfer.status === 'in_transit' && (
                      <span className="inline-flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                        <Truck size={12} /> In Transit
                      </span>
                    )}
                    {transfer.status === 'pending' && (
                      <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                        <Clock size={12} /> Pending
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-sm font-semibold text-gray-600">{transfer.user}</td>
                </tr>
              ))}
              {sortedTransfers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500 font-medium">
                    No transfers yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <TransferDetailsModal
        transfer={selectedTransfer}
        isOpen={!!selectedTransfer}
        onClose={() => setSelectedTransfer(null)}
        onUpdateStatus={(id, status) => void handleUpdateStatus(id, status)}
      />
    </div>
  );
}
