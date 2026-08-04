'use client';

import React from 'react';
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

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

// Monochrome Business Palette
const COLORS = {
  black: '#111827',
  darkGray: '#4b5563',
  lightGray: '#9ca3af',
  grid: '#f3f4f6',
  white: '#ffffff'
};

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

  const pattern = ctx.createPattern(canvas, 'repeat');
  return pattern || color;
};

// Helper for dynamic dates
const today = new Date();
const formatDate = (d: Date) => {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`; // Day, Month, Year
};

const last7End = new Date(today);
const last7Start = new Date(today);
last7Start.setDate(today.getDate() - 6);

const prev7End = new Date(today);
prev7End.setDate(today.getDate() - 7);
const prev7Start = new Date(today);
prev7Start.setDate(today.getDate() - 13);

const last7Label = `Sales (${formatDate(last7Start)} - ${formatDate(last7End)})`;
const prev7Label = `Sales (${formatDate(prev7Start)} - ${formatDate(prev7End)})`;

const revenueData = {
  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  datasets: [
    {
      label: 'Gross Volume',
      data: [6000, 7800, 5200, 5800, 7300, 9200, 8100],
      backgroundColor: '#f59e0b', // Corgi yellow
      borderSkipped: false,
      barPercentage: 1.0,
      categoryPercentage: 0.8,
      borderRadius: 4
    },
    {
      label: 'Net Volume',
      data: [3500, 3200, 3800, 3500, 4800, 4100, 6200],
      backgroundColor: '#e5e5e5', // Gray
      borderSkipped: false,
      barPercentage: 1.0,
      categoryPercentage: 0.8,
      borderRadius: 4
    },
    {
      label: 'Gross Volume (Previous)',
      data: [5000, 7000, 4500, 5000, 6800, 8000, 7500],
      backgroundColor: () => createDiagonalPattern('#f59e0b', '#fef3c7'), // Striped yellow
      borderSkipped: false,
      barPercentage: 1.0,
      categoryPercentage: 0.8,
      borderRadius: 4
    },
    {
      label: 'Net Volume (Previous)',
      data: [3000, 2800, 3100, 3000, 4200, 3800, 5000],
      backgroundColor: () => createDiagonalPattern('#d1d5db', '#f3f4f6'), // Striped gray
      borderSkipped: false,
      barPercentage: 1.0,
      categoryPercentage: 0.8,
      borderRadius: 4
    }
  ],
};

const locationColors = [
  '#f59e0b', // Corgi yellow
  '#111827', // Black
  '#4b5563', // Dark Gray
  '#9ca3af', // Gray
  '#e5e7eb'  // Light Gray
];

const revenueByLocationData = {
  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  datasets: [
    { label: 'Eixample', data: [2000, 2500, 1800, 2000, 2500, 3200, 2800], backgroundColor: locationColors[0], borderSkipped: false, barPercentage: 1.0, categoryPercentage: 0.8, borderRadius: 4 },
    { label: 'Gótico', data: [1500, 1800, 1200, 1400, 1800, 2200, 2000], backgroundColor: locationColors[1], borderSkipped: false, barPercentage: 1.0, categoryPercentage: 0.8, borderRadius: 4 },
    { label: 'Arc de Triomf', data: [1200, 1500, 1000, 1200, 1500, 1800, 1600], backgroundColor: locationColors[2], borderSkipped: false, barPercentage: 1.0, categoryPercentage: 0.8, borderRadius: 4 },
    { label: 'Sagrada Família', data: [800, 1200, 700, 800, 1000, 1200, 1000], backgroundColor: locationColors[3], borderSkipped: false, barPercentage: 1.0, categoryPercentage: 0.8, borderRadius: 4 },
    { label: 'Gràcia', data: [500, 800, 500, 400, 500, 800, 700], backgroundColor: locationColors[4], borderSkipped: false, barPercentage: 1.0, categoryPercentage: 0.8, borderRadius: 4 },
  ]
};

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index' as const,
    intersect: false,
  },
  plugins: {
    legend: {
      display: true,
      position: 'bottom' as const,
      onHover: (event: any, legendItem: any, legend: any) => {
        if (legend.chart.canvas) legend.chart.canvas.style.cursor = 'pointer';
      },
      onLeave: (event: any, legendItem: any, legend: any) => {
        if (legend.chart.canvas) legend.chart.canvas.style.cursor = 'default';
      },
      labels: {
        usePointStyle: true,
        padding: 20,
        color: COLORS.darkGray,
        font: { size: 12, family: 'Inter, sans-serif' }
      }
    },
    tooltip: {
      backgroundColor: COLORS.white,
      titleColor: COLORS.darkGray,
      bodyColor: COLORS.black,
      bodyFont: { weight: 'bold' as const },
      borderColor: COLORS.grid,
      borderWidth: 1,
      padding: 12,
      displayColors: true,
      usePointStyle: true,
      callbacks: {
        label: (context: any) => ` €${context.parsed.y.toLocaleString()}`,
      }
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
      ticks: {
        color: COLORS.lightGray,
        font: { size: 12, family: 'Inter, sans-serif' },
      },
      border: { display: false },
    },
    y: {
      grid: {
        color: COLORS.grid,
        drawBorder: false,
      },
      ticks: {
        color: COLORS.lightGray,
        font: { size: 12, family: 'Inter, sans-serif' },
        callback: (value: any) => `€${value.toLocaleString()}`,
        stepSize: 2000,
      },
      border: { display: false },
      beginAtZero: true,
      max: 10000,
    },
  },
};

const barOptionsLocations = {
  ...barOptions,
  scales: {
    ...barOptions.scales,
    x: { ...barOptions.scales.x, stacked: false },
    y: { 
      ...barOptions.scales.y, 
      stacked: false,
      max: undefined,
      ticks: {
        ...barOptions.scales.y.ticks,
        stepSize: undefined
      }
    }
  }
};

export function RevenueLineChart({ compare = false, viewMode = 'total', grossOnly = false }: { compare?: boolean; viewMode?: 'total' | 'locations'; grossOnly?: boolean }) {
  if (viewMode === 'locations') {
    let locData = revenueByLocationData;
    
    if (compare) {
      const prevDatasets = revenueByLocationData.datasets.map(ds => ({
        ...ds,
        label: `${ds.label} (Prev)`,
        data: ds.data.map(val => Math.round(val * 0.85)), // mock previous data
        backgroundColor: () => createDiagonalPattern(ds.backgroundColor as string, '#f3f4f6'),
      }));
      
      locData = {
        ...revenueByLocationData,
        datasets: revenueByLocationData.datasets.flatMap((ds, i) => [ds, prevDatasets[i]])
      };
    }

    const resolvedData = {
      ...locData,
      datasets: locData.datasets.map(ds => ({
        ...ds,
        backgroundColor: typeof ds.backgroundColor === 'function' ? ds.backgroundColor() : ds.backgroundColor
      }))
    };

    return (
      <div className="w-full h-full min-h-[220px]">
        <Bar data={resolvedData} options={barOptionsLocations as any} />
      </div>
    );
  }

  const data = {
    ...revenueData,
    datasets: compare ? revenueData.datasets : revenueData.datasets.slice(0, 2)
  };

  if (grossOnly) {
    data.datasets = data.datasets.filter(ds => ds.label.includes('Gross'));
  }

  // Resolve background colors since they are functions for patterns
  const resolvedData = {
    ...data,
    datasets: data.datasets.map(ds => ({
      ...ds,
      backgroundColor: typeof ds.backgroundColor === 'function' ? ds.backgroundColor() : ds.backgroundColor
    }))
  };

  return (
    <div className="w-full h-full min-h-[220px]">
      <Bar data={resolvedData} options={barOptions} />
    </div>
  );
}

// Dummy data for Payment Distribution as a Gauge
export function PaymentGaugeChart({ compare = false }: { compare?: boolean }) {
  const totalBlocks = 20;
  // Based on [5400, 2400, 1200] roughly 60%, 25%, 15%
  const cardBlocks = 12;
  const appBlocks = 5;
  const cashBlocks = 3;
  const dataArray = Array(totalBlocks).fill(1);

  const getBlockColor = (index: number) => {
    if (index < cardBlocks) return '#111827'; // Black for Card
    if (index < cardBlocks + appBlocks) return '#f59e0b'; // Yellow for App
    return '#d1d5db'; // Light Gray for Cash
  };

  const bgColors = dataArray.map((_, i) => getBlockColor(i));

  const gaugeData = {
    labels: dataArray.map(() => ''),
    datasets: [{
      data: dataArray,
      backgroundColor: bgColors,
      borderWidth: 0,
      hoverOffset: 0,
      borderRadius: 4,
      spacing: 6, // 2px more than before (4 -> 6)
    }]
  };

  const gaugeOptions = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 2,
    rotation: -90,
    circumference: 180,
    cutout: '80%',
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
    },
  };

  return (
    <div className="flex flex-col items-center justify-center w-full pb-[8px]">
      <div className="relative w-full max-w-[425px] mx-auto flex items-center justify-center mb-6 aspect-[2/1]">
        <div className="absolute inset-0">
          <Doughnut data={gaugeData} options={gaugeOptions} />
        </div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center justify-center text-center z-10 w-full">
          <span className={`${compare ? 'text-2xl' : 'text-3xl'} font-black text-gray-900 leading-none`}>€9,000</span>
          <span className="text-xs font-medium text-gray-500 mt-1 leading-none">Total Sales</span>
          {compare && (
            <div className="mt-1 flex flex-col items-center w-3/4">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5 leading-none">Previous</span>
              <span className="text-xs font-bold text-gray-500 leading-none">€8,200</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Custom Legend */}
      <div className="flex flex-col items-center justify-center gap-3 w-full">
        <div className="flex items-center justify-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-gray-900"></div>
            <span className="text-sm font-medium text-gray-600">Card (60%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#f59e0b' }}></div>
            <span className="text-sm font-medium text-gray-600">App (25%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-gray-300"></div>
            <span className="text-sm font-medium text-gray-600">Cash (15%)</span>
          </div>
        </div>
        
        {compare && (
          <div className="flex items-center justify-center gap-6 pt-3 border-t border-gray-100 w-full opacity-60">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-500 uppercase">Prev:</span>
              <span className="text-xs font-medium text-gray-500">Card (55%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500">App (30%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500">Cash (15%)</span>
            </div>
          </div>
        )}

        <div className="text-[13px] font-medium text-gray-600 mt-1">
          Sales ({formatDate(last7Start)} - {formatDate(last7End)})
        </div>
      </div>
    </div>
  );
}
