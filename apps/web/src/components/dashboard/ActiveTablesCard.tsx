"use client";

import React, { useState } from 'react';

const locations = [
  { id: 'all', name: "Across 3 locations", active: 42, total: 60, title: "All Locations" },
  { id: 'downtown', name: "Downtown Cafe", active: 18, total: 20, title: "Downtown Cafe" },
  { id: 'riverside', name: "Riverside Corgi", active: 15, total: 25, title: "Riverside Corgi" },
  { id: 'mall', name: "Mall Kiosk", active: 9, total: 15, title: "Mall Kiosk" }
];

export default function ActiveTablesCard() {
  const [index, setIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleNext = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setTimeout(() => {
      setIndex((prev) => (prev + 1) % locations.length);
      setIsAnimating(false);
    }, 150);
  };

  const handlePrev = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setTimeout(() => {
      setIndex((prev) => (prev - 1 + locations.length) % locations.length);
      setIsAnimating(false);
    }, 150);
  };

  const current = locations[index];

  return (
    <div className="rounded-3xl p-6 flex flex-col justify-between shadow-sm relative" style={{ backgroundColor: '#f59e0b' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-white/90 text-sm font-medium">Active Tables (Live)</div>
        <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse shadow-sm"></div>
      </div>
      
      <div className={`transition-all duration-150 ${isAnimating ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}>
        <div className="text-2xl font-black text-white">
          {current.active} <span className="text-lg font-bold text-white/70">/ {current.total}</span>
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div className={`transition-all duration-150 text-white/90 text-xs font-medium mt-2 ${isAnimating ? 'opacity-0 -translate-y-1' : 'opacity-100 translate-y-0'}`}>
          {current.id === 'all' ? "Occupied across 3 locations" : `Occupied at ${current.name}`}
        </div>
      </div>
      
      {/* Navigation Arrows */}
      <div className="absolute right-5 bottom-4 flex flex-col gap-0.5">
          <button 
            onClick={handlePrev}
            className="p-1 rounded-md hover:bg-white/20 transition-colors text-white/80 hover:text-white cursor-pointer"
            aria-label="Previous location"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
          </button>
          <button 
            onClick={handleNext}
            className="p-1 rounded-md hover:bg-white/20 transition-colors text-white/80 hover:text-white cursor-pointer"
            aria-label="Next location"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </button>
        </div>
    </div>
  );
}
