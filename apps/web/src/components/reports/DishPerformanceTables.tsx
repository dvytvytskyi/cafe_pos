import React from 'react';
import type { DishAbcRow } from '@/lib/reports-financial';

export function DishPerformanceTables({ dishes = [] }: { dishes?: DishAbcRow[] }) {
  const topDishes = dishes.slice(0, 7);

  return (
    <div data-testid="dish-performance-tables" className="border border-gray-100 rounded-3xl p-6 flex flex-col hover:border-gray-200 transition-colors bg-white w-full">
      <div className="flex flex-col gap-1 mb-6">
        <h3 className="text-xl font-bold text-gray-900 tracking-tight">Dish Popularity</h3>
        <p className="text-sm font-medium text-gray-500">ABC analysis by revenue for the selected period.</p>
      </div>

      <div className="w-full border border-gray-100 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 px-4 text-[11px] font-bold text-gray-400 uppercase">Menu Item</th>
                <th className="py-3 px-4 text-[11px] font-bold text-gray-400 uppercase text-right">Sales</th>
                <th className="py-3 px-4 text-[11px] font-bold text-gray-400 uppercase text-right">Qty</th>
                <th className="py-3 px-4 text-[11px] font-bold text-gray-400 uppercase text-right">ABC</th>
              </tr>
            </thead>
            <tbody>
              {topDishes.map((dish, i) => (
                <tr key={`${dish.name}-${i}`} data-testid={`dish-row-${dish.abcClass}`} className="border-t border-gray-50">
                  <td className="py-2 px-4 text-[13px] font-bold text-gray-900">{dish.name}</td>
                  <td className="py-2 px-4 text-[13px] font-bold text-gray-900 text-right">€{dish.revenue.toFixed(2)}</td>
                  <td className="py-2 px-4 text-[13px] text-gray-600 text-right">{dish.quantity}</td>
                  <td className="py-2 px-4 text-[13px] font-bold text-right">{dish.abcClass}</td>
                </tr>
              ))}
              {topDishes.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-sm text-gray-400">No dish sales in this period.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
