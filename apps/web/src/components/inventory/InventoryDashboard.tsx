'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PackageSearch, ArrowRightLeft, Plus } from 'lucide-react';
import StockTable from './StockTable';
import LogisticsTransfers from './LogisticsTransfers';
import AddItemModal from './AddItemModal';
import NewTransferModal from './NewTransferModal';

export default function InventoryDashboard() {
  const [activeTab, setActiveTab] = useState<'stock' | 'logistics'>('stock');
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isNewTransferModalOpen, setIsNewTransferModalOpen] = useState(false);

  return (
    <div className="bg-white rounded-3xl p-5 md:px-8 md:pb-8 pt-6 md:pt-6 shadow-sm flex-1 overflow-hidden flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 flex-shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Inventory & Logistics</h2>
          <p className="text-sm font-medium text-gray-500 mt-1">Manage stock levels and branch transfers</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-0.5 h-9 bg-gray-50/80 p-1 rounded-xl border border-gray-200/60 shrink-0">
            <button 
              onClick={() => setActiveTab('stock')} 
              className={`cursor-pointer whitespace-nowrap h-7 flex items-center justify-center px-4 text-[13px] font-semibold rounded-lg transition-all duration-200 gap-1.5 ${activeTab === 'stock' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'}`}
            >
              <PackageSearch size={16} />
              Stock Overview
            </button>
            <button 
              onClick={() => setActiveTab('logistics')} 
              className={`cursor-pointer whitespace-nowrap h-7 flex items-center justify-center px-4 text-[13px] font-semibold rounded-lg transition-all duration-200 gap-1.5 ${activeTab === 'logistics' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'}`}
            >
              <ArrowRightLeft size={16} />
              Logistics
            </button>
          </div>
          
          <button 
            onClick={() => {
              if (activeTab === 'stock') setIsAddItemModalOpen(true);
              else setIsNewTransferModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-black text-white text-[13px] font-bold rounded-xl shadow-sm transition-all cursor-pointer hover:bg-gray-800 hover:-translate-y-0.5 active:translate-y-0 shrink-0"
          >
            <Plus size={16} strokeWidth={2.5} />
            {activeTab === 'stock' ? 'Add Item' : 'New Transfer'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <AnimatePresence mode="wait">
          {activeTab === 'stock' ? (
            <motion.div
              key="stock"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex-1 overflow-hidden flex flex-col"
            >
              <StockTable />
            </motion.div>
          ) : (
            <motion.div
              key="logistics"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex-1 overflow-hidden flex flex-col"
            >
              <LogisticsTransfers />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AddItemModal 
        isOpen={isAddItemModalOpen} 
        onClose={() => setIsAddItemModalOpen(false)} 
      />
      <NewTransferModal
        isOpen={isNewTransferModalOpen}
        onClose={() => setIsNewTransferModalOpen(false)}
      />
    </div>
  );
}
