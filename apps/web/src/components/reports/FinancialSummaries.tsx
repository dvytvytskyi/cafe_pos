import React, { useState } from 'react';
import { FileText, Filter, Check, Copy, RefreshCw, XCircle, FilePlus } from 'lucide-react';
import type { FinancialReport } from '@/repositories/reports.repository';

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

export function FinancialSummaries({ report }: { report?: FinancialReport | null }) {
  const [filter, setFilter] = useState<'All' | 'Receipt' | 'Void'>('All');
  const ledger: LedgerEntry[] = report?.ledger ?? [];
  const summary = report?.summary;
  const filteredLedger = ledger.filter((entry) => filter === 'All' || entry.type === filter);
  const voidRate =
    summary && summary.orderCount + summary.voidCount > 0
      ? ((summary.voidCount / (summary.orderCount + summary.voidCount)) * 100).toFixed(1)
      : '0.0';
  const pendingCount = ledger.filter((e) => !e.synced).length;

  return (
    <div data-testid="financial-summaries" className="border border-gray-100 rounded-3xl p-6 flex flex-col hover:border-gray-200 transition-colors bg-white w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-gray-900 tracking-tight">Financial & Tax Ledger</h3>
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
            <h4 data-testid="reports-total-revenue" className="text-xl font-bold text-gray-900">
              €{(summary?.grossRevenue ?? 0).toFixed(2)}
            </h4>
          </div>
          <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100 relative z-10">
            <span className="text-xs font-bold text-gray-500">Closed Receipts</span>
            <span className="text-sm font-bold text-gray-900">{summary?.orderCount ?? 0}</span>
          </div>
        </div>

        {/* Void / Cancelled */}
        <div className="p-5 rounded-2xl bg-white border border-gray-100 flex flex-col gap-4 relative overflow-hidden">
          <div className="flex flex-col relative z-10">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Void / Cancelled</p>
            <h4 className="text-xl font-bold text-gray-900">€{(summary?.voidAmount ?? 0).toFixed(2)}</h4>
          </div>
          <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100 relative z-10">
            <span className="text-xs font-bold text-gray-500">Transactions</span>
            <span className="text-sm font-bold text-gray-900">{summary?.voidCount ?? 0} ({voidRate}%)</span>
          </div>
        </div>

        {/* Tax Summary */}
        <div className="p-5 rounded-2xl bg-white border border-gray-100 flex flex-col gap-4 relative overflow-hidden">
          <div className="flex flex-col relative z-10">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Tax Collection</p>
            <h4 className="text-xl font-bold text-gray-900">€{(summary?.taxTotal ?? 0).toFixed(2)}</h4>
          </div>
          <div className="flex flex-col gap-1 mt-auto pt-2 border-t border-gray-100 relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-500">Base Imponible</span>
              <span className="text-[11px] font-bold text-gray-900">€{(summary?.netRevenue ?? 0).toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-500">IVA 10% (F&B)</span>
              <span className="text-[11px] font-bold text-gray-900">€{(summary?.taxTotal ?? 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* AEAT Status */}
        <div className="p-5 rounded-2xl bg-white border border-gray-100 flex flex-col gap-4 relative overflow-hidden">
          <div className="flex flex-col relative z-10">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">AEAT Sync</p>
            <h4 className="text-xl font-bold text-gray-900">Active</h4>
          </div>
          <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100 relative z-10">
            <span className="text-xs font-bold text-gray-500">Pending</span>
            <span className="text-sm font-bold text-gray-900">{pendingCount} Receipts</span>
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
                    <span className="text-[13px] font-bold text-gray-900">
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
          {filteredLedger.length === 0 && (
            <div className="py-8 text-center text-sm text-gray-400 font-medium">No ledger entries for this period.</div>
          )}
        </div>
      </div>

    </div>
  );
}
