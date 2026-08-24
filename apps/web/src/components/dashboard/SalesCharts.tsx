'use client';

import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import type { RevenueByDayRow } from '@/repositories/reports.repository';
import type { PaymentBreakdown } from '@/lib/dashboard';
import { formatPeriodLabel } from '@/lib/dashboard';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const COLORS = {
  black: '#111827',
  darkGray: '#4b5563',
  lightGray: '#9ca3af',
  grid: '#f3f4f6',
  white: '#ffffff',
};

const locationColors = ['#EE635E', '#111827', '#4b5563', '#9ca3af', '#e5e7eb', '#d1d5db'];

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
  ctx.beginPath();
  ctx.moveTo(-5, 5);
  ctx.lineTo(5, -5);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(5, 15);
  ctx.lineTo(15, 5);
  ctx.stroke();
  return ctx.createPattern(canvas, 'repeat') || color;
};

function formatDayLabel(iso: string, weekly = false): string {
  const d = new Date(iso + 'T12:00:00');
  if (weekly) {
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function resolveChartData(
  revenueByDay: RevenueByDayRow[],
  previousRevenueByDay?: RevenueByDayRow[]
) {
  const labels = revenueByDay.map((d) => formatDayLabel(d.date));
  const gross = revenueByDay.map((d) => d.gross);
  const net = revenueByDay.map((d) => d.net);

  const datasets: Array<Record<string, unknown>> = [
    {
      label: 'Gross Volume',
      data: gross,
      backgroundColor: '#EE635E',
      borderSkipped: false,
      barPercentage: 1.0,
      categoryPercentage: 0.8,
      borderRadius: 4,
    },
    {
      label: 'Net Volume',
      data: net,
      backgroundColor: '#e5e5e5',
      borderSkipped: false,
      barPercentage: 1.0,
      categoryPercentage: 0.8,
      borderRadius: 4,
    },
  ];

  if (previousRevenueByDay?.length) {
    datasets.push(
      {
        label: 'Gross Volume (Previous)',
        data: previousRevenueByDay.map((d) => d.gross),
        backgroundColor: () => createDiagonalPattern('#EE635E', '#ffdedd'),
        borderSkipped: false,
        barPercentage: 1.0,
        categoryPercentage: 0.8,
        borderRadius: 4,
      },
      {
        label: 'Net Volume (Previous)',
        data: previousRevenueByDay.map((d) => d.net),
        backgroundColor: () => createDiagonalPattern('#d1d5db', '#f3f4f6'),
        borderSkipped: false,
        barPercentage: 1.0,
        categoryPercentage: 0.8,
        borderRadius: 4,
      }
    );
  }

  return { labels: labels.length ? labels : ['—'], datasets };
}

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index' as const, intersect: false },
  plugins: {
    legend: {
      display: true,
      position: 'bottom' as const,
      labels: {
        usePointStyle: true,
        padding: 20,
        color: COLORS.darkGray,
        font: { size: 12, family: 'Inter, sans-serif' },
      },
    },
    tooltip: {
      backgroundColor: COLORS.white,
      titleColor: COLORS.darkGray,
      bodyColor: COLORS.black,
      bodyFont: { weight: 'bold' as const },
      borderColor: COLORS.grid,
      borderWidth: 1,
      padding: 12,
      usePointStyle: true,
      callbacks: {
        label: (context: { parsed: { y: number } }) => ` €${context.parsed.y.toLocaleString()}`,
      },
    },
  },
  scales: {
    x: { grid: { display: false }, ticks: { color: COLORS.lightGray, font: { size: 12 } }, border: { display: false } },
    y: {
      grid: { color: COLORS.grid, drawBorder: false },
      ticks: {
        color: COLORS.lightGray,
        callback: (value: number | string) => `€${Number(value).toLocaleString()}`,
      },
      border: { display: false },
      beginAtZero: true,
    },
  },
};

type RevenueChartProps = {
  compare?: boolean;
  viewMode?: 'total' | 'locations';
  grossOnly?: boolean;
  weekly?: boolean;
  revenueByDay?: RevenueByDayRow[];
  previousRevenueByDay?: RevenueByDayRow[];
  revenueByDayByLocation?: Array<{ locationId: string; name: string; days: RevenueByDayRow[] }>;
};

export function RevenueLineChart({
  compare = false,
  viewMode = 'total',
  grossOnly = false,
  weekly = false,
  revenueByDay = [],
  previousRevenueByDay,
  revenueByDayByLocation = [],
}: RevenueChartProps) {
  const locationChart = useMemo(() => {
    if (viewMode !== 'locations') return null;
    const allDates = [
      ...new Set(revenueByDayByLocation.flatMap((l) => l.days.map((d) => d.date))),
    ].sort();
    const labels = allDates.map((d) => formatDayLabel(d, weekly));

    const datasets = revenueByDayByLocation.map((loc, index) => ({
      label: loc.name,
      data: allDates.map((date) => loc.days.find((d) => d.date === date)?.gross ?? 0),
      backgroundColor: locationColors[index % locationColors.length],
      borderSkipped: false,
      barPercentage: 1.0,
      categoryPercentage: 0.8,
      borderRadius: 4,
    }));

    return { labels: labels.length ? labels : ['—'], datasets };
  }, [viewMode, revenueByDayByLocation, weekly]);

  const chartData = useMemo(() => {
    const data = resolveChartData(
      compare ? revenueByDay : revenueByDay,
      compare ? previousRevenueByDay : undefined
    );
    data.labels = revenueByDay.map((d) => formatDayLabel(d.date, weekly));
    return data;
  }, [compare, revenueByDay, previousRevenueByDay, weekly]);

  if (viewMode === 'locations' && revenueByDayByLocation.length > 0 && locationChart) {
    return (
      <div className="w-full h-full min-h-[220px]">
        <Bar data={locationChart as never} options={barOptions as never} />
      </div>
    );
  }

  const displayData = { ...chartData };
  if (grossOnly) {
    displayData.datasets = chartData.datasets.filter((ds) =>
      String(ds.label).includes('Gross')
    );
  } else if (!compare) {
    displayData.datasets = chartData.datasets.slice(0, 2);
  }

  const resolvedData = {
    ...displayData,
    datasets: displayData.datasets.map((ds) => ({
      ...ds,
      backgroundColor:
        typeof ds.backgroundColor === 'function' ? ds.backgroundColor() : ds.backgroundColor,
    })),
  };

  return (
    <div className="w-full h-full min-h-[220px]">
      <Bar data={resolvedData as never} options={barOptions as never} />
    </div>
  );
}

type PaymentGaugeProps = {
  compare?: boolean;
  breakdown?: PaymentBreakdown;
  previousBreakdown?: PaymentBreakdown;
  periodLabel?: { start: string; end: string };
};

function pct(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

export function PaymentGaugeChart({
  compare = false,
  breakdown = { card: 0, cash: 0, app: 0, total: 0 },
  previousBreakdown,
  periodLabel,
}: PaymentGaugeProps) {
  const totalBlocks = 20;
  const total = breakdown.total || 1;
  const cardBlocks = Math.round((breakdown.card / total) * totalBlocks);
  const appBlocks = Math.round((breakdown.app / total) * totalBlocks);
  const cashBlocks = Math.max(0, totalBlocks - cardBlocks - appBlocks);
  const dataArray = Array(totalBlocks).fill(1);

  const getBlockColor = (index: number) => {
    if (index < cardBlocks) return '#EE635E';
    if (index < cardBlocks + appBlocks) return '#111827';
    return '#d1d5db';
  };

  const gaugeData = {
    labels: dataArray.map(() => ''),
    datasets: [
      {
        data: dataArray,
        backgroundColor: dataArray.map((_, i) => getBlockColor(i)),
        borderWidth: 0,
        hoverOffset: 0,
        borderRadius: 4,
        spacing: 6,
      },
    ],
  };

  const gaugeOptions = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 2,
    rotation: -90,
    circumference: 180,
    cutout: '80%',
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
  };

  const cardPct = pct(breakdown.card, breakdown.total);
  const appPct = pct(breakdown.app, breakdown.total);
  const cashPct = pct(breakdown.cash, breakdown.total);

  const label = periodLabel
    ? `Sales (${formatPeriodLabel(periodLabel.start, periodLabel.end)})`
    : 'Sales';

  return (
    <div className="flex flex-col items-center justify-center w-full pb-[8px]">
      <div className="relative w-full max-w-[425px] mx-auto flex items-center justify-center mb-6 aspect-[2/1]">
        <div className="absolute inset-0">
          <Doughnut data={gaugeData} options={gaugeOptions} />
        </div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center justify-center text-center z-10 w-full">
          <span className={`${compare ? 'text-2xl' : 'text-3xl'} font-bold text-gray-900 leading-none`}>
            €{breakdown.total.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
          <span className="text-xs font-medium text-gray-500 mt-1 leading-none">Total Sales</span>
          {compare && previousBreakdown && (
            <div className="mt-1 flex flex-col items-center w-3/4">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5 leading-none">
                Previous
              </span>
              <span className="text-xs font-bold text-gray-500 leading-none">
                €{previousBreakdown.total.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center justify-center gap-3 w-full">
        <div className="flex items-center justify-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#EE635E' }}></div>
            <span className="text-sm font-medium text-gray-600">Card ({cardPct}%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-gray-900"></div>
            <span className="text-sm font-medium text-gray-600">App ({appPct}%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-gray-300"></div>
            <span className="text-sm font-medium text-gray-600">Cash ({cashPct}%)</span>
          </div>
        </div>
        <div className="text-[13px] font-medium text-gray-600 mt-1">{label}</div>
      </div>
    </div>
  );
}
