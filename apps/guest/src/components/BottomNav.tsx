'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Coffee, Gift, ShoppingBag, ClipboardList } from 'lucide-react';
import { useGuest } from '@/lib/guest-context';
import { t } from '@/lib/i18n';

const tabs = [
  { href: '/menu', icon: Coffee, labelKey: 'menu', cartKey: 'food' as const },
  { href: '/shop', icon: ShoppingBag, labelKey: 'shop', cartKey: 'merch' as const },
  { href: '/loyalty', icon: Gift, labelKey: 'loyalty' },
  { href: '/orders', icon: ClipboardList, labelKey: 'orders' },
];

export function BottomNav() {
  const pathname = usePathname();
  const { locale, foodCart, merchCart, showCartBarInsteadOfNav, setShowCartBarInsteadOfNav } = useGuest();
  const [visible, setVisible] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const checkModal = () => {
      const isOpen = document.body.classList.contains('item-detail-open');
      setModalOpen(isOpen);
    };

    checkModal();

    const observer = new MutationObserver(checkModal);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleScroll = (e: any) => {
      const target = e.target;
      if (!target || typeof target.scrollTop === 'undefined') return;
      const currentScrollY = target.scrollTop;
      
      if (Math.abs(currentScrollY - lastScrollY.current) > 8) {
        if (currentScrollY > lastScrollY.current && currentScrollY > 60) {
          setVisible(false);
        } else {
          setVisible(true);
        }
      }
      lastScrollY.current = currentScrollY;
    };

    // Capture scrolling on any inner container (like h-screen overflow-y-auto page wrappers)
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, []);

  const isCartActive = (foodCart.length > 0 && pathname === '/menu') || (merchCart.length > 0 && pathname === '/shop');
  if (modalOpen || (isCartActive && showCartBarInsteadOfNav)) return null;

  return (
    <nav 
      className={`fixed bottom-[14px] left-6 right-6 z-40 max-w-[400px] mx-auto bg-white/95 backdrop-blur-md border border-gray-100/80 rounded-[22px] shadow-[0_8px_30px_-8px_rgba(0,0,0,0.12)] transition-all duration-500 ease-in-out transform ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-16 opacity-0 pointer-events-none'
      }`}
    >
      <div className="mx-auto flex items-stretch justify-around px-2 py-[10px]">
        {tabs.map(({ href, icon: Icon, labelKey, cartKey }) => {
          const active = pathname.startsWith(href);
          const count = cartKey === 'food' ? foodCart.length : cartKey === 'merch' ? merchCart.length : 0;
          return (
            <Link
              key={href}
              href={href}
              onClick={(e) => {
                const isTargetCartActive = (foodCart.length > 0 && href === '/menu') || (merchCart.length > 0 && href === '/shop');
                if (isTargetCartActive) {
                  if (active) {
                    e.preventDefault();
                  }
                  setShowCartBarInsteadOfNav(true);
                }
              }}
              className={`flex min-h-9 min-w-9 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-[9px] font-bold uppercase tracking-wider transition-colors ${
                active 
                  ? (href === '/shop' ? 'text-[#EE635E]' : 'text-corgi') 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <span className="relative">
                <Icon size={18} strokeWidth={active ? 2.6 : 2.1} />
                {count > 0 && (
                  <span className={`absolute -right-2 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-0.5 text-[8px] font-bold shadow-sm border border-white ${
                    href === '/shop' ? 'bg-[#EE635E] text-white' : 'bg-corgi text-gray-900'
                  }`}>
                    {count}
                  </span>
                )}
              </span>
              {t(locale, labelKey)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
