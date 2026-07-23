'use client';

import React, { useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS } from 'chart.js';

const COLORS = {
  black: '#111827',
  darkGray: '#4b5563',
  lightGray: '#9ca3af',
  grid: '#f3f4f6',
  white: '#ffffff',
  corgi: '#f59e0b',
  prevGray: '#e5e5e5',
  prevStripes: '#d1d5db',
  prevBg: '#f3f4f6'
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
  return ctx.createPattern(canvas, 'repeat') || color;
};

const hours = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', 
  '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'
];

type LocationId = 'all' | 'by_location' | 'eixample' | 'gotico' | 'arc' | 'sagrada' | 'gracia';

const mockData: Record<Exclude<LocationId, 'by_location'>, number[]> = {
  all: [1200, 2400, 3500, 2200, 2800, 4100, 3600, 2100, 2400, 3100, 3800, 4200, 2800, 1500, 600],
  eixample: [350, 700, 1100, 650, 800, 1200, 1050, 600, 700, 950, 1150, 1300, 850, 450, 180],
  gotico: [250, 500, 750, 450, 600, 900, 800, 450, 550, 700, 900, 1000, 650, 350, 120],
  arc: [200, 450, 650, 400, 550, 850, 750, 400, 500, 650, 800, 850, 550, 300, 110],
  sagrada: [250, 500, 700, 450, 500, 750, 650, 350, 400, 550, 650, 750, 500, 250, 100],
  gracia: [150, 250, 300, 250, 350, 400, 350, 300, 250, 250, 300, 300, 250, 150, 90]
};

const locations = [
  { id: 'all', label: 'All Locations' },
  { id: 'by_location', label: 'By Location' },
  { id: 'eixample', label: 'Eixample' },
  { id: 'gotico', label: 'Gótico' },
  { id: 'arc', label: 'Arc de Triomf' },
  { id: 'sagrada', label: 'Sagrada Família' },
  { id: 'gracia', label: 'Gràcia' }
];

export default function HourlySalesWidget({ compare = false }: { compare?: boolean }) {
  const [selectedLoc, setSelectedLoc] = useState<LocationId>('all');

  let chartDatasets: any[] = [];
  
  if (selectedLoc === 'by_location') {
    const locationKeys = ['eixample', 'gotico', 'arc', 'sagrada', 'gracia'] as const;
    const locColors = ['#f59e0b', '#111827', '#4b5563', '#9ca3af', '#e5e7eb'];
    
    chartDatasets = locationKeys.map((key, index) => ({
      label: locations.find(l => l.id === key)?.label || key,
      data: mockData[key],
      backgroundColor: locColors[index],
      borderRadius: 4,
      barPercentage: 1.0,
      categoryPercentage: compare ? 0.8 : 0.6,
    }));

    if (compare) {
      const prevDatasets = locationKeys.map((key, index) => ({
        label: `${locations.find(l => l.id === key)?.label} (Prev)`,
        data: mockData[key].map(v => Math.round(v * 0.85)),
        backgroundColor: () => createDiagonalPattern('#d1d5db', '#f3f4f6'),
        borderRadius: 4,
        barPercentage: 1.0,
        categoryPercentage: 0.8,
      }));
      chartDatasets = chartDatasets.flatMap((ds, i) => [ds, prevDatasets[i]]);
    }
  } else {
    const currentData = mockData[selectedLoc as Exclude<LocationId, 'by_location'>];
    const prevData = currentData.map(val => Math.round(val * 0.85));
    const maxSales = Math.max(...currentData);
    const threshold = maxSales * 0.8;
    const backgroundColors = currentData.map(val => val >= threshold ? COLORS.corgi : COLORS.black);

    chartDatasets = [
      {
        label: 'Current Period',
        data: currentData,
        backgroundColor: backgroundColors,
        borderRadius: 4,
        barPercentage: 1.0,
        categoryPercentage: compare ? 0.8 : 0.6,
        stack: 'Stack 0',
      },
      ...(compare ? [{
        label: 'Previous Period',
        data: prevData,
        backgroundColor: () => createDiagonalPattern(COLORS.prevStripes, COLORS.prevBg),
        borderRadius: 4,
        barPercentage: 1.0,
        categoryPercentage: 0.8,
        stack: 'Stack 1',
      }] : [])
    ];
  }

  const data = {
    labels: hours,
    datasets: chartDatasets
  };

  // Resolve patterns
  const resolvedData = {
    ...data,
    datasets: data.datasets.map(ds => ({
      ...ds,
      backgroundColor: typeof ds.backgroundColor === 'function' ? ds.backgroundColor() : ds.backgroundColor
    }))
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
          label: (context: any) => ` €${context.parsed.y.toLocaleString()}`,
        }
      }
    },
    scales: {
      x: {
        stacked: selectedLoc !== 'by_location',
        grid: { display: false },
        ticks: { color: COLORS.lightGray, font: { size: 11, family: 'Inter, sans-serif' } },
        border: { display: false }
      },
      y: {
        stacked: selectedLoc !== 'by_location',
        grid: { color: COLORS.grid, drawBorder: false },
        ticks: { 
          color: COLORS.lightGray, 
          font: { size: 11, family: 'Inter, sans-serif' },
          callback: (value: any) => `€${value}`
        },
        border: { display: false },
        beginAtZero: true
      }
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-gray-100 flex flex-col mb-8 h-[450px]">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 flex-shrink-0">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            Peak Hours & Hourly Load
          </h3>
          <p className="text-sm font-medium text-gray-500 mt-1">Average daily sales distribution</p>
        </div>
        
        {/* Location Tabs */}
        <div className="flex flex-wrap items-center gap-2 bg-gray-50 p-1.5 rounded-2xl border border-gray-100/50">
          {locations.map((loc) => {
            const isActive = selectedLoc === loc.id;
            return (
              <button
                key={loc.id}
                onClick={() => setSelectedLoc(loc.id as LocationId)}
                className={`cursor-pointer px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
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
        <Bar data={resolvedData} options={options as any} />
      </div>
      
      {/* Custom Legend */}
      <div className="flex flex-wrap items-center justify-center gap-6 mt-6 pb-2">
        {selectedLoc === 'by_location' ? (
          <>
            {['Eixample', 'Gótico', 'Arc de Triomf', 'Sagrada Família', 'Gràcia'].map((loc, i) => (
              <div key={loc} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ['#f59e0b', '#111827', '#4b5563', '#9ca3af', '#e5e7eb'][i] }}></div>
                <span className="text-xs font-medium text-gray-500">{loc}</span>
              </div>
            ))}
          </>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-corgi"></div>
            <span className="text-xs font-medium text-gray-500">Peak Rush</span>
          </div>
        )}
        {compare && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #d1d5db, #d1d5db 2px, #f3f4f6 2px, #f3f4f6 4px)' }}></div>
            <span className="text-xs font-medium text-gray-500">Previous</span>
          </div>
        )}
      </div>
    </div>
  );
}
