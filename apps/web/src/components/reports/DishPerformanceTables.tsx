import React from 'react';

// Mock Data
type DishPerformance = {
  id: string;
  name: string;
  category: string;
  sales: number;
  qty: number;
  trend: number; // percentage trend
};

type LocationDishPerformance = {
  location: string;
  dishes: DishPerformance[];
};

const MOCK_DISH_DATA: LocationDishPerformance[] = [
  {
    location: 'Eixample',
    dishes: [
      { id: '1', name: 'Corgi Signature Latte', category: 'Coffee', sales: 4200, qty: 840, trend: 5.2 },
      { id: '2', name: 'Avocado Toast', category: 'Food', sales: 3000, qty: 250, trend: 2.1 },
      { id: '3', name: 'Matcha Croissant', category: 'Pastries', sales: 2500, qty: 500, trend: -1.5 },
      { id: '4', name: 'Double Espresso', category: 'Coffee', sales: 2400, qty: 960, trend: 8.4 },
      { id: '5', name: 'Iced Caramel Macchiato', category: 'Coffee', sales: 1800, qty: 360, trend: 12.0 },
      { id: '6', name: 'Cinnamon Roll', category: 'Pastries', sales: 1400, qty: 350, trend: 0.5 },
      { id: '7', name: 'English Breakfast Tea', category: 'Tea', sales: 400, qty: 130, trend: -4.2 },
    ]
  },
  {
    location: 'Gótico',
    dishes: [
      { id: '1', name: 'Corgi Signature Latte', category: 'Coffee', sales: 3100, qty: 620, trend: 4.1 },
      { id: '2', name: 'Avocado Toast', category: 'Food', sales: 2200, qty: 180, trend: 3.5 },
      { id: '3', name: 'Matcha Croissant', category: 'Pastries', sales: 1800, qty: 360, trend: 1.2 },
      { id: '4', name: 'Double Espresso', category: 'Coffee', sales: 1600, qty: 640, trend: 6.8 },
      { id: '5', name: 'Iced Caramel Macchiato', category: 'Coffee', sales: 1400, qty: 280, trend: 9.5 },
      { id: '6', name: 'Cinnamon Roll', category: 'Pastries', sales: 1000, qty: 250, trend: -2.1 },
      { id: '7', name: 'English Breakfast Tea', category: 'Tea', sales: 300, qty: 100, trend: -1.0 },
    ]
  },
  {
    location: 'Arc de Triomf',
    dishes: [
      { id: '1', name: 'Corgi Signature Latte', category: 'Coffee', sales: 2150, qty: 430, trend: 2.0 },
      { id: '2', name: 'Avocado Toast', category: 'Food', sales: 1500, qty: 125, trend: 1.5 },
      { id: '3', name: 'Matcha Croissant', category: 'Pastries', sales: 1200, qty: 240, trend: -3.2 },
      { id: '4', name: 'Double Espresso', category: 'Coffee', sales: 1100, qty: 440, trend: 4.1 },
      { id: '5', name: 'Iced Caramel Macchiato', category: 'Coffee', sales: 900, qty: 180, trend: 5.5 },
      { id: '6', name: 'Cinnamon Roll', category: 'Pastries', sales: 700, qty: 175, trend: -4.5 },
      { id: '7', name: 'English Breakfast Tea', category: 'Tea', sales: 200, qty: 65, trend: -2.2 },
    ]
  },
  {
    location: 'Sagrada Família',
    dishes: [
      { id: '1', name: 'Corgi Signature Latte', category: 'Coffee', sales: 1800, qty: 360, trend: 1.2 },
      { id: '2', name: 'Avocado Toast', category: 'Food', sales: 1300, qty: 110, trend: 0.8 },
      { id: '3', name: 'Matcha Croissant', category: 'Pastries', sales: 1000, qty: 200, trend: -1.0 },
      { id: '4', name: 'Double Espresso', category: 'Coffee', sales: 900, qty: 360, trend: 2.5 },
      { id: '5', name: 'Iced Caramel Macchiato', category: 'Coffee', sales: 800, qty: 160, trend: 3.2 },
      { id: '6', name: 'Cinnamon Roll', category: 'Pastries', sales: 600, qty: 150, trend: -2.0 },
      { id: '7', name: 'English Breakfast Tea', category: 'Tea', sales: 200, qty: 65, trend: -1.5 },
    ]
  },
  {
    location: 'Gràcia',
    dishes: [
      { id: '1', name: 'Corgi Signature Latte', category: 'Coffee', sales: 1200, qty: 240, trend: 0.5 },
      { id: '2', name: 'Avocado Toast', category: 'Food', sales: 900, qty: 75, trend: 1.1 },
      { id: '3', name: 'Matcha Croissant', category: 'Pastries', sales: 700, qty: 140, trend: -0.5 },
      { id: '4', name: 'Double Espresso', category: 'Coffee', sales: 800, qty: 320, trend: 1.8 },
      { id: '5', name: 'Iced Caramel Macchiato', category: 'Coffee', sales: 500, qty: 100, trend: 2.1 },
      { id: '6', name: 'Cinnamon Roll', category: 'Pastries', sales: 400, qty: 100, trend: -1.2 },
      { id: '7', name: 'English Breakfast Tea', category: 'Tea', sales: 100, qty: 35, trend: -0.8 },
    ]
  }
];

