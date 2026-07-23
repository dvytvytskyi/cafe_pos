import React from 'react';

// Mock Data
type StaffMember = {
  id: string;
  name: string;
  role: string;
  sales: number;
  checks: number;
  avgCheck: number;
  avatar: string;
};

type LocationPerformance = {
  location: string;
  staff: StaffMember[];
};

const MOCK_STAFF_DATA: LocationPerformance[] = [
  {
    location: 'Eixample',
    staff: [
      { id: '1', name: 'Emma W.', role: 'Cashier', sales: 4250, checks: 142, avgCheck: 29.9, avatar: '1' },
      { id: '2', name: 'James L.', role: 'Barista', sales: 3100, checks: 110, avgCheck: 28.1, avatar: '2' },
      { id: '3', name: 'Sophia R.', role: 'Manager', sales: 2800, checks: 85, avgCheck: 32.9, avatar: '3' },
      { id: '12', name: 'Lucas K.', role: 'Barista', sales: 2450, checks: 82, avgCheck: 29.8, avatar: '12' },
      { id: '13', name: 'Mia J.', role: 'Cashier', sales: 2100, checks: 70, avgCheck: 30.0, avatar: '13' },
      { id: '14', name: 'Ethan H.', role: 'Barista', sales: 1800, checks: 65, avgCheck: 27.6, avatar: '14' },
      { id: '15', name: 'Chloe T.', role: 'Cashier', sales: 1500, checks: 52, avgCheck: 28.8, avatar: '15' },
    ]
  },
  {
    location: 'Gótico',
    staff: [
      { id: '4', name: 'Oliver T.', role: 'Cashier', sales: 3950, checks: 131, avgCheck: 30.1, avatar: '4' },
      { id: '5', name: 'Mia B.', role: 'Barista', sales: 2450, checks: 88, avgCheck: 27.8, avatar: '5' },
      { id: '16', name: 'Noah L.', role: 'Manager', sales: 2200, checks: 75, avgCheck: 29.3, avatar: '16' },
      { id: '17', name: 'Ava S.', role: 'Barista', sales: 1950, checks: 70, avgCheck: 27.8, avatar: '17' },
      { id: '18', name: 'William R.', role: 'Cashier', sales: 1700, checks: 58, avgCheck: 29.3, avatar: '18' },
      { id: '19', name: 'Harper C.', role: 'Barista', sales: 1400, checks: 50, avgCheck: 28.0, avatar: '19' },
      { id: '20', name: 'Logan P.', role: 'Cashier', sales: 1200, checks: 42, avgCheck: 28.5, avatar: '20' },
    ]
  },
  {
    location: 'Arc de Triomf',
    staff: [
      { id: '6', name: 'Noah C.', role: 'Cashier', sales: 3120, checks: 105, avgCheck: 29.7, avatar: '6' },
      { id: '7', name: 'Isabella M.', role: 'Barista', sales: 2100, checks: 76, avgCheck: 27.6, avatar: '7' },
      { id: '21', name: 'Benjamin F.', role: 'Manager', sales: 1850, checks: 60, avgCheck: 30.8, avatar: '21' },
      { id: '22', name: 'Evelyn W.', role: 'Cashier', sales: 1600, checks: 55, avgCheck: 29.0, avatar: '22' },
      { id: '23', name: 'Mason D.', role: 'Barista', sales: 1450, checks: 52, avgCheck: 27.8, avatar: '23' },
      { id: '24', name: 'Abigail G.', role: 'Cashier', sales: 1200, checks: 42, avgCheck: 28.5, avatar: '24' },
      { id: '25', name: 'Elijah K.', role: 'Barista', sales: 950, checks: 35, avgCheck: 27.1, avatar: '25' },
    ]
  },
  {
    location: 'Sagrada Família',
    staff: [
      { id: '8', name: 'Liam P.', role: 'Manager', sales: 4100, checks: 125, avgCheck: 32.8, avatar: '8' },
      { id: '9', name: 'Charlotte H.', role: 'Cashier', sales: 2900, checks: 98, avgCheck: 29.5, avatar: '9' },
      { id: '26', name: 'Alexander B.', role: 'Barista', sales: 2650, checks: 92, avgCheck: 28.8, avatar: '26' },
      { id: '27', name: 'Emily V.', role: 'Cashier', sales: 2300, checks: 78, avgCheck: 29.4, avatar: '27' },
      { id: '28', name: 'Daniel C.', role: 'Barista', sales: 2000, checks: 72, avgCheck: 27.7, avatar: '28' },
      { id: '29', name: 'Madison R.', role: 'Cashier', sales: 1750, checks: 60, avgCheck: 29.1, avatar: '29' },
      { id: '30', name: 'Matthew F.', role: 'Barista', sales: 1400, checks: 50, avgCheck: 28.0, avatar: '30' },
    ]
  },
  {
    location: 'Gràcia',
    staff: [
      { id: '10', name: 'Elias B.', role: 'Barista', sales: 2600, checks: 95, avgCheck: 27.3, avatar: '10' },
      { id: '11', name: 'Amelia T.', role: 'Cashier', sales: 3200, checks: 110, avgCheck: 29.0, avatar: '11' },
      { id: '31', name: 'Jackson H.', role: 'Manager', sales: 2450, checks: 80, avgCheck: 30.6, avatar: '31' },
      { id: '32', name: 'Avery S.', role: 'Barista', sales: 2100, checks: 75, avgCheck: 28.0, avatar: '32' },
      { id: '33', name: 'Joseph M.', role: 'Cashier', sales: 1850, checks: 62, avgCheck: 29.8, avatar: '33' },
      { id: '34', name: 'Sofia D.', role: 'Barista', sales: 1600, checks: 58, avgCheck: 27.5, avatar: '34' },
      { id: '35', name: 'David L.', role: 'Cashier', sales: 1300, checks: 45, avgCheck: 28.8, avatar: '35' },
    ]
  }
];

