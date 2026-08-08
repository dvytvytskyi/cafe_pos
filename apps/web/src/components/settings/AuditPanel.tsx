'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Shield, Search, RefreshCw } from 'lucide-react';
import { getAuditLogsAsync, type AuditEntry, AuditApiError } from '@/lib/audit';
import { AUDIT_ACTIONS } from '@/lib/audit-validation';

const ACTION_LABELS: Record<string, string> = {
  shift_open: 'Shift Open',
  shift_close: 'Shift Close',
  cash_adjustment: 'Cash Adjustment',
  order_completed: 'Order Completed',
  order_cancelled: 'Order Cancelled',
  order_refunded: 'Order Refunded',
  invoice_generated: 'Invoice Generated',
  menu_item_archived: 'Menu Item Archived',
};

function formatDetails(details: Record<string, unknown> | null): string {
  if (!details || Object.keys(details).length === 0) return '—';
  try {
    return JSON.stringify(details);
  } catch {
    return '—';
  }
}

export default function AuditPanel() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const page = await getAuditLogsAsync({
        action: actionFilter || undefined,
        userId: userFilter || undefined,
        limit: 100,
      });
      setLogs(page.items);
      setTotal(page.total);
    } catch (e) {
      setError(e instanceof AuditApiError ? e.message : 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [actionFilter, userFilter]);

  useEffect(() => {
    load().catch(console.error);
  }, [load]);

  const filtered = logs.filter((log) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    const details = formatDetails(log.details as Record<string, unknown>).toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      details.includes(q) ||
      (log.userId ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div data-testid="audit-panel">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Shield size={22} className="text-corgi" />
            Audit Trail
          </h2>
          <p className="text-xs text-gray-400 font-semibold mt-1">
            Immutable append-only ledger. {total} total entries.
          </p>
        </div>
        <button
          type="button"
          data-testid="audit-refresh-btn"
          onClick={() => load()}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold text-gray-700 flex items-center gap-2"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <select
          data-testid="audit-filter-action"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-800 outline-none"
        >
          <option value="">All actions</option>
          {AUDIT_ACTIONS.map((a) => (
            <option key={a} value={a}>
              {ACTION_LABELS[a] ?? a}
            </option>
          ))}
        </select>
        <input
          type="text"
          data-testid="audit-filter-user"
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          placeholder="Filter by user ID…"
          className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-xs font-semibold text-gray-800 outline-none"
        />
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
          <Search size={14} className="text-gray-400 shrink-0" />
          <input
            type="text"
            data-testid="audit-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search details…"
            className="bg-transparent border-none outline-none text-xs font-semibold text-gray-800 w-full"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 mb-4" data-testid="audit-error">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-gray-500" data-testid="audit-loading">
          Loading audit trail…
        </p>
      ) : (
        <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse bg-white">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50 text-[10px] font-black uppercase text-gray-400 tracking-wider">
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Details</th>
                <th className="px-4 py-3">Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-xs font-semibold text-gray-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    No audit entries found.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr key={log.id} data-testid={`audit-row-${log.id}`} className="hover:bg-gray-50/30">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {log.timestamp.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        data-testid={`audit-action-${log.action}`}
                        className="px-2 py-0.5 rounded bg-gray-100 text-gray-800 text-[10px] font-black uppercase"
                      >
                        {ACTION_LABELS[log.action] ?? log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{log.userId ?? '—'}</td>
                    <td className="px-4 py-3 max-w-xs truncate text-gray-600" title={formatDetails(log.details as Record<string, unknown>)}>
                      {formatDetails(log.details as Record<string, unknown>)}
                    </td>
                    <td className="px-4 py-3 font-mono text-[10px] text-gray-400 truncate max-w-[120px]" title={log.hash}>
                      {log.hash.slice(0, 12)}…
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
