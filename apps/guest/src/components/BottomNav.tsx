'use client';

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
  const { locale, foodCart, merchCart } = useGuest();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur safe-bottom">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 py-2">
        {tabs.map(({ href, icon: Icon, labelKey, cartKey }) => {
          const active = pathname.startsWith(href);
          const count = cartKey === 'food' ? foodCart.length : cartKey === 'merch' ? merchCart.length : 0;
          return (
            <Link
              key={href}
              href={href}
              className={`flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-bold uppercase tracking-wide ${
                active ? 'text-brand-green' : 'text-gray-400'
              }`}
            >
              <span className="relative">
                <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                {count > 0 && (
                  <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-corgi px-1 text-[9px] font-black text-gray-900">
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