export function DishPerformanceTables() {
  return (
    <div className="border border-gray-100 rounded-3xl p-6 flex flex-col hover:border-gray-200 transition-colors bg-white w-full">
      <div className="flex flex-col gap-1 mb-6">
        <h3 className="text-xl font-black text-gray-900 tracking-tight">Dish Popularity</h3>
        <p className="text-sm font-medium text-gray-500">Simple menu item sales report across all branches.</p>
      </div>

      <div className="flex flex-wrap justify-start gap-6 w-full">
        {MOCK_DISH_DATA.map((loc) => (
          <div key={loc.location} className="w-full lg:w-[calc(50%-0.75rem)] xl:w-[calc(33.333%-1rem)] min-w-[320px] border border-gray-100 rounded-2xl flex flex-col bg-white overflow-hidden transition-colors hover:border-gray-200">
            {/* Location Header */}
            <div className="pt-4 px-4 pb-2 flex items-center gap-2 bg-white">
              <div className="w-2 h-2 rounded-full bg-[#f59e0b]"></div>
              <h4 className="text-[14px] font-bold text-gray-900">{loc.location}</h4>
            </div>

            {/* Table */}
            <div className="overflow-x-auto overflow-y-auto max-h-[260px] custom-scrollbar w-full">
              <table className="w-full text-left border-collapse relative">
                <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_#f3f4f6]">
                  <tr>
                    <th className="py-2.5 px-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap bg-white">Menu Item</th>
                    <th className="py-2.5 px-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right whitespace-nowrap bg-white">Sales</th>
                    <th className="py-2.5 px-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right whitespace-nowrap bg-white">Qty Sold</th>
                    <th className="py-2.5 px-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right whitespace-nowrap bg-white">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {loc.dishes.map((dish, i) => (
                    <tr key={dish.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="py-2 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black ${i < 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                            #{i + 1}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[13px] font-bold text-gray-900">{dish.name}</span>
                            <span className="text-[11px] font-medium text-gray-400">{dish.category}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-2 px-4 whitespace-nowrap text-right">
                        <span className="text-[13px] font-bold text-gray-900">
                          €{dish.sales.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-2 px-4 whitespace-nowrap text-right">
                        <span className="text-[13px] font-medium text-gray-600">
                          {dish.qty}
                        </span>
                      </td>
                      <td className="py-2 px-4 whitespace-nowrap text-right">
                        <span className={`text-[12px] font-bold flex items-center justify-end gap-1 ${dish.trend > 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {dish.trend > 0 ? '↑' : '↓'} {Math.abs(dish.trend)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
