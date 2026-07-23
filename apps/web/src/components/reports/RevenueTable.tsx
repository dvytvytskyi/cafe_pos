import React, { useState, useMemo } from 'react';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Download } from 'lucide-react';

// Mock Data Types
type RevenueRow = {
  id: string;
  date: string;
  location: string;
  gross: number;
  prevGross: number;
  net: number;
  prevNet: number;
  orders: number;
  avgCheck: number;
};

// Generate Mock Data (combining locations and days)
const locations = ['Eixample', 'Gótico', 'Arc de Triomf', 'Sagrada Família', 'Gràcia'];
const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const generateMockData = (): RevenueRow[] => {
  const rows: RevenueRow[] = [];
  locations.forEach(loc => {
    days.forEach(day => {
      const baseGross = Math.floor(Math.random() * 2000) + 1000;
      const orders = Math.floor(Math.random() * 80) + 40;
      rows.push({
        id: `${loc}-${day}`,
        date: day,
        location: loc,
        gross: baseGross,
        prevGross: Math.round(baseGross * 0.95), // mock prev data
        net: baseGross * 0.85,
        prevNet: Math.round(baseGross * 0.95 * 0.85),
        orders: orders,
        avgCheck: baseGross / orders,
      });
    });
  });
  return rows;
};

const mockData = generateMockData();

type SortConfig = {
  key: keyof RevenueRow;
  direction: 'asc' | 'desc';
} | null;

export function RevenueTable({ compare = false }: { compare?: boolean }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

  // Sorting Logic
  const handleSort = (key: keyof RevenueRow) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Filter & Sort Data
  const processedData = useMemo(() => {
    let sortableItems = [...mockData];

    // Filter
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      sortableItems = sortableItems.filter(item => 
        item.location.toLowerCase().includes(lowerQuery) || 
        item.date.toLowerCase().includes(lowerQuery)
      );
    }

    // Sort
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return sortableItems;
  }, [searchQuery, sortConfig]);

  const SortIcon = ({ columnKey }: { columnKey: keyof RevenueRow }) => {
    if (sortConfig?.key !== columnKey) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-gray-300 ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="w-3.5 h-3.5 text-[#1a2333] ml-1.5" />
      : <ArrowDown className="w-3.5 h-3.5 text-[#1a2333] ml-1.5" />;
  };

  return (
    <div className="flex flex-col w-full h-[480px]">
      
      {/* Table Toolbar */}
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
            className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-gray-50 border border-gray-100 hover:border-gray-200 text-gray-700 rounded-xl font-bold text-[13px] transition-colors cursor-pointer"
            onClick={() => {
              // Real implementation would convert data to CSV and trigger download
              alert('CSV downloaded!');
            }}
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-auto rounded-2xl border border-gray-100 bg-white">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/80 sticky top-0 z-10 backdrop-blur-sm shadow-sm">
              <th onClick={() => handleSort('date')} className="px-5 py-3 text-[12px] font-bold text-gray-500 tracking-wider cursor-pointer group whitespace-nowrap">
                <div className="flex items-center">
                  Date
                  <SortIcon columnKey="date" />
                </div>
              </th>
              <th onClick={() => handleSort('location')} className="px-5 py-3 text-[12px] font-bold text-gray-500 tracking-wider cursor-pointer group whitespace-nowrap">
                <div className="flex items-center">
                  Location
                  <SortIcon columnKey="location" />
                </div>
              </th>
              <th onClick={() => handleSort('gross')} className="px-5 py-3 text-[12px] font-bold text-gray-500 tracking-wider cursor-pointer group whitespace-nowrap text-right">
                <div className="flex items-center justify-end">
                  Gross Revenue
                  <SortIcon columnKey="gross" />
                </div>
              </th>
              {compare && (
                <th onClick={() => handleSort('prevGross')} className="px-5 py-3 text-[12px] font-bold text-gray-400 tracking-wider cursor-pointer group whitespace-nowrap text-right bg-gray-50/50">
                  <div className="flex items-center justify-end">
                    Gross (Prev)
                    <SortIcon columnKey="prevGross" />
                  </div>
                </th>
              )}
              <th onClick={() => handleSort('net')} className="px-5 py-3 text-[12px] font-bold text-gray-500 tracking-wider cursor-pointer group whitespace-nowrap text-right">
                <div className="flex items-center justify-end">
                  Net Revenue
                  <SortIcon columnKey="net" />
                </div>
              </th>
              {compare && (
                <th onClick={() => handleSort('prevNet')} className="px-5 py-3 text-[12px] font-bold text-gray-400 tracking-wider cursor-pointer group whitespace-nowrap text-right bg-gray-50/50">
                  <div className="flex items-center justify-end">
                    Net (Prev)
                    <SortIcon columnKey="prevNet" />
                  </div>
                </th>
              )}
              <th onClick={() => handleSort('orders')} className="px-5 py-3 text-[12px] font-bold text-gray-500 tracking-wider cursor-pointer group whitespace-nowrap text-right">
                <div className="flex items-center justify-end">
                  Orders
                  <SortIcon columnKey="orders" />
                </div>
              </th>
              <th onClick={() => handleSort('avgCheck')} className="px-5 py-3 text-[12px] font-bold text-gray-500 tracking-wider cursor-pointer group whitespace-nowrap text-right">
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
                  <td className="px-5 py-3 text-[13px] font-semibold text-gray-600 whitespace-nowrap flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#f59e0b]"></div>
                    {row.location}
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
                <td colSpan={6} className="px-5 py-12 text-center text-[13px] text-gray-500 font-medium">
                  No data found for "{searchQuery}"
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
