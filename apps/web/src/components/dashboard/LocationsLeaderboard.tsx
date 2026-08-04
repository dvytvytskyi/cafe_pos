'use client';

import React, { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { LayoutGrid, Castle, Landmark, Church, Coffee, LocateFixed } from 'lucide-react';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

const LOCATIONS = [
  { 
    id: 'eixample', 
    name: 'Eixample', 
    icon: LayoutGrid,
    revenue: '€2,450',
    revenueValue: 2450,
    reviews: { count: 312, growth: 14 },
    registrations: { count: 128, growth: 22 },
    staff: 6,
    avgCheck: { value: '€32.40', growth: 5 },
    liveTables: 14,
    totalTables: 24,
    lat: 41.387630, lng: 2.157706 
  },
  { 
    id: 'gotico', 
    name: 'Gótico', 
    icon: Castle,
    revenue: '€2,100',
    revenueValue: 2100,
    reviews: { count: 245, growth: 8 },
    registrations: { count: 96, growth: 15 },
    staff: 4,
    avgCheck: { value: '€28.90', growth: 3 },
    liveTables: 8,
    totalTables: 16,
    lat: 41.384142, lng: 2.172637 
  },
  { 
    id: 'arc', 
    name: 'Arc de Triomf', 
    icon: Landmark,
    revenue: '€1,980',
    revenueValue: 1980,
    reviews: { count: 189, growth: -2 },
    registrations: { count: 74, growth: 5 },
    staff: 5,
    avgCheck: { value: '€26.50', growth: 1 },
    liveTables: 12,
    totalTables: 20,
    lat: 41.388592, lng: 2.181591 
  },
  { 
    id: 'sagrada', 
    name: 'Sagrada Família', 
    icon: Church,
    revenue: '€1,850',
    revenueValue: 1850,
    reviews: { count: 156, growth: 5 },
    registrations: { count: 52, growth: 8 },
    staff: 3,
    avgCheck: { value: '€25.20', growth: -4 },
    liveTables: 5,
    totalTables: 12,
    lat: 41.405790, lng: 2.169558 
  },
  { 
    id: 'gracia', 
    name: 'Gràcia', 
    icon: Coffee,
    revenue: '€1,620',
    revenueValue: 1620,
    reviews: { count: 142, growth: 3 },
    registrations: { count: 48, growth: 2 },
    staff: 3,
    avgCheck: { value: '€22.80', growth: 0 },
    liveTables: 9,
    totalTables: 14,
    lat: 41.403345, lng: 2.150875 
  }
];

export default function LocationsLeaderboard({ compare = false }: { compare?: boolean }) {
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [hoverSource, setHoverSource] = useState<'list' | 'map' | null>(null);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});

  const handleRecenter = () => {
    setSelectedLocation(null);
    setHoverSource(null);
    if (map.current) {
      map.current.flyTo({
        center: [2.168, 41.393],
        zoom: 12.5,
        speed: 0.8,
        curve: 1.2,
        offset: [0, 0]
      });
    }
  };

  useEffect(() => {
    if (!mapContainer.current) return;
    if (!MAPBOX_TOKEN) {
      console.warn("Mapbox token is missing. Map will not load.");
      return;
    }
    
    if (map.current) return;
    
    mapboxgl.accessToken = MAPBOX_TOKEN;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/abiespana/cmqxgn84r004t01se6nwt1acq',
      center: [2.168, 41.393],
      zoom: 12.5,
      minZoom: 11.5,
      attributionControl: false
    });

    // Add markers
    LOCATIONS.forEach((loc) => {
      const el = document.createElement('div');
      el.className = 'custom-marker';
      
      el.innerHTML = `
        <div class="flex flex-col items-center cursor-pointer transition-all duration-300 z-10 relative group">
          <!-- Name Tooltip (Hidden by default, shown on select) -->
          <div class="marker-name absolute bg-gray-900 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-xl opacity-0 pointer-events-none transition-all duration-300 whitespace-nowrap" style="z-index: 100; bottom: 18px;">
            ${loc.name}
            <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
          </div>
          
          <!-- Expanded Card (Hidden by default, shown on select) -->
          <div class="marker-card absolute bottom-0 pb-[20px] w-[240px] origin-bottom transform scale-95 opacity-0 pointer-events-none transition-all duration-300" style="z-index: 100;">
            <div class="bg-white/95 backdrop-blur-md p-4 rounded-3xl shadow-2xl border border-gray-100/50">
              <div class="flex justify-between items-start mb-3">
                <span class="font-bold text-gray-900 text-[15px] leading-tight">${loc.name}</span>
                <div class="flex items-center gap-1.5 bg-green-50/80 px-2 py-0.5 rounded-full border border-green-100/50 shadow-sm whitespace-nowrap">
                  <div class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                  <span class="text-[9px] font-bold text-green-700 uppercase tracking-wider">${loc.liveTables} / ${loc.totalTables} Live</span>
                </div>
              </div>
              
              <div class="text-2xl font-black text-gray-900 mb-4 tracking-tight">${loc.revenue}</div>
              
              <div class="grid grid-cols-2 gap-2 bg-gray-50/80 rounded-2xl p-2.5 border border-gray-100/50">
                <div class="flex flex-col">
                    <span class="text-[9px] uppercase font-bold text-gray-400 mb-0.5">Reviews</span>
                    <div class="flex items-center gap-1">
                      <span class="text-xs font-bold text-gray-800">${loc.reviews.count}</span>
                      <span class="text-[9px] font-bold ${loc.reviews.growth >= 0 ? 'text-green-500' : 'text-red-500'}">${loc.reviews.growth > 0 ? '+' : ''}${loc.reviews.growth}%</span>
                    </div>
                </div>
                <div class="flex flex-col">
                    <span class="text-[9px] uppercase font-bold text-gray-400 mb-0.5">Signups</span>
                    <div class="flex items-center gap-1">
                      <span class="text-xs font-bold text-gray-800">${loc.registrations.count}</span>
                      <span class="text-[9px] font-bold ${loc.registrations.growth >= 0 ? 'text-green-500' : 'text-red-500'}">${loc.registrations.growth > 0 ? '+' : ''}${loc.registrations.growth}%</span>
                    </div>
                </div>
                <div class="flex flex-col col-span-2 mt-1 pt-2 border-t border-gray-200/50">
                    <div class="flex justify-between items-end">
                      <span class="text-[9px] uppercase font-bold text-gray-400">Avg Check</span>
                      <div class="flex items-center gap-1">
                        <span class="text-sm font-bold text-gray-900">${loc.avgCheck.value}</span>
                        <span class="text-[9px] font-bold ${loc.avgCheck.growth >= 0 ? 'text-green-500' : 'text-red-500'}">${loc.avgCheck.growth > 0 ? '+' : ''}${loc.avgCheck.growth}%</span>
                      </div>
                    </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Compact Pill (Shown by default, hidden on select) -->
          <div class="marker-pill flex items-center gap-2 px-3 py-1.5 rounded-full shadow-md mb-1.5 bg-white text-gray-900 border border-gray-200 transition-all duration-300">
            <span class="text-xs font-bold">${loc.revenue}</span>
            <div class="w-px h-3 bg-gray-200"></div>
            <div class="flex items-center gap-1">
              <div class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
              <span class="text-[10px] font-bold text-gray-600">${loc.liveTables} Live</span>
            </div>
            <div class="w-px h-3 bg-gray-200"></div>
            <div class="flex items-center gap-1">
              <span class="text-[10px] font-bold text-gray-600">${loc.staff} 👩‍🍳</span>
            </div>
          </div>
          
          <div class="marker-dot w-3 h-3 rounded-full border-2 border-white shadow-sm bg-[#111827] transition-all duration-300"></div>
        </div>
      `;

      el.addEventListener('mouseenter', () => {
        setSelectedLocation(loc.id);
        setHoverSource('map');
      });

      // No mouseleave for map markers! This makes them 'sticky' so when the map pans and the marker moves away from the cursor, the modal doesn't immediately disappear.
      
      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([loc.lng, loc.lat])
        .addTo(map.current!);
        
      markersRef.current[loc.id] = marker;
    });

    // Dismiss marker if map background is clicked
    map.current.on('click', (e) => {
      // Mapbox click events fire on the canvas. If they clicked a marker, it stops propagation?
      // Actually standard DOM events on markers aren't caught by map.on('click'). 
      // So this fires when clicking the map background.
      setSelectedLocation(null);
      setHoverSource(null);
    });

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      map.current?.resize();
    });
    resizeObserver.observe(mapContainer.current);

    return () => {
      resizeObserver.disconnect();
      map.current?.remove();
    };
  }, []);

  // Update marker styles when selectedLocation changes
  useEffect(() => {
    LOCATIONS.forEach(loc => {
      const marker = markersRef.current[loc.id];
      if (marker) {
        const el = marker.getElement();
        const innerDiv = el.querySelector('.flex.flex-col') as HTMLElement;
        const dotDiv = innerDiv?.querySelector('.marker-dot') as HTMLElement;
        const cardDiv = innerDiv?.querySelector('.marker-card') as HTMLElement;
        const pillDiv = innerDiv?.querySelector('.marker-pill') as HTMLElement;
        const nameDiv = innerDiv?.querySelector('.marker-name') as HTMLElement;
        
        if (innerDiv && dotDiv) {
          if (selectedLocation === loc.id) {
            el.style.zIndex = '50';
            innerDiv.style.zIndex = '50';
            dotDiv.className = 'marker-dot w-4 h-4 rounded-full border-2 border-white shadow-sm bg-[#f59e0b] transition-all duration-300';
            
            if (nameDiv) {
              nameDiv.style.opacity = '1';
              nameDiv.style.transform = 'translateY(-4px)';
            }
            if (cardDiv) {
              cardDiv.style.opacity = '1';
              cardDiv.style.transform = 'scale(1)';
              cardDiv.style.pointerEvents = 'auto';
            }
            if (pillDiv) {
              pillDiv.style.opacity = '0';
              pillDiv.style.pointerEvents = 'none';
            }
          } else {
            el.style.zIndex = '';
            innerDiv.style.zIndex = '0';
            dotDiv.className = 'marker-dot w-3 h-3 rounded-full border-2 border-white shadow-sm bg-[#111827] transition-all duration-300';
            
            if (nameDiv) {
              nameDiv.style.opacity = '0';
              nameDiv.style.transform = 'translateY(0)';
            }
            if (cardDiv) {
              cardDiv.style.opacity = '0';
              cardDiv.style.transform = 'scale(0.95)';
              cardDiv.style.pointerEvents = 'none';
            }
            if (pillDiv) {
              pillDiv.style.opacity = '1';
              pillDiv.style.pointerEvents = 'auto';
            }
          }
        }
      }
    });

    if (selectedLocation && map.current) {
      const loc = LOCATIONS.find(l => l.id === selectedLocation);
      if (loc) {
        // Offset center slightly down so the card fits at the top (e.g. 120px below center)
        map.current.flyTo({ 
          center: [loc.lng, loc.lat], 
          zoom: 14, 
          speed: 0.8,
          curve: 1.2,
          offset: [0, 120]
        });
      }
    }
  }, [selectedLocation, hoverSource]);

  return (
    <div className="bg-white rounded-3xl p-6 border border-gray-100 flex flex-col mb-8 h-auto xl:h-[600px]">
      <style>{`
        .mapboxgl-ctrl-logo { display: none !important; }
        .mapboxgl-ctrl-attrib { display: none !important; }
      `}</style>
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-8 min-h-0">
        {/* Left Side: Header + Leaderboard List (col-span-5) */}
        <div className="xl:col-span-5 flex flex-col h-full overflow-hidden">
          <div className="flex-shrink-0 mb-6">
            <h3 className="text-lg font-bold text-gray-900">Locations Overview</h3>
            <p className="text-sm font-medium text-gray-500 mt-1">Network performance across Barcelona</p>
          </div>

          <div className="flex-1 flex flex-col gap-5 overflow-y-auto pr-2 custom-scrollbar">
            {LOCATIONS.sort((a, b) => b.revenueValue - a.revenueValue).map((loc, index) => (
              <div 
                key={loc.id} 
                className={`flex flex-col p-4 rounded-2xl transition-colors cursor-pointer border flex-shrink-0 ${selectedLocation === loc.id ? 'border-[#f59e0b] bg-[#f59e0b]/5' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}
                onMouseEnter={() => {
                  setSelectedLocation(loc.id);
                  setHoverSource('list');
                }}
                onMouseLeave={() => {
                  setSelectedLocation(null);
                  setHoverSource(null);
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl transition-colors ${selectedLocation === loc.id ? 'bg-[#f59e0b] text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'}`}>
                      <loc.icon className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-gray-900 text-base">{loc.name}</span>
                  </div>
                  <span className="font-bold text-gray-900 text-base">{loc.revenue}</span>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white rounded-xl p-2.5 border border-gray-100 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] uppercase font-bold text-gray-500 mb-1">Reviews</span>
                    <div className="flex items-end justify-between">
                      <span className="font-bold text-gray-900 text-sm">{loc.reviews.count}</span>
                      <span className={`text-[10px] font-bold ${loc.reviews.growth > 0 ? 'text-green-500' : loc.reviews.growth < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                        {loc.reviews.growth > 0 ? '+' : ''}{loc.reviews.growth}%
                      </span>
                    </div>
                    {compare && (
                      <div className="flex w-full items-center justify-between mt-1 pt-1 border-t border-gray-100">
                         <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Prev</span>
                         <span className="text-[10px] font-bold text-gray-500">{Math.round(loc.reviews.count / (1 + loc.reviews.growth / 100))}</span>
                      </div>
                    )}
                  </div>
                  <div className="bg-white rounded-xl p-2.5 border border-gray-100 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] uppercase font-bold text-gray-500 mb-1">Signups</span>
                    <div className="flex items-end justify-between">
                      <span className="font-bold text-gray-900 text-sm">{loc.registrations.count}</span>
                      <span className={`text-[10px] font-bold ${loc.registrations.growth > 0 ? 'text-green-500' : loc.registrations.growth < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                        {loc.registrations.growth > 0 ? '+' : ''}{loc.registrations.growth}%
                      </span>
                    </div>
                    {compare && (
                      <div className="flex w-full items-center justify-between mt-1 pt-1 border-t border-gray-100">
                         <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Prev</span>
                         <span className="text-[10px] font-bold text-gray-500">{Math.round(loc.registrations.count / (1 + loc.registrations.growth / 100))}</span>
                      </div>
                    )}
                  </div>
                  <div className="bg-white rounded-xl p-2.5 border border-gray-100 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] uppercase font-bold text-gray-500 mb-1">Avg Check</span>
                    <div className="flex items-end justify-between">
                      <span className="font-bold text-gray-900 text-sm">{loc.avgCheck.value}</span>
                      <span className={`text-[10px] font-bold ${loc.avgCheck.growth > 0 ? 'text-green-500' : loc.avgCheck.growth < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                        {loc.avgCheck.growth > 0 ? '+' : ''}{loc.avgCheck.growth}%
                      </span>
                    </div>
                    {compare && (
                      <div className="flex w-full items-center justify-between mt-1 pt-1 border-t border-gray-100">
                         <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Prev</span>
                         <span className="text-[10px] font-bold text-gray-500">€{(parseFloat(loc.avgCheck.value.replace('€', '')) / (1 + loc.avgCheck.growth / 100)).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Mapbox (col-span-7) */}
        <div className="xl:col-span-7 rounded-2xl overflow-hidden relative border border-gray-100 h-[300px] xl:h-full min-h-[300px]">
          <div ref={mapContainer} className="w-full h-full absolute inset-0" />
          
          <button 
            onClick={handleRecenter}
            className="absolute top-4 right-4 z-10 cursor-pointer bg-white/90 backdrop-blur-sm border border-gray-200/60 shadow-sm p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-white transition-colors"
            title="Recenter Map"
          >
            <LocateFixed className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
