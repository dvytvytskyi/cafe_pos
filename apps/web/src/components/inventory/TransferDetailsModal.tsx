import React from 'react';
import { X, ArrowRight, Package, User, Clock, CheckCircle2, Truck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface TransferData {
  id: string;
  fullId: string;
  date: string;
  item: string;
  sku: string;
  quantity: number;
  from: string;
  to: string;
  status: 'completed' | 'in_transit' | 'pending';
  user: string;
}

interface TransferDetailsModalProps {
  transfer: TransferData | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (id: string, newStatus: 'completed' | 'in_transit' | 'pending') => void;
}

export default function TransferDetailsModal({ transfer, isOpen, onClose, onUpdateStatus }: TransferDetailsModalProps) {
  if (!isOpen || !transfer) return null;

  const getStatusDisplay = (status: TransferData['status']) => {
    switch (status) {
      case 'completed':
        return (
          <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50/80 px-2 py-0.5 rounded border border-emerald-200 w-fit">
            <CheckCircle2 size={12} strokeWidth={2.5} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Delivered</span>
          </div>
        );
      case 'in_transit':
        return (
          <div className="flex items-center gap-1 text-blue-600 bg-blue-50/80 px-2 py-0.5 rounded border border-blue-200 w-fit">
            <Truck size={12} strokeWidth={2.5} />
            <span className="text-[10px] font-bold uppercase tracking-wider">In Transit</span>
          </div>
        );
      case 'pending':
        return (
          <div className="flex items-center gap-1 text-amber-600 bg-amber-50/80 px-2 py-0.5 rounded border border-amber-200 w-fit">
            <Clock size={12} strokeWidth={2.5} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Pending</span>
          </div>
        );
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
          onClick={onClose}
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Transfer Details</h2>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-[13px] font-medium text-gray-500">{transfer.id}</p>
                {getStatusDisplay(transfer.status)}
              </div>
            </div>
            <button 
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-gray-50 text-gray-500 flex items-center justify-center hover:bg-gray-100 hover:text-gray-800 transition-colors cursor-pointer border border-transparent hover:border-gray-200 shrink-0"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-8">

            <div className="grid grid-cols-2 gap-6">
              <section>
                <h3 className="text-sm font-bold text-gray-900 mb-2 uppercase tracking-wider flex items-center gap-2"><Clock size={16} className="text-corgi" /> Date & Time</h3>
                <p className="text-[14px] font-bold text-gray-900 bg-gray-50/50 px-4 py-3 rounded-xl border border-gray-100">{transfer.date}</p>
              </section>
              <section>
                <h3 className="text-sm font-bold text-gray-900 mb-2 uppercase tracking-wider flex items-center gap-2"><User size={16} className="text-corgi" /> Initiated By</h3>
                <p className="text-[14px] font-bold text-gray-900 bg-gray-50/50 px-4 py-3 rounded-xl border border-gray-100">{transfer.user}</p>
              </section>
            </div>

            {/* Route */}
            <section className="space-y-3">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2"><ArrowRight size={16} className="text-corgi" /> Transfer Route</h3>
              <div className="flex items-center gap-3 bg-gray-50/50 px-4 py-3 rounded-xl border border-gray-100">
                <span className="text-[13px] font-bold text-gray-800">{transfer.from}</span>
                <ArrowRight className="w-4 h-4 text-gray-300 shrink-0" />
                <span className="text-[13px] font-bold text-gray-800">{transfer.to}</span>
              </div>
            </section>

            {/* Item Information */}
            <section className="space-y-3">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2"><Package size={16} className="text-corgi" /> Item Info</h3>
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-[15px] font-bold text-gray-900">{transfer.item}</span>
                  <span className="text-[12px] font-mono font-medium text-gray-500">{transfer.sku}</span>
                </div>
                <div className="text-right flex flex-col items-end">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Quantity</span>
                  <span className="text-xl font-bold text-gray-900">{transfer.quantity}</span>
                </div>
              </div>
            </section>

          </div>

          {/* Footer Actions */}
          {transfer.status !== 'completed' && (
            <div className="px-8 py-5 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 shrink-0">
              {transfer.status === 'pending' && (
                <>
                  <button 
                    onClick={() => {
                      // Logic to cancel
                      onClose();
                    }}
                    className="px-5 py-2.5 rounded-xl text-[13px] font-bold text-red-600 bg-white border border-gray-200 hover:bg-red-50 hover:border-red-200 transition-colors shadow-sm mr-auto cursor-pointer"
                  >
                    Cancel Transfer
                  </button>
                  <button 
                    onClick={() => onUpdateStatus(transfer.fullId, 'in_transit')}
                    className="flex items-center gap-2 px-6 py-2.5 bg-black hover:bg-gray-800 text-white rounded-xl text-[13px] font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                  >
                    <Truck size={16} />
                    Mark as In Transit
                  </button>
                </>
              )}

              {transfer.status === 'in_transit' && (
                <button 
                  onClick={() => onUpdateStatus(transfer.fullId, 'completed')}
                  className="flex items-center gap-2 px-6 py-2.5 bg-corgi hover:bg-[#ff8f20] text-white rounded-xl text-[13px] font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  <CheckCircle2 size={16} strokeWidth={2.5} />
                  Confirm Delivery
                </button>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
