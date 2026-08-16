'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useGuest } from '@/lib/guest-context';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, LogIn, UserPlus, ArrowRight, HelpCircle, Menu, X, MapPin, ClipboardList, Gift, Coffee, ShoppingBag, Navigation2, Zap, ArrowLeft, MoreHorizontal, Compass } from 'lucide-react';
import mapboxgl from 'mapbox-gl';

export default function HomePage() {
  const { bootstrap, orderMode, setOrderMode, isLoggedIn, profileName } = useGuest();
  const router = useRouter();
  const [showDrawer, setShowDrawer] = useState(false);
  const [showLocations, setShowLocations] = useState(false);
  const [showOrderModeSelector, setShowOrderModeSelector] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTimeSlotIndex, setSelectedTimeSlotIndex] = useState(1);
  const timeSlots = [
    "18:45 - 19:15 h",
    "19:15 - 19:45 h",
    "19:45 - 20:15 h",
    "20:15 - 20:45 h",
    "20:45 - 21:15 h",
    "21:15 - 21:45 h"
  ];

  const locations = [
    { 
      id: 'loc-glories', 
      name: 'Westfield Glòries', 
      distance: '2571.1 km', 
      hours: '09:30 - 22:59', 
      city: 'Barcelona', 
      speedLane: 'Speed Lane · Open', 
      speedLaneDesc: 'After placing an order, skip the line.',
      coords: [2.1896, 41.4063] // [longitude, latitude] for Glòries
    },
    { 
      id: 'loc-pedralbes', 
      name: 'Pedralbes Centre', 
      distance: '2570.0 km', 
      hours: '09:30 - 22:59', 
      city: 'Barcelona', 
      speedLane: 'Speed Lane · Open', 
      speedLaneDesc: 'After placing an order, skip the line.',
      coords: [2.1278, 41.3887] // Pedralbes
    },
    { 
      id: 'loc-sagrada', 
      name: 'Sagrada Família', 
      distance: '2573.5 km', 
      hours: '09:00 - 23:00', 
      city: 'Barcelona', 
      speedLane: 'Speed Lane · Open', 
      speedLaneDesc: 'After placing an order, skip the line.',
      coords: [2.1744, 41.4036] // Sagrada Família
    },
    { 
      id: 'loc-gotico', 
      name: 'Gótico', 
      distance: '2574.2 km', 
      hours: '08:00 - 00:00', 
      city: 'Barcelona', 
      speedLane: 'Speed Lane · Open', 
      speedLaneDesc: 'After placing an order, skip the line.',
      coords: [2.1770, 41.3825] // Gothic Quarter
    }
  ];

  const [activeLocationIndex, setActiveLocationIndex] = useState(0);
  const activeLocation = locations[activeLocationIndex];
  const [isFading, setIsFading] = useState(false);

  const handleLocationChange = (nextIndex: number) => {
    setIsFading(true);
    setTimeout(() => {
      setActiveLocationIndex(nextIndex);
      setIsFading(false);
    }, 150);
  };

  // Mapbox setup
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});

  useEffect(() => {
    if (!showLocations || !mapContainerRef.current) return;

    mapboxgl.accessToken = 'pk.eyJ1IjoiYWJpZXNwYW5hIiwiYSI6ImNsb3N4NzllYzAyOWYybWw5ZzNpNXlqaHkifQ.UxlTvUuSq9L5jt0jRtRR-A';

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/abiespana/cmqavnkjq003c01sbeymo33iq?fresh=true',
      center: activeLocation.coords as [number, number],
      zoom: 13,
      pitch: 0,
      attributionControl: false
    });

    mapRef.current = map;

    map.on('load', () => {
      map.resize();
    });

    // Plot pins
    locations.forEach((loc, idx) => {
      // Custom HTML element for Marker
      const el = document.createElement('div');
      el.className = 'custom-marker transition-none';
      el.style.width = '32px';
      el.style.height = '32px';
      el.style.borderRadius = '50%';
      el.style.border = '4px solid white';
      el.style.cursor = 'pointer';
      el.style.boxShadow = '0 10px 25px -5px rgba(0,0,0,0.3)';
      el.style.backgroundColor = activeLocationIndex === idx ? '#FDBD38' : '#000000';

      // Inner element for ping animation if active
      if (activeLocationIndex === idx) {
        const ping = document.createElement('span');
        ping.className = 'absolute w-full h-full rounded-full bg-white opacity-40 animate-ping';
        el.appendChild(ping);
      }
      
      const innerDot = document.createElement('span');
      innerDot.className = 'w-2 h-2 rounded-full bg-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2';
      el.appendChild(innerDot);

      el.addEventListener('click', () => {
        setActiveLocationIndex(idx);
      });

      const marker = new mapboxgl.Marker(el)
        .setLngLat(loc.coords as [number, number])
        .addTo(map);

      markersRef.current[loc.id] = marker;
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = {};
    };
  }, [showLocations]);

  // Handle active index changes by updating marker colors & panning map
  useEffect(() => {
    if (!mapRef.current) return;

    mapRef.current.easeTo({
      center: activeLocation.coords as [number, number],
      zoom: 13,
      duration: 1000
    });

    locations.forEach((loc, idx) => {
      const marker = markersRef.current[loc.id];
      if (!marker) return;
      
      const el = marker.getElement();
      el.style.backgroundColor = activeLocationIndex === idx ? '#FDBD38' : '#000000';
      
      const existingPing = el.querySelector('.animate-ping');
      if (existingPing) {
        existingPing.remove();
      }

      if (activeLocationIndex === idx) {
        const ping = document.createElement('span');
        ping.className = 'absolute w-full h-full rounded-full bg-white opacity-40 animate-ping';
        el.appendChild(ping);
      }
    });
  }, [activeLocationIndex]);

  return (
    <div className="relative h-screen w-full bg-[#FAF7F3] text-gray-900 overflow-hidden font-sans flex flex-col justify-between select-none">
      
      {/* Hero Visual Section - Fixed height (50vh) */}
      <div 
        className="relative h-[50vh] w-full bg-cover bg-center flex flex-col justify-between p-6 text-white transition-all duration-300"
        style={{ backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.4)), url('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=1200')` }}
      >
        {/* Top Header Bar - Smaller icons with thin stroke */}
        <div className="flex justify-between items-center w-full">
          <button onClick={() => setShowDrawer(true)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
            <Menu className="w-6 h-6 text-white" strokeWidth={1.5} />
          </button>
          <button onClick={() => alert('Support / FAQ')} className="p-1 hover:bg-white/10 rounded-full transition-colors">
            <HelpCircle className="w-6 h-6 text-white" strokeWidth={1.5} />
          </button>
        </div>

        {/* Hero Headline Text */}
        <div className="mb-2">
          <h1 className="text-3xl font-extrabold tracking-tight leading-none mb-1">
            LOVE AT FIRST BITE.
          </h1>
          <p className="text-sm text-gray-200 font-medium">
            Introducing our new summer menu.
          </p>
        </div>
      </div>

      {/* Interactive Controls & Cards Container - Fill remaining space and stick button to bottom */}
      <div className="bg-white flex flex-col flex-1 justify-between overflow-hidden transition-all duration-300">
        
        {/* Conditionally Render Auth Links OR Order Mode Selector */}
        <div className="relative overflow-hidden transition-all duration-300">
          {!showOrderModeSelector ? (
            <div className="flex flex-col w-full opacity-100 transition-opacity duration-300">
              {!isLoggedIn ? (
                <>
                  <Link 
                    href="/loyalty" 
                    className="flex justify-between items-center bg-white py-[26px] px-6 border-b border-gray-200 transition-colors w-full"
                  >
                    <div className="flex items-center gap-3">
                      <LogIn className="w-4 h-4 text-gray-800" strokeWidth={1.5} />
                      <span className="font-medium text-[15px] text-black">Log in</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
                  </Link>
                  <Link 
                    href="/loyalty" 
                    className="flex justify-between items-center bg-white py-[26px] px-6 border-b border-gray-200 transition-colors w-full"
                  >
                    <div className="flex items-center gap-3">
                      <UserPlus className="w-4 h-4 text-gray-800" strokeWidth={1.5} />
                      <span className="font-medium text-[15px] text-black">Sign up</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
                  </Link>
                </>
              ) : (
                <div className="bg-white py-[26px] px-6 border-b border-gray-200 text-center w-full">
                  <p className="text-gray-500 font-normal text-xs">Logged in as</p>
                  <h4 className="text-base font-bold text-black">{profileName}</h4>
                </div>
              )}
            </div>
          ) : (
            /* Inline Mode Selector (Replaces Auth Cards on "Order now" click) */
             <div className="p-6 pb-2 border-b border-gray-100 transition-all duration-500 ease-out transform translate-y-0 opacity-100">
               <div className="flex justify-between items-center pb-2">
                 <h2 className="text-xl font-black tracking-tight uppercase text-gray-900">ORDER NOW</h2>
               </div>
               
               {/* Active Location Selection or Add Delivery Address */}
               {orderMode !== 'delivery' ? (
                 <div 
                   onClick={() => setShowLocations(true)}
                   className="flex items-center justify-between py-3 border-b border-gray-100 cursor-pointer hover:opacity-80 transition-opacity animate-fadeIn"
                 >
                   <div className="flex items-center gap-2 text-gray-800 font-bold text-sm">
                     <MapPin className="w-5 h-5 text-gray-600" />
                     <span>{activeLocation.name} · ({activeLocation.distance})</span>
                   </div>
                   <ChevronRight className="w-5 h-5 text-gray-400" />
                 </div>
               ) : (
                 <div 
                   onClick={() => {
                     const addr = prompt("Enter your delivery address:", deliveryAddress);
                     if (addr !== null) setDeliveryAddress(addr);
                   }}
                   className="flex items-center justify-between py-3 border-b border-gray-100 cursor-pointer hover:opacity-80 transition-opacity animate-fadeIn"
                 >
                   <div className="flex items-center gap-2 text-gray-800 font-bold text-sm">
                     <span className="text-base">🚲</span>
                     <span className={deliveryAddress ? "text-gray-900" : "text-gray-950 font-bold"}>
                       {deliveryAddress ? deliveryAddress : "Add a delivery address"}
                     </span>
                   </div>
                   <ChevronRight className="w-5 h-5 text-gray-400" />
                 </div>
               )}

                <div className="relative w-full h-[180px] overflow-hidden my-4">
                  {/* Mode Selector Cards View (Fades & slides left when picker is shown) */}
                  <div className={`absolute inset-0 w-full h-full flex flex-col justify-center transition-all duration-300 ease-in-out ${
                    showTimePicker 
                      ? 'opacity-0 pointer-events-none -translate-x-12 scale-95' 
                      : 'opacity-100 pointer-events-auto translate-x-0 scale-100'
                  }`}>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <button 
                        onClick={() => setOrderMode('store')}
                        className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all relative ${
                          orderMode === 'store' 
                            ? 'border-corgi bg-[#FFF2E2] text-gray-950 font-bold' 
                            : 'border-gray-100 bg-gray-550 text-gray-600'
                        }`}
                      >
                        <span className="text-2xl mb-1">🥗</span>
                        <span className="text-xs uppercase tracking-wider font-bold">Store</span>
                        {orderMode === 'store' && (
                          <span className="absolute -top-1.5 -right-1.5 bg-corgi text-gray-950 rounded-full p-0.5">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                          </span>
                        )}
                      </button>

                      <button 
                        onClick={() => setOrderMode('pickup')}
                        className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all relative ${
                          orderMode === 'pickup' 
                            ? 'border-corgi bg-[#FFF2E2] text-gray-950 font-bold' 
                            : 'border-gray-100 bg-gray-550 text-gray-600'
                        }`}
                      >
                        <span className="text-2xl mb-1">🛍️</span>
                        <span className="text-xs uppercase tracking-wider font-bold">Pick up</span>
                        {orderMode === 'pickup' && (
                          <span className="absolute -top-1.5 -right-1.5 bg-corgi text-gray-950 rounded-full p-0.5">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                          </span>
                        )}
                      </button>

                      <button 
                        onClick={() => setOrderMode('delivery')}
                        className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all relative ${
                          orderMode === 'delivery' 
                            ? 'border-corgi bg-[#FFF2E2] text-gray-950 font-bold' 
                            : 'border-gray-100 bg-gray-550 text-gray-600'
                        }`}
                      >
                        <span className="text-2xl mb-1">🚲</span>
                        <span className="text-xs uppercase tracking-wider font-bold">Delivery</span>
                        {orderMode === 'delivery' && (
                          <span className="absolute -top-1.5 -right-1.5 bg-corgi text-gray-950 rounded-full p-0.5">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                          </span>
                        )}
                      </button>
                    </div>

                    <p className="text-xs text-gray-500 text-left leading-relaxed px-2 h-10 overflow-hidden">
                      {orderMode === 'store' && 'Order and pay with the app in-store. Collect your tracker at the till. Easy.'}
                      {orderMode === 'pickup' && 'Order now or schedule a pickup—your food will be waiting, no lines.'}
                      {orderMode === 'delivery' && 'From our kitchen to your door. Fresh, warm, and fast delivery.'}
                    </p>
                  </div>

                  {/* Custom iOS Wheel Picker View (Fades & slides in from right when active) */}
                  <div className={`absolute inset-0 w-full h-full flex items-center justify-center bg-transparent select-none transition-all duration-300 ease-in-out ${
                    showTimePicker 
                      ? 'opacity-100 pointer-events-auto translate-x-0 scale-100' 
                      : 'opacity-0 pointer-events-none translate-x-12 scale-95'
                  }`} style={{ perspective: '1000px' }}>
                    <style>{`
                      .scrollbar-none::-webkit-scrollbar {
                        display: none;
                      }
                    `}</style>
                    {/* Fixed highlight pill in the center */}
                    <div className="absolute left-[7.5%] right-[7.5%] h-[36px] bg-gray-100 rounded-full pointer-events-none z-0" />
                    
                    {/* Scrollable list of slots */}
                    <div 
                      className="w-full h-full overflow-y-scroll snap-y snap-mandatory flex flex-col items-center z-10 scrollbar-none"
                      style={{
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                        paddingTop: '72px',
                        paddingBottom: '72px'
                      }}
                      onScroll={(e) => {
                        const container = e.currentTarget;
                        const scrollTop = container.scrollTop;
                        const itemHeight = 36; // Item height is 36px
                        const index = Math.round(scrollTop / itemHeight);
                        if (index >= 0 && index < timeSlots.length && index !== selectedTimeSlotIndex) {
                          setSelectedTimeSlotIndex(index);
                        }
                      }}
                    >
                      {timeSlots.map((slot, idx) => {
                        const isSelected = idx === selectedTimeSlotIndex;
                        const distance = Math.abs(idx - selectedTimeSlotIndex);
                        const scale = isSelected ? 1 : 0.95;
                        const opacity = Math.max(0.15, 1 - distance * 0.4);
                        const rotate = (idx - selectedTimeSlotIndex) * 15; // 3D rotating cylinder effect
                        
                        return (
                          <div
                            key={slot}
                            className={`h-[36px] w-[85%] flex-shrink-0 flex items-center justify-center snap-center text-[16px] transition-all duration-150 ${
                              isSelected 
                                ? 'text-gray-950 font-medium' 
                                : 'text-gray-400 font-medium'
                            }`}
                            style={{
                              transform: `scale(${scale}) rotateX(${rotate}deg)`,
                              opacity: opacity
                            }}
                          >
                            {slot}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>    
             </div>
          )}
        </div>

        {/* Action Button: Black Pill with Arrow (Order Now / Confirm) */}
        <div className="p-6 mb-8 bg-white">
          {!showOrderModeSelector ? (
            <button 
              onClick={() => setShowOrderModeSelector(true)} 
              className="w-full bg-black text-white py-3 pl-6 pr-4 rounded-full font-bold flex items-center justify-between hover:bg-gray-900 active:scale-[0.98] transition-all duration-100 shadow-md shadow-black/20"
            >
              <span className="text-base font-medium">Order now</span>
              <div className="bg-white/20 px-6 py-2 rounded-full">
                <ArrowRight className="w-5 h-5 text-white" strokeWidth={1.5} />
              </div>
            </button>
          ) : showTimePicker ? (
             /* Time Picker Action Buttons */
             <div className="flex gap-4 items-center animate-fadeIn">
               <button 
                 onClick={() => setShowTimePicker(false)}
                 className="p-4 bg-gray-100 hover:bg-gray-200 rounded-full transition-all active:scale-95 text-gray-800 shadow-md shadow-black/20"
               >
                 <X className="w-6 h-6" strokeWidth={2} />
               </button>
               <button 
                 onClick={() => {
                   setShowTimePicker(false);
                   router.push('/menu');
                 }}
                 className="flex-1 bg-black hover:bg-gray-900 text-white py-3 pl-6 pr-4 rounded-full font-bold flex items-center justify-between active:scale-[0.98] transition-all duration-100 shadow-md shadow-black/20"
               >
                 <span className="text-base font-medium">Confirm time</span>
                 <div className="bg-white/20 px-6 py-2 rounded-full">
                   <ArrowRight className="w-5 h-5 text-white" strokeWidth={1.5} />
                 </div>
               </button>
             </div>
           ) : (orderMode === 'delivery' || orderMode === 'pickup') ? (
             /* Delivery & Pickup Order now Button with Clock button */
             <div className="flex gap-4 items-center animate-fadeIn">
                <button 
                  onClick={() => setShowTimePicker(true)}
                  className="p-4 bg-gray-100 hover:bg-gray-200 rounded-full transition-all active:scale-95 text-gray-800 shadow-md shadow-black/20"
                >
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                   <circle cx="12" cy="12" r="10" />
                   <polyline points="12 6 12 12 16 14" />
                 </svg>
               </button>
               <button 
                 onClick={() => {
                   if (orderMode === 'delivery' && !deliveryAddress) {
                     const addr = prompt("Enter your delivery address:", deliveryAddress);
                     if (addr) {
                       setDeliveryAddress(addr);
                       setShowTimePicker(true);
                     }
                     return;
                   }
                   setShowTimePicker(true);
                 }}
                 className="flex-1 bg-black hover:bg-gray-900 text-white py-3 pl-6 pr-4 rounded-full font-bold flex items-center justify-between active:scale-[0.98] transition-all duration-100 shadow-md shadow-black/20"
               >
                 <span className="text-base font-medium">Order now</span>
                 <div className="bg-white/20 px-6 py-2 rounded-full">
                   <ArrowRight className="w-5 h-5 text-white" strokeWidth={1.5} />
                 </div>
               </button>
             </div>
           ) : (
             <button 
               onClick={() => router.push('/menu')}
               className="w-full bg-black hover:bg-gray-900 text-white py-3 pl-6 pr-4 rounded-full font-bold flex items-center justify-between active:scale-[0.98] transition-all duration-100 shadow-md shadow-black/20 animate-fadeIn"
             >
               <span className="text-base font-medium">Order now</span>
               <div className="bg-white/20 px-6 py-2 rounded-full">
                 <ArrowRight className="w-5 h-5 text-white" strokeWidth={1.5} />
               </div>
             </button>
           )}
        </div>
      </div>

      {/* Drawer Overlay Menu */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300 ${
          showDrawer ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setShowDrawer(false)}
      >
        <div 
          className={`w-[85%] max-w-sm h-full bg-[#FAF7F3] shadow-2xl flex flex-col justify-between relative transition-transform duration-300 ease-in-out transform ${
            showDrawer ? 'translate-x-0' : '-translate-x-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Transparent close button */}
          <button 
            onClick={() => setShowDrawer(false)}
            className="absolute top-6 right-6 p-1 hover:opacity-80 transition-opacity z-10"
          >
            <X className="w-5 h-5 text-white" strokeWidth={1.5} />
          </button>

          {/* Drawer Content */}
          <div className="flex-1 flex flex-col">
            {/* Top Black Header Section (~15% height) */}
            <div className="bg-[#000000] text-white p-6 pt-12 pb-8 flex items-center gap-4">
              {/* White circle avatar container with kiwi emoji inside */}
              <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-2xl shadow-sm">
                🥝
              </div>
              <div>
                <h4 className="font-extrabold text-base tracking-tight leading-tight uppercase">
                  {isLoggedIn ? profileName : 'NOT LOGGED IN'}
                </h4>
                {!isLoggedIn && (
                  <Link href="/loyalty" onClick={() => setShowDrawer(false)} className="text-xs text-gray-300 hover:text-white underline font-medium">
                    Log in
                  </Link>
                )}
              </div>
            </div>

            {/* Navigation Links with indented bottom border */}
            <nav className="flex-1 mt-4">
              <div className="flex flex-col">
                <Link 
                  href="/orders" 
                  onClick={() => setShowDrawer(false)} 
                  className="flex items-center justify-between hover:bg-black/5 transition-colors pl-6 py-[22px] pr-6 w-full"
                >
                  <div className="flex items-center gap-3">
                    <ClipboardList className="w-5 h-5 text-gray-800" strokeWidth={1.5} />
                    <span className="text-[15px] font-medium text-[#000000]">My orders</span>
                  </div>
                </Link>
                <div className="ml-6 mr-0 border-b border-gray-200" />
                
                <Link 
                  href="/loyalty" 
                  onClick={() => setShowDrawer(false)} 
                  className="flex items-center justify-between hover:bg-black/5 transition-colors pl-6 py-[22px] pr-6 w-full"
                >
                  <div className="flex items-center gap-3">
                    <Gift className="w-5 h-5 text-gray-800" strokeWidth={1.5} />
                    <span className="text-[15px] font-medium text-[#000000]">Honest People</span>
                  </div>
                </Link>
                <div className="ml-6 mr-0 border-b border-gray-200" />

                <Link 
                  href="/menu" 
                  onClick={() => setShowDrawer(false)} 
                  className="flex items-center justify-between hover:bg-black/5 transition-colors pl-6 py-[22px] pr-6 w-full"
                >
                  <div className="flex items-center gap-3">
                    <Coffee className="w-5 h-5 text-gray-800" strokeWidth={1.5} />
                    <span className="text-[15px] font-medium text-[#000000]">Summer Menu</span>
                  </div>
                </Link>
                <div className="ml-6 mr-0 border-b border-gray-200" />

                <Link 
                  href="/shop" 
                  onClick={() => setShowDrawer(false)} 
                  className="flex items-center justify-between hover:bg-black/5 transition-colors pl-6 py-[22px] pr-6 w-full"
                >
                  <div className="flex items-center gap-3">
                    <ShoppingBag className="w-5 h-5 text-gray-800" strokeWidth={1.5} />
                    <span className="text-[15px] font-medium text-[#000000]">Merch Shop</span>
                  </div>
                </Link>
                <div className="ml-6 mr-0 border-b border-gray-200" />
              </div>
            </nav>
          </div>

          {/* Instagram link footer */}
          <div className="p-6 flex justify-center bg-white border-t border-gray-100">
            <a 
              href="https://instagram.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-800"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* Modern Map Picker Modal (Smooth CSS Transition Wrapper) */}
      <div 
        className={`fixed inset-0 z-50 transition-all duration-500 ease-in-out ${
          showLocations 
            ? 'opacity-100 pointer-events-auto scale-100' 
            : 'opacity-0 pointer-events-none scale-105'
        }`}
      >
        {/* Map Container Target for Mapbox GL */}
        <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0 bg-gray-200" />

        {/* Top Bar Navigation Overlaid */}
        <div className="absolute top-12 left-6 z-10">
          <button 
            onClick={() => setShowLocations(false)}
            className="bg-white/90 p-3 rounded-full shadow-lg hover:bg-white active:scale-95 transition-all text-gray-800"
          >
            <ArrowLeft className="w-6 h-6" strokeWidth={2} />
          </button>
        </div>

        {/* Bottom Card Overlay Floating ON TOP of Mapbox */}
        <div className="absolute bottom-6 left-4 right-4 z-10 bg-white/95 backdrop-blur-lg rounded-3xl p-6 shadow-2xl flex flex-col gap-4 border border-white/20 animate-slideUp">
          
          {/* Title / Hours Block with navigation arrows and Distance */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between w-full">
              {/* Left navigation arrow */}
              <button 
                onClick={() => handleLocationChange(activeLocationIndex > 0 ? activeLocationIndex - 1 : locations.length - 1)}
                className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors active:scale-95"
              >
                <ChevronRight className="w-5 h-5 text-gray-700 transform rotate-180" strokeWidth={2.5} />
              </button>

              {/* Location Name in Center */}
              <h3 className={`text-xl font-black uppercase tracking-tight text-gray-950 leading-tight text-center mx-2 flex-1 transition-all duration-150 ${isFading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
                {activeLocation.name}.
              </h3>

              {/* Right navigation arrow */}
              <button 
                onClick={() => handleLocationChange(activeLocationIndex < locations.length - 1 ? activeLocationIndex + 1 : 0)}
                className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors active:scale-95"
              >
                <ChevronRight className="w-5 h-5 text-gray-700" strokeWidth={2.5} />
              </button>
            </div>

            {/* Sub-header info: distance, hours, city */}
            <div className={`flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-gray-500 mt-2 transition-all duration-150 ${isFading ? 'opacity-0' : 'opacity-100'}`}>
              <span className="text-gray-800 font-bold bg-gray-100 px-2 py-0.5 rounded-full">{activeLocation.distance}</span>
              <span>·</span>
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              <span>{activeLocation.hours}</span>
              <span>·</span>
              <span>{activeLocation.city}</span>
            </div>
          </div>

          {/* Buttons Group: Maps & Open Menu (styled like Order now button) */}
          <div className="flex gap-3 mt-1">
            <button 
              onClick={() => alert(`Opening maps for ${activeLocation.name}...`)}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-950 py-3 rounded-full font-medium text-sm transition-all active:scale-[0.98] text-center"
            >
              Maps
            </button>
            
            <button 
              onClick={() => {
                setShowLocations(false);
                setShowOrderModeSelector(true);
              }}
              className="flex-1 bg-black hover:bg-gray-900 text-white py-3 rounded-full font-medium text-sm transition-all active:scale-[0.98] text-center flex items-center justify-center gap-1.5 shadow-md shadow-black/20"
            >
              Open menu
              <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
