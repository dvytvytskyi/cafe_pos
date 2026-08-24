'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  Mail,
  ClipboardList,
  Users,
  Layers,
  Settings,
  HelpCircle,
  LogOut,
  Globe,
  MapPin,
  Castle,
  Church,
  Landmark,
  LayoutGrid,
  Coffee,
  Building2,
  Package,
  Bike,
  BarChart3,
  Tablet,
  History,
  DollarSign,
  ShoppingBag,
  Briefcase,
  Timer
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);
  
  const activeItem = pathname.startsWith('/analytics') 
    ? 'kitchen-analytics' 
    : pathname.startsWith('/inventory') 
    ? 'inventory' 
    : pathname.startsWith('/orders') 
    ? 'orders' 
    : pathname.startsWith('/reports') 
    ? 'reports' 
    : pathname.startsWith('/operations') 
    ? 'operations' 
    : pathname.startsWith('/crm') 
    ? 'crm' 
    : pathname === '/settings' 
    ? 'settings' 
    : pathname === '/menu' 
    ? 'menu' 
    : pathname.startsWith('/history') 
    ? 'history' 
    : pathname.startsWith('/shift') 
    ? 'shift' 
    : pathname.startsWith('/staff') 
    ? 'staff' 
    : 'dashboard';
  
  const [activeLocale, setActiveLocale] = React.useState('all');
  const [lastSelectedLocale, setLastSelectedLocale] = React.useState('gotico');
  const [isHoveringLocales, setIsHoveringLocales] = React.useState(false);

  const locales = [
    { id: 'gotico', name: 'Gótico', icon: Castle },
    { id: 'sagrada', name: 'Sagrada', icon: Church },
    { id: 'muntaner', name: 'Muntaner', icon: Building2 },
    { id: 'gracia', name: 'Gràcia', icon: Coffee },
    { id: 'arc', name: 'ARC', icon: Landmark },
  ];

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', href: '/' },
    { id: 'orders', icon: ShoppingBag, label: 'Orders', href: '/orders' },
    { id: 'crm', icon: Users, label: 'CRM & Loyalty', href: '/crm' },
    { id: 'shift', icon: DollarSign, label: 'Cash Register', href: '/shift' },
    { id: 'history', icon: History, label: 'Order History', href: '/history' },
    { id: 'reports', icon: BarChart3, label: 'Reports', href: '/reports' },
    { id: 'kitchen-analytics', icon: Timer, label: 'Kitchen & Bar', href: '/analytics/kitchen-bar' },
    { id: 'menu', icon: Coffee, label: 'Menu', href: '/menu' },
    { id: 'inventory', icon: Package, label: 'Inventory', href: '/inventory' },
    { id: 'operations', icon: ClipboardList, label: 'Operations', href: '/operations' },
    { id: 'staff', icon: Briefcase, label: 'Staff & HR', href: '/staff' },
  ];

  const bottomActions = [
    { id: 'settings', icon: Settings, label: 'Settings', href: '/settings' },
    { id: 'help', icon: HelpCircle, label: 'Help' },
  ];

  return (
    <div className="hidden md:flex flex-col items-center h-full w-auto shrink-0 bg-transparent gap-6">

      {/* Locale Switcher Pill */}
      <div className="bg-white rounded-full flex flex-col items-center p-1.5 shadow-sm gap-2 w-14 relative z-50">
        
        <div className="relative group/btn flex justify-center w-full">
          <button 
            onClick={() => setActiveLocale('all')}
            className={`w-11 h-11 rounded-full transition-all duration-200 cursor-pointer flex items-center justify-center shrink-0 ${
              activeLocale === 'all' 
                ? 'bg-gray-100 text-gray-800' 
                : 'text-gray-400 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <Globe size={20} />
          </button>
          <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-[#EE635E] text-white text-xs font-medium rounded-lg opacity-0 invisible group-hover/btn:opacity-100 group-hover/btn:visible transition-all duration-200 whitespace-nowrap z-50">
            All Locales
          </div>
        </div>

        {/* Expanding Locale Pill */}
        <div className="relative w-11 h-11 group">
          <div className="absolute left-[-6px] top-[-6px] h-14 bg-white rounded-full flex items-center p-1.5 transition-all duration-300 max-w-[56px] group-hover:max-w-[400px] shadow-none group-hover:shadow-md z-50">
            
            {/* Base Icon: Last Selected Locale */}
            <div className="relative group/btn flex justify-center w-11 shrink-0">
              <button 
                onClick={() => setActiveLocale(lastSelectedLocale)}
                className={`w-11 h-11 rounded-full transition-all duration-200 cursor-pointer flex items-center justify-center shrink-0 ${
                  activeLocale !== 'all' 
                    ? 'bg-gray-100 text-gray-800' 
                    : 'text-gray-400 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                {React.createElement(locales.find(l => l.id === lastSelectedLocale)?.icon || MapPin, { size: 20 })}
              </button>
              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-[#EE635E] text-white text-xs font-medium rounded-lg opacity-0 invisible group-hover/btn:opacity-100 group-hover/btn:visible transition-all duration-200 whitespace-nowrap z-50">
                {locales.find(l => l.id === lastSelectedLocale)?.name || 'Locale'}
              </div>
            </div>

            {/* Other Icons appearing on hover */}
            <div className="flex flex-row gap-1 pl-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 delay-100 shrink-0">
              {locales.filter(loc => loc.id !== lastSelectedLocale).map(loc => {
                const Icon = loc.icon;
                return (
                  <div key={loc.id} className="relative group/btn flex justify-center">
                    <button
                      onClick={() => {
                        setActiveLocale(loc.id);
                        setLastSelectedLocale(loc.id);
                      }}
                      className="w-11 h-11 rounded-full text-gray-400 hover:text-gray-800 hover:bg-gray-100 transition-all duration-200 cursor-pointer flex items-center justify-center shrink-0"
                    >
                      <Icon size={20} />
                    </button>
                    <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-[#EE635E] text-white text-xs font-medium rounded-lg opacity-0 invisible group-hover/btn:opacity-100 group-hover/btn:visible transition-all duration-200 whitespace-nowrap z-50">
                      {loc.name}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Pill */}
      <div className="bg-white rounded-full flex flex-col items-center p-1.5 shadow-sm gap-2 mb-auto w-14">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = isMounted && activeItem === item.id;
          return (
            <div key={item.id} className="relative group/btn w-full flex justify-center">
              {item.href ? (
                <Link
                  href={item.href}
                  suppressHydrationWarning
                  className={`p-3 rounded-full transition-all duration-200 cursor-pointer flex items-center justify-center ${
                    isActive 
                      ? 'bg-[#EE635E] text-white shadow-md' 
                      : 'text-gray-400 hover:text-[#EE635E] hover:bg-[#EE635E]/10'
                  }`}
                >
                  <Icon size={20} />
                </Link>
              ) : (
                <button
                  className={`p-3 rounded-full transition-all duration-200 cursor-pointer flex items-center justify-center ${
                    isActive 
                      ? 'bg-[#EE635E] text-white shadow-md' 
                      : 'text-gray-400 hover:text-[#EE635E] hover:bg-[#EE635E]/10'
                  }`}
                >
                  <Icon size={20} />
                </button>
              )}
              <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-[#EE635E] text-white text-xs font-medium rounded-lg opacity-0 invisible group-hover/btn:opacity-100 group-hover/btn:visible transition-all duration-200 whitespace-nowrap z-50">
                {item.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Actions Pill */}
      <div className="bg-white rounded-full flex flex-col items-center justify-center p-1.5 shadow-sm gap-2 w-14">
        {bottomActions.map((item) => {
          const Icon = item.icon;
          const isLogout = item.id === 'logout';
          const isActive = isMounted && activeItem === item.id;
          return (
            <div key={item.id} className="relative group/btn w-full flex justify-center">
              {item.href ? (
                <Link
                  href={item.href}
                  suppressHydrationWarning
                  className={`p-3 rounded-full text-gray-400 transition-colors cursor-pointer flex items-center justify-center ${
                    isActive ? 'bg-[#EE635E] text-white shadow-md' : (isLogout ? 'hover:text-corgi hover:bg-red-50' : 'hover:text-[#EE635E] hover:bg-[#EE635E]/10')
                  }`}
                >
                  <Icon size={20} />
                </Link>
              ) : (
                <button
                  className={`p-3 rounded-full text-gray-400 transition-colors cursor-pointer flex items-center justify-center ${
                    isActive ? 'bg-[#EE635E] text-white shadow-md' : (isLogout ? 'hover:text-corgi hover:bg-red-50' : 'hover:text-[#EE635E] hover:bg-[#EE635E]/10')
                  }`}
                >
                  <Icon size={20} />
                </button>
              )}
              <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-[#EE635E] text-white text-xs font-medium rounded-lg opacity-0 invisible group-hover/btn:opacity-100 group-hover/btn:visible transition-all duration-200 whitespace-nowrap z-50">
                {item.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
