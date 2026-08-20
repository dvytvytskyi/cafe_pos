import React from 'react';
import type { StaffByLocation, StaffPerformanceRow } from '@/repositories/reports.repository';

function staffInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function StaffRow({ staff }: { staff: StaffPerformanceRow }) {
  const avgCheck = staff.orderCount > 0 ? staff.revenue / staff.orderCount : 0;
  return (
    <tr className="hover:bg-gray-50/50 transition-colors group">
      <td className="py-2 px-4 whitespace-nowrap">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-[10px] font-bold shrink-0">
            {staffInitials(staff.name)}
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-bold text-gray-900">{staff.name}</span>
          </div>
        </div>
      </td>
      <td className="py-2 px-4 whitespace-nowrap text-right">
        <span className="text-[13px] font-bold text-gray-900">
          €{staff.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </td>
      <td className="py-2 px-4 whitespace-nowrap text-right">
        <span className="text-[13px] font-medium text-gray-600">{staff.orderCount}</span>
      </td>
      <td className="py-2 px-4 whitespace-nowrap text-right">
        <span className="text-[13px] font-medium text-gray-600">
          €{avgCheck.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </td>
    </tr>
  );
}

type StaffPerformanceTablesProps = {
  staffByLocation: StaffByLocation[];
};

export function StaffPerformanceTables({ staffByLocation }: StaffPerformanceTablesProps) {
  const visibleLocations = staffByLocation.filter((loc) => loc.staff.length > 0);

  return (
    <div className="border border-gray-100 rounded-3xl p-6 flex flex-col hover:border-gray-200 transition-colors bg-white w-full">
      <div className="flex flex-col gap-1 mb-6">
        <h3 className="text-xl font-bold text-gray-900 tracking-tight">Staff Performance</h3>
        <p className="text-sm font-medium text-gray-500">
          Sales attributed to staff on shift during each order.
        </p>
      </div>

      {visibleLocations.length === 0 ? (
        <div className="py-12 text-center text-sm font-medium text-gray-400">
          No staff performance data for this period.
        </div>
      ) : (
        <div className="flex flex-wrap justify-start gap-6 w-full">
          {visibleLocations.map((loc) => (
            <div
              key={loc.locationId}
              className="w-full lg:w-[calc(50%-0.75rem)] xl:w-[calc(33.333%-1rem)] min-w-[320px] border border-gray-100 rounded-2xl flex flex-col bg-white overflow-hidden transition-colors hover:border-gray-200"
            >
              <div className="pt-4 px-4 pb-2 flex items-center gap-2 bg-white">
                <div className="w-2 h-2 rounded-full bg-[#f59e0b]"></div>
                <h4 className="text-[14px] font-bold text-gray-900">{loc.name}</h4>
              </div>

              <div className="overflow-x-auto overflow-y-auto max-h-[260px] custom-scrollbar w-full">
                <table className="w-full text-left border-collapse relative">
                  <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_#f3f4f6]">
                    <tr>
                      <th className="py-2.5 px-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap bg-white">
                        Employee
                      </th>
                      <th className="py-2.5 px-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right whitespace-nowrap bg-white">
                        Sales
                      </th>
                      <th className="py-2.5 px-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right whitespace-nowrap bg-white">
                        Checks
                      </th>
                      <th className="py-2.5 px-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right whitespace-nowrap bg-white">
                        Avg Check
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loc.staff.map((staff) => (
                      <StaffRow key={`${loc.locationId}-${staff.name}`} staff={staff} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
