'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Search, Bell, Info, ChevronDown, Menu } from 'lucide-react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import SearchModal from './SearchModal';
import NotificationsPopover from './NotificationsPopover';
import { getProfileAsync, PROFILE_UPDATED_EVENT, type Profile } from '@/lib/profile';

function NavItems() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const navItems = ['Overview', 'Activity', 'Manage', 'Program', 'Account', 'Reports'];
  const [activeItemState, setActiveItemState] = useState('Overview');

  // Sync active item with query parameter tab if on CRM page
  const activeItem = pathname === '/crm' 
    ? (() => {
        const tab = searchParams.get('tab') || 'overview';
        return tab.charAt(0).toUpperCase() + tab.slice(1);
      })()
    : activeItemState;

  const handleItemClick = (item: string) => {
    if (pathname === '/crm') {
      router.push(`/crm?tab=${item.toLowerCase()}`);
    } else {
      setActiveItemState(item);
    }
  };

  return (
    <div className="bg-white rounded-full h-14 p-2 shadow-sm hidden md:flex items-center gap-1 overflow-x-auto shrink min-w-0 mx-2 scrollbar-hide">
      {navItems.map((item) => (
        <button
          key={item}
          onClick={() => handleItemClick(item)}
          className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap ${
            activeItem === item
              ? 'bg-[#FDBD38] text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-black hover:bg-gray-100'
          }`}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

export default function Header() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await getProfileAsync();
        if (!cancelled) setProfile(data);
      } catch {
        /* profile optional until auth */
      }
    };
    load();
    const onUpdated = (event: Event) => {
      const detail = (event as CustomEvent<Profile>).detail;
      if (detail) setProfile(detail);
    };
    window.addEventListener(PROFILE_UPDATED_EVENT, onUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener(PROFILE_UPDATED_EVENT, onUpdated);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex items-center justify-between w-full py-4 md:py-6 bg-transparent gap-4 md:gap-6">
      {/* Mobile Menu Button */}
      <div className="md:hidden bg-white rounded-full h-14 w-14 shadow-sm flex items-center justify-center shrink-0 cursor-pointer hover:shadow-md transition-shadow">
        <Menu size={24} className="text-black" />
      </div>

      {/* Logo Pill */}
      <div className="bg-white rounded-full h-14 p-2 pr-4 md:pr-5 shadow-sm hidden md:flex items-center gap-3 shrink-0 cursor-pointer hover:shadow-md transition-shadow">
        <img 
          src="/media/image.png" 
          alt="Corgi Cafe Logo" 
          className="w-10 h-10 object-contain shrink-0"
        />
        <span className="font-semibold text-black text-sm hidden md:block pr-2 whitespace-nowrap">Corgi Cafe</span>
      </div>

      {/* Main Navigation Pill */}
      <Suspense fallback={<div className="bg-white rounded-full h-14 w-40 animate-pulse shrink-0 mr-auto" />}>
        <NavItems />
      </Suspense>

      <div className="flex items-center gap-4 shrink-0 ml-auto">
        <div className="bg-white rounded-full h-14 p-1.5 shadow-sm flex items-center gap-1 hidden sm:flex">
          
          <div className="relative group/btn flex items-center justify-center">
            <button 
              onClick={() => setIsSearchOpen(true)}
              className="w-11 h-11 rounded-full text-gray-400 hover:text-black hover:bg-gray-100 transition-all duration-200 cursor-pointer flex items-center justify-center"
            >
              <Search size={20} />
            </button>
            <div className="absolute top-full mt-2 px-2.5 py-1.5 bg-gray-800 text-white text-xs font-medium rounded-lg opacity-0 invisible group-hover/btn:opacity-100 group-hover/btn:visible transition-all duration-200 whitespace-nowrap z-50">
              Search (⌘K)
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <button 
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="w-11 h-11 rounded-full text-gray-400 hover:text-black hover:bg-gray-100 transition-all duration-200 cursor-pointer flex items-center justify-center relative group/btn"
            >
              <Bell size={20} />
              <span className="absolute top-2.5 right-3 w-2 h-2 bg-corgi rounded-full border-2 border-white"></span>
              {!isNotificationsOpen && (
                <div className="absolute top-full mt-2 px-2.5 py-1.5 bg-gray-800 text-white text-xs font-medium rounded-lg opacity-0 invisible group-hover/btn:opacity-100 group-hover/btn:visible transition-all duration-200 whitespace-nowrap z-50">
                  Notifications
                </div>
              )}
            </button>
            <NotificationsPopover isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
          </div>

          <div className="relative group/btn flex items-center justify-center">
            <button className="w-11 h-11 rounded-full text-gray-400 hover:text-black hover:bg-gray-100 transition-all duration-200 cursor-pointer flex items-center justify-center">
              <Info size={20} />
            </button>
            <div className="absolute top-full mt-2 px-2.5 py-1.5 bg-gray-800 text-white text-xs font-medium rounded-lg opacity-0 invisible group-hover/btn:opacity-100 group-hover/btn:visible transition-all duration-200 whitespace-nowrap z-50">
              Information
            </div>
          </div>

        </div>

        {/* User Profile Pill */}
        <div className="bg-white rounded-full h-14 p-1.5 pr-4 shadow-sm flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow">
          <div className="w-11 h-11 bg-gray-100 rounded-full overflow-hidden shrink-0 border border-gray-200">
            <img 
              src="https://api.dicebear.com/7.x/notionists/svg?seed=Felix&backgroundColor=EE635E" 
              alt="User Avatar" 
              className="w-full h-full object-cover" 
            />
          </div>
          <div className="flex flex-col hidden xl:flex">
            <span className="text-sm font-bold text-black leading-tight" data-testid="header-profile-name">
              {profile?.name ?? 'Staff User'}
            </span>
            <span className="text-xs text-gray-500 leading-tight" data-testid="header-profile-email">
              {profile?.email ? `${profile.email.slice(0, 16)}${profile.email.length > 16 ? '…' : ''}` : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Search Modal */}
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
}
