'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useGuest } from '@/lib/guest-context';
import Link from 'next/link';
import { logoutGuest } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { ChevronRight, ChevronLeft, LogIn, UserPlus, ArrowRight, HelpCircle, Menu, X, MapPin, ClipboardList, Gift, Coffee, ShoppingBag, Navigation2, Zap, ArrowLeft, MoreHorizontal, Compass, Bike, Globe, FileText, Shirt, Package, MessageSquare, Megaphone, Radio, PawPrint, Share2, Copy, Check, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import mapboxgl from 'mapbox-gl';

export default function HomePage() {
  const { bootstrap, orderMode, setOrderMode, isLoggedIn, profileName, refreshAuth, logout } = useGuest();
  const router = useRouter();
  const [showDrawer, setShowDrawer] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register_step1' | 'register_step2'>('login');
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authConfirmPassword, setAuthConfirmPassword] = useState("");
  const [authFullName, setAuthFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showLocations, setShowLocations] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showOrderModeSelector, setShowOrderModeSelector] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [showNewAddressModal, setShowNewAddressModal] = useState(false);
  const [newStreetAddress, setNewStreetAddress] = useState("");
  const [newAddressAlias, setNewAddressAlias] = useState<'home' | 'work' | 'custom'>('home');
  const [isDefaultAddress, setIsDefaultAddress] = useState(false);
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

  const addressSuggestions = [
    { title: "Passeig de Gràcia, 43", desc: "Casa Batlló, 08007 Barcelona, Spain" },
    { title: "Parc de la Ciutadella", desc: "Passeig de Picasso, 21, 08003 Barcelona, Spain" },
    { title: "Parc Güell", desc: "Carrer d'Olot, 08024 Barcelona, Spain" },
    { title: "Plaça d'Espanya", desc: "08004 Barcelona, Spain" },
    { title: "Palau de la Música Catalana", desc: "Carrer Palau de la Música, 4-6, 08003 Barcelona, Spain" },
    { title: "Patronat de la Sagrada Família", desc: "Carrer de Mallorca, 401, 08013 Barcelona, Spain" }
  ];

  const filteredSuggestions = newStreetAddress.trim()
    ? addressSuggestions.filter(sug => 
        (sug.title.toLowerCase().includes(newStreetAddress.toLowerCase()) || 
         sug.desc.toLowerCase().includes(newStreetAddress.toLowerCase())) &&
        sug.title.toLowerCase() !== newStreetAddress.toLowerCase().trim()
      )
    : [];

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
    <div className="relative h-[100dvh] w-full overflow-hidden bg-white select-none">
      
      {/* Main Page Content Wrapper (Pushed to the right when drawer is active) */}
      <div 
        className={`relative h-full w-full bg-[#FFFFFF] text-gray-900 font-sans flex flex-col justify-between transform transition-transform duration-300 ease-out ${
          showDrawer ? 'translate-x-[290px]' : 'translate-x-0'
        }`}
        style={{ willChange: 'transform' }}
      >
      
      {/* Hero Visual Section - Dynamic height (flex-1) */}
      <div 
        className="relative flex-1 w-full bg-cover bg-center flex flex-col justify-between p-6 text-white min-h-[140px] transition-all duration-300"
        style={{ backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.4)), url('https://static.tildacdn.com/tild6162-6266-4231-a134-353165393339/corgicafe-19.jpg')` }}
      >
        {/* Top Header Bar - Smaller icons with thin stroke */}
        <div className="flex justify-between items-center w-full">
          <button 
            onClick={() => setShowDrawer(true)} 
            className={`p-1 hover:bg-white/10 rounded-full transition-all duration-300 ${
              showDrawer ? 'opacity-0 pointer-events-none scale-75' : 'opacity-100 pointer-events-auto scale-100'
            }`}
          >
            <Menu className="w-6 h-6 text-white" strokeWidth={1.5} />
          </button>
          <button onClick={() => alert('Support / FAQ')} className="p-1 hover:bg-white/10 rounded-full transition-colors">
            <HelpCircle className="w-6 h-6 text-white" strokeWidth={1.5} />
          </button>
        </div>

        {/* Hero Headline Text */}
        <div className="mb-2">
          <h1 className="text-3xl font-bold tracking-tight leading-none mb-1">
            LOVE AT FIRST BITE.
          </h1>
          <p className="text-sm text-gray-200 font-medium">
            Introducing our new summer menu.
          </p>
        </div>
      </div>

            {/* Interactive Controls & Cards Container - Natural height (flex-shrink-0) */}
      <div className="bg-white flex flex-col flex-shrink-0 justify-between transition-all duration-300">
        
        {/* Conditionally Render Auth Links OR Order Mode Selector */}
        <div className="relative overflow-hidden transition-all duration-300">
          {!showOrderModeSelector ? (
            <div className="flex flex-col w-full opacity-100 transition-opacity duration-300">
              {!isLoggedIn ? (
                <>
                  <button 
                    onClick={() => setShowLoginModal(true)}
                    className="flex justify-between items-center bg-white py-[26px] px-6 border-b border-gray-200 transition-colors w-full text-left"
                  >
                    <div className="flex items-center gap-3">
                      <LogIn className="w-4 h-4 text-gray-800" strokeWidth={1.5} />
                      <span className="font-medium text-[15px] text-black">Log in</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
                  </button>
                  <button 
                    onClick={() => {
                      setAuthMode('register_step1');
                      setShowLoginModal(true);
                    }}
                    className="flex justify-between items-center bg-white py-[26px] px-6 border-b border-gray-200 transition-colors w-full text-left"
                  >
                    <div className="flex items-center gap-3">
                      <UserPlus className="w-4 h-4 text-gray-800" strokeWidth={1.5} />
                      <span className="font-medium text-[15px] text-black">Sign up</span>
                      <span className="bg-[#FDBD38] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                        +3€ bonus
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
                  </button>
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
             <div className="p-6 pb-2 transition-all duration-500 ease-out transform translate-y-0 opacity-100">
               <div className="flex justify-between items-center pb-2">
                 <h2 className="text-xl font-bold tracking-tight uppercase text-gray-900">ORDER NOW</h2>
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
                      setNewStreetAddress(deliveryAddress);
                      setNewAddressAlias("home");
                      setIsDefaultAddress(false);
                      setShowNewAddressModal(true);
                    }}
                   className="flex items-center justify-between py-3 border-b border-gray-100 cursor-pointer hover:opacity-80 transition-opacity animate-fadeIn"
                 >
                   <div className="flex items-center gap-2 text-gray-800 font-bold text-sm">
                     <Bike className="w-5 h-5 text-gray-600" />
                     <span className="text-gray-800">
                       {deliveryAddress ? deliveryAddress : "Add a delivery address"}
                     </span>
                   </div>
                   <ChevronRight className="w-5 h-5 text-gray-400" />
                 </div>
               )}

                <div className="relative w-full h-[140px] overflow-hidden my-4">
                  {/* Mode Selector Cards View (Fades & slides left when picker is shown) */}
                  <div className={`absolute inset-y-0 left-2 right-2 flex flex-col justify-center transition-all duration-300 ease-in-out ${
                    showTimePicker 
                      ? 'opacity-0 pointer-events-none -translate-x-12 scale-95' 
                      : 'opacity-100 pointer-events-auto translate-x-0 scale-100'
                  }`}>
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <button 
                        onClick={() => setOrderMode('store')}
                        className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all overflow-visible relative ${
                          orderMode === 'store' 
                            ? 'border-corgi bg-[#FFF2E2] text-gray-950 font-bold' 
                            : 'border-gray-100 bg-gray-550 text-gray-600'
                        }`}
                      >
                        <span className="text-xl mb-0.5">🥗</span>
                        <span className="text-[10px] uppercase tracking-wider font-bold">Store</span>
                        {orderMode === 'store' && (
                          <span className="absolute -top-1 -right-1 bg-corgi text-gray-950 rounded-full p-0.5 z-10">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                          </span>
                        )}
                      </button>

                      <button 
                        onClick={() => setOrderMode('pickup')}
                        className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all overflow-visible relative ${
                          orderMode === 'pickup' 
                            ? 'border-corgi bg-[#FFF2E2] text-gray-950 font-bold' 
                            : 'border-gray-100 bg-gray-550 text-gray-600'
                        }`}
                      >
                        <span className="text-xl mb-0.5">🛍️</span>
                        <span className="text-[10px] uppercase tracking-wider font-bold">Pick up</span>
                        {orderMode === 'pickup' && (
                          <span className="absolute -top-1 -right-1 bg-corgi text-gray-950 rounded-full p-0.5 z-10">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                          </span>
                        )}
                      </button>

                      <button 
                        onClick={() => setOrderMode('delivery')}
                        className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all overflow-visible relative ${
                          orderMode === 'delivery' 
                            ? 'border-corgi bg-[#FFF2E2] text-gray-950 font-bold' 
                            : 'border-gray-100 bg-gray-550 text-gray-600'
                        }`}
                      >
                        <span className="text-xl mb-0.5">🚲</span>
                        <span className="text-[10px] uppercase tracking-wider font-bold">Delivery</span>
                        {orderMode === 'delivery' && (
                          <span className="absolute -top-1 -right-1 bg-corgi text-gray-950 rounded-full p-0.5 z-10">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                          </span>
                        )}
                      </button>
                    </div>

                    <p className="text-[11px] text-gray-500 text-left leading-relaxed px-2 h-8 overflow-hidden">
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
                        paddingTop: '52px',
                        paddingBottom: '52px'
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
              className="w-full bg-[#FDBD38] text-white py-3 pl-6 pr-4 rounded-full font-bold flex items-center justify-between hover:bg-[#e5a420] active:scale-[0.98] transition-all duration-100 shadow-sm shadow-black/10"
            >
              <span className="text-base font-medium">Order now</span>
              <div className="bg-white px-6 py-2 rounded-full">
                <PawPrint className="w-5 h-5 text-[#FDBD38] fill-[#FDBD38]" strokeWidth={1.5} />
              </div>
            </button>
          ) : showTimePicker ? (
             /* Time Picker Action Buttons */
             <div className="flex gap-4 items-center animate-fadeIn">
               <button 
                 onClick={() => setShowTimePicker(false)}
                 className="p-4 bg-gray-100 hover:bg-gray-200 rounded-full transition-all active:scale-95 text-gray-800 shadow-sm shadow-black/10"
               >
                 <X className="w-6 h-6" strokeWidth={2} />
               </button>
               <button 
                 onClick={() => {
                   setShowTimePicker(false);
                   router.push('/menu');
                 }}
                 className="flex-1 bg-[#FDBD38] hover:bg-[#e5a420] text-white py-3 pl-6 pr-4 rounded-full font-bold flex items-center justify-between active:scale-[0.98] transition-all duration-100 shadow-sm shadow-black/10"
               >
                 <span className="text-base font-medium">Confirm time</span>
                 <div className="bg-white px-6 py-2 rounded-full">
                   <PawPrint className="w-5 h-5 text-[#FDBD38] fill-[#FDBD38]" strokeWidth={1.5} />
                 </div>
               </button>
             </div>
           ) : (orderMode === 'delivery' || orderMode === 'pickup') ? (
             /* Delivery & Pickup Order now Button with Clock button */
             <div className="flex gap-4 items-center animate-fadeIn">
                <button 
                  onClick={() => setShowTimePicker(true)}
                  className="p-4 bg-gray-100 hover:bg-gray-200 rounded-full transition-all active:scale-95 text-gray-800 shadow-sm shadow-black/10"
                >
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                   <circle cx="12" cy="12" r="10" />
                   <polyline points="12 6 12 12 16 14" />
                 </svg>
               </button>
               <button 
                 onClick={() => {
                   if (orderMode === 'delivery' && !deliveryAddress) {
                     setShowNewAddressModal(true);
                     return;
                   }
                   setShowTimePicker(true);
                 }}
                 className="flex-1 bg-[#FDBD38] hover:bg-[#e5a420] text-white py-3 pl-6 pr-4 rounded-full font-bold flex items-center justify-between active:scale-[0.98] transition-all duration-100 shadow-sm shadow-black/10"
               >
                 <span className="text-base font-medium">Order now</span>
                 <div className="bg-white px-6 py-2 rounded-full">
                   <PawPrint className="w-5 h-5 text-[#FDBD38] fill-[#FDBD38]" strokeWidth={1.5} />
                 </div>
               </button>
             </div>
           ) : (
             <button 
               onClick={() => router.push('/menu')}
               className="w-full bg-[#FDBD38] hover:bg-[#e5a420] text-white py-3 pl-6 pr-4 rounded-full font-bold flex items-center justify-between active:scale-[0.98] transition-all duration-100 shadow-sm shadow-black/10 animate-fadeIn"
             >
               <span className="text-base font-medium">Order now</span>
               <div className="bg-white px-6 py-2 rounded-full">
                 <PawPrint className="w-5 h-5 text-[#FDBD38] fill-[#FDBD38]" strokeWidth={1.5} />
               </div>
             </button>
           )}
        </div>
      </div>
      </div>
             {/* Sidebar Drawer Sheet */}
      <div 
        className={`fixed inset-0 bg-black/5 z-50 transition-opacity duration-300 ${
          showDrawer ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setShowDrawer(false)}
      >
        <div 
          className={`w-[80%] max-w-[290px] h-[100dvh] bg-[#FFFFFF] flex flex-col justify-between relative transform transition-transform duration-300 ease-out shadow-[10px_0_30px_rgba(0,0,0,0.06)] border-none ${
            showDrawer ? 'translate-x-0' : '-translate-x-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Transparent close button - Moved outside to the right of the sidebar container */}
          <button 
            onClick={() => setShowDrawer(false)}
            className="absolute top-6 left-[calc(100%+12px)] p-1 hover:opacity-80 transition-opacity z-10 text-white"
          >
            <X className="w-6 h-6" strokeWidth={1.8} />
          </button>

          {/* Drawer Content */}
          <div className="flex-1 flex flex-col">
            {/* Top Yellow Header Section (~15% height) */}
            <div className="bg-[#FDBD38] text-white p-6 pt-12 pb-8 flex items-center gap-4">
              {/* White circle avatar container with Corgi icon inside */}
              <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-sm flex-shrink-0 p-1 border border-amber-200 overflow-hidden">
                <img src="/stickers/corgi_fiesta_1.png" alt="Corgi Avatar" className="w-full h-full object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-[18px] text-white tracking-tight leading-snug uppercase line-clamp-2 break-words">
                  {isLoggedIn ? (profileName || 'АФІА СОФІЯ-ЕЛИЗАВЕТА') : 'WELCOME TO CORGI CAFE'}
                </h4>
                {isLoggedIn ? (
                  <div className="flex flex-col gap-0.5 mt-1">
                    <span className="text-xs text-white/95 font-medium leading-tight block">
                      Welcome to Corgi Cafe!
                    </span>
                    <button 
                      onClick={async (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        await logout();
                        setShowDrawer(false);
                      }}
                      className="text-[11px] text-white/80 hover:text-white font-semibold block text-left underline underline-offset-2 mt-0.5 cursor-pointer"
                    >
                      Log out
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => {
                      setShowDrawer(false);
                      setAuthMode('login');
                      setShowLoginModal(true);
                    }}
                    className="text-xs text-white/90 hover:text-white font-semibold block text-left mt-1 underline underline-offset-2 cursor-pointer"
                  >
                    Log in
                  </button>
                )}
              </div>
            </div>

            {/* Navigation Links with indented bottom border */}
            <nav className="flex-1 mt-4 overflow-y-auto scrollbar-none" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <div className="flex flex-col">
                <Link 
                  href="/orders" 
                  onClick={() => setShowDrawer(false)} 
                  className="flex items-center justify-between hover:bg-black/5 transition-colors pl-6 py-[22px] pr-6 w-full"
                >
                  <div className="flex items-center gap-3">
                    <Package className="w-[18px] h-[18px] text-gray-800" strokeWidth={1.5} />
                    <span className="text-[14px] font-medium text-[#000000]">My orders</span>
                  </div>
                </Link>
                <div className="ml-6 mr-0 border-b border-gray-200" />
                
                <Link 
                  href="/loyalty" 
                  onClick={() => setShowDrawer(false)} 
                  className="flex items-center justify-between hover:bg-black/5 transition-colors pl-6 py-[22px] pr-6 w-full"
                >
                  <div className="flex items-center gap-3">
                    <Gift className="w-[18px] h-[18px] text-gray-800" strokeWidth={1.5} />
                    <span className="text-[14px] font-medium text-[#000000]">Loyalty Club</span>
                  </div>
                </Link>
                <div className="ml-6 mr-0 border-b border-gray-200" />

                <button 
                  onClick={() => {
                    setShowInviteModal(true);
                  }}
                  className="flex items-center justify-between hover:bg-black/5 transition-colors pl-6 py-[22px] pr-6 w-full cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Megaphone className="w-[18px] h-[18px] text-gray-800" strokeWidth={1.5} />
                    <span className="text-[14px] font-medium text-[#000000]">Invite a friend</span>
                  </div>
                </button>
                <div className="ml-6 mr-0 border-b border-gray-200" />

                <Link 
                  href="/support" 
                  onClick={() => setShowDrawer(false)} 
                  className="flex items-center justify-between hover:bg-black/5 transition-colors pl-6 py-[22px] pr-6 w-full"
                >
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-[18px] h-[18px] text-gray-800" strokeWidth={1.5} />
                    <span className="text-[14px] font-medium text-[#000000]">Chat & support</span>
                  </div>
                </Link>
              </div>
            </nav>

            {/* Bottom Fixed Metadata & Footer Section */}
            <div className="bg-white border-none">
              {/* Divider above Region */}
              <div className="ml-6 mr-0 border-t border-gray-200" />
              
              <div className="flex flex-col">
                <div className="flex items-center justify-between hover:bg-black/5 transition-colors pl-6 pt-[22px] pb-[11px] pr-6 w-full cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Globe className="w-4 h-4 text-gray-800" strokeWidth={1.5} />
                    <span className="text-[12px] font-medium text-[#000000]">Region · 🇪🇸 España</span>
                  </div>
                </div>

                <Link 
                  href="/privacy" 
                  onClick={() => setShowDrawer(false)} 
                  className="flex items-center justify-between hover:bg-black/5 transition-colors pl-6 py-[11px] pr-6 w-full"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-gray-800" strokeWidth={1.5} />
                    <span className="text-[12px] font-medium text-[#000000]">Privacy policy</span>
                  </div>
                </Link>

                <Link 
                  href="/team" 
                  onClick={() => setShowDrawer(false)} 
                  className="flex items-center justify-between hover:bg-black/5 transition-colors pl-6 pt-[11px] pb-[22px] pr-6 w-full"
                >
                  <div className="flex items-center gap-3">
                    <Shirt className="w-4 h-4 text-gray-800" strokeWidth={1.5} />
                    <span className="text-[12px] font-medium text-[#000000]">Join our team</span>
                  </div>
                </Link>
              </div>

              {/* Border Divider before Instagram */}
              <div className="ml-6 mr-0 border-t border-gray-200" />

              {/* Instagram link footer */}
              <div className="p-6 flex justify-start bg-white">
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
        <div className="absolute bottom-6 left-4 right-4 z-10 bg-white rounded-3xl p-6 shadow-2xl flex flex-col gap-4 animate-slideUp">
          
          {/* Title / Hours Block with navigation arrows and Distance */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between w-full">
              {/* Left navigation arrow */}
              <button 
                onClick={() => handleLocationChange(activeLocationIndex > 0 ? activeLocationIndex - 1 : locations.length - 1)}
                className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors active:scale-95"
              >
                <ChevronLeft className="w-5 h-5 text-gray-800" strokeWidth={2.2} />
              </button>

              {/* Location Name in Center */}
              <h3 className={`text-[20px] font-bold uppercase tracking-tight text-gray-900 leading-tight text-center mx-2 flex-1 transition-all duration-150 ${isFading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
                {activeLocation.name}.
              </h3>

              {/* Right navigation arrow */}
              <button 
                onClick={() => handleLocationChange(activeLocationIndex < locations.length - 1 ? activeLocationIndex + 1 : 0)}
                className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors active:scale-95"
              >
                <ChevronRight className="w-5 h-5 text-gray-800" strokeWidth={2.2} />
              </button>
            </div>

            {/* Sub-header info: distance, hours, city */}
            <div className={`flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-gray-400 mt-2 transition-all duration-150 ${isFading ? 'opacity-0' : 'opacity-100'}`}>
              <span className="text-gray-700 font-bold bg-gray-100 px-2 py-0.5 rounded-full">{activeLocation.distance}</span>
              <span>·</span>
              <span className="w-2 h-2 rounded-full bg-[#4ADE80] animate-pulse inline-block" />
              <span>{activeLocation.hours}</span>
              <span>·</span>
              <span>{activeLocation.city}</span>
            </div>
          </div>

          {/* Buttons Group: Maps & Open Menu (styled like Order now button) */}
          <div className="flex gap-3 mt-1">
            <button 
              onClick={() => alert(`Opening maps for ${activeLocation.name}...`)}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 py-4 rounded-full font-semibold text-[15px] transition-all active:scale-[0.98] text-center"
            >
              Maps
            </button>
            
            <button 
              onClick={() => {
                setShowLocations(false);
                setShowOrderModeSelector(true);
              }}
              className="flex-1 bg-[#FDBD38] hover:bg-[#e5a420] text-white py-4 rounded-full font-semibold text-[15px] transition-all active:scale-[0.98] text-center flex items-center justify-center gap-1.5 shadow-none"
            >
              Open menu
              <ArrowRight className="w-4 h-4 text-white" strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Sheet Login Modal */}
      <div 
        className={`fixed inset-0 bg-black/60 z-50 transition-opacity duration-300 flex items-end justify-center ${
          showLoginModal ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setShowLoginModal(false)}
      >
        <div 
          className={`w-full max-w-[480px] bg-white rounded-t-[32px] pt-8 px-6 pb-8 transition-transform duration-300 ease-out transform flex flex-col gap-6 shadow-2xl relative ${
            showLoginModal ? 'translate-y-0' : 'translate-y-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Block */}
          <div className="flex justify-between items-start w-full">
            <div className="flex flex-col pl-[25px]">
              <h2 className="text-[28px] font-bold tracking-tight leading-none text-[#FDBD38] uppercase">
                {authMode === 'login' ? 'LOGIN' : 'CREATE ACCOUNT'}
              </h2>
              <span className="text-[12px] text-gray-500 font-bold uppercase tracking-wider mt-1.5">
                {authMode === 'login' ? 'To place an order' : 'Join our club'}
              </span>
            </div>
            
            <button 
              onClick={() => setShowLoginModal(false)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors text-black"
            >
              <X className="w-6 h-6" strokeWidth={1.8} />
            </button>
          </div>
          {/* Form Fields */}
          <div className="flex flex-col gap-4 w-full">
            {authMode === 'login' && (
              <>
                <div className="relative">
                  <input 
                    type="email" 
                    placeholder="Email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full bg-[#F4F4F5] hover:bg-[#E4E4E7] focus:bg-white border-2 border-transparent focus:border-black rounded-2xl py-4 px-5 text-base text-black font-medium transition-all outline-none placeholder-gray-400"
                  />
                </div>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full bg-[#F4F4F5] hover:bg-[#E4E4E7] focus:bg-white border-2 border-transparent focus:border-black rounded-2xl py-4 pl-5 pr-12 text-base text-black font-medium transition-all outline-none placeholder-gray-400"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </>
            )}

            {authMode === 'register_step1' && (
              <div className="relative">
                <input 
                  type="email" 
                  placeholder="Email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full bg-[#F4F4F5] hover:bg-[#E4E4E7] focus:bg-white border-2 border-transparent focus:border-black rounded-2xl py-4 px-5 text-base text-black font-medium transition-all outline-none placeholder-gray-400"
                />
              </div>
            )}

            {authMode === 'register_step2' && (
              <>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Full name"
                    value={authFullName}
                    onChange={(e) => setAuthFullName(e.target.value)}
                    className="w-full bg-[#F4F4F5] hover:bg-[#E4E4E7] focus:bg-white border-2 border-transparent focus:border-black rounded-2xl py-4 px-5 text-base text-black font-medium transition-all outline-none placeholder-gray-400"
                  />
                </div>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full bg-[#F4F4F5] hover:bg-[#E4E4E7] focus:bg-white border-2 border-transparent focus:border-black rounded-2xl py-4 pl-5 pr-12 text-base text-black font-medium transition-all outline-none placeholder-gray-400"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                <div className="relative">
                  <input 
                    type={showConfirmPassword ? "text" : "password"} 
                    placeholder="Confirm password"
                    value={authConfirmPassword}
                    onChange={(e) => setAuthConfirmPassword(e.target.value)}
                    className="w-full bg-[#F4F4F5] hover:bg-[#E4E4E7] focus:bg-white border-2 border-transparent focus:border-black rounded-2xl py-4 pl-5 pr-12 text-base text-black font-medium transition-all outline-none placeholder-gray-400"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors"
                  >
                    {showConfirmPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                {authPassword && authConfirmPassword && authPassword !== authConfirmPassword && (
                  <span className="text-[12px] text-rose-500 font-semibold px-5 mt-[-4px]">
                    Passwords do not match
                  </span>
                )}
              </>
            )}
          </div>

          {/* Social Auth Providers */}
          {authMode !== 'register_step2' && (
            <div className="flex flex-col gap-3 w-full">
              {/* Apple Sign in */}
              <button 
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('corgi_mock_user', 'Apple User');
                  }
                  refreshAuth();
                  setShowLoginModal(false);
                }}
                className="w-full bg-[#F5F5F7] hover:bg-[#EBEBEF] rounded-full py-3.5 px-6 font-semibold text-[14px] text-gray-900 flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] cursor-pointer"
              >
                <svg className="w-5 h-5 fill-current text-gray-900" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-.96.04-2.13.64-2.82 1.45-.6.69-1.12 1.83-.98 2.94.1.08.2.12.31.12.87 0 1.94-.56 2.5-1.45z" />
                </svg>
                <span>Sign in with Apple</span>
              </button>

              {/* Google Sign in */}
              <button 
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('corgi_mock_user', 'Google User');
                  }
                  refreshAuth();
                  setShowLoginModal(false);
                }}
                className="w-full bg-[#F5F5F7] hover:bg-[#EBEBEF] rounded-full py-3.5 px-6 font-semibold text-[14px] text-gray-900 flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] cursor-pointer"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.17-.63-.26-1.29-.26-1.89z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Sign in with Google</span>
              </button>
            </div>
          )}

          {/* Legal Disclaimer */}
          {authMode !== 'register_step2' && (
            <p className="text-[11px] text-gray-400 text-center leading-relaxed px-4">
              By tapping continue, you accept our{' '}
              <span className="underline cursor-pointer hover:text-black">Terms and Conditions</span> and{' '}
              <span className="underline cursor-pointer hover:text-black">Privacy Policy</span>.
            </p>
          )}

          {(authMode === 'register_step1' || authMode === 'register_step2') && (
            <div 
              className="flex items-center justify-center gap-2.5 px-4 mx-auto cursor-pointer select-none text-center" 
              onClick={() => setAgreedToTerms(!agreedToTerms)}
            >
              <input 
                type="checkbox" 
                checked={agreedToTerms}
                onChange={() => {}} // handled by click on parent div
                className="w-4.5 h-4.5 rounded border-gray-300 text-black focus:ring-black accent-black cursor-pointer flex-shrink-0"
              />
              <span className="text-[12px] text-gray-500 font-medium leading-tight">
                By registering I confirm{' '}
                <span className="underline cursor-pointer hover:text-black">privacy policy</span> and{' '}
                <span className="underline cursor-pointer hover:text-black">terms</span>
              </span>
            </div>
          )}

          {/* Submit Action Button */}
          {authMode === 'login' && (
            <button 
              disabled={!authEmail || !authPassword}
              onClick={() => {
                if (typeof window !== 'undefined') {
                  const nameFromEmail = authEmail.split('@')[0].toUpperCase();
                  localStorage.setItem('corgi_mock_user', nameFromEmail);
                }
                refreshAuth();
                setShowLoginModal(false);
                setAuthEmail("");
                setAuthPassword("");
              }}
              className={`w-full py-4 rounded-full font-bold text-center text-base transition-all ${
                (authEmail && authPassword)
                  ? 'bg-black text-white hover:bg-gray-900 active:scale-[0.99] cursor-pointer'
                  : 'bg-[#F4F4F5] text-gray-300 cursor-not-allowed'
              }`}
            >
              Enter
            </button>
          )}

          {authMode === 'register_step1' && (
            <button 
              disabled={!authEmail || !agreedToTerms}
              onClick={() => setAuthMode('register_step2')}
              className={`w-full py-4 rounded-full font-bold text-center text-base transition-all ${
                (authEmail && agreedToTerms)
                  ? 'bg-black text-white hover:bg-gray-900 active:scale-[0.99] cursor-pointer'
                  : 'bg-[#F4F4F5] text-gray-300 cursor-not-allowed'
              }`}
            >
              Next
            </button>
          )}


          {authMode === 'register_step2' && (
            <button 
              disabled={!authFullName || !authPassword || !authConfirmPassword || authPassword !== authConfirmPassword || !agreedToTerms}
              onClick={() => {
                if (typeof window !== 'undefined') {
                  localStorage.setItem('corgi_mock_user', authFullName.toUpperCase());
                }
                refreshAuth();
                setShowLoginModal(false);
                setAuthEmail("");
                setAuthPassword("");
                setAuthConfirmPassword("");
                setAuthFullName("");
                setAgreedToTerms(false);
              }}
              className={`w-full py-4 rounded-full font-bold text-center text-base transition-all ${
                (authFullName && authPassword && authConfirmPassword && authPassword === authConfirmPassword && agreedToTerms)
                  ? 'bg-black text-white hover:bg-gray-900 active:scale-[0.99] cursor-pointer'
                  : 'bg-[#F4F4F5] text-gray-300 cursor-not-allowed'
              }`}
            >
              Enter
            </button>
          )}
        </div>
      </div>
      {/* Bottom Sheet New Address Modal */}
      <div 
        className={`fixed inset-0 bg-transparent z-50 transition-all duration-300 flex items-end justify-center ${
          showNewAddressModal ? 'opacity-100 backdrop-blur-[3px] pointer-events-auto' : 'opacity-0 backdrop-blur-none pointer-events-none'
        }`}
        onClick={() => setShowNewAddressModal(false)}
      >
        <div 
          className={`w-full max-w-[480px] bg-white rounded-t-[16px] pt-6 px-6 pb-6 transition-transform duration-300 ease-out transform flex flex-col gap-6 shadow-none relative ${
            showNewAddressModal ? 'translate-y-0' : 'translate-y-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Block */}
          <div className="flex justify-between items-center w-full">
            <h2 className="text-[22px] font-bold tracking-tight leading-none text-gray-900 uppercase">
              NEW ADDRESS
            </h2>
            
            {/* Close X Button */}
            <button 
              onClick={() => setShowNewAddressModal(false)}
              className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-black -mr-1.5"
            >
              <X className="w-5 h-5" strokeWidth={2} />
            </button>
          </div>

          {/* Form Fields */}
          <div className="flex flex-col gap-6 w-full px-0">
            {/* Street address */}
            <div className="flex flex-col w-full relative">
              <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">
                Street address
              </label>
              <input 
                type="text" 
                placeholder="e.g. Passeig de Gràcia, 48"
                value={newStreetAddress}
                onChange={(e) => setNewStreetAddress(e.target.value)}
                className="w-full border-b border-gray-100 focus:border-gray-200 py-2 text-base text-gray-800 font-medium transition-all outline-none placeholder-gray-300 bg-transparent"
              />
              {filteredSuggestions.length > 0 && (
                <div className="absolute top-[calc(100%+8px)] left-0 right-0 z-30 bg-white shadow-2xl rounded-none p-4 max-h-[195px] overflow-y-auto scrollbar-none animate-fadeIn flex flex-col gap-4">
                  {filteredSuggestions.map((sug, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => setNewStreetAddress(sug.title)}
                      className="flex flex-col text-left cursor-pointer hover:opacity-75 transition-opacity"
                    >
                      <span className="font-bold text-black text-[14px] leading-tight">
                        {sug.title}
                      </span>
                      {sug.desc && (
                        <span className="text-[12px] text-gray-500 font-medium leading-tight mt-0.5">
                          {sug.desc}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Alias Selection */}
            <div className="flex flex-col w-full">
              <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-3">
                Select option
              </label>
              <div className="flex gap-4 w-full">
                {/* Home */}
                <div 
                  onClick={() => setNewAddressAlias('home')}
                  className={`flex-1 py-3 text-center rounded-2xl font-semibold text-[13px] cursor-pointer relative transition-all border ${
                    newAddressAlias === 'home' 
                      ? 'bg-[#FDBD38] border-[#FDBD38] text-white shadow-none' 
                      : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50/50'
                  }`}
                >
                  <span>Home</span>
                </div>

                {/* Work */}
                <div 
                  onClick={() => setNewAddressAlias('work')}
                  className={`flex-1 py-3 text-center rounded-2xl font-semibold text-[13px] cursor-pointer relative transition-all border ${
                    newAddressAlias === 'work' 
                      ? 'bg-[#FDBD38] border-[#FDBD38] text-white shadow-none' 
                      : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50/50'
                  }`}
                >
                  <span>Work</span>
                </div>

                {/* Custom */}
                <div 
                  onClick={() => setNewAddressAlias('custom')}
                  className={`flex-1 py-3 text-center rounded-2xl font-semibold text-[13px] cursor-pointer relative transition-all border ${
                    newAddressAlias === 'custom' 
                      ? 'bg-[#FDBD38] border-[#FDBD38] text-white shadow-none' 
                      : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50/50'
                  }`}
                >
                  <span>Custom</span>
                </div>
              </div>
            </div>

            {/* Default address Toggle */}
            <div 
              className="flex items-center gap-2.5 px-4 cursor-pointer select-none mt-2" 
              onClick={() => setIsDefaultAddress(!isDefaultAddress)}
            >
              <input 
                type="checkbox" 
                checked={isDefaultAddress}
                onChange={() => {}} // handled by parent onClick
                className="w-4.5 h-4.5 rounded border-gray-300 text-black focus:ring-black accent-black cursor-pointer"
              />
              <span className="text-[12px] text-gray-500 font-semibold leading-tight">
                Default address
              </span>
            </div>
          </div>

          {/* Submit button */}
          <div className="px-0 w-full mt-[150px]">
            <button 
              disabled={!newStreetAddress}
              onClick={() => {
                setDeliveryAddress(newStreetAddress);
                setShowNewAddressModal(false);
                setShowTimePicker(true);
              }}
              className={`w-full py-3.5 rounded-full font-semibold text-center text-[15px] transition-all shadow-none ${
                newStreetAddress 
                  ? 'bg-[#FDBD38] text-white hover:bg-[#e5a420] active:scale-[0.99] cursor-pointer' 
                  : 'bg-[#F4F4F5] text-gray-300 cursor-not-allowed'
              }`}
            >
              Save Address
            </button>
          </div>
        </div>
      </div>
      {/* Invite a Friend Modal */}
      {showInviteModal && (
        <div 
          onClick={() => setShowInviteModal(false)}
          className="fixed inset-0 z-[60] backdrop-blur-md bg-white/20 animate-backdrop-blur flex items-center justify-center p-4 select-none cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[360px] bg-white rounded-[28px] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-gray-100/90 relative flex flex-col items-center text-center animate-scaleUp cursor-default"
          >
            <button 
              onClick={() => setShowInviteModal(false)}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 absolute top-4 right-4 transition-all active:scale-90 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <img 
              src="/stickers/corgi_fiesta_1.png" 
              alt="Fiesta Corgi" 
              className="w-24 h-24 object-contain mb-2.5 drop-shadow-sm" 
            />

            <h3 className="text-xl font-bold text-gray-950 tracking-tight mb-1">
              Invite a Friend
            </h3>
            <p className="text-xs text-gray-500 max-w-[270px] leading-relaxed mb-5">
              Share your referral link with friends and invite them to join the Corgi Cafe club!
            </p>

            {/* Link Input Box */}
            <div className="w-full bg-gray-50 border border-gray-200/80 rounded-[16px] p-1.5 flex items-center gap-2 mb-4">
              <span className="text-xs font-semibold text-gray-700 pl-3 truncate flex-1 select-all">
                corgi.cafe/invite?ref=CORGI2026
              </span>
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    navigator.clipboard.writeText('https://corgi.cafe/invite?ref=CORGI2026');
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }
                }}
                className="bg-[#FDBD38] hover:bg-[#e5a420] text-white font-bold px-3.5 py-2 rounded-[12px] text-xs transition-all active:scale-[0.95] flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5 text-white" />}
                <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>

            {/* Share via Socials Button */}
            <button
              onClick={() => {
                if (typeof window !== 'undefined' && navigator.share) {
                  navigator.share({
                    title: 'Corgi Cafe Invite',
                    text: 'Join me at Corgi Cafe!',
                    url: 'https://corgi.cafe/invite?ref=CORGI2026',
                  }).catch(() => {});
                } else if (typeof window !== 'undefined') {
                  window.open(`https://t.me/share/url?url=${encodeURIComponent('https://corgi.cafe/invite?ref=CORGI2026')}&text=${encodeURIComponent('Join me at Corgi Cafe!')}`, '_blank');
                }
              }}
              className="w-full bg-gray-950 hover:bg-gray-800 text-white font-bold py-3.5 rounded-[16px] text-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Share2 className="w-4 h-4 text-white" />
              <span>Share with Friends</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

