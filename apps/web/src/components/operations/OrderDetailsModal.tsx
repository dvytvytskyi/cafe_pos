import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, MapPin, ShoppingBag, Bike, Store, Printer, CreditCard, Trash2, SplitSquareHorizontal, Banknote, CheckCircle2, ChevronLeft, Tag, Percent, Coins, Heart, Mail, Send, Download, AlertCircle, Users, Sparkles, Gift, UserPlus, MessageSquare, Receipt, ChefHat, AlertTriangle, Search, Minus, Plus, Check, RotateCcw } from 'lucide-react';
import { Order, OrderSource, OrderItem, completePaymentAsync, PayPayload } from '@/lib/orders';
import { getDiscountPresetsAsync, DiscountPreset } from '@/lib/discounts';
import { Guest, getGuestsAsync, getTierCashbackRate, getLoyaltyConfigAsync, DEFAULT_LOYALTY_CONFIG, type LoyaltyConfig } from '@/lib/crm';
import { updateTableStatusAsync } from '@/lib/tables';
import { logAuditEventAsync } from '@/lib/audit';
import { getCurrentShiftAsync } from '@/lib/shifts';
import { findCardByCodeAsync } from '@/lib/giftcards';
import { DEFAULT_LOCATION_ID } from '@/lib/constants';
import { refundOrderAsync, generateFiscalAsync, printOrderReceiptAsync } from '@/lib/fiscal';
import { getDefaultReceiptPrinterIpAsync } from '@/lib/printers';
import { mapApiOrderToUi } from '@/lib/mappers/order.mapper';
import { calculateReceiptTaxes } from '@/lib/tax-calc';
import { getTaxRatesAsync, taxRatesToMap, TAX_RATES_UPDATED_EVENT } from '@/lib/taxes';
import { getPosSettingsAsync, DEFAULT_POS_SETTINGS, type PosSettings } from '@/lib/pos-settings';

interface OrderDetailsModalProps {
  order: Order | null;
  isOpen: boolean;
  initialView?: ViewState;
  onClose: () => void;
  onUpdateStatus: (id: string, status: string) => void;
  onUpdateOrder: (updatedOrder: Order) => void;
  onPaymentComplete?: (updatedOrder: Order) => void | Promise<void>;
}

const SourceBadge = ({ source }: { source: OrderSource }) => {
  switch (source) {
    case 'glovo':
      return <img src="https://upload.wikimedia.org/wikipedia/commons/d/d9/Logotip_de_Glovo.png" alt="Glovo" className="h-6 object-contain" />;
    case 'ubereats':
      return <img src="https://1000logos.net/wp-content/uploads/2021/04/Uber-Eats-logo.png" alt="Uber Eats" className="h-[26px] object-contain" />;
    case 'dine_in':
      return <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 font-black text-[13px] rounded-xl"><Store size={16} /> DINE-IN</div>;
    case 'takeaway':
      return <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 text-orange-700 font-black text-[13px] rounded-xl"><ShoppingBag size={16} /> TAKEAWAY</div>;
  }
};

type ViewState = 'default' | 'checkout' | 'split_bill' | 'split_amount' | 'split_ways_list' | 'split_dishes' | 'checkout_split_dishes' | 'discount' | 'tip' | 'send_receipt' | 'cancel_order_confirm' | 'factura_form' | 'factura_a4' | 'refund_select' | 'refund_confirm';

