'use client';

import React, { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import OrdersBoard from '@/components/operations/OrdersBoard';
import TablesView from '@/components/ui/TablesView';
import { ShoppingBag, Tablet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePosShellMode } from '@/lib/use-pos-shell-mode';

function OrdersPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const posShell = usePosShellMode();
  const activeTab = searchParams.get('tab') || 'delivery';

  // Premium Toggle Switches (Matching style from screenshot #2, icons only)
  const toggleElement = posShell ? null : (
    <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200/60 items-center h-[38px] shrink-0">
      <button
        onClick={() => router.push('/orders?tab=delivery')}
        className={`w-9 h-full rounded-[8px] transition-all duration-200 cursor-pointer flex items-center justify-center ${
          activeTab === 'delivery'
            ? 'bg-white text-gray-950 shadow-sm border border-gray-200/50'
            : 'text-gray-500 hover:text-gray-700'
        }`}
        title="Delivery & Pickup"
      >
        <ShoppingBag size={16} />
      </button>
      <button
        onClick={() => router.push('/orders?tab=tables')}
        className={`w-9 h-full rounded-[8px] transition-all duration-200 cursor-pointer flex items-center justify-center ${
          activeTab === 'tables'
            ? 'bg-white text-gray-950 shadow-sm border border-gray-200/50'
            : 'text-gray-500 hover:text-gray-700'
        }`}
        title="Table Layout"
      >
        <Tablet size={16} />
      </button>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="flex-1 overflow-hidden flex flex-col gap-4">
        <AnimatePresence mode="wait">
          {activeTab === 'tables' ? (
            /* For Table Layout view, we render the TablesView directly with no extra card frame.
               The toggle is passed inside the TablesView's header next to rooms selector */
            <motion.div
              key="tables"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 overflow-hidden rounded-3xl bg-white shadow-sm border border-gray-100 flex flex-col"
            >
              <div className="flex-1 overflow-hidden">
                <TablesView readonly={true} extraHeaderActions={toggleElement} />
              </div>
            </motion.div>
          ) : (
            /* For Delivery view, we render the board directly with no extra card frame.
               The toggle is passed inside the board's header next to Create Order button */
            <motion.div
              key="delivery"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 overflow-hidden flex flex-col"
            >
              <OrdersBoard extraHeaderActions={toggleElement} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="p-8 text-center text-gray-500 font-bold">Loading Orders Dashboard...</div>
      </DashboardLayout>
    }>
      <OrdersPageContent />
    </Suspense>
  );
}
