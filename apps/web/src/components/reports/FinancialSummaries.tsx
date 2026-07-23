import React, { useState } from 'react';
import { FileText, ShieldCheck, AlertCircle, RefreshCw, XCircle, FilePlus, Filter, Check, Copy } from 'lucide-react';

// Mock Data for Ledger
type LedgerEntry = {
  id: string;
  time: string;
  location: string;
  type: 'Receipt' | 'Void';
  amount: number;
  base: number;
  iva: number;
  hash: string;
  synced: boolean;
};

const MOCK_LEDGER: LedgerEntry[] = [
  { id: 'TKT-2605-0042', time: '14:32', location: 'Eixample', type: 'Receipt', amount: 42.50, base: 38.64, iva: 3.86, hash: 'a1b2...8f9e', synced: true },
  { id: 'TKT-2605-0043', time: '14:35', location: 'Gótico', type: 'Receipt', amount: 15.00, base: 13.64, iva: 1.36, hash: 'c3d4...7e6d', synced: true },
  { id: 'TKT-2605-0044', time: '14:38', location: 'Arc de Triomf', type: 'Void', amount: -28.00, base: -25.45, iva: -2.55, hash: 'e5f6...5c4b', synced: true },
  { id: 'TKT-2605-0045', time: '14:41', location: 'Sagrada Família', type: 'Receipt', amount: 89.90, base: 81.73, iva: 8.17, hash: 'g7h8...3a2z', synced: true },
  { id: 'TKT-2605-0046', time: '14:45', location: 'Eixample', type: 'Receipt', amount: 12.50, base: 11.36, iva: 1.14, hash: 'i9j0...1y0x', synced: false },
  { id: 'TKT-2605-0047', time: '14:50', location: 'Gràcia', type: 'Receipt', amount: 55.00, base: 50.00, iva: 5.00, hash: 'k1l2...9w8v', synced: false },
  { id: 'TKT-2605-0048', time: '14:55', location: 'Gótico', type: 'Void', amount: -15.00, base: -13.64, iva: -1.36, hash: 'm3n4...7u6t', synced: false },
];