export default function OrderDetailsModal({ order, isOpen, initialView = 'default', onClose, onUpdateStatus, onUpdateOrder: parentOnUpdateOrder, onPaymentComplete }: OrderDetailsModalProps) {
  const [view, setView] = useState<ViewState>(initialView);
  const [splitWays, setSplitWays] = useState(2);
  const [splitAmountType, setSplitAmountType] = useState<'ways' | 'custom'>('ways');
  const [customSplitAmount, setCustomSplitAmount] = useState('');
  const [customSplits, setCustomSplits] = useState<number[]>([]);
  const [discountPresets, setDiscountPresets] = useState<DiscountPreset[]>([]);
  const [loyaltyConfig, setLoyaltyConfig] = useState<LoyaltyConfig>(DEFAULT_LOYALTY_CONFIG);
  const [manualDiscount, setManualDiscount] = useState('');
  
  const [manualTip, setManualTip] = useState('');
  const [manualTipType, setManualTipType] = useState<'percent' | 'fixed'>('percent');
  const [selectedDishes, setSelectedDishes] = useState<Set<number>>(new Set());
  const [generatedSplits, setGeneratedSplits] = useState<{id: number, amount: number, paid: boolean}[]>([]);
  const [receiptEmails, setReceiptEmails] = useState<string[]>([]);
  const [currentEmailInput, setCurrentEmailInput] = useState('');
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  const [deleteConfirmIdx, setDeleteConfirmIdx] = useState<number | null>(null);

  // CRM & Loyalty States
  const [crmSearchQuery, setCrmSearchQuery] = useState('');
  const [selectedTierFilter, setSelectedTierFilter] = useState<'all' | 'VIP' | 'Gold' | 'Silver' | 'Bronze'>('all');
  const [showAssignGuest, setShowAssignGuest] = useState(false);
  const [allGuests, setAllGuests] = useState<Guest[]>([]);
  const [pointsToSpend, setPointsToSpend] = useState('');
  const [editingCommentIdx, setEditingCommentIdx] = useState<number | null>(null);
  
  // Gift Card States
  const [giftCardCode, setGiftCardCode] = useState('');
  const [giftCardError, setGiftCardError] = useState<string | null>(null);
  const [giftCardSuccess, setGiftCardSuccess] = useState<string | null>(null);
  const [showGiftCardInput, setShowGiftCardInput] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [shiftOpen, setShiftOpen] = useState<boolean | null>(null);
  const [shiftWarning, setShiftWarning] = useState(false);
  const [refundSelections, setRefundSelections] = useState<Record<number, number>>({});
  const [refundReason, setRefundReason] = useState('');
  const [refundMethod, setRefundMethod] = useState<'cash' | 'card'>('card');
  const [refundProcessing, setRefundProcessing] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [fiscalInvoiceNumber, setFiscalInvoiceNumber] = useState('');
  
  // Factura Corporate Details
  const [companyName, setCompanyName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [activeInvoiceNumber, setActiveInvoiceNumber] = useState('');
  const [kitchenPrintNotification, setKitchenPrintNotification] = useState<{
    show: boolean;
    barItems: string[];
    kitchenItems: string[];
  } | null>(null);
  const [taxRates, setTaxRates] = useState({ food: 10, alcohol: 21 });
  const [posSettings, setPosSettings] = useState<PosSettings>(DEFAULT_POS_SETTINGS);

  useEffect(() => {
    let cancelled = false;
    getTaxRatesAsync()
      .then((rates) => {
        if (!cancelled) setTaxRates(taxRatesToMap(rates));
      })
      .catch(console.error);

    const onRatesUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (Array.isArray(detail)) setTaxRates(taxRatesToMap(detail));
    };
    window.addEventListener(TAX_RATES_UPDATED_EVENT, onRatesUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener(TAX_RATES_UPDATED_EVENT, onRatesUpdated);
    };
  }, []);

  const handleKitchenPrint = async () => {
    if (!order) return;
    const ip = await getDefaultReceiptPrinterIpAsync(DEFAULT_LOCATION_ID);
    if (ip) {
      try {
        await printOrderReceiptAsync(order.id, ip, 'kitchen');
      } catch (e) {
        console.warn('Kitchen printer unavailable, falling back to simulated print:', e);
      }
    }
    const barItems: string[] = [];
    const kitchenItems: string[] = [];
    
    order.items.forEach(item => {
      const nameLower = item.name.toLowerCase();
      const isDrink = nameLower.includes('latte') || 
                      nameLower.includes('coffee') || 
                      nameLower.includes('flat white') || 
                      nameLower.includes('espresso') || 
                      nameLower.includes('cappuccino') || 
                      nameLower.includes('juice') || 
                      nameLower.includes('tea') || 
                      nameLower.includes('mocha') ||
                      nameLower.includes('americano');
                      
      const detail = `${item.quantity}x ${item.name}${item.comments ? ` ("${item.comments}")` : ''}`;
      if (isDrink) {
        barItems.push(detail);
      } else {
        kitchenItems.push(detail);
      }
    });

    setKitchenPrintNotification({
      show: true,
      barItems,
      kitchenItems
    });
    
    setTimeout(() => {
      setKitchenPrintNotification(null);
    }, 6000);
  };

  const handleReceiptPrint = async () => {
    if (!order) return;
    if (order.tableId) {
      updateTableStatusAsync(order.tableId, 'billed').catch(console.error);
    }
    const ip = getPrinterIp();
    if (ip) {
      try {
        await printOrderReceiptAsync(order.id, ip, 'receipt');
        return;
      } catch (e) {
        console.warn('Receipt printer unavailable, falling back to browser print:', e);
      }
    }
    window.print();
  };

  const handleDownloadReceipt = async () => {
    if (!order) return;
    const lines: string[] = [];
    if (order.paid) {
      try {
        const result = await generateFiscalAsync(order.id, {});
        lines.push(`Invoice: ${result.record.invoiceNumber}`);
        lines.push(`Hash: ${result.record.hash?.slice(0, 16) || 'N/A'}...`);
        lines.push('');
      } catch (e) {
        console.warn('Could not attach fiscal data to export:', e);
      }
    }
    lines.push(formatReceiptText(order));
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${order.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Common utility to calculate total
  const calculateFinalTotal = (baseItems: OrderItem[], currentDiscount: Order['discount'], currentTip: Order['tip']) => {
    const rawTotal = baseItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    let amountDeducted = 0;
    if (currentDiscount) {
      amountDeducted = rawTotal * (currentDiscount.value / 100);
    }
    const afterDiscount = Math.max(0, rawTotal - amountDeducted);
    
    let amountAdded = 0;
    if (currentTip) {
      if (currentTip.type === 'percent') {
        amountAdded = afterDiscount * (currentTip.value / 100);
      } else {
        amountAdded = currentTip.value;
      }
    }
    
    return { rawTotal, amountDeducted, afterDiscount, amountAdded, finalTotal: parseFloat(Math.max(0, afterDiscount + amountAdded).toFixed(2)) };
  };

  const paymentMethodLabel = (method: string) => {
    switch (method) {
      case 'card': return 'Card';
      case 'cash': return 'Cash';
      case 'points': return 'Loyalty Points';
      case 'giftcard': return 'Gift Card';
      default: return method;
    }
  };

  const formatReceiptText = (o: Order) => {
    const lines = [
      `RECEIPT - Order ${o.id}`,
      `Customer: ${o.customerName}`,
      `Date: ${o.time.toLocaleString()}`,
      '',
      '--- Items ---',
      ...o.items.map((item) => `${item.quantity}x ${item.name}  €${(item.price * item.quantity).toFixed(2)}`),
      '',
      `Subtotal: €${o.total.toFixed(2)}`,
    ];
    if (o.discount) lines.push(`Discount (${o.discount.name}): -€${o.discount.amountDeducted.toFixed(2)}`);
    if (o.tip) lines.push(`Tip: +€${o.tip.amountAdded.toFixed(2)}`);
    lines.push(`TOTAL: €${o.total.toFixed(2)}`);
    if (o.payments && o.payments.length > 0) {
      lines.push('', '--- Payments ---');
      o.payments.forEach((p) => {
        lines.push(`${paymentMethodLabel(p.method)}: €${p.amount.toFixed(2)}${p.code ? ` (${p.code})` : ''}`);
      });
      lines.push(`Paid: €${(o.amountPaid || 0).toFixed(2)}`);
      if (!o.paid) lines.push(`Remaining: €${(o.total - (o.amountPaid || 0)).toFixed(2)}`);
    }
    return lines.join('\n');
  };

  useEffect(() => {
    if (isOpen) {
      setView(initialView);
      setDiscountPresets([]);
      getDiscountPresetsAsync().then(setDiscountPresets).catch(console.error);
      getLoyaltyConfigAsync().then(setLoyaltyConfig).catch(console.error);
      getGuestsAsync().then(setAllGuests).catch(e => {
        console.error('Failed to load guests dynamically:', e);
        setAllGuests([]);
      });
      getPosSettingsAsync().then(setPosSettings).catch(console.error);
      setManualDiscount('');
      setManualTip('');
      setManualTipType('percent');
      setSelectedDishes(new Set());
      setSplitAmountType('ways');
      setCustomSplitAmount('');
      setCustomSplits([]);
      setGeneratedSplits([]);
      setReceiptEmails([]);
      setCurrentEmailInput('');
      setItemToDelete(null);
      setCrmSearchQuery('');
      setShowAssignGuest(false);
      setPointsToSpend('');
      setEditingCommentIdx(null);
      setKitchenPrintNotification(null);
      setCompanyName('');
      setTaxId('');
      setCompanyAddress('');
      setActiveInvoiceNumber('');
      setPaymentError(null);
      setShiftWarning(false);
      setRefundSelections({});
      setRefundReason('');
      setRefundError(null);
      setFiscalInvoiceNumber('');

      // Auto-apply Happy Hour discount on open if eligible
      if (order && !order.paid && !order.discount) {
        fetch('/api/promotions/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: order.items })
        })
          .then(res => res.ok ? res.json() : null)
          .then(hh => {
            if (hh && hh.value > 0) {
              const { finalTotal } = calculateFinalTotal(order.items, hh, order.tip);
              onUpdateOrder({
                ...order,
                discount: hh,
                total: finalTotal
              });
            }
          })
          .catch(err => console.error('Failed to calculate Happy Hour discount:', err));
      }
    }
  }, [isOpen, initialView]);

  useEffect(() => {
    if (isOpen && (view === 'checkout' || view === 'checkout_split_dishes' || view === 'split_ways_list')) {
      getCurrentShiftAsync(DEFAULT_LOCATION_ID)
        .then((shift) => setShiftOpen(!!shift))
        .catch(() => setShiftOpen(null));
    }
  }, [isOpen, view]);

  const onUpdateOrder = (updatedOrder: Order) => {
    parentOnUpdateOrder(updatedOrder);
  };

  const remainingBalance = order ? order.total - (order.amountPaid || 0) : 0;
  const customSplitsSum = customSplits.reduce((a, b) => a + b, 0);
  const currentRemainingForCustom = remainingBalance - customSplitsSum;

  if (!order) return null;

  // duplicate calculateFinalTotal removed

  const handleRemoveItem = (index: number) => {
    const newItems = [...order.items];
    newItems.splice(index, 1);
    
    const { amountDeducted, amountAdded, finalTotal } = calculateFinalTotal(newItems, order.discount, order.tip);
    
    // Update discount and tip amounts based on new total
    let updatedDiscount = order.discount ? { ...order.discount, amountDeducted } : undefined;
    let updatedTip = order.tip ? { ...order.tip, amountAdded } : undefined;

    onUpdateOrder({ 
      ...order, 
      items: newItems, 
      total: finalTotal,
      discount: updatedDiscount,
      tip: updatedTip
    });
    setItemToDelete(null);
  };

  const handleMinusClick = (index: number, currentQuantity: number) => {
    if (currentQuantity === 1) {
      if (deleteConfirmIdx === index) {
        handleRemoveItem(index);
        setDeleteConfirmIdx(null);
      } else {
        setDeleteConfirmIdx(index);
      }
    } else {
      const newItems = order.items.map((it, i) => i === index ? { ...it, quantity: it.quantity - 1 } : it);
      const { amountDeducted, amountAdded, finalTotal } = calculateFinalTotal(newItems, order.discount, order.tip);
      let updatedDiscount = order.discount ? { ...order.discount, amountDeducted } : undefined;
      let updatedTip = order.tip ? { ...order.tip, amountAdded } : undefined;

      onUpdateOrder({ 
        ...order, 
        items: newItems, 
        total: finalTotal,
        discount: updatedDiscount,
        tip: updatedTip
      });
      if (deleteConfirmIdx === index) {
        setDeleteConfirmIdx(null);
      }
    }
  };

  const handlePlusClick = (index: number) => {
    const newItems = order.items.map((it, i) => i === index ? { ...it, quantity: it.quantity + 1 } : it);
    const { amountDeducted, amountAdded, finalTotal } = calculateFinalTotal(newItems, order.discount, order.tip);
    let updatedDiscount = order.discount ? { ...order.discount, amountDeducted } : undefined;
    let updatedTip = order.tip ? { ...order.tip, amountAdded } : undefined;

    onUpdateOrder({ 
      ...order, 
      items: newItems, 
      total: finalTotal,
      discount: updatedDiscount,
      tip: updatedTip
    });
    if (deleteConfirmIdx === index) {
      setDeleteConfirmIdx(null);
    }
  };

  const handleCompletePayment = async (
    payments: PayPayload['payments'],
    options?: { paidItemIndexes?: number[]; onSuccess?: () => void }
  ) => {
    if (!order || paymentProcessing) return;
    setPaymentProcessing(true);
    setPaymentError(null);
    setGiftCardError(null);
    try {
      const updated = await completePaymentAsync(order.id, {
        payments,
        customerId: order.customerId,
        discount: order.discount ? { name: order.discount.name, value: order.discount.value } : undefined,
        tip: order.tip ? { type: order.tip.type, value: order.tip.value } : undefined,
        total: order.total,
        paidItemIndexes: options?.paidItemIndexes,
      });
      if (updated.warnings?.includes('NO_OPEN_SHIFT')) {
        setShiftWarning(true);
      }
      if (onPaymentComplete) {
        await onPaymentComplete(updated);
      } else {
        parentOnUpdateOrder(updated);
      }
      getGuestsAsync().then(setAllGuests).catch(() => setAllGuests([]));
      options?.onSuccess?.();
      if (updated.paid) {
        setTimeout(() => setView('default'), 600);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Payment failed';
      setPaymentError(msg);
      setGiftCardError(msg);
    } finally {
      setPaymentProcessing(false);
    }
  };

  const handleCheckout = async (method: 'cash' | 'card') => {
    if (method === 'cash' && shiftOpen === false) {
      setShiftWarning(true);
    }
    await handleCompletePayment([{ method, amount: remainingBalance }]);
  };

  const refundTotalSelected = Object.entries(refundSelections).reduce((sum, [idx, qty]) => {
    const item = order?.items[Number(idx)];
    return item ? sum + item.price * qty : sum;
  }, 0);

  const handleProcessRefund = async () => {
    if (!order || refundProcessing || !refundReason.trim()) return;
    const items = Object.entries(refundSelections)
      .filter(([, qty]) => qty > 0)
      .map(([idx, quantity]) => ({ itemIndex: Number(idx), quantity }));
    if (items.length === 0) {
      setRefundError('Select at least one item to refund');
      return;
    }
    setRefundProcessing(true);
    setRefundError(null);
    try {
      const result = await refundOrderAsync(order.id, {
        items,
        reason: refundReason.trim(),
        method: refundMethod,
      });
      if (result.order) {
        parentOnUpdateOrder(mapApiOrderToUi(result.order as any) as Order);
      }
      setView('default');
      setRefundSelections({});
      setRefundReason('');
    } catch (e: unknown) {
      setRefundError(e instanceof Error ? e.message : 'Refund failed');
    } finally {
      setRefundProcessing(false);
    }
  };

  const handleGiftCardRedeem = async (code: string) => {
    if (!order) return;
    try {
      const card = await findCardByCodeAsync(code);
      if (!card) {
        setGiftCardError('Gift Card not found.');
        setGiftCardSuccess(null);
        return;
      }
      if (card.status !== 'active') {
        setGiftCardError(`Gift Card is ${card.status}.`);
        setGiftCardSuccess(null);
        return;
      }
      if (new Date(card.expiryDate).getTime() < Date.now()) {
        setGiftCardError('Gift Card has expired.');
        setGiftCardSuccess(null);
        return;
      }
      if (card.balance <= 0) {
        setGiftCardError('Gift Card has zero balance.');
        setGiftCardSuccess(null);
        return;
      }

      const redeemAmount = parseFloat(Math.min(remainingBalance, card.balance).toFixed(2));
      await handleCompletePayment(
        [{ method: 'giftcard', amount: redeemAmount, code }],
        {
          onSuccess: () => {
            setGiftCardError(null);
            setGiftCardSuccess(`Successfully applied €${redeemAmount.toFixed(2)} from Gift Card!`);
            setGiftCardCode('');
            setTimeout(() => {
              setGiftCardSuccess(null);
              setShowGiftCardInput(false);
            }, 1200);
          },
        }
      );
    } catch (e: unknown) {
      setGiftCardError(e instanceof Error ? e.message : 'Gift Card not found or invalid.');
      setGiftCardSuccess(null);
    }
  };

  const renderOrderBody = () => (
    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50">
      
      {/* Kitchen Print Notification */}
      <AnimatePresence>
        {kitchenPrintNotification && (
          <motion.div 
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            className="bg-gray-900 text-white rounded-3xl p-5 shadow-2xl overflow-hidden flex flex-col gap-3 z-30 border border-gray-800"
          >
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <Printer size={16} />
              <span>Simulated Print Routing (Otkaz ot KDS)</span>
            </div>
            <div className="space-y-2.5 text-xs text-gray-300">
              {kitchenPrintNotification.barItems.length > 0 && (
                <div>
                  <div className="font-extrabold text-[10px] text-gray-400 uppercase tracking-wider mb-1">📟 Bar Printer (Drinks)</div>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {kitchenPrintNotification.barItems.map((it, i) => <li key={i}>{it}</li>)}
                  </ul>
                </div>
              )}
              {kitchenPrintNotification.kitchenItems.length > 0 && (
                <div>
                  <div className="font-extrabold text-[10px] text-gray-400 uppercase tracking-wider mb-1">🍳 Kitchen Printer (Food)</div>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {kitchenPrintNotification.kitchenItems.map((it, i) => <li key={i}>{it}</li>)}
                  </ul>
                </div>
              )}
            </div>
            <button 
              onClick={() => setKitchenPrintNotification(null)}
              className="w-full py-1.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg text-[11px] transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Customer Info */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-2">
        <div className="flex justify-between items-center mb-1">
          <span className="text-gray-500 font-medium text-sm">Customer</span>
          <span className="text-gray-900 font-bold">{order.customerName}</span>
        </div>
        {order.deliveryId && (
          <div className="flex justify-between items-center">
            <span className="text-gray-500 font-medium text-sm">Courier ID</span>
            <span className="text-gray-900 font-bold flex items-center gap-1.5">
              <MapPin size={14} className="text-gray-400" />
              {order.deliveryId}
            </span>
          </div>
        )}
        <div className="flex justify-between items-center pt-3 border-t border-gray-100">
          <span className="text-gray-500 font-medium text-sm">Ordered via</span>
          <span className="text-gray-900 font-bold capitalize">{order.orderedBy}</span>
        </div>
      </div>

      {/* Timing Info */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-gray-500 font-medium text-sm">Order Time</span>
          <span className="text-gray-900 font-bold flex items-center gap-1.5">
            <Clock size={14} className="text-gray-400" />
            {order.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        {order.readyByTime && (
          <div className="flex justify-between items-center pt-3 border-t border-gray-100">
            <span className="text-orange-600 font-medium text-sm">Target Ready Time</span>
            <span className="text-orange-600 font-black">{order.readyByTime}</span>
          </div>
        )}
      </div>

      {/* Loyalty & Guest Info */}
      {order.orderedBy !== 'app' && (
        <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-900 font-black text-sm flex items-center gap-1.5">
              <Users size={16} className="text-gray-400" />
              CRM & Loyalty
            </span>
            {order.customerId && !order.paid && (
              <button 
                onClick={() => {
                  onUpdateOrder({
                    ...order,
                    customerId: undefined,
                    customerPointsPaid: undefined
                  });
                }}
                className="text-xs text-red-500 font-bold hover:underline cursor-pointer"
              >
                Remove
              </button>
            )}
          </div>

          {order.customerId ? (
            (() => {
              const guest = allGuests.find(g => g.id === order.customerId);
              if (!guest) return <div className="text-xs text-gray-400 font-semibold">Guest not found</div>;
              const cashbackRate = getTierCashbackRate(guest.tier, loyaltyConfig);
              const estCashback = ((order.total - (order.customerPointsPaid || 0)) * cashbackRate).toFixed(2);
              
              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center font-bold text-xs text-gray-600">
                        {guest.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <span className="font-bold text-sm text-gray-900 block">{guest.name}</span>
                        <span className="text-[10px] text-gray-400 font-semibold">{guest.phone}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-900 text-white border border-gray-900">
                      {guest.tier}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 text-xs">
                    <div className="bg-gray-50 p-2 rounded-lg">
                      <span className="text-gray-400 font-semibold block text-[10px]">Points Balance</span>
                      <span className="font-black text-gray-900 flex items-center gap-0.5 mt-0.5">
                        <Coins size={12} className="text-amber-500" />
                        {guest.points.toFixed(1)}
                      </span>
                    </div>
                    <div className="bg-gray-50 p-2 rounded-lg">
                      <span className="text-gray-400 font-semibold block text-[10px]">Est. Cashback</span>
                      <span className="font-black text-green-600 flex items-center gap-0.5 mt-0.5">
                        <Sparkles size={12} className="text-green-500" />
                        +€{estCashback}
                      </span>
                    </div>
                  </div>
                  {guest.allergyNotes && (
                    <div className="bg-amber-50 border border-amber-100 text-amber-900 px-3 py-2 rounded-lg flex gap-2 items-start text-xs font-semibold">
                      <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={14} />
                      <span>Allergies: {guest.allergyNotes}</span>
                    </div>
                  )}
                </div>
              );
            })()
          ) : (
            !order.paid && (
              <button
                onClick={() => setShowAssignGuest(true)}
                className="w-full py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 border-dashed rounded-xl text-xs font-bold text-gray-600 hover:text-gray-900 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <UserPlus size={14} />
                Assign Guest to Order
              </button>
            )
          )}
        </div>
      )}

      {/* Order Items */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100">
        <h3 className="text-gray-900 font-black mb-3">Order Summary</h3>
        {order.items.length === 0 ? (
          <div className="text-center py-6 text-gray-400 font-medium">No items left</div>
        ) : (
          <div className="space-y-4">
            {order.items.map((item, idx) => (
              <div key={idx} className={`flex flex-col text-sm group hover:bg-gray-50 p-2 -mx-2 rounded-xl transition-colors ${item.paid ? 'opacity-50 grayscale' : ''}`}>
                <div className="flex justify-between items-center w-full">
                  <div className="flex gap-3 items-center">
                    {!item.paid && <span className="text-gray-400 font-bold w-4">{item.quantity}x</span>}
                    <span className="font-bold text-gray-700">{item.name} {item.paid && <span className="text-xs text-green-600 ml-1 px-1.5 py-0.5 bg-green-100 rounded-md">Paid</span>}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-900">€{(item.price * item.quantity).toFixed(2)}</span>
                    {(!order.paid || order.status === 'incoming' || order.status === 'preparing') && !item.paid && (
                      <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-0.5 shrink-0 border border-gray-200/50">
                        <button 
                          onClick={() => handleMinusClick(idx, item.quantity)} 
                          className={`w-7 h-7 flex items-center justify-center rounded-lg border transition-all cursor-pointer ${
                            deleteConfirmIdx === idx
                              ? 'bg-red-500 hover:bg-red-600 border-red-500 text-white animate-pulse'
                              : 'bg-white text-gray-600 border-gray-200/50 hover:text-corgi'
                          }`}
                          title={deleteConfirmIdx === idx ? "Click again to delete" : "Decrease quantity"}
                        >
                          {deleteConfirmIdx === idx ? <Trash2 size={12} /> : <Minus size={12} />}
                        </button>
                        <span className="font-extrabold w-4 text-center text-gray-950 text-xs select-none">{item.quantity}</span>
                        <button 
                          onClick={() => handlePlusClick(idx)} 
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-white text-gray-600 border border-gray-200/50 hover:text-corgi cursor-pointer"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Preparation Comments */}
                {(!order.paid || order.status === 'incoming' || order.status === 'preparing') && !item.paid && (
                  <div className="pl-2 w-full mt-1.5 mb-1">
                    {editingCommentIdx === idx ? (
                      <div className="flex gap-2 w-full items-center animate-in fade-in slide-in-from-top-1 duration-150">
                        <input
                          type="text"
                          defaultValue={item.comments || ''}
                          placeholder="Add prep notes (e.g. Extra hot, no onions)..."
                          onBlur={(e) => {
                            const val = e.target.value.trim();
                            const newItems = order.items.map((it, i) => i === idx ? { ...it, comments: val || undefined } : it);
                            onUpdateOrder({ ...order, items: newItems });
                            setEditingCommentIdx(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const val = (e.target as HTMLInputElement).value.trim();
                              const newItems = order.items.map((it, i) => i === idx ? { ...it, comments: val || undefined } : it);
                              onUpdateOrder({ ...order, items: newItems });
                              setEditingCommentIdx(null);
                            }
                          }}
                          className="flex-1 bg-gray-50/70 focus:bg-white border border-gray-200 focus:border-corgi focus:ring-2 focus:ring-corgi/20 rounded-xl px-3 py-2 text-xs text-gray-900 placeholder-gray-400 font-extrabold outline-none transition-all"
                          autoFocus
                        />
                        <button 
                          onClick={() => setEditingCommentIdx(null)} 
                          className="w-8 h-8 bg-corgi hover:bg-orange-600 text-white rounded-xl transition-all cursor-pointer active:scale-95 flex items-center justify-center shrink-0 shadow-sm"
                        >
                          <Check size={16} className="stroke-[3px]" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 min-h-[16px] flex-wrap">
                        {item.comments ? (
                          <span 
                            onClick={() => !order.paid && setEditingCommentIdx(idx)}
                            className={`text-[10px] bg-orange-50/60 border border-orange-100/80 hover:bg-orange-100/40 text-corgi px-2 py-0.5 rounded-lg font-bold flex items-center gap-1 transition-colors ${!order.paid ? 'cursor-pointer' : ''}`}
                            title={!order.paid ? 'Click to edit' : ''}
                          >
                            <MessageSquare size={10} />
                            <span>"{item.comments}"</span>
                          </span>
                        ) : (
                          !order.paid && (
                            <button
                              onClick={() => setEditingCommentIdx(idx)}
                              className="text-[10px] text-gray-500 hover:text-corgi hover:bg-orange-50/40 border border-gray-200/60 rounded-md px-1.5 py-0.5 w-fit flex items-center gap-1 cursor-pointer transition-colors font-extrabold"
                            >
                              <MessageSquare size={10} /> Add Prep Note
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {order.discount && (
          <div className="flex justify-between items-center pt-3 mt-3 border-t border-gray-100 text-sm">
            <span className="font-bold text-corgi flex items-center gap-1.5"><Tag size={14}/> {order.discount.name} ({order.discount.value}%)</span>
            <span className="font-bold text-corgi">-€{order.discount.amountDeducted.toFixed(2)}</span>
          </div>
        )}

        {order.tip && (
          <div className="flex justify-between items-center pt-2 text-sm">
            <span className="font-bold text-green-600 flex items-center gap-1.5"><Heart size={14}/> Tip {order.tip.type === 'percent' ? `(${order.tip.value}%)` : ''}</span>
            <span className="font-bold text-green-600">+€{order.tip.amountAdded.toFixed(2)}</span>
          </div>
        )}

        {order.payments && order.payments.length > 0 && (
          <div className="pt-3 mt-3 border-t border-gray-100 space-y-1.5">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Payment Methods</span>
            {order.payments.map((p, i) => (
              <div key={i} className="flex justify-between items-center text-sm">
                <span className="font-bold text-gray-600 flex items-center gap-1.5">
                  {p.method === 'card' && <CreditCard size={13} className="text-blue-500" />}
                  {p.method === 'cash' && <Banknote size={13} className="text-green-600" />}
                  {p.method === 'points' && <Coins size={13} className="text-amber-500" />}
                  {p.method === 'giftcard' && <Gift size={13} className="text-purple-500" />}
                  {paymentMethodLabel(p.method)}
                </span>
                <span className="font-black text-gray-900">€{p.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );

  const renderDefaultView = () => (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col h-full"
    >
      {/* Content */}
      {renderOrderBody()}

      {/* Footer Actions */}
      <div className="p-6 bg-white border-t border-gray-100 shrink-0 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)] flex flex-col gap-4">
        
        {/* Fixed Total Area */}
        <div className="flex justify-between items-end">
          <div className="flex flex-col">
            <span className="font-bold text-gray-500 text-sm mb-1">Total</span>
            <span className="font-black text-gray-900 text-3xl leading-none">€{order.total.toFixed(2)}</span>
          </div>
          {(order.amountPaid || 0) > 0 && (
            <div className="flex flex-col items-end">
              <span className="font-bold text-green-600 text-sm mb-1">Paid: €{(order.amountPaid || 0).toFixed(2)}</span>
              <span className="font-black text-corgi text-xl leading-none">Rem: €{remainingBalance.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Payment & Split Actions */}
        {!order.paid && (
          <div className="grid grid-cols-4 gap-3">
            <button 
              onClick={() => setView('checkout')}
              className="flex flex-col items-center justify-center gap-1.5 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-bold transition-all active:scale-95 cursor-pointer"
            >
              <CreditCard size={18} /> <span className="text-[13px]">Checkout {order.discount ? `(-${order.discount.value}%)` : ''}</span>
            </button>
            <button 
              onClick={() => setView('split_bill')}
              className="flex flex-col items-center justify-center gap-1.5 py-3 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl font-bold transition-all active:scale-95 cursor-pointer"
            >
              <SplitSquareHorizontal size={18} /> <span className="text-[13px]">Split Bill</span>
            </button>
            <button 
              onClick={() => setView('discount')}
              className="flex flex-col items-center justify-center gap-1.5 py-3 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl font-bold transition-all active:scale-95 cursor-pointer"
            >
              <Tag size={18} /> <span className="text-[13px]">Discount</span>
            </button>
            <button 
              onClick={() => setView('tip')}
              className="flex flex-col items-center justify-center gap-1.5 py-3 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl font-bold transition-all active:scale-95 cursor-pointer"
            >
              <Heart size={18} /> <span className="text-[13px]">Add Tip</span>
            </button>
          </div>
        )}

        {order.paid && (
          <button 
            onClick={() => setView('factura_form')}
            className="w-full py-3.5 bg-brown hover:bg-brown/90 text-white rounded-xl font-bold transition-all cursor-pointer active:scale-[0.98] flex items-center justify-center gap-2 text-sm shadow-sm"
          >
            <Receipt size={16} /> Generate Corporate A4 Invoice (Factura)
          </button>
        )}

        {order.paid && (order.refundedAmount ?? 0) < order.total - 0.01 && (
          <button
            onClick={() => { setRefundSelections({}); setView('refund_select'); }}
            className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw size={16} /> Refund Items
          </button>
        )}

        {/* Utilities */}
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={handleReceiptPrint}
            className="flex flex-col items-center justify-center gap-1.5 py-3 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl font-bold transition-all active:scale-95 cursor-pointer"
          >
            <Printer size={18} className="text-gray-500" /> <span className="text-[13px]">Print Ticket</span>
          </button>
          
          <button 
            onClick={handleKitchenPrint}
            className="flex flex-col items-center justify-center gap-1.5 py-3 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl font-bold transition-all active:scale-95 cursor-pointer"
          >
            <ChefHat size={18} className="text-amber-600" /> <span className="text-[13px] text-amber-800">Print Kitchen</span>
          </button>

          <button 
            onClick={() => {
              setReceiptEmails(order.customerEmail ? [order.customerEmail] : []);
              setCurrentEmailInput('');
              setView('send_receipt');
            }}
            className="flex flex-col items-center justify-center gap-1.5 py-3 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl font-bold transition-all active:scale-95 cursor-pointer"
          >
            <Mail size={18} className="text-gray-500" /> <span className="text-[13px]">{order.receiptsSentTo && order.receiptsSentTo.length > 0 ? 'Resend' : 'Send'}</span>
          </button>

          <button 
            onClick={handleDownloadReceipt}
            className="flex flex-col items-center justify-center gap-1.5 py-3 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl font-bold transition-all active:scale-95 cursor-pointer"
          >
            <Download size={18} className="text-gray-500" /> <span className="text-[13px]">PDF</span>
          </button>
        </div>

        {/* State Actions */}
        {order.status === 'incoming' && (
          <button 
            onClick={() => { onUpdateStatus(order.id, 'preparing'); onClose(); }}
            className="w-full py-4 bg-gray-900 text-white rounded-xl font-black text-lg hover:bg-gray-800 transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2"
          >
            Start Preparing
          </button>
        )}
        {order.status === 'preparing' && (
          <button 
            onClick={() => { 
              const nextStatus = (order.source === 'glovo' || order.source === 'ubereats') ? 'ready' : (order.source === 'takeaway' ? 'completed' : 'served');
              onUpdateStatus(order.id, nextStatus); 
              onClose(); 
            }}
            className="w-full py-4 bg-gray-900 text-white rounded-xl font-black text-lg hover:bg-gray-800 transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2"
          >
            <ShoppingBag size={20} /> {(order.source === 'glovo' || order.source === 'ubereats') ? 'Mark as Ready' : 'Mark as Served'}
          </button>
        )}
        {order.status === 'ready' && (
          <button 
            onClick={() => { onUpdateStatus(order.id, 'completed'); onClose(); }}
            className="w-full py-4 bg-gray-900 text-white rounded-xl font-black text-lg hover:bg-gray-800 transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2"
          >
            Handed to Courier/Guest
          </button>
        )}
        {order.status === 'served' && order.paid && (
          <button 
            onClick={() => { onUpdateStatus(order.id, 'completed'); onClose(); }}
            className="w-full py-4 bg-gray-900 text-white rounded-xl font-black text-lg hover:bg-gray-800 transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={20} /> Complete Order
          </button>
        )}
        {order.status !== 'cancelled' && order.status !== 'served' && order.status !== 'completed' && (
          <button 
            onClick={() => setView('cancel_order_confirm')}
            className="w-full py-3 text-red-500 font-bold bg-white hover:bg-red-50 border border-transparent hover:border-red-100 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <X size={18} /> Cancel Order
          </button>
        )}
      </div>
    </motion.div>
  );

  const renderCheckoutView = () => {
    const assignedGuest = order.customerId ? allGuests.find(g => g.id === order.customerId) : null;
    
    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="flex flex-col h-full"
      >
        {/* Content */}
        {renderOrderBody()}
        
        {/* Footer Actions for Checkout */}
        <div className="p-6 bg-white border-t border-gray-100 shrink-0 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)]">
          {shiftOpen === false && (
            <div className="mb-4 bg-amber-50 border border-amber-100 rounded-xl p-3 flex gap-2.5 items-start text-amber-800 animate-in fade-in">
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <div className="text-left">
                <span className="text-xs font-bold block">Cash Register Shift Closed</span>
                <span className="text-[10px] text-amber-600 font-semibold leading-normal">Card, points, and gift cards are available. Cash payments will be logged with a compliance warning.</span>
              </div>
            </div>
          )}
          {shiftWarning && (
            <div className="mb-4 bg-red-50 border border-red-100 rounded-xl p-3 flex gap-2.5 items-start text-red-700 animate-in fade-in">
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <div className="text-left">
                <span className="text-xs font-bold block">Cash logged without open shift</span>
                <span className="text-[10px] text-red-500 font-semibold leading-normal">Open a register shift to stay compliant with VERI*FACTU cash tracking.</span>
              </div>
            </div>
          )}
          {paymentError && (
            <div className="mb-4 bg-red-50 border border-red-100 rounded-xl p-3 text-red-700 text-xs font-bold flex items-center gap-2">
              <AlertCircle size={16} /> {paymentError}
            </div>
          )}
          {shiftOpen !== false && assignedGuest && assignedGuest.points > 0 && remainingBalance > 0.01 && (
              <div className="mb-4 bg-amber-50/50 border border-amber-100/50 rounded-xl p-3 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center gap-2">
                  <Coins size={18} className="text-amber-500 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-gray-700 block">Redeem Points</span>
                    <span className="text-[10px] text-gray-400 font-semibold">Balance: {assignedGuest.points.toFixed(1)} pts (€{assignedGuest.points.toFixed(1)})</span>
                  </div>
                </div>
                
                <div className="flex gap-1.5 items-center">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={pointsToSpend ? pointsToSpend.replace('.', ',') : ''}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '');
                      if (val === '') {
                        setPointsToSpend('');
                      } else {
                        const num = parseInt(val, 10) / 100;
                        const maxRedeem = Math.min(assignedGuest.points, remainingBalance);
                        if (num > maxRedeem) {
                          setPointsToSpend(maxRedeem.toFixed(2));
                        } else {
                          setPointsToSpend(num.toFixed(2));
                        }
                      }
                    }}
                    placeholder="0,00"
                    className="w-20 bg-white border border-gray-200 rounded-lg px-2 py-1 text-right font-bold text-xs text-gray-955 focus:border-gray-900 outline-none"
                  />
                  <button
                    disabled={!pointsToSpend || parseFloat(pointsToSpend) <= 0 || paymentProcessing}
                    onClick={() => {
                      const pointsAmount = parseFloat(pointsToSpend);
                      if (pointsAmount > 0) {
                        handleCompletePayment([{ method: 'points', amount: pointsAmount }]);
                        setPointsToSpend('');
                      }
                    }}
                    className="bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )
          }

          <h3 className="text-[14px] font-bold text-gray-500 mb-3 text-center uppercase tracking-wider">Select Payment Method</h3>
          <div className="grid grid-cols-3 gap-2 w-full mb-3">
            <button 
              disabled={paymentProcessing || remainingBalance <= 0.01}
              onClick={() => handleCheckout('card')}
              className="flex flex-col items-center justify-center gap-1.5 py-3 bg-white border border-gray-200 hover:border-gray-900 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-gray-200 rounded-xl transition-all active:scale-95 cursor-pointer group"
            >
              <CreditCard size={20} className="text-gray-500 group-hover:text-gray-900 group-disabled:text-gray-300 transition-colors" />
              <span className="font-bold text-sm text-gray-900 group-disabled:text-gray-400">Card</span>
            </button>
            <button 
              disabled={paymentProcessing || remainingBalance <= 0.01}
              onClick={() => handleCheckout('cash')}
              className="flex flex-col items-center justify-center gap-1.5 py-3 bg-white border border-gray-200 hover:border-gray-900 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-gray-200 rounded-xl transition-all active:scale-95 cursor-pointer group"
            >
              <Banknote size={20} className="text-gray-500 group-hover:text-gray-900 group-disabled:text-gray-300 transition-colors" />
              <span className="font-bold text-sm text-gray-900 group-disabled:text-gray-400">Cash</span>
            </button>
            <button 
              disabled={paymentProcessing || remainingBalance <= 0.01}
              onClick={() => {
                setShowGiftCardInput(!showGiftCardInput);
                setGiftCardError(null);
                setGiftCardSuccess(null);
              }}
              className={`flex flex-col items-center justify-center gap-1.5 py-3 border disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-all active:scale-95 cursor-pointer group ${
                showGiftCardInput 
                  ? 'bg-purple-50 border-purple-400 text-purple-700 font-bold' 
                  : 'bg-white border-gray-200 hover:border-gray-900 hover:bg-gray-50'
              }`}
            >
              <Gift size={20} className={showGiftCardInput ? 'text-purple-650' : 'text-gray-500 group-hover:text-gray-900 group-disabled:text-gray-300 transition-colors'} />
              <span className={`font-bold text-sm ${showGiftCardInput ? 'text-purple-750' : 'text-gray-900 group-disabled:text-gray-400'}`}>Gift Card</span>
            </button>
          </div>

          {showGiftCardInput && (
            <div className="mb-4 p-4 border border-purple-100 rounded-2xl bg-purple-50/20 text-left animate-in fade-in slide-in-from-bottom-2">
              <label className="text-[10px] font-black text-purple-700 uppercase tracking-wider block mb-1.5">Redeem Gift Card Code</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. CORGI-50-GIFT"
                  value={giftCardCode}
                  onChange={e => setGiftCardCode(e.target.value)}
                  className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-955 outline-none focus:border-purple-500"
                />
                <button
                  type="button"
                  onClick={() => handleGiftCardRedeem(giftCardCode)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer active:scale-95"
                >
                  Apply
                </button>
              </div>

              {giftCardError && (
                <div className="text-[10px] text-red-500 font-bold mt-1.5 flex items-center gap-1">
                  <AlertCircle size={12} /> {giftCardError}
                </div>
              )}

              {giftCardSuccess && (
                <div className="text-[10px] text-saturated-green font-bold mt-1.5 flex items-center gap-1">
                  <CheckCircle2 size={12} /> {giftCardSuccess}
                </div>
              )}
            </div>
          )}
          <button 
            onClick={() => setView('default')}
            className="w-full py-3 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 hover:text-gray-900 transition-all active:scale-95 flex items-center justify-center cursor-pointer"
          >
            Cancel Checkout
          </button>
        </div>
      </motion.div>
    );
  };

  const renderSplitBillOptions = () => (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col h-full"
    >
      <div className="flex-1 p-6 bg-gray-50/50 flex flex-col items-center justify-center space-y-4">
        <div className="text-3xl font-black text-gray-900 mb-6">Split Bill</div>
        
        <button 
          onClick={() => setView('split_amount')}
          className="w-full max-w-xs p-5 bg-white border-2 border-gray-100 hover:border-gray-300 rounded-3xl flex flex-col items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
        >
          <span className="font-black text-lg text-gray-900">Split by Amount</span>
          <span className="text-sm font-medium text-gray-500 text-center">Divide the total equally among multiple people</span>
        </button>

        <button 
          onClick={() => setView('split_dishes')}
          className="w-full max-w-xs p-5 bg-white border-2 border-gray-100 hover:border-gray-300 rounded-3xl flex flex-col items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
        >
          <span className="font-black text-lg text-gray-900">Split by Dishes</span>
          <span className="text-sm font-medium text-gray-500 text-center">Select specific items to pay for separately</span>
        </button>
      </div>

      <div className="p-6 bg-white border-t border-gray-100 shrink-0">
        <button 
          onClick={() => setView('default')}
          className="w-full py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all active:scale-95 cursor-pointer"
        >
          Back to Order
        </button>
      </div>
    </motion.div>
  );

  const renderSplitAmountView = () => {
    const payAmount = splitAmountType === 'ways' 
      ? (remainingBalance / splitWays) 
      : (parseFloat(customSplitAmount) || 0);

    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="flex flex-col h-full"
      >
        <div className="flex items-center gap-4 p-6 border-b border-gray-100 bg-white">
          <button onClick={() => {
            if (customSplits.length > 0) {
              setCustomSplits([]);
            } else {
              setView('split_bill');
            }
          }} className="p-2 -ml-2 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 cursor-pointer"><ChevronLeft size={20}/></button>
          <h3 className="text-xl font-black text-gray-900">Split Payment</h3>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 flex flex-col items-center">
          
          <div className="flex bg-gray-100 p-1 rounded-xl mb-6 w-full max-w-sm">
            <button 
              onClick={() => setSplitAmountType('ways')}
              className={`flex-1 py-2 font-bold text-sm rounded-lg transition-all cursor-pointer ${splitAmountType === 'ways' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Divide Equally
            </button>
            <button 
              onClick={() => {
                setSplitAmountType('custom');
                if (customSplitAmount === '') {
                  setCustomSplitAmount(currentRemainingForCustom.toFixed(2));
                }
              }}
              className={`flex-1 py-2 font-bold text-sm rounded-lg transition-all cursor-pointer ${splitAmountType === 'custom' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Custom Amount
            </button>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm w-full max-w-sm mb-6 text-center">
            <div className="text-gray-500 font-medium mb-1">Total Remaining</div>
            <div className="text-3xl font-black text-gray-900 mb-6">€{remainingBalance.toFixed(2)}</div>
            
            {splitAmountType === 'ways' ? (
              <>
                <div className="text-gray-500 font-medium mb-3">How many ways?</div>
                <div className="flex items-center justify-center gap-4 mb-6">
                  <button onClick={() => setSplitWays(Math.max(2, splitWays - 1))} className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 hover:text-gray-900 transition-colors cursor-pointer font-bold text-xl">-</button>
                  <span className="text-3xl font-black text-gray-900 w-12 text-center">{splitWays}</span>
                  <button onClick={() => setSplitWays(splitWays + 1)} className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 hover:text-gray-900 transition-colors cursor-pointer font-bold text-xl">+</button>
                </div>

                <div className="p-4 bg-orange-50 rounded-2xl">
                  <div className="text-sm font-bold text-orange-700 mb-1">Amount per person</div>
                  <div className="text-3xl font-black text-orange-600">€{payAmount.toFixed(2)}</div>
                </div>
              </>
            ) : (
              <>
                {customSplits.length > 0 && (
                  <div className="mb-4 space-y-2 text-left">
                    {customSplits.map((amt, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm font-bold text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <span>Payment {idx + 1}</span>
                        <span>€{amt.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                {currentRemainingForCustom > 0.01 && (
                  <>
                    <div className="text-gray-500 font-medium mb-3 text-left">Payment {customSplits.length + 1} Amount</div>
                    <div className="relative max-w-[200px] mx-auto mb-2">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="text-gray-400 font-black text-2xl">€</span>
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={customSplitAmount ? customSplitAmount.replace('.', ',') : ''}
                        onChange={(e) => {
                          const rawValue = e.target.value.replace(/\D/g, '');
                          if (rawValue === '') {
                            setCustomSplitAmount('0.00');
                          } else {
                            const floatValue = parseInt(rawValue, 10) / 100;
                            if (floatValue > currentRemainingForCustom) {
                               setCustomSplitAmount(currentRemainingForCustom.toFixed(2));
                            } else {
                               setCustomSplitAmount(floatValue.toFixed(2));
                            }
                          }
                        }}
                        placeholder="0,00"
                        className="block w-full pl-10 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-2xl font-black text-gray-900 text-center focus:border-corgi focus:ring-0 transition-all outline-none"
                      />
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
        
        <div className="p-6 bg-white border-t border-gray-100 shrink-0">
          <button 
            disabled={
              splitAmountType === 'ways' 
                ? (payAmount <= 0 || payAmount > remainingBalance)
                : (payAmount <= 0 || payAmount > currentRemainingForCustom)
            }
            onClick={() => {
              if (splitAmountType === 'ways') {
                const baseAmount = Math.floor(remainingBalance / splitWays * 100) / 100;
                const splits = Array.from({ length: splitWays }).map((_, i) => ({
                  id: i,
                  amount: i === splitWays - 1 ? parseFloat((remainingBalance - baseAmount * (splitWays - 1)).toFixed(2)) : baseAmount,
                  paid: false
                }));
                setGeneratedSplits(splits);
                setView('split_ways_list');
              } else {
                const newSplits = [...customSplits, payAmount];
                const newSum = newSplits.reduce((a, b) => a + b, 0);
                
                if (newSum >= remainingBalance - 0.01) {
                  // Reached total, proceed to splits list
                  const splits = newSplits.map((amt, i) => ({
                    id: i,
                    amount: amt,
                    paid: false
                  }));
                  setGeneratedSplits(splits);
                  setView('split_ways_list');
                  setCustomSplits([]);
                } else {
                  // Stay and ask for next payment
                  setCustomSplits(newSplits);
                  setCustomSplitAmount((remainingBalance - newSum).toFixed(2));
                }
              }
            }}
            className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            {splitAmountType === 'ways' || customSplitsSum + payAmount >= remainingBalance - 0.01 ? 'Generate Splits' : `Add Payment €${payAmount.toFixed(2)}`}
          </button>
        </div>
      </motion.div>
    );
  };

  const handlePaySplit = async (splitId: number, method: 'card' | 'cash') => {
    const split = generatedSplits.find(s => s.id === splitId);
    if (!split || split.paid || paymentProcessing) return;

    if (method === 'cash' && shiftOpen === false) {
      setShiftWarning(true);
    }

    await handleCompletePayment([{ method, amount: split.amount }], {
      onSuccess: () => {
        const newSplits = generatedSplits.map(s => s.id === splitId ? { ...s, paid: true } : s);
        setGeneratedSplits(newSplits);
      },
    });
  };

  const renderSplitWaysListView = () => (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col h-full"
    >
      <div className="flex items-center gap-4 p-6 border-b border-gray-100 bg-white">
        <button onClick={() => setView('split_amount')} className="p-2 -ml-2 rounded-full hover:bg-gray-100"><ChevronLeft size={20}/></button>
        <h3 className="text-xl font-black text-gray-900">Generated Splits</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 space-y-3">
        {generatedSplits.map((split, idx) => (
          <div key={split.id} className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${split.paid ? 'bg-green-50 border-green-500' : 'bg-white border-transparent shadow-sm'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${split.paid ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 text-gray-400 font-bold'}`}>
                {split.paid ? <CheckCircle2 size={20} /> : idx + 1}
              </div>
              <span className={`font-black text-xl ${split.paid ? 'text-green-700' : 'text-gray-900'}`}>€{split.amount.toFixed(2)}</span>
            </div>
            
            {!split.paid && (
              <div className="flex gap-2">
                <button 
                  onClick={() => handlePaySplit(split.id, 'card')}
                  className="px-4 py-2 border-2 border-blue-200 text-blue-600 rounded-xl font-bold hover:bg-blue-50 transition-all active:scale-95 flex items-center gap-1 text-sm"
                >
                  <CreditCard size={16} /> Card
                </button>
                <button 
                  onClick={() => handlePaySplit(split.id, 'cash')}
                  className="px-4 py-2 border-2 border-green-200 text-green-600 rounded-xl font-bold hover:bg-green-50 transition-all active:scale-95 flex items-center gap-1 text-sm"
                >
                  <Banknote size={16} /> Cash
                </button>
              </div>
            )}
            
            {split.paid && (
              <span className="font-bold text-green-600 text-sm">Paid</span>
            )}
          </div>
        ))}
      </div>
      
      <div className="p-6 bg-white border-t border-gray-100 shrink-0">
        {generatedSplits.every(s => s.paid) ? (
          <button 
            onClick={() => {
              setGeneratedSplits([]);
              setView('default');
            }}
            className="w-full py-4 bg-corgi text-white rounded-2xl font-black text-lg hover:brightness-110 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <CheckCircle2 size={24} /> Finish Checkout
          </button>
        ) : (
          <button 
            onClick={() => {
              setGeneratedSplits([]);
              setView('default');
            }}
            className="w-full py-4 bg-white border-2 border-gray-200 text-gray-600 rounded-2xl font-black text-lg hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            Cancel Remaining Splits
          </button>
        )}
      </div>
    </motion.div>
  );

  const toggleDish = (idx: number) => {
    if (order.items[idx].paid) return;
    const next = new Set(selectedDishes);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setSelectedDishes(next);
  };

  const selectedTotal = order.items.reduce((sum, item, idx) => sum + (selectedDishes.has(idx) ? item.price * item.quantity : 0), 0);

  const renderSplitDishesView = () => (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col h-full"
    >
      <div className="flex items-center gap-4 p-6 border-b border-gray-100 bg-white">
        <button onClick={() => setView('split_bill')} className="p-2 -ml-2 rounded-full hover:bg-gray-100"><ChevronLeft size={20}/></button>
        <h3 className="text-xl font-black text-gray-900">Select Items to Pay</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 space-y-2">
        {order.items.map((item, idx) => (
          <button 
            key={idx}
            disabled={item.paid}
            onClick={() => toggleDish(idx)}
            className={`w-full flex justify-between items-center p-4 rounded-2xl border-2 transition-all text-left ${item.paid ? 'opacity-50 bg-gray-50 border-transparent cursor-not-allowed grayscale' : selectedDishes.has(idx) ? 'bg-purple-50 border-purple-500' : 'bg-white border-transparent hover:border-gray-200 shadow-sm'}`}
          >
            <div className="flex gap-3 items-center">
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${item.paid ? 'border-gray-300 bg-gray-200 text-gray-400' : selectedDishes.has(idx) ? 'bg-purple-500 border-purple-500 text-white' : 'border-gray-300'}`}>
                {(selectedDishes.has(idx) || item.paid) && <CheckCircle2 size={16} />}
              </div>
              <div>
                <div className="font-bold text-gray-900">{item.name} {item.paid && <span className="text-xs text-green-600 ml-1 px-1.5 py-0.5 bg-green-100 rounded-md">Paid</span>}</div>
                <div className="text-xs font-bold text-gray-400">Qty: {item.quantity}</div>
              </div>
            </div>
            <div className="font-black text-gray-900 text-lg">€{(item.price * item.quantity).toFixed(2)}</div>
          </button>
        ))}
      </div>
      
      <div className="p-6 bg-white border-t border-gray-100 shrink-0">
        <div className="flex justify-between items-center mb-4 px-2">
          <span className="font-medium text-gray-500">Selected Total</span>
          <span className="font-black text-2xl text-purple-600">€{selectedTotal.toFixed(2)}</span>
        </div>
        <button 
          disabled={selectedDishes.size === 0}
          onClick={() => setView('checkout_split_dishes')}
          className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black text-lg hover:bg-purple-700 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
        >
          Next €{selectedTotal.toFixed(2)}
        </button>
      </div>
    </motion.div>
  );

  const renderCheckoutSplitDishesView = () => (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col h-full"
    >
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 flex flex-col items-center justify-center">
        <h3 className="text-xl font-black text-gray-900 mb-2">Split Sub-bill</h3>
        <div className="text-5xl font-black text-corgi mb-8">€{selectedTotal.toFixed(2)}</div>
        
        <div className="w-full max-w-sm mb-8 space-y-2 text-left bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <div className="text-sm font-bold text-gray-500 mb-3 border-b border-gray-100 pb-2">Selected Items</div>
          {order.items.map((item, idx) => selectedDishes.has(idx) && (
            <div key={idx} className="flex justify-between text-sm">
              <span className="font-bold text-gray-700">{item.quantity}x {item.name}</span>
              <span className="font-bold text-gray-900">€{(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="p-6 bg-white border-t border-gray-100 shrink-0 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)]">
        <h3 className="text-[14px] font-bold text-gray-500 mb-3 text-center uppercase tracking-wider">Select Payment Method</h3>
        <div className="grid grid-cols-2 gap-3 w-full mb-3">
          <button 
            onClick={() => {
              handleCompletePayment(
                [{ method: 'card', amount: selectedTotal }],
                {
                  paidItemIndexes: Array.from(selectedDishes),
                  onSuccess: () => {
                    setSelectedDishes(new Set());
                    setView('default');
                  },
                }
              );
            }}
            disabled={paymentProcessing}
            className="flex flex-col items-center justify-center gap-2 py-4 bg-white border-2 border-gray-100 hover:border-blue-500 hover:bg-blue-50 rounded-2xl transition-all active:scale-95 cursor-pointer"
          >
            <CreditCard size={24} className="text-blue-500" />
            <span className="font-bold text-gray-900">Card</span>
          </button>
          <button 
            onClick={() => {
              if (shiftOpen === false) setShiftWarning(true);
              handleCompletePayment(
                [{ method: 'cash', amount: selectedTotal }],
                {
                  paidItemIndexes: Array.from(selectedDishes),
                  onSuccess: () => {
                    setSelectedDishes(new Set());
                    setView('default');
                  },
                }
              );
            }}
            disabled={paymentProcessing}
            className="flex flex-col items-center justify-center gap-2 py-4 bg-white border-2 border-gray-100 hover:border-green-500 hover:bg-green-50 rounded-2xl transition-all active:scale-95 cursor-pointer"
          >
            <Banknote size={24} className="text-green-500" />
            <span className="font-bold text-gray-900">Cash</span>
          </button>
        </div>
        
        <button 
          onClick={() => setView('split_dishes')}
          className="w-full py-4 bg-white border-2 border-gray-200 text-gray-600 rounded-2xl font-black text-lg hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
        >
          Cancel Split
        </button>
      </div>
    </motion.div>
  );

  const applyDiscount = (name: string, value: number) => {
    const newDiscount = { name, value, amountDeducted: 0 };
    const { amountDeducted, finalTotal, amountAdded } = calculateFinalTotal(order.items, newDiscount, order.tip);
    
    onUpdateOrder({
      ...order,
      total: finalTotal,
      discount: { ...newDiscount, amountDeducted },
      tip: order.tip ? { ...order.tip, amountAdded } : undefined
    });
    setView('default');
  };

  const removeDiscount = () => {
    const { finalTotal, amountAdded } = calculateFinalTotal(order.items, undefined, order.tip);
    onUpdateOrder({
      ...order,
      total: finalTotal,
      discount: undefined,
      tip: order.tip ? { ...order.tip, amountAdded } : undefined
    });
    setView('default');
  };

  const renderDiscountView = () => (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col h-full"
    >
      <div className="flex items-center gap-4 p-6 border-b border-gray-100 bg-white">
        <button onClick={() => setView('default')} className="p-2 -ml-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 cursor-pointer transition-colors"><ChevronLeft size={24}/></button>
        <h3 className="text-xl font-black text-gray-900">Apply Discount</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 space-y-6">
        
        {/* Presets */}
        <div>
          <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Presets</h4>
          <div className="grid grid-cols-3 gap-2">
            {discountPresets.map(preset => {
              const isActive = order.discount?.name === preset.name;
              return (
                <button 
                  key={preset.id}
                  onClick={() => applyDiscount(preset.name, preset.value)}
                  className={`p-3 rounded-xl border flex flex-col items-start gap-1 transition-all active:scale-95 cursor-pointer ${
                    isActive 
                      ? 'border-gray-900 bg-gray-900 shadow-sm' 
                      : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className={`text-xs font-bold truncate w-full text-left ${isActive ? 'text-gray-300' : 'text-gray-500'}`}>
                    {preset.name}
                  </div>
                  <div className={`text-lg font-bold ${isActive ? 'text-white' : 'text-gray-900'}`}>
                    -{preset.value}%
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Manual Input */}
        <div>
          <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Custom Percentage</h4>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Percent className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text"
                inputMode="numeric"
                value={manualDiscount}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '');
                  if (val === '' || parseInt(val) <= 100) {
                    setManualDiscount(val);
                  }
                }}
                placeholder="0"
                className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-lg font-bold text-gray-900 outline-none focus:border-gray-900 transition-all"
              />
            </div>
            <button 
              onClick={() => {
                const val = parseInt(manualDiscount);
                if (val > 0 && val <= 100) {
                  applyDiscount('Custom', val);
                }
              }}
              disabled={!manualDiscount || parseInt(manualDiscount) <= 0 || parseInt(manualDiscount) > 100}
              className="px-6 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 disabled:opacity-50 transition-all cursor-pointer"
            >
              Apply
            </button>
          </div>
        </div>

      </div>
      
      {order.discount && (
        <div className="p-6 bg-white border-t border-gray-100 shrink-0">
          <button 
            onClick={removeDiscount}
            className="w-full py-3 bg-white text-red-500 border border-gray-200 rounded-xl font-bold hover:bg-red-50 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Trash2 size={18} /> Remove Current Discount
          </button>
        </div>
      )}
    </motion.div>
  );

  const applyTip = (type: 'percent' | 'fixed', value: number) => {
    const newTip = { type, value, amountAdded: 0 };
    const { amountAdded, finalTotal } = calculateFinalTotal(order.items, order.discount, newTip);
    
    onUpdateOrder({
      ...order,
      total: finalTotal,
      tip: { ...newTip, amountAdded }
    });
    setView('default');
  };

  const removeTip = () => {
    const { finalTotal } = calculateFinalTotal(order.items, order.discount, undefined);
    onUpdateOrder({
      ...order,
      total: finalTotal,
      tip: undefined
    });
    setView('default');
  };

  const TIP_PRESETS = [1, 5, 10, 15, 25];

  const renderTipView = () => (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col h-full"
    >
      <div className="flex items-center gap-4 p-6 border-b border-gray-100 bg-white">
        <button onClick={() => setView('default')} className="p-2 -ml-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 cursor-pointer transition-colors"><ChevronLeft size={24}/></button>
        <h3 className="text-xl font-black text-gray-900">Add Gratuity (Tip)</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 space-y-6">
        
        {/* Presets */}
        <div>
          <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Preset Percentages</h4>
          <div className="grid grid-cols-5 gap-2">
            {TIP_PRESETS.map(preset => (
              <button 
                key={preset}
                onClick={() => applyTip('percent', preset)}
                className={`p-3 rounded-xl border flex items-center justify-center transition-all active:scale-95 font-bold text-base cursor-pointer ${
                  order.tip?.type === 'percent' && order.tip?.value === preset 
                    ? 'border-gray-900 bg-gray-900 text-white shadow-sm' 
                    : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {preset}%
              </button>
            ))}
          </div>
        </div>

        {/* Manual Input */}
        <div>
          <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Custom Tip</h4>
          <div className="flex bg-gray-100 p-1 rounded-xl mb-4 w-full">
            <button 
              onClick={() => { setManualTipType('percent'); setManualTip(''); }}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all cursor-pointer ${manualTipType === 'percent' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Percentage (%)
            </button>
            <button 
              onClick={() => { setManualTipType('fixed'); setManualTip(''); }}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all cursor-pointer ${manualTipType === 'fixed' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Fixed Amount (€)
            </button>
          </div>

          <div className="flex gap-3">
            <div className="relative flex-1">
              {manualTipType === 'percent' ? (
                <Percent className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              ) : (
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">€</span>
              )}
              <input 
                type="text"
                inputMode="numeric"
                value={manualTipType === 'fixed' && manualTip ? manualTip.replace('.', ',') : manualTip}
                onChange={e => {
                  const rawValue = e.target.value.replace(/\D/g, '');
                  if (manualTipType === 'fixed') {
                    if (rawValue === '') {
                      setManualTip('');
                    } else {
                      const floatVal = parseInt(rawValue, 10) / 100;
                      setManualTip(floatVal.toFixed(2));
                    }
                  } else {
                    setManualTip(rawValue);
                  }
                }}
                placeholder={manualTipType === 'percent' ? "0" : "0,00"}
                className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-lg font-bold text-gray-900 outline-none focus:border-gray-900 transition-all"
              />
            </div>
            <button 
              onClick={() => {
                const val = parseFloat(manualTip);
                if (val > 0) {
                  applyTip(manualTipType, val);
                }
              }}
              disabled={!manualTip || parseFloat(manualTip) <= 0}
              className="px-6 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 disabled:opacity-50 transition-all cursor-pointer"
            >
              Apply
            </button>
          </div>
        </div>

      </div>
      
      {order.tip && (
        <div className="p-6 bg-white border-t border-gray-100 shrink-0">
          <button 
            onClick={removeTip}
            className="w-full py-3 bg-white text-red-500 border border-gray-200 rounded-xl font-bold hover:bg-red-50 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Trash2 size={18} /> Remove Tip
          </button>
        </div>
      )}
    </motion.div>
  );

  const handleAddEmail = () => {
    const email = currentEmailInput.trim();
    if (email && email.includes('@') && !receiptEmails.includes(email)) {
      setReceiptEmails([...receiptEmails, email]);
      setCurrentEmailInput('');
    }
  };

  const handleSendReceipt = () => {
    const email = currentEmailInput.trim();
    const finalEmails = [...receiptEmails];
    if (email && email.includes('@') && !finalEmails.includes(email)) {
      finalEmails.push(email);
    }
    
    if (finalEmails.length === 0) return;

    const newSentTo = [...(order.receiptsSentTo || [])];
    finalEmails.forEach(e => {
      if (!newSentTo.includes(e)) {
        newSentTo.push(e);
      }
    });
    
    onUpdateOrder({ ...order, receiptsSentTo: newSentTo });
    setView('default');
  };

  const renderSendReceiptView = () => (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col h-full"
    >
      <div className="flex items-center gap-4 p-6 border-b border-gray-100 bg-white">
        <button onClick={() => setView('default')} className="p-2 -ml-2 rounded-full hover:bg-gray-100"><ChevronLeft size={20}/></button>
        <h3 className="text-xl font-black text-gray-900">Send Receipt</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 flex flex-col">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm w-full">
          <div className="text-gray-500 font-medium mb-3">Send to Email Addresses</div>
          
          {receiptEmails.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {receiptEmails.map((email, i) => (
                <div key={i} className="px-3 py-1.5 bg-corgi/10 text-corgi border border-corgi/20 rounded-lg text-sm font-bold flex items-center gap-1.5">
                  <Mail size={14} />
                  {email}
                  <button 
                    onClick={() => setReceiptEmails(receiptEmails.filter(e => e !== email))}
                    className="p-1 hover:bg-corgi/20 rounded-full transition-colors ml-1"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="relative mb-6 flex gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="text-gray-400" size={20} />
              </div>
              <input
                type="email"
                value={currentEmailInput}
                onChange={(e) => setCurrentEmailInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddEmail()}
                placeholder="customer@example.com"
                className="block w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-md font-bold text-gray-900 focus:border-corgi focus:ring-0 transition-all outline-none"
              />
            </div>
            <button 
              disabled={!currentEmailInput || !currentEmailInput.includes('@')}
              onClick={handleAddEmail}
              className="px-6 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 disabled:opacity-50 disabled:pointer-events-none transition-all"
            >
              Add
            </button>
          </div>
          
          {order.receiptsSentTo && order.receiptsSentTo.length > 0 && (
            <div className="mb-4 pt-4 border-t border-gray-100">
              <div className="text-sm font-bold text-gray-500 mb-2">Previously sent to:</div>
              <div className="flex flex-wrap gap-2">
                {order.receiptsSentTo.map((email, i) => (
                  <div key={i} className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-semibold flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-green-500" />
                    {email}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="p-6 bg-white border-t border-gray-100 shrink-0">
        <button 
          disabled={receiptEmails.length === 0 && (!currentEmailInput || !currentEmailInput.includes('@'))}
          onClick={handleSendReceipt}
          className="w-full py-4 bg-corgi text-white rounded-2xl font-black text-lg hover:brightness-110 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
        >
          <Send size={20} /> Send Receipt
        </button>
      </div>
    </motion.div>
  );

  const renderRefundSelectView = () => (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col h-full">
      <div className="flex items-center gap-4 p-6 border-b border-gray-100 bg-white">
        <button onClick={() => setView('default')} className="p-2 -ml-2 rounded-full hover:bg-gray-100"><ChevronLeft size={20}/></button>
        <h3 className="text-xl font-black text-gray-900">Refund Items</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-gray-50/50">
        {order.items.map((item, idx) => {
          const maxQty = item.quantity - ((item as OrderItem & { refundedQuantity?: number }).refundedQuantity || 0);
          if (maxQty <= 0) return null;
          const sel = refundSelections[idx] || 0;
          return (
            <div key={idx} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100">
              <div>
                <span className="font-bold text-gray-900">{item.name}</span>
                <span className="text-xs text-gray-400 block">€{item.price.toFixed(2)} · max {maxQty}</span>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setRefundSelections(s => ({ ...s, [idx]: Math.max(0, sel - 1) }))} className="w-8 h-8 rounded-lg bg-gray-100 font-bold">-</button>
                <span className="w-6 text-center font-black">{sel}</span>
                <button type="button" onClick={() => setRefundSelections(s => ({ ...s, [idx]: Math.min(maxQty, sel + 1) }))} className="w-8 h-8 rounded-lg bg-gray-100 font-bold">+</button>
              </div>
            </div>
          );
        })}
        <div className="text-right font-black text-lg text-gray-900 pt-2">Refund total: €{refundTotalSelected.toFixed(2)}</div>
      </div>
      <div className="p-6 border-t border-gray-100 bg-white">
        <button type="button" disabled={refundTotalSelected <= 0} onClick={() => setView('refund_confirm')} className="w-full py-4 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-xl font-bold">
          Continue — €{refundTotalSelected.toFixed(2)}
        </button>
      </div>
    </motion.div>
  );

  const renderRefundConfirmView = () => (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col h-full">
      <div className="flex items-center gap-4 p-6 border-b border-gray-100 bg-white">
        <button onClick={() => setView('refund_select')} className="p-2 -ml-2 rounded-full hover:bg-gray-100"><ChevronLeft size={20}/></button>
        <h3 className="text-xl font-black text-gray-900">Confirm Refund</h3>
      </div>
      <div className="flex-1 p-6 space-y-4 bg-gray-50/50">
        <div className="text-3xl font-black text-red-600 text-center">€{refundTotalSelected.toFixed(2)}</div>
        <div>
          <label className="label-corgi">Reason (required)</label>
          <textarea value={refundReason} onChange={e => setRefundReason(e.target.value)} rows={3} className="input-corgi resize-none" placeholder="Wrong item, customer complaint..." />
        </div>
        <div>
          <label className="label-corgi">Refund method</label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setRefundMethod('card')} className={`py-3 rounded-xl font-bold border-2 ${refundMethod === 'card' ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200'}`}>Card</button>
            <button type="button" onClick={() => setRefundMethod('cash')} className={`py-3 rounded-xl font-bold border-2 ${refundMethod === 'cash' ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200'}`}>Cash</button>
          </div>
        </div>
        {refundError && <div className="text-red-600 text-sm font-bold flex items-center gap-2"><AlertCircle size={16}/>{refundError}</div>}
      </div>
      <div className="p-6 border-t border-gray-100 bg-white grid grid-cols-2 gap-3">
        <button type="button" onClick={() => setView('refund_select')} className="py-4 bg-gray-100 rounded-xl font-bold">Back</button>
        <button type="button" disabled={refundProcessing || !refundReason.trim()} onClick={handleProcessRefund} className="py-4 bg-red-500 text-white rounded-xl font-bold disabled:opacity-50">
          {refundProcessing ? 'Processing...' : 'Confirm Refund'}
        </button>
      </div>
    </motion.div>
  );

  const renderCancelOrderConfirmView = () => (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col h-full bg-white p-6"
    >
      <div className="flex items-center gap-3 text-red-500 mb-6">
        <AlertCircle size={32} />
        <h3 className="text-2xl font-black text-gray-900">Cancel Order?</h3>
      </div>
      <p className="text-gray-500 font-medium mb-6 text-[15px] leading-relaxed">
        Are you sure you want to cancel order <span className="font-bold text-gray-900">{order.id}</span>? 
        This action cannot be undone and will stop any active preparation in the kitchen.
      </p>
      
      <div className="mt-auto pt-4 flex gap-3">
        <button 
          onClick={() => setView('default')}
          className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl transition-colors cursor-pointer active:scale-95 text-[15px]"
        >
          No, Keep It
        </button>
        <button 
          onClick={() => {
            onUpdateStatus(order.id, 'cancelled');
            logAuditEvent('order_cancelled', { orderId: order.id });
            onClose();
          }}
          className="flex-1 py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-2xl transition-colors cursor-pointer active:scale-95 text-[15px]"
        >
          Yes, Cancel Order
        </button>
      </div>
    </motion.div>
  );

  const renderFacturaFormView = () => (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col h-full bg-white p-6"
    >
      <div className="flex items-center gap-4 border-b border-gray-100 pb-4 mb-6">
        <button onClick={() => setView('default')} className="p-2 -ml-2 rounded-full hover:bg-gray-100 cursor-pointer text-gray-700"><ChevronLeft size={20}/></button>
        <h3 className="text-xl font-bold text-gray-900">Corporate Invoice Details</h3>
      </div>

      <div className="flex-1 space-y-4">
        <div>
          <label className="label-corgi">Company / Client Name</label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="e.g. Acme Corporation S.L."
            className="input-corgi"
          />
        </div>

        <div>
          <label className="label-corgi">Tax ID (NIF / CIF)</label>
          <input
            type="text"
            value={taxId}
            onChange={(e) => setTaxId(e.target.value)}
            placeholder="e.g. B-12345678"
            className="input-corgi"
          />
        </div>

        <div>
          <label className="label-corgi">Billing Address</label>
          <textarea
            value={companyAddress}
            onChange={(e) => setCompanyAddress(e.target.value)}
            placeholder="e.g. Gran Via de les Corts Catalanes 585, Barcelona"
            rows={3}
            className="input-corgi resize-none"
          />
        </div>
      </div>

      <button
        onClick={async () => {
          if (!companyName.trim() || !taxId.trim()) return;
          try {
            const result = await generateFiscalAsync(order.id, {
              clientName: companyName.trim(),
              clientNif: taxId.trim(),
              clientAddress: companyAddress.trim(),
            });
            setFiscalInvoiceNumber(result.record.invoiceNumber);
            setActiveInvoiceNumber(result.record.invoiceNumber);
            logAuditEventAsync('invoice_generated', {
              orderId: order.id,
              invoiceNumber: result.record.invoiceNumber,
              taxId,
            }).catch(console.error);
            setView('factura_a4');
          } catch (e) {
            console.error('Fiscal generation failed:', e);
          }
        }}
        disabled={!companyName.trim() || !taxId.trim()}
        className="w-full py-3.5 bg-brown hover:bg-brown/90 disabled:opacity-55 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-2 mt-auto active:scale-95"
      >
        Generate A4 Invoice
      </button>
    </motion.div>
  );

  const renderFacturaA4View = () => {
    const receiptConfig = {
      header: posSettings.receiptHeader,
      footer: posSettings.receiptFooter,
      veriFactuActive: true,
      invoicePrefix: 'FAC-2026-',
    };

    const breakdown = calculateReceiptTaxes(
      order!.items.map((item) => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
      taxRates
    );

    const { foodNet: foodNetBase, foodTax: foodVatAmount, alcoholNet: alcoholNetBase, alcoholTax: alcoholVatAmount } = breakdown;
    const totalNetBase = breakdown.totalNet;
    const formattedInvoiceNumber = activeInvoiceNumber || receiptConfig.invoicePrefix;

    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="flex flex-col h-full bg-gray-50"
      >
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .factura-print-only, .factura-print-only * {
              visibility: visible;
            }
            .factura-print-only {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              background: white !important;
              color: black !important;
              padding: 0px !important;
            }
            .no-print {
              display: none !important;
            }
          }
        `}</style>

        {/* Action Header (hidden when printing) */}
        <div className="no-print p-4 bg-white border-b border-gray-250 flex justify-between items-center shadow-sm z-10">
          <button onClick={() => setView('factura_form')} className="p-2 rounded-full hover:bg-gray-100 cursor-pointer flex items-center gap-1.5 text-xs font-bold text-gray-600"><ChevronLeft size={16} /> Back</button>
          <button 
            onClick={() => window.print()}
            className="px-4 py-2 bg-corgi hover:bg-corgi-hover text-black rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-sm"
          >
            <Printer size={16} /> Print A4 Invoice
          </button>
        </div>

        {/* Printable Invoice Container */}
        <div className="flex-1 overflow-y-auto p-8 flex justify-center">
          <div className="factura-print-only bg-white w-[595px] h-fit min-h-[842px] shadow-lg rounded-3xl p-8 border border-gray-200 flex flex-col justify-between text-gray-800 font-sans text-xs">
            
            {/* Upper Section */}
            <div>
              {/* Header block */}
              <div className="flex justify-between items-start pb-6 border-b border-gray-100">
                <div>
                  <h1 className="text-2xl font-black text-gray-950 uppercase tracking-tight">Corgi Cafe S.L.</h1>
                  <p className="text-[10px] text-corgi font-black mt-0.5">{receiptConfig.header}</p>
                  <p className="text-[10px] text-gray-500 font-semibold mt-1">NIF: B-99214951</p>
                  <p className="text-[10px] text-gray-500 font-semibold">Carrer del Corgi 24, Barcelona</p>
                </div>
                <div className="text-right">
                  <span className="px-3 py-1.5 bg-gray-100 text-gray-800 rounded-lg text-[10px] font-black uppercase tracking-wider block mb-2">Factura simplificada</span>
                  <div className="text-[10px] font-bold text-gray-500">Invoice: <span className="text-gray-950 font-black">{formattedInvoiceNumber}</span></div>
                  <div className="text-[10px] font-bold text-gray-500 mt-0.5">Date: <span className="text-gray-950 font-black">{new Date().toLocaleDateString()}</span></div>
                </div>
              </div>

              {/* Corporate Customer details block */}
              <div className="grid grid-cols-2 gap-4 py-6 border-b border-gray-100">
                <div>
                  <div className="font-extrabold text-[10px] text-gray-400 uppercase tracking-wider mb-2">Emisor (Sender)</div>
                  <div className="font-bold text-gray-950">Corgi Cafe S.L.</div>
                  <div className="text-gray-500 font-medium mt-0.5">Carrer del Corgi 24, Barcelona</div>
                  <div className="text-gray-500 font-medium">Spain</div>
                </div>
                <div>
                  <div className="font-extrabold text-[10px] text-gray-400 uppercase tracking-wider mb-2">Receptor (Client)</div>
                  <div className="font-black text-gray-950">{companyName}</div>
                  <div className="text-gray-500 font-bold mt-0.5">NIF: {taxId}</div>
                  <div className="text-gray-500 font-medium mt-0.5 whitespace-pre-wrap">{companyAddress}</div>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-left mt-6 border-collapse">
                <thead>
                  <tr className="border-b border-gray-250 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                    <th className="py-2.5">Description</th>
                    <th className="py-2.5 text-center w-12">Qty</th>
                    <th className="py-2.5 text-right w-24">Price</th>
                    <th className="py-2.5 text-right w-24">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                  {order.items.map((item, i) => (
                    <tr key={i} className="py-2">
                      <td className="py-3 font-bold text-gray-950">
                        {item.name}
                        {item.comments && <p className="text-[10px] text-amber-800 italic font-semibold">"{item.comments}"</p>}
                      </td>
                      <td className="py-3 text-center">{item.quantity}</td>
                      <td className="py-3 text-right">€{item.price.toFixed(2)}</td>
                      <td className="py-3 text-right font-bold text-gray-950">€{(item.price * item.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Calculations, QR and signature */}
            <div className="mt-8 pt-6 border-t border-gray-100 space-y-6">
              
              {/* Financial Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-2 text-xs">
                  <div className="flex justify-between text-gray-500 font-medium">
                    <span>Base Imponible (Net):</span>
                    <span>€{totalNetBase.toFixed(2)}</span>
                  </div>
                  {foodVatAmount > 0 && (
                    <div className="flex justify-between text-gray-500 font-medium">
                      <span data-testid="receipt-food-vat-rate">I.V.A. Alimentos ({taxRates.food}%):</span>
                      <span>€{foodVatAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {alcoholVatAmount > 0 && (
                    <div className="flex justify-between text-gray-500 font-medium">
                      <span data-testid="receipt-alcohol-vat-rate">I.V.A. Bebidas ({taxRates.alcohol}%):</span>
                      <span>€{alcoholVatAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-gray-150 font-black text-gray-950 text-lg">
                    <span>Total Factura:</span>
                    <span>€{order.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* AEAT System VERI*FACTU Compliance Footer */}
              {receiptConfig.veriFactuActive && (
                <div className="flex justify-between items-end bg-[#FAF7F3] p-4 rounded-2xl border border-gray-100">
                  <div className="max-w-[320px] space-y-1 text-left">
                    <span className="text-[10px] font-black uppercase text-amber-800 tracking-wider flex items-center gap-1">
                      <CheckCircle2 size={12} /> Factura verificable en la sede de la AEAT
                    </span>
                    <p className="text-[10px] text-gray-400 font-bold">VERI*FACTU Compliance system</p>
                    <p className="text-[9px] text-gray-550 font-medium leading-relaxed">
                      Esta factura simplificada ha sido generada bajo la normativa reguladora de los sistemas de facturación verificables (VERI*FACTU) de la Agencia Tributaria Española.
                    </p>
                  </div>
                  
                  {/* Simulated AEAT Verification QR code */}
                  <div className="flex flex-col items-center gap-1 shrink-0 bg-white p-2 rounded-xl border border-gray-200">
                    <div className="w-16 h-16 bg-gray-100 flex items-center justify-center font-bold text-gray-300 text-[8px] uppercase select-none pointer-events-none relative border border-dashed border-gray-300">
                      <div className="absolute inset-1.5 flex flex-wrap justify-between gap-1 opacity-70">
                        <div className="w-4 h-4 bg-gray-900 rounded-sm"></div>
                        <div className="w-4 h-4 bg-gray-900 rounded-sm"></div>
                        <div className="w-4 h-4 bg-gray-900 rounded-sm"></div>
                        <div className="w-4 h-4 bg-gray-900 rounded-sm"></div>
                      </div>
                      <span className="z-10 text-[8px] font-black text-gray-900 tracking-tight bg-white px-1 shadow-sm rounded-sm">AEAT</span>
                    </div>
                    <span className="text-[8px] font-extrabold text-gray-450 uppercase tracking-widest">Verify QR</span>
                  </div>
                </div>
              )}

              <div className="text-center text-[9px] text-gray-400 font-medium">
                {receiptConfig.footer}
              </div>

            </div>

          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
            className="fixed right-0 top-0 bottom-0 w-full md:w-[500px] bg-white shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-white z-10">
              <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">{order.id}</h2>
                <div className="flex items-center gap-3 mt-2">
                  <SourceBadge source={order.source} />
                  <span className={`px-2 py-1 rounded-lg text-xs font-bold ${order.paid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {order.paid ? 'Paid' : 'Not Paid'}
                  </span>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
              >
                <X size={20} />
              </button>
            </div>

            {/* Dynamic Views */}
            <div className="flex-1 overflow-hidden relative">
              <AnimatePresence mode="wait">
                {view === 'default' && <div key="default" className="h-full absolute inset-0">{renderDefaultView()}</div>}
                {view === 'checkout' && <div key="checkout" className="h-full absolute inset-0">{renderCheckoutView()}</div>}
                {view === 'split_bill' && <div key="split_bill" className="h-full absolute inset-0">{renderSplitBillOptions()}</div>}
                {view === 'split_amount' && <div key="split_amount" className="h-full absolute inset-0">{renderSplitAmountView()}</div>}
                {view === 'split_ways_list' && <div key="split_ways_list" className="h-full absolute inset-0">{renderSplitWaysListView()}</div>}
                {view === 'split_dishes' && <div key="split_dishes" className="h-full absolute inset-0">{renderSplitDishesView()}</div>}
                {view === 'checkout_split_dishes' && <div key="checkout_split_dishes" className="h-full absolute inset-0">{renderCheckoutSplitDishesView()}</div>}
                {view === 'discount' && <div key="discount" className="h-full absolute inset-0">{renderDiscountView()}</div>}
                {view === 'tip' && <div key="tip" className="h-full absolute inset-0">{renderTipView()}</div>}
                {view === 'send_receipt' && <div key="send_receipt" className="h-full absolute inset-0">{renderSendReceiptView()}</div>}
                {view === 'cancel_order_confirm' && <div key="cancel_order_confirm" className="h-full absolute inset-0">{renderCancelOrderConfirmView()}</div>}
                {view === 'refund_select' && <div key="refund_select" className="h-full absolute inset-0">{renderRefundSelectView()}</div>}
                {view === 'refund_confirm' && <div key="refund_confirm" className="h-full absolute inset-0">{renderRefundConfirmView()}</div>}
                {view === 'factura_form' && <div key="factura_form" className="h-full absolute inset-0">{renderFacturaFormView()}</div>}
                {view === 'factura_a4' && <div key="factura_a4" className="h-full absolute inset-0">{renderFacturaA4View()}</div>}
              </AnimatePresence>
            </div>
          </motion.div>
          
          {/* Assign Guest Modal Overlay */}
          {/* Assign Guest Modal Overlay */}
          <AnimatePresence>
            {showAssignGuest && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-gray-900/40 backdrop-blur-sm">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-4xl flex flex-col h-[75vh] z-[70] border border-gray-100"
                >
                  <div className="flex justify-between items-center mb-4 shrink-0">
                    <div>
                      <h3 className="text-lg font-black text-gray-900">Assign Guest</h3>
                      <p className="text-xs font-semibold text-gray-500">Link a guest profile to apply loyalty rewards and track LTV</p>
                    </div>
                    <button 
                      onClick={() => setShowAssignGuest(false)} 
                      className="w-9 h-9 rounded-full bg-gray-50 text-gray-500 flex items-center justify-center hover:bg-gray-100 hover:text-gray-800 transition-all cursor-pointer border border-transparent hover:border-gray-200"
                      title="Close modal"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Filter & Search Header */}
                  <div className="flex flex-col gap-3 mb-4 shrink-0">
                    <div className="relative">
                      <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={crmSearchQuery}
                        onChange={e => setCrmSearchQuery(e.target.value)}
                        placeholder="Search guests by name or phone number..."
                        className="w-full bg-gray-50/60 border border-gray-200 focus:border-corgi focus:bg-white focus:ring-2 focus:ring-corgi/20 rounded-xl pl-10 pr-4 py-2.5 text-xs font-extrabold text-gray-950 outline-none transition-all"
                      />
                    </div>

                    {/* Tier Filters */}
                    <div className="flex gap-1.5 flex-wrap">
                      {(['all', 'VIP', 'Gold', 'Silver', 'Bronze'] as const).map(tier => (
                        <button
                          key={tier}
                          onClick={() => setSelectedTierFilter(tier)}
                          className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
                            selectedTierFilter === tier
                              ? 'bg-corgi text-white'
                              : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200/60'
                          }`}
                        >
                          {tier === 'all' ? 'All Tiers' : tier}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3-Column Scrollable Grid */}
                  <div className="flex-1 overflow-y-auto pr-1">
                    {(() => {
                      const filteredGuests = allGuests.filter(g => {
                        const matchesSearch = g.name.toLowerCase().includes(crmSearchQuery.toLowerCase()) || g.phone.includes(crmSearchQuery);
                        const matchesTier = selectedTierFilter === 'all' || g.tier === selectedTierFilter;
                        return matchesSearch && matchesTier;
                      });

                      if (filteredGuests.length === 0) {
                        return (
                          <div className="py-12 text-center text-gray-400 font-semibold text-xs">
                            No guests found matching your criteria.
                          </div>
                        );
                      }

                      return (
                        <div className="grid grid-cols-3 gap-3">
                          {filteredGuests.map(guest => (
                            <div
                              key={guest.id}
                              onClick={() => {
                                onUpdateOrder({
                                  ...order,
                                  customerId: guest.id
                                });
                                setShowAssignGuest(false);
                              }}
                              className="p-3.5 bg-white border border-gray-200/80 hover:border-corgi hover:shadow-md rounded-2xl flex flex-col justify-between cursor-pointer transition-all hover:-translate-y-0.5"
                            >
                              <div className="flex items-start gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-orange-50 text-corgi flex items-center justify-center font-black text-xs shrink-0 border border-orange-100/50">
                                  {guest.name.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div className="min-w-0">
                                  <span className="font-extrabold text-sm text-gray-950 block truncate" title={guest.name}>
                                    {guest.name}
                                  </span>
                                  <span className="text-[10px] text-gray-400 font-bold block">
                                    {guest.phone}
                                  </span>
                                </div>
                              </div>

                              <div className="mt-3.5 pt-2.5 border-t border-gray-100 flex justify-between items-center">
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                                  guest.tier === 'VIP' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                                  guest.tier === 'Gold' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                  guest.tier === 'Silver' ? 'bg-gray-100 text-gray-700 border border-gray-200' :
                                  'bg-orange-50 text-orange-700 border border-orange-200'
                                }`}>
                                  {guest.tier}
                                </span>
                                <span className="text-[10px] text-gray-400 font-bold">
                                  LTV: €{guest.ltv?.toFixed(2) || '0.00'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
}
