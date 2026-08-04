import React, { useState } from 'react';
import { ArrowRight, Truck, CheckCircle2, Clock, ArrowUpDown, ArrowUp, ArrowDown, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TransferDetailsModal, { TransferData } from './TransferDetailsModal';

// Re-using the exported type from the modal
type Transfer = TransferData;

const MOCK_TRANSFERS: Transfer[] = [
  { id: 'TRF-1042', date: 'Jul 3, 14:30', item: 'Corgi Signature Mug', sku: 'M-MUG-01', quantity: 50, from: 'Main WH', to: 'Sagrada', status: 'completed', user: 'Emma W.' },
  { id: 'TRF-1043', date: 'Jul 3, 10:15', item: 'Oat Milk 1L', sku: 'K-MILK-01', quantity: 24, from: 'Main WH', to: 'Eixample', status: 'in_transit', user: 'James L.' },
  { id: 'TRF-1044', date: 'Jul 2, 18:45', item: 'Vanilla Syrup 1L', sku: 'B-SYR-01', quantity: 5, from: 'Eixample', to: 'Gótico', status: 'completed', user: 'Sophia R.' },
  { id: 'TRF-1045', date: 'Jul 2, 09:00', item: 'Corgi Staff T-Shirt', sku: 'M-TEE-02', quantity: 10, from: 'Main WH', to: 'Arc de Triomf', status: 'pending', user: 'Oliver T.' },
  { id: 'TRF-1046', date: 'Jul 4, 08:30', item: 'Free Range Eggs (Dozen)', sku: 'K-EGG-01', quantity: 15, from: 'Main WH', to: 'Gótico', status: 'in_transit', user: 'Liam K.' },
  { id: 'TRF-1047', date: 'Jul 4, 09:15', item: 'Takeaway Cups 8oz', sku: 'B-CUP-01', quantity: 500, from: 'Main WH', to: 'Eixample', status: 'completed', user: 'Emma W.' },
  { id: 'TRF-1048', date: 'Jul 3, 16:20', item: 'Ceremonial Matcha 500g', sku: 'B-MTCH-01', quantity: 2, from: 'Main WH', to: 'Sagrada', status: 'completed', user: 'James L.' },
  { id: 'TRF-1049', date: 'Jul 3, 11:00', item: 'Corgi Tote Bag', sku: 'M-BAG-01', quantity: 10, from: 'Main WH', to: 'Eixample', status: 'pending', user: 'Sophia R.' },
  { id: 'TRF-1050', date: 'Jul 2, 14:10', item: 'Sourdough Loaf', sku: 'K-BREAD-01', quantity: 20, from: 'Main WH', to: 'Gótico', status: 'completed', user: 'Oliver T.' },
  { id: 'TRF-1051', date: 'Jul 4, 07:45', item: 'Enamel Corgi Pin', sku: 'M-PIN-01', quantity: 100, from: 'Main WH', to: 'Sagrada', status: 'in_transit', user: 'Liam K.' },
  { id: 'TRF-1052', date: 'Jul 4, 10:05', item: 'Spiced Chai Mix 1kg', sku: 'B-CHAI-01', quantity: 5, from: 'Main WH', to: 'Gótico', status: 'pending', user: 'Emma W.' },
  { id: 'TRF-1053', date: 'Jul 3, 08:30', item: 'Hass Avocados (Box)', sku: 'K-AVO-01', quantity: 3, from: 'Main WH', to: 'Eixample', status: 'completed', user: 'James L.' },
  { id: 'TRF-1054', date: 'Jul 2, 17:50', item: 'Corgi Dad Cap', sku: 'M-HAT-01', quantity: 5, from: 'Main WH', to: 'Gótico', status: 'completed', user: 'Sophia R.' },
  { id: 'TRF-1055', date: 'Jul 4, 11:30', item: 'All-Purpose Flour 25kg', sku: 'K-FLR-01', quantity: 2, from: 'Main WH', to: 'Sagrada', status: 'in_transit', user: 'Oliver T.' },
  { id: 'TRF-1056', date: 'Jul 3, 15:40', item: 'Cup Lids 8oz/12oz', sku: 'B-LID-01', quantity: 1000, from: 'Main WH', to: 'Eixample', status: 'completed', user: 'Liam K.' },
  { id: 'TRF-1057', date: 'Jul 4, 09:20', item: 'Corgi Print Socks', sku: 'M-SOCKS-01', quantity: 15, from: 'Main WH', to: 'Gótico', status: 'pending', user: 'Emma W.' },
  { id: 'TRF-1058', date: 'Jul 2, 12:15', item: 'Unsalted Butter 1kg', sku: 'K-BUT-01', quantity: 4, from: 'Main WH', to: 'Sagrada', status: 'completed', user: 'James L.' },
  { id: 'TRF-1059', date: 'Jul 3, 13:25', item: 'Hot Chocolate Powder 2kg', sku: 'B-COCO-01', quantity: 6, from: 'Main WH', to: 'Eixample', status: 'completed', user: 'Sophia R.' },
  { id: 'TRF-1060', date: 'Jul 4, 08:10', item: 'Smoked Bacon 5kg', sku: 'K-BACON-01', quantity: 2, from: 'Main WH', to: 'Gótico', status: 'in_transit', user: 'Oliver T.' },
  { id: 'TRF-1061', date: 'Jul 3, 10:45', item: 'Paper Straws (Pack)', sku: 'B-STRAW-01', quantity: 50, from: 'Main WH', to: 'Sagrada', status: 'pending', user: 'Liam K.' },
  { id: 'TRF-1062', date: 'Jul 4, 12:00', item: 'Corgi Hoodie (L)', sku: 'M-HOOD-01', quantity: 3, from: 'Main WH', to: 'Eixample', status: 'in_transit', user: 'Emma W.' },
  { id: 'TRF-1063', date: 'Jul 2, 08:55', item: 'Cherry Tomatoes (Box)', sku: 'K-TOM-01', quantity: 4, from: 'Main WH', to: 'Gótico', status: 'completed', user: 'James L.' },
  { id: 'TRF-1064', date: 'Jul 3, 17:30', item: 'Soy Milk 1L', sku: 'B-SMLK-01', quantity: 12, from: 'Main WH', to: 'Sagrada', status: 'completed', user: 'Sophia R.' },
  { id: 'TRF-1065', date: 'Jul 4, 09:50', item: 'Cheddar Cheese Block', sku: 'K-CHZ-01', quantity: 5, from: 'Main WH', to: 'Eixample', status: 'pending', user: 'Oliver T.' },
];

export default function LogisticsTransfers({ onAdd }: { onAdd?: () => void }) {
  const [transfers, setTransfers] = useState<Transfer[]>(MOCK_TRANSFERS);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Transfer | null, direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });

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

  const handleUpdateStatus = (id: string, newStatus: Transfer['status']) => {
    setTransfers(transfers.map(t => t.id === id ? { ...t, status: newStatus } : t));
    if (selectedTransfer?.id === id) {
      setSelectedTransfer({ ...selectedTransfer, status: newStatus });
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
    <div className="flex flex-col h-full">
      {onAdd && (
        <div className="flex justify-end mb-6">
          <button 
            onClick={onAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-black text-white text-[13px] font-bold rounded-xl shadow-sm transition-all cursor-pointer hover:bg-gray-800 hover:-translate-y-0.5 active:translate-y-0 shrink-0"
          >
            <Plus size={16} strokeWidth={2.5} />
            New Transfer
          </button>
        </div>
      )}
      <div className="flex-1 overflow-auto rounded-xl bg-white border border-gray-100">
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
                  onClick={() => setSelectedTransfer(transfer)}
                  className="hover:bg-gray-50/80 transition-colors group cursor-pointer"
                >
                <td className="px-5 py-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-gray-900 text-sm">{transfer.id}</span>
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
