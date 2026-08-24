import React, { useState, useMemo } from 'react';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Download } from 'lucide-react';
import type { RevenueTableRow } from '@/lib/reports';

type SortConfig = {
  key: keyof RevenueTableRow;
  direction: 'asc' | 'desc';
} | null;

type RevenueTableProps = {
  compare?: boolean;
  rows: RevenueTableRow[];
};

function exportRevenueCsv(rows: RevenueTableRow[], compare: boolean): void {
  const headers = compare
    ? ['Date', 'Location', 'Gross', 'Gross (Prev)', 'Net', 'Net (Prev)', 'Orders', 'Avg Check']
    : ['Date', 'Location', 'Gross', 'Net', 'Orders', 'Avg Check'];
  const lines = [headers.join(',')];
  for (const row of rows) {
    const base = [
      row.date,
      `"${row.location}"`,
      row.gross.toFixed(2),
      ...(compare ? [row.prevGross.toFixed(2)] : []),
      row.net.toFixed(2),
      ...(compare ? [row.prevNet.toFixed(2)] : []),
      String(row.orders),
      row.avgCheck.toFixed(2),
    ];
    lines.push(base.join(','));
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `revenue_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function RevenueTable({ compare = false, rows }: RevenueTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

  const handleSort = (key: keyof RevenueTableRow) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const processedData = useMemo(() => {
    let sortableItems = [...rows];

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      sortableItems = sortableItems.filter(
        (item) =>
          item.location.toLowerCase().includes(lowerQuery) ||
          item.date.toLowerCase().includes(lowerQuery)
      );
    }

    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return sortableItems;
  }, [rows, searchQuery, sortConfig]);

  const SortIcon = ({ columnKey }: { columnKey: keyof RevenueTableRow }) => {
    if (sortConfig?.key !== columnKey) {
      return (
        <ArrowUpDown className="w-3.5 h-3.5 text-gray-300 ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity" />
      );
    }
    return sortConfig.direction === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-[#1a2333] ml-1.5" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-[#1a2333] ml-1.5" />
    );
  };

  const colSpan = compare ? 8 : 6;

  return (
    <div className="flex flex-col w-full h-[480px]">
      <div className="flex items-center justify-between mb-4">
        <div className="relative w-full sm:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by location or date..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-100 focus:border-gray-300 rounded-[10px] pl-9 pr-4 py-2 h-[40px] text-[13px] outline-none transition-colors placeholder:text-gray-400 font-medium"
          />
        </div>
        <div className="flex items-center gap-4">
          <div className="text-[13px] text-gray-500 font-medium hidden sm:block">
            {processedData.length} results
          </div>
          <button
            type="button"
            disabled={rows.length === 0}
            className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-gray-50 border border-gray-100 hover:border-gray-200 text-gray-700 rounded-xl font-bold text-[13px] transition-colors cursor-pointer disabled:opacity-50"
            onClick={() => exportRevenueCsv(processedData, compare)}
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto rounded-2xl border border-gray-100 bg-white">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/80 sticky top-0 z-10 backdrop-blur-sm shadow-sm">
              <th
                onClick={() => handleSort('dateIso')}
                className="px-5 py-3 text-[12px] font-bold text-gray-500 tracking-wider cursor-pointer group whitespace-nowrap"
              >
                <div className="flex items-center">
                  Date
                  <SortIcon columnKey="dateIso" />
                </div>
              </th>
              <th
                onClick={() => handleSort('location')}
                className="px-5 py-3 text-[12px] font-bold text-gray-500 tracking-wider cursor-pointer group whitespace-nowrap"
              >
                <div className="flex items-center">
                  Location
                  <SortIcon columnKey="location" />
                </div>
              </th>
              <th
                onClick={() => handleSort('gross')}
                className="px-5 py-3 text-[12px] font-bold text-gray-500 tracking-wider cursor-pointer group whitespace-nowrap text-right"
              >
                <div className="flex items-center justify-end">
                  Gross Revenue
                  <SortIcon columnKey="gross" />
                </div>
              </th>
              {compare && (
                <th
                  onClick={() => handleSort('prevGross')}
                  className="px-5 py-3 text-[12px] font-bold text-gray-400 tracking-wider cursor-pointer group whitespace-nowrap text-right bg-gray-50/50"
                >
                  <div className="flex items-center justify-end">
                    Gross (Prev)
                    <SortIcon columnKey="prevGross" />
                  </div>
                </th>
              )}
              <th
                onClick={() => handleSort('net')}
                className="px-5 py-3 text-[12px] font-bold text-gray-500 tracking-wider cursor-pointer group whitespace-nowrap text-right"
              >
                <div className="flex items-center justify-end">
                  Net Revenue
                  <SortIcon columnKey="net" />
                </div>
              </th>
              {compare && (
                <th
                  onClick={() => handleSort('prevNet')}
                  className="px-5 py-3 text-[12px] font-bold text-gray-400 tracking-wider cursor-pointer group whitespace-nowrap text-right bg-gray-50/50"
                >
                  <div className="flex items-center justify-end">
                    Net (Prev)
                    <SortIcon columnKey="prevNet" />
                  </div>
                </th>
              )}
              <th
                onClick={() => handleSort('orders')}
                className="px-5 py-3 text-[12px] font-bold text-gray-500 tracking-wider cursor-pointer group whitespace-nowrap text-right"
              >
                <div className="flex items-center justify-end">
                  Orders
                  <SortIcon columnKey="orders" />
                </div>
              </th>
              <th
                onClick={() => handleSort('avgCheck')}
                className="px-5 py-3 text-[12px] font-bold text-gray-500 tracking-wider cursor-pointer group whitespace-nowrap text-right"
              >
                <div className="flex items-center justify-end">
                  Avg Check
                  <SortIcon columnKey="avgCheck" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100/60">
            {processedData.length > 0 ? (
              processedData.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3 text-[13px] font-bold text-gray-900 whitespace-nowrap">
                    {row.date}
                  </td>
                  <td className="px-5 py-3 text-[13px] font-semibold text-gray-600 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#EE635E]"></div>
                      {row.location}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-[13px] font-bold text-gray-900 whitespace-nowrap text-right">
                    €{row.gross.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  {compare && (
                    <td className="px-5 py-3 text-[13px] font-semibold text-gray-400 whitespace-nowrap text-right bg-gray-50/30">
                      €{row.prevGross.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  )}
                  <td className="px-5 py-3 text-[13px] font-semibold text-gray-500 whitespace-nowrap text-right">
                    €{row.net.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  {compare && (
                    <td className="px-5 py-3 text-[13px] font-medium text-gray-400 whitespace-nowrap text-right bg-gray-50/30">
                      €{row.prevNet.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  )}
                  <td className="px-5 py-3 text-[13px] font-bold text-gray-700 whitespace-nowrap text-right">
                    {row.orders}
                  </td>
                  <td className="px-5 py-3 text-[13px] font-semibold text-gray-500 whitespace-nowrap text-right">
                    €{row.avgCheck.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={colSpan} className="px-5 py-12 text-center text-[13px] text-gray-500 font-medium">
                  {searchQuery ? `No data found for "${searchQuery}"` : 'No revenue data for this period.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
