'use client';

import React, { useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS } from 'chart.js';
import { HOURLY_SLOTS } from '@/lib/dashboard';
import type { DashboardReport } from '@/lib/dashboard';

ChartJS.register();

const COLORS = {
  black: '#EE635E',
  darkGray: '#4b5563',
  lightGray: '#9ca3af',
  grid: '#f3f4f6',
  white: '#ffffff',
  corgi: '#FDBD38',
  prevStripes: '#d1d5db',
  prevBg: '#f3f4f6',
};

const locationColors = ['#EE635E', '#FDBD38', '#4b5563', '#9ca3af', '#e5e7eb', '#d1d5db'];

const hours = HOURLY_SLOTS.map((h) => `${String(h).padStart(2, '0')}:00`);

const createDiagonalPattern = (color: string, bgColor: string) => {
  if (typeof document === 'undefined') return color;
  const canvas = document.createElement('canvas');
  canvas.width = 10;
  canvas.height = 10;
  const ctx = canvas.getContext('2d');
  if (!ctx) return color;
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 10);
  ctx.lineTo(10, 0);
  ctx.stroke();
  return ctx.createPattern(canvas, 'repeat') || color;
};

type LocationTab = { id: string; label: string };

type HourlySalesWidgetProps = {
  compare?: boolean;
  hourlySales?: DashboardReport['hourlySales'];
  previousHourlySales?: DashboardReport['previousHourlySales'];
  locations?: DashboardReport['locations'];
};

export default function HourlySalesWidget({
  compare = false,
  hourlySales,
  previousHourlySales,
  locations = [],
}: HourlySalesWidgetProps) {
  const tabs: LocationTab[] = useMemo(
    () => [
      { id: 'all', label: 'All Locations' },
      { id: 'by_location', label: 'By Location' },
      ...locations.map((l) => ({ id: l.id, label: l.name })),
    ],
    [locations]
  );

  const [selectedLoc, setSelectedLoc] = useState('all');

  const chartDatasets = useMemo(() => {
    const empty = HOURLY_SLOTS.map(() => 0);
    const currentAll = hourlySales?.all ?? empty;
    const prevAll = previousHourlySales?.all ?? empty;

    if (selectedLoc === 'by_location') {
      return locations.flatMap((loc, index) => {
        const data = hourlySales?.byLocation[loc.id] ?? empty;
        const ds = {
          label: loc.name,
          data,
          backgroundColor: locationColors[index % locationColors.length],
          borderRadius: 4,
          barPercentage: 1.0,
          categoryPercentage: compare ? 0.8 : 0.6,
        };
        if (!compare) return [ds];
        const prevData = previousHourlySales?.byLocation[loc.id] ?? empty;
        return [
          ds,
          {
            label: `${loc.name} (Prev)`,
            data: prevData,
            backgroundColor: () => createDiagonalPattern('#d1d5db', '#f3f4f6'),
            borderRadius: 4,
            barPercentage: 1.0,
            categoryPercentage: 0.8,
          },
        ];
      });
    }

    const currentData = selectedLoc === 'all' ? currentAll : hourlySales?.byLocation[selectedLoc] ?? empty;
    const maxSales = Math.max(...currentData, 1);
    const threshold = maxSales * 0.8;
    const backgroundColors = currentData.map((val) => (val >= threshold ? COLORS.corgi : COLORS.black));

    const datasets: Array<Record<string, unknown>> = [
      {
        label: 'Current Period',
        data: currentData,
        backgroundColor: backgroundColors,
        borderRadius: 4,
        barPercentage: 1.0,
        categoryPercentage: compare ? 0.8 : 0.6,
        stack: 'Stack 0',
      },
    ];

    if (compare) {
      const prevData = selectedLoc === 'all' ? prevAll : previousHourlySales?.byLocation[selectedLoc] ?? empty;
      datasets.push({
        label: 'Previous Period',
        data: prevData,
        backgroundColor: () => createDiagonalPattern(COLORS.prevStripes, COLORS.prevBg),
        borderRadius: 4,
        barPercentage: 1.0,
        categoryPercentage: 0.8,
        stack: 'Stack 1',
      });
    }

    return datasets;
  }, [compare, hourlySales, previousHourlySales, locations, selectedLoc]);

  const resolvedData = {
    labels: hours,
    datasets: chartDatasets.map((ds) => ({
      ...ds,
      backgroundColor:
        typeof ds.backgroundColor === 'function' ? ds.backgroundColor() : ds.backgroundColor,
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: COLORS.white,
        titleColor: COLORS.darkGray,
        bodyColor: COLORS.black,
        bodyFont: { weight: 'bold' as const },
        borderColor: COLORS.grid,
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          label: (context: { parsed: { y: number } }) => ` €${context.parsed.y.toLocaleString()}`,
        },
      },
    },
    scales: {
      x: {
        stacked: selectedLoc !== 'by_location',
        grid: { display: false },
        ticks: { color: COLORS.lightGray, font: { size: 11, family: 'Inter, sans-serif' } },
        border: { display: false },
      },
      y: {
        stacked: selectedLoc !== 'by_location',
        grid: { color: COLORS.grid, drawBorder: false },
        ticks: {
          color: COLORS.lightGray,
          font: { size: 11, family: 'Inter, sans-serif' },
          callback: (value: number | string) => `€${value}`,
        },
        border: { display: false },
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-gray-100 flex flex-col mb-8 h-[450px]">
      <div className="flex flex-col gap-4 mb-6 flex-shrink-0 w-full overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 w-full">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 whitespace-nowrap">
            Peak Hours & Hourly Load
          </h3>
          <p className="text-sm font-medium text-gray-500 whitespace-nowrap">Average daily sales distribution</p>
        </div>

        <div className="flex items-center gap-1 bg-gray-50 p-1.5 rounded-2xl border border-gray-100/50 overflow-x-auto scrollbar-hide w-full">
          {tabs.map((loc) => {
            const isActive = selectedLoc === loc.id;
            return (
              <button
                key={loc.id}
                onClick={() => setSelectedLoc(loc.id)}
                className={`cursor-pointer flex-1 flex items-center justify-center px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex-shrink-0 min-w-max ${
                  isActive
                    ? 'bg-white text-gray-900 shadow-sm border border-gray-200/50'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'
                }`}
              >
                {loc.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 w-full min-h-0 relative">
        <Bar data={resolvedData as never} options={options as never} />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-6 mt-6 pb-2">
        {selectedLoc === 'by_location' ? (
          locations.map((loc, i) => (
            <div key={loc.id} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: locationColors[i % locationColors.length] }}
              ></div>
              <span className="text-xs font-medium text-gray-500">{loc.name}</span>
            </div>
          ))
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-corgi"></div>
            <span className="text-xs font-medium text-gray-500">Peak Rush</span>
          </div>
        )}
        {compare && (
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(45deg, #d1d5db, #d1d5db 2px, #f3f4f6 2px, #f3f4f6 4px)',
              }}
            ></div>
            <span className="text-xs font-medium text-gray-500">Previous</span>
          </div>
        )}
      </div>
    </div>
  );
}