export function FinancialSummaries() {
  const [filter, setFilter] = useState<'All' | 'Receipt' | 'Void'>('All');
  const [ledger, setLedger] = useState<LedgerEntry[]>(MOCK_LEDGER);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const loadMore = () => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);
    
    setTimeout(() => {
      const newEntries: LedgerEntry[] = Array.from({ length: 10 }).map((_, i) => {
        const idNum = ledger.length + i + 49;
        const type = Math.random() > 0.8 ? 'Void' : 'Receipt';
        const base = type === 'Void' ? -(10 + Math.random() * 40) : (10 + Math.random() * 80);
        const iva = base * 0.1;
        const amount = base + iva;
        return {
          id: `TKT-2605-${idNum.toString().padStart(4, '0')}`,
          time: `15:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
          location: ['Eixample', 'Gótico', 'Arc de Triomf', 'Sagrada Família', 'Gràcia'][Math.floor(Math.random() * 5)],
          type,
          amount,
          base,
          iva,
          hash: Math.random().toString(36).substring(2, 6) + '...' + Math.random().toString(36).substring(2, 6),
          synced: Math.random() > 0.3
        };
      });
      setLedger(prev => [...prev, ...newEntries]);
      setIsLoadingMore(false);
    }, 800); // Simulate network delay
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    // Add a small threshold (10px) to trigger slightly before bottom
    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 10) {
      loadMore();
    }
  };

  const filteredLedger = ledger.filter(entry => filter === 'All' || entry.type === filter);

  return (
    <div className="border border-gray-100 rounded-3xl p-6 flex flex-col hover:border-gray-200 transition-colors bg-white w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-black text-gray-900 tracking-tight">Financial & Tax Ledger</h3>
          </div>
          <p className="text-sm font-medium text-gray-500">VERI*FACTU compliant append-only ledger and tax summaries.</p>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        
        {/* Total Receipts */}
        <div className="p-5 rounded-2xl bg-white border border-gray-100 flex flex-col gap-4 relative overflow-hidden">
          <div className="flex flex-col relative z-10">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Revenue</p>
            <h4 className="text-xl font-black text-gray-900">€33,244.00</h4>
          </div>
          <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100 relative z-10">
            <span className="text-xs font-bold text-gray-500">Closed Receipts</span>
            <span className="text-sm font-black text-gray-900">1,248</span>
          </div>
        </div>

        {/* Void / Cancelled */}
        <div className="p-5 rounded-2xl bg-white border border-gray-100 flex flex-col gap-4 relative overflow-hidden">
          <div className="flex flex-col relative z-10">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Void / Cancelled</p>
            <h4 className="text-xl font-black text-gray-900">€840.50</h4>
          </div>
          <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100 relative z-10">
            <span className="text-xs font-bold text-gray-500">Transactions</span>
            <span className="text-sm font-black text-gray-900">14 (1.1%)</span>
          </div>
        </div>

        {/* Tax Summary */}
        <div className="p-5 rounded-2xl bg-white border border-gray-100 flex flex-col gap-4 relative overflow-hidden">
          <div className="flex flex-col relative z-10">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Tax Collection</p>
            <h4 className="text-xl font-black text-gray-900">€3,704.00</h4>
          </div>
          <div className="flex flex-col gap-1 mt-auto pt-2 border-t border-gray-100 relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-500">Base Imponible</span>
              <span className="text-[11px] font-black text-gray-900">€29,540.00</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-500">IVA 10% (F&B)</span>
              <span className="text-[11px] font-black text-gray-900">€2,850.00</span>
            </div>
          </div>
        </div>

        {/* AEAT Status */}
        <div className="p-5 rounded-2xl bg-white border border-gray-100 flex flex-col gap-4 relative overflow-hidden">
          <div className="flex flex-col relative z-10">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">AEAT Sync</p>
            <h4 className="text-xl font-black text-gray-900">Active</h4>
          </div>
          <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100 relative z-10">
            <span className="text-xs font-bold text-gray-500">Pending</span>
            <span className="text-sm font-black text-gray-900">3 Receipts</span>
          </div>
        </div>

      </div>

      {/* Ledger Table */}
      <div className="flex flex-col border border-gray-100 rounded-2xl overflow-hidden">
        {/* Table Header / Filters */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <h4 className="text-sm font-bold text-gray-900">Recent Transactions</h4>
          </div>
          
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            <button 
              onClick={() => setFilter('All')}
              className={`cursor-pointer px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${filter === 'All' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
            >
              All
            </button>
            <button 
              onClick={() => setFilter('Receipt')}
              className={`cursor-pointer px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${filter === 'Receipt' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
            >
              <FilePlus className="w-3.5 h-3.5" /> Receipts
            </button>
            <button 
              onClick={() => setFilter('Void')}
              className={`cursor-pointer px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${filter === 'Void' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
            >
              <XCircle className="w-3.5 h-3.5" /> Voids
            </button>
          </div>
        </div>

        <div 
          className="overflow-x-auto overflow-y-auto max-h-[400px] w-full custom-scrollbar"
          onScroll={handleScroll}
        >
          <table className="w-full text-left border-collapse relative">
            <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_#f3f4f6]">
              <tr>
                <th className="py-3 px-5 text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Receipt ID</th>
                <th className="py-3 px-5 text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Time / Location</th>
                <th className="py-3 px-5 text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap text-right">Base</th>
                <th className="py-3 px-5 text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap text-right">IVA</th>
                <th className="py-3 px-5 text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap text-right">Total</th>
                <th className="py-3 px-5 text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap text-right">AEAT Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredLedger.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="py-3 px-5 whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-50 text-gray-600">
                        {entry.type === 'Void' ? <XCircle className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[13px] font-bold text-gray-900">{entry.id}</span>
                        <span className="text-[11px] font-bold text-gray-400">{entry.type}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-5 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-[13px] font-bold text-gray-900">{entry.time}</span>
                      <span className="text-[11px] font-medium text-gray-500">{entry.location}</span>
                    </div>
                  </td>
                  <td className="py-3 px-5 whitespace-nowrap text-right">
                    <span className="text-[13px] font-medium text-gray-600">
                      €{entry.base.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-3 px-5 whitespace-nowrap text-right">
                    <span className="text-[13px] font-medium text-gray-600">
                      €{entry.iva.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-3 px-5 whitespace-nowrap text-right">
                    <span className="text-[13px] font-black text-gray-900">
                      €{entry.amount.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-3 px-5 whitespace-nowrap text-right">
                    <div className="flex flex-col items-end gap-1">
                      <button className="cursor-pointer font-mono text-[11px] font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 hover:text-gray-700 transition-colors px-2 py-0.5 rounded-md flex items-center gap-1.5 group/copy">
                        {entry.hash}
                        <Copy className="w-3 h-3 text-gray-400 group-hover/copy:text-gray-600" />
                      </button>
                      {entry.synced ? (
                        <span className="text-[10px] font-bold text-green-600 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Synced
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-orange-500 flex items-center gap-1">
                          <RefreshCw className="w-3 h-3 animate-spin" /> Pending
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {isLoadingMore && (
            <div className="py-4 flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
