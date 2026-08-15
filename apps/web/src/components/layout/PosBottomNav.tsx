'use client';

import React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ShoppingBag, Tablet } from 'lucide-react';

const tabs = [
  { id: 'delivery', href: '/orders?tab=delivery', icon: ShoppingBag, label: 'Orders' },
  { id: 'tables', href: '/orders?tab=tables', icon: Tablet, label: 'Tables' },
] as const;

export default function PosBottomNav() {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') === 'tables' ? 'tables' : 'delivery';

  return (
    <nav
      className="shrink-0 px-4 pb-4 pt-2 safe-bottom"
      aria-label="POS navigation"
      data-testid="pos-bottom-nav"
    >
      <div className="bg-white rounded-full p-1.5 shadow-sm border border-gray-100 flex gap-1">
        {tabs.map(({ id, href, icon: Icon, label }) => {
          const active = activeTab === id;
          return (
            <Link
              key={id}
              href={href}
              className={`flex-1 flex items-center justify-center gap-2 h-12 rounded-full text-sm font-bold transition-all duration-200 ${
                active
                  ? 'bg-black text-white shadow-md'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <Icon size={18} strokeWidth={active ? 2.25 : 2} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