export function StaffPerformanceTables() {
  return (
    <div className="border border-gray-100 rounded-3xl p-6 flex flex-col hover:border-gray-200 transition-colors bg-white w-full">
      <div className="flex flex-col gap-1 mb-6">
        <h3 className="text-xl font-black text-gray-900 tracking-tight">Staff Performance</h3>
        <p className="text-sm font-medium text-gray-500">Detailed breakdown of employee sales across all branches.</p>
      </div>

      <div className="flex flex-wrap justify-start gap-6 w-full">
        {MOCK_STAFF_DATA.map((loc) => (
          <div key={loc.location} className="w-full md:w-[calc(50%-0.75rem)] xl:w-[calc(33.333%-1rem)] min-w-[320px] border border-gray-100 rounded-2xl flex flex-col bg-white overflow-hidden transition-colors hover:border-gray-200">
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
                    <th className="py-2.5 px-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap bg-white">Employee</th>
                    <th className="py-2.5 px-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right whitespace-nowrap bg-white">Sales</th>
                    <th className="py-2.5 px-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right whitespace-nowrap bg-white">Checks</th>
                    <th className="py-2.5 px-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right whitespace-nowrap bg-white">Avg Check</th>
                  </tr>
                </thead>
                <tbody>
                  {loc.staff.map((staff) => (
                    <tr key={staff.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="py-2 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <img 
                            src={`https://i.pravatar.cc/150?img=${staff.avatar}`} 
                            alt={staff.name} 
                            className="w-7 h-7 rounded-full object-cover" 
                          />
                          <div className="flex flex-col">
                            <span className="text-[13px] font-bold text-gray-900">{staff.name}</span>
                            <span className="text-[11px] font-medium text-gray-400">{staff.role}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-2 px-4 whitespace-nowrap text-right">
                        <span className="text-[13px] font-bold text-gray-900">
                          €{staff.sales.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-2 px-4 whitespace-nowrap text-right">
                        <span className="text-[13px] font-medium text-gray-600">
                          {staff.checks}
                        </span>
                      </td>
                      <td className="py-2 px-4 whitespace-nowrap text-right">
                        <span className="text-[13px] font-medium text-gray-600">
                          €{staff.avgCheck.toFixed(1)}
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
