'use client';

import React, { useEffect, useRef } from 'react';
import { Search, X, Package, Users, BarChart2, ShoppingCart, MoreHorizontal, Command } from 'lucide-react';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [render, setRender] = React.useState(isOpen);
  const [visible, setVisible] = React.useState(isOpen);

  useEffect(() => {
    let mountTimer: NodeJS.Timeout;
    let unmountTimer: NodeJS.Timeout;

    if (isOpen) {
      setRender(true);
      document.body.style.overflow = 'hidden';
      // slight delay to allow DOM to render before adding visible class for CSS transition
      mountTimer = setTimeout(() => setVisible(true), 10);
    } else {
      setVisible(false);
      document.body.style.overflow = 'auto';
      // wait for transition to finish before unmounting
      unmountTimer = setTimeout(() => setRender(false), 200);
    }

    return () => {
      clearTimeout(mountTimer);
      clearTimeout(unmountTimer);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!render) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/10 backdrop-blur-[2px] transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      {/* Container for Frames */}
      <div 
        ref={modalRef}
        className="relative w-full max-w-2xl flex flex-col gap-3"
      >
        {/* Frame 1: Search Input Header */}
        <div className={`bg-white rounded-[20px] shadow-xl flex items-center px-4 py-3 gap-3 transition-all duration-150 ease-out transform ${
          visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2'
        }`}>
          <Search size={20} className="text-gray-400 shrink-0" />
          <input 
            autoFocus
            type="text" 
            placeholder="Search..." 
            className="flex-1 bg-transparent border-none outline-none text-[15px] px-1 text-gray-800 placeholder-gray-400 font-medium"
          />
          <div className="flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded-md text-gray-500 shrink-0 text-xs font-semibold shadow-sm">
            <Command size={12} />
            <span>K</span>
          </div>
        </div>

        {/* Frame 2: Modal Body */}
        <div 
          className={`bg-white rounded-[20px] shadow-2xl p-5 overflow-y-auto max-h-[60vh] flex flex-col gap-6 transition-all duration-200 ease-out ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
          }`}
          style={{ transitionDelay: visible ? '50ms' : '0ms' }}
        >
          
          {/* Popular Search */}
          <div>
            <h3 className="text-[13px] font-semibold text-gray-800 mb-3">Popular Search</h3>
            <div className="flex flex-wrap gap-2">
              {['Analytics', 'Shop', 'Watchlist', 'Customers', 'Inventory', 'Reports', 'Settings'].map(filter => (
                <button 
                  key={filter}
                  className="flex items-center px-3 py-1.5 border border-gray-200 rounded-full text-[13px] font-medium text-gray-700 hover:border-black hover:text-black transition-all cursor-pointer group"
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="h-px w-full bg-gray-50"></div>

          {/* Recent */}
          <div>
            <h3 className="text-[13px] font-semibold text-gray-800 mb-2">Recent</h3>
            <div className="flex flex-col gap-0.5">
              
              <div className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group">
                <div className="flex items-center">
                  <span className="text-[14px] font-medium text-gray-800">Adventure Time BMO Nintendo Original</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 bg-gray-100 rounded-full text-[11px] font-semibold text-gray-500">1,210 Sales</span>
                </div>
              </div>

              <div className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group">
                <div className="flex items-center">
                  <span className="text-[14px] font-medium text-gray-800">NorteDesignGo</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 bg-gray-100 rounded-full text-[11px] font-semibold text-gray-500">1,210 Sales</span>
                </div>
              </div>

              <div className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group">
                <div className="flex items-center">
                  <span className="text-[14px] font-medium text-gray-800">MoonSpirit</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 bg-gray-100 rounded-full text-[11px] font-semibold text-gray-500">970 Sales</span>
                </div>
              </div>

              <div className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group">
                <div className="flex items-center">
                  <span className="text-[14px] font-medium text-gray-800">Purpleheartstore</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 bg-gray-100 rounded-full text-[11px] font-semibold text-gray-500">235 Sales</span>
                </div>
              </div>

            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
