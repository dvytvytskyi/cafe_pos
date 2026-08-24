'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { LayoutGrid, Castle, Landmark, Church, Coffee, MapPin, LocateFixed } from 'lucide-react';
import type { DashboardLocationMetrics } from '@/lib/dashboard';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

const ICONS = [LayoutGrid, Castle, Landmark, Church, Coffee, MapPin];

function formatEuro(value: number): string {
  return `€${value.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function growthLabel(growth: number | null): string {
  if (growth === null) return '';
  return `${growth > 0 ? '+' : ''}${growth}%`;
}

type LocationsLeaderboardProps = {
  compare?: boolean;
  locations?: DashboardLocationMetrics[];
};

export default function LocationsLeaderboard({ compare = false, locations = [] }: LocationsLeaderboardProps) {
  const sorted = useMemo(
    () => [...locations].sort((a, b) => b.revenue - a.revenue),
    [locations]
  );

  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [hoverSource, setHoverSource] = useState<'list' | 'map' | null>(null);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Record<string, mapboxgl.Marker>>({});

  const mapCenter = useMemo(() => {
    if (sorted.length === 0) return { lng: 2.168, lat: 41.393 };
    const lng = sorted.reduce((s, l) => s + l.lng, 0) / sorted.length;
    const lat = sorted.reduce((s, l) => s + l.lat, 0) / sorted.length;
    return { lng, lat };
  }, [sorted]);

  const handleRecenter = () => {
    setSelectedLocation(null);
    setHoverSource(null);
    map.current?.flyTo({
      center: [mapCenter.lng, mapCenter.lat],
      zoom: sorted.length <= 1 ? 13 : 12.5,
      speed: 0.8,
      curve: 1.2,
      offset: [0, 0],
    });
  };

  useEffect(() => {
    if (!mapContainer.current || !MAPBOX_TOKEN || sorted.length === 0) return;
    if (map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/abiespana/cmqxgn84r004t01se6nwt1acq',
      center: [mapCenter.lng, mapCenter.lat],
      zoom: sorted.length <= 1 ? 13 : 12.5,
      minZoom: 11.5,
      attributionControl: false,
    });

    sorted.forEach((loc) => {
      const el = document.createElement('div');
      el.className = 'custom-marker';
      el.innerHTML = `
        <div class="flex flex-col items-center cursor-pointer transition-all duration-300 z-10 relative group">
          <div class="marker-name absolute bg-gray-900 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-xl opacity-0 pointer-events-none transition-all duration-300 whitespace-nowrap" style="z-index: 100; bottom: 18px;">
            ${loc.name}
            <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
          </div>
          <div class="marker-card absolute bottom-0 pb-[20px] w-[240px] origin-bottom transform scale-95 opacity-0 pointer-events-none transition-all duration-300" style="z-index: 100;">
            <div class="bg-white/95 backdrop-blur-md p-4 rounded-3xl shadow-2xl border border-gray-100/50">
              <div class="flex justify-between items-start mb-3">
                <span class="font-bold text-gray-900 text-[15px] leading-tight">${loc.name}</span>
                <div class="flex items-center gap-1.5 bg-green-50/80 px-2 py-0.5 rounded-full border border-green-100/50 shadow-sm whitespace-nowrap">
                  <div class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                  <span class="text-[9px] font-bold text-green-700 uppercase tracking-wider">${loc.activeTables} / ${loc.totalTables} Live</span>
                </div>
              </div>
              <div class="text-2xl font-bold text-gray-900 mb-4 tracking-tight">${formatEuro(loc.revenue)}</div>
            </div>
          </div>
          <div class="marker-pill flex items-center gap-2 px-3 py-1.5 rounded-full shadow-md mb-1.5 bg-white text-gray-900 border border-gray-200 transition-all duration-300">
            <span class="text-xs font-bold">${formatEuro(loc.revenue)}</span>
            <div class="w-px h-3 bg-gray-200"></div>
            <div class="flex items-center gap-1">
              <div class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
              <span class="text-[10px] font-bold text-gray-600">${loc.activeTables} Live</span>
            </div>
          </div>
          <div class="marker-dot w-3 h-3 rounded-full border-2 border-white shadow-sm bg-[#111827] transition-all duration-300"></div>
        </div>
      `;

      el.addEventListener('mouseenter', () => {
        setSelectedLocation(loc.id);
        setHoverSource('map');
      });

      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([loc.lng, loc.lat])
        .addTo(map.current!);
      markersRef.current[loc.id] = marker;
    });

    map.current.on('click', () => {
      setSelectedLocation(null);
      setHoverSource(null);
    });

    const resizeObserver = new ResizeObserver(() => map.current?.resize());
    resizeObserver.observe(mapContainer.current);

    return () => {
      resizeObserver.disconnect();
      map.current?.remove();
      map.current = null;
    };
  }, [sorted, mapCenter]);

  useEffect(() => {
    sorted.forEach((loc) => {
      const marker = markersRef.current[loc.id];
      if (!marker) return;
      const el = marker.getElement();
      const innerDiv = el.querySelector('.flex.flex-col') as HTMLElement;
      const dotDiv = innerDiv?.querySelector('.marker-dot') as HTMLElement;
      const cardDiv = innerDiv?.querySelector('.marker-card') as HTMLElement;
      const pillDiv = innerDiv?.querySelector('.marker-pill') as HTMLElement;
      const nameDiv = innerDiv?.querySelector('.marker-name') as HTMLElement;

      if (!innerDiv || !dotDiv) return;

      if (selectedLocation === loc.id) {
        el.style.zIndex = '50';
        dotDiv.className =
          'marker-dot w-4 h-4 rounded-full border-2 border-white shadow-sm bg-[#FDBD38] transition-all duration-300';
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
        dotDiv.className =
          'marker-dot w-3 h-3 rounded-full border-2 border-white shadow-sm bg-[#111827] transition-all duration-300';
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
    });

    if (selectedLocation && map.current) {
      const loc = sorted.find((l) => l.id === selectedLocation);
      if (loc) {
        map.current.flyTo({
          center: [loc.lng, loc.lat],
          zoom: 14,
          speed: 0.8,
          curve: 1.2,
          offset: [0, 120],
        });
      }
    }
  }, [selectedLocation, hoverSource, sorted]);

  return (
    <div className="bg-white rounded-3xl p-6 border border-gray-100 flex flex-col mb-8 h-auto xl:h-[600px]">
      <style>{`
        .mapboxgl-ctrl-logo { display: none !important; }
        .mapboxgl-ctrl-attrib { display: none !important; }
      `}</style>
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-8 min-h-0">
        <div className="xl:col-span-5 flex flex-col h-full overflow-hidden">
          <div className="flex-shrink-0 mb-6">
            <h3 className="text-lg font-bold text-gray-900">Locations Overview</h3>
            <p className="text-sm font-medium text-gray-500 mt-1">Network performance across locations</p>
          </div>

          <div className="flex-1 flex flex-col gap-5 overflow-y-auto pr-2 custom-scrollbar">
            {sorted.length === 0 ? (
              <p className="text-sm text-gray-400">No location data for this period.</p>
            ) : (
              sorted.map((loc, index) => {
                const Icon = ICONS[index % ICONS.length];
                return (
                  <div
                    key={loc.id}
                    className={`flex flex-col p-4 rounded-2xl transition-colors cursor-pointer border flex-shrink-0 ${selectedLocation === loc.id ? 'border-[#FDBD38] bg-[#FDBD38]/10' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}
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
                        <div
                          className={`p-2 rounded-xl transition-colors ${selectedLocation === loc.id ? 'bg-[#FDBD38] text-white' : 'bg-gray-100 text-gray-500'}`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-gray-900 text-base">{loc.name}</span>
                      </div>
                      <span className="font-bold text-gray-900 text-base">{formatEuro(loc.revenue)}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-white rounded-xl p-2.5 border border-gray-100 shadow-sm flex flex-col justify-between">
                        <span className="text-[10px] uppercase font-bold text-gray-500 mb-1">Reviews</span>
                        <div className="flex items-end justify-between">
                          <span className="font-bold text-gray-900 text-sm">{loc.reviewCount}</span>
                          {loc.reviewGrowth !== null && (
                            <span
                              className={`text-[10px] font-bold ${loc.reviewGrowth > 0 ? 'text-green-500' : loc.reviewGrowth < 0 ? 'text-red-500' : 'text-gray-400'}`}
                            >
                              {growthLabel(loc.reviewGrowth)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="bg-white rounded-xl p-2.5 border border-gray-100 shadow-sm flex flex-col justify-between">
                        <span className="text-[10px] uppercase font-bold text-gray-500 mb-1">Orders</span>
                        <div className="flex items-end justify-between">
                          <span className="font-bold text-gray-900 text-sm">{loc.orderCount}</span>
                        </div>
                      </div>
                      <div className="bg-white rounded-xl p-2.5 border border-gray-100 shadow-sm flex flex-col justify-between">
                        <span className="text-[10px] uppercase font-bold text-gray-500 mb-1">Avg Check</span>
                        <div className="flex items-end justify-between">
                          <span className="font-bold text-gray-900 text-sm">
                            €{loc.avgTicket.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="xl:col-span-7 rounded-2xl overflow-hidden relative border border-gray-100 h-[300px] xl:h-full min-h-[300px]">
          {sorted.length > 0 && MAPBOX_TOKEN ? (
            <>
              <div ref={mapContainer} className="w-full h-full absolute inset-0" />
              <button
                onClick={handleRecenter}
                className="absolute top-4 right-4 z-10 cursor-pointer bg-white/90 backdrop-blur-sm border border-gray-200/60 shadow-sm p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-white transition-colors"
                title="Recenter Map"
              >
                <LocateFixed className="w-5 h-5" />
              </button>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-50 text-sm text-gray-400">
              {!MAPBOX_TOKEN ? 'Map unavailable (no Mapbox token)' : 'Add locations to see the map'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
