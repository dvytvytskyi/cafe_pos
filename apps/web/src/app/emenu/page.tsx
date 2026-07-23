'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Coffee, Croissant, Sandwich, CupSoda, Plus, Minus, ShoppingBag, Check, X, ArrowRight, Search, Award, Sparkles, AlertCircle, ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getGuests, saveGuests, getTierCashbackRate, updateTier } from '@/lib/crm';
import { getOrders, saveOrders, Order, OrderItem } from '@/lib/orders';

// Fallback image url
const imgUrl = 'https://images.pexels.com/photos/37417630/pexels-photo-37417630.jpeg';

// Default static dishes data matching MenusView
const defaultDishes = [
  { id: 'd1', categoryId: '1', name: 'Espresso', description: 'Single shot of rich espresso', image: imgUrl, basePrice: 2.50, allergens: [] },
  { id: 'd2', categoryId: '1', name: 'Macchiato', description: 'Espresso with a dash of frothy milk', image: imgUrl, basePrice: 2.80, allergens: ['Dairy'] },
  { id: 'd3', categoryId: '1', name: 'Cortado', description: 'Equal parts espresso and steamed milk', image: imgUrl, basePrice: 3.00, allergens: ['Dairy'] },
  { id: 'd4', categoryId: '1', name: 'Americano', description: 'Espresso with hot water', image: imgUrl, basePrice: 2.50, allergens: [] },
  { id: 'd5', categoryId: '1', name: 'Flat White', description: 'Espresso with microfoam', image: imgUrl, basePrice: 3.50, allergens: ['Dairy'] },
  { id: 'd6', categoryId: '1', name: 'Cappuccino', description: 'Espresso with steamed milk and thick foam', image: imgUrl, basePrice: 3.50, allergens: ['Dairy'] },
  { id: 'd7', categoryId: '1', name: 'Latte', description: 'Espresso with steamed milk and foam', image: imgUrl, basePrice: 4.00, allergens: ['Dairy'] },
  { id: 'd8', categoryId: '1', name: 'Mocha', description: 'Espresso with chocolate and steamed milk', image: imgUrl, basePrice: 4.50, allergens: ['Dairy'] },
  { id: 'd9', categoryId: '2', name: 'Croissant', description: 'Buttery, flaky, pastry', image: imgUrl, basePrice: 3.00, allergens: ['Gluten', 'Dairy'] },
  { id: 'd10', categoryId: '2', name: 'Pain au Chocolat', description: 'Croissant dough with dark chocolate', image: imgUrl, basePrice: 3.50, allergens: ['Gluten', 'Dairy'] },
  { id: 'd11', categoryId: '2', name: 'Almond Croissant', description: 'Croissant filled with almond paste', image: imgUrl, basePrice: 4.00, allergens: ['Gluten', 'Dairy', 'Nuts'] },
  { id: 'd12', categoryId: '2', name: 'Cinnamon Roll', description: 'Sweet roll with cinnamon and glaze', image: imgUrl, basePrice: 3.50, allergens: ['Gluten', 'Dairy'] },
  { id: 'd15', categoryId: '3', name: 'Ham & Cheese Sandwich', description: 'Classic ham and gruyere on baguette', image: imgUrl, basePrice: 5.50, allergens: ['Gluten', 'Dairy'] },
  { id: 'd17', categoryId: '3', name: 'Caprese Sandwich', description: 'Mozzarella, tomato, basil, balsamic', image: imgUrl, basePrice: 6.00, allergens: ['Gluten', 'Dairy'] },
  { id: 'd21', categoryId: '4', name: 'Berry Blast Smoothie', description: 'Strawberry, blueberry, raspberry blend', image: imgUrl, basePrice: 5.00, allergens: [] },
  { id: 'd22', categoryId: '4', name: 'Tropical Mango Smoothie', description: 'Mango, pineapple, coconut water', image: imgUrl, basePrice: 5.50, allergens: [] },
];

const categories = [
  { id: '1', name: 'Coffee', icon: Coffee },
  { id: '2', name: 'Pastries', icon: Croissant },
  { id: '3', name: 'Sandwiches', icon: Sandwich },
  { id: '4', name: 'Smoothies', icon: CupSoda },
];

function EMenuContent() {
  const searchParams = useSearchParams();
  const rawTable = searchParams.get('table') || '4';
  const tableId = `T${rawTable.replace('T', '')}`;

  const [activeCategoryId, setActiveCategoryId] = useState('1');
  const [cart, setCart] = useState<any[]>([]);
  const [selectedDish, setSelectedDish] = useState<any>(null);
  
  // Modifiers config inside detail modal
  const [selectedMilk, setSelectedMilk] = useState('none');
  const [extraShot, setExtraShot] = useState(false);
  const [comment, setComment] = useState('');
  
  // Checkout Drawer
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [tipPercent, setTipPercent] = useState<number | null>(10);
  const [customTip, setCustomTip] = useState('');
  const [guestSearch, setGuestSearch] = useState('');
  const [linkedGuest, setLinkedGuest] = useState<any>(null);
  
  // Success Flow
  const [successOrder, setSuccessOrder] = useState<any>(null);

  const activeCategoryDishes = defaultDishes.filter(d => d.categoryId === activeCategoryId);

  // Cart helper functions
  const handleOpenDish = (dish: any) => {
    setSelectedDish(dish);
    setSelectedMilk('none');
    setExtraShot(false);
    setComment('');
  };

  const handleAddToCart = () => {
    if (!selectedDish) return;
    
    let priceMultiplier = selectedDish.basePrice;
    const notes: string[] = [];
    
    if (selectedMilk === 'oat' || selectedMilk === 'almond') {
      priceMultiplier += 0.80;
      notes.push(`${selectedMilk === 'oat' ? 'Oat' : 'Almond'} Milk`);
    } else if (selectedMilk === 'cow') {
      notes.push('Cow Milk');
    }
    
    if (extraShot) {
      priceMultiplier += 1.50;
      notes.push('Extra Shot');
    }
    
    if (comment.trim()) {
      notes.push(comment.trim());
    }

    const itemNotesString = notes.join(', ');

    // Check if duplicate item exists
    const existingIndex = cart.findIndex(c => c.dish.id === selectedDish.id && c.notes === itemNotesString);
    if (existingIndex > -1) {
      const newCart = [...cart];
      newCart[existingIndex].quantity += 1;
      setCart(newCart);
    } else {
      setCart([...cart, {
        dish: selectedDish,
        quantity: 1,
        unitPrice: priceMultiplier,
        notes: itemNotesString
      }]);
    }
    
    setSelectedDish(null);
  };

  const updateCartQty = (index: number, change: number) => {
    const newCart = [...cart];
    newCart[index].quantity += change;
    if (newCart[index].quantity <= 0) {
      newCart.splice(index, 1);
    }
    setCart(newCart);
  };

  const getSubtotal = () => cart.reduce((acc, c) => acc + (c.unitPrice * c.quantity), 0);
  
  const getTipAmount = () => {
    const subtotal = getSubtotal();
    if (tipPercent !== null) return subtotal * (tipPercent / 100);
    return parseFloat(customTip) || 0;
  };

  const getTotal = () => getSubtotal() + getTipAmount();

  // Search & Link guest for loyalty cashback
  const handleLinkGuest = () => {
    if (!guestSearch.trim()) return;
    const guests = getGuests();
    const found = guests.find(g => 
      g.name.toLowerCase().includes(guestSearch.toLowerCase()) ||
      g.phone.includes(guestSearch) ||
      g.email.toLowerCase().includes(guestSearch.toLowerCase())
    );
    if (found) {
      setLinkedGuest(found);
      setGuestSearch('');
    } else {
      alert('Guest not found. Register a guest profile at the counter to link!');
    }
  };

  // Submit Simulating payment & ordering
  const handlePlaceOrder = () => {
    if (cart.length === 0) return;
    
    const subtotal = getSubtotal();
    const tipVal = getTipAmount();
    const orderTotal = getTotal();

    const orderItems: OrderItem[] = cart.map(c => ({
      name: c.dish.name + (c.notes ? ` (${c.notes})` : ''),
      price: c.unitPrice,
      quantity: c.quantity,
      comments: c.notes
    }));

    // Calculate Points Earned
    let pointsEarned = 0;
    if (linkedGuest) {
      const rate = getTierCashbackRate(linkedGuest.tier);
      pointsEarned = parseFloat((orderTotal * rate).toFixed(2));
      
      // Update LTV and Tier inside database
      const guests = getGuests();
      const updated = guests.map(g => {
        if (g.id === linkedGuest.id) {
          const newLtv = g.ltv + orderTotal;
          const newPoints = g.points + pointsEarned;
          const newTier = updateTier(newLtv);
          const updatedGuest = { ...g, ltv: newLtv, points: newPoints, tier: newTier };
          return updatedGuest;
        }
        return g;
      });
      saveGuests(updated);
    }

    // Save POS Order
    const newOrder: Order = {
      id: 'ORD-' + Date.now(),
      source: 'dine_in',
      customerName: linkedGuest ? linkedGuest.name : `Table ${rawTable} Guest`,
      items: orderItems,
      total: orderTotal,
      tip: tipVal > 0 ? { type: tipPercent !== null ? 'percent' : 'fixed', value: tipPercent || parseFloat(customTip), amountAdded: tipVal } : undefined,
      status: 'incoming',
      time: new Date(),
      paid: true,
      amountPaid: orderTotal,
      payments: [{ method: 'card', amount: orderTotal }],
      orderedBy: 'app',
      tableId,
      customerId: linkedGuest?.id,
      customerPointsEarned: pointsEarned > 0 ? pointsEarned : undefined
    };

    const currentOrders = getOrders();
    saveOrders([newOrder, ...currentOrders]);

    // Set table state in localStorage to occupied/billed
    localStorage.setItem(`corgi_table_status_${tableId}`, 'occupied');
    // Save active order mapping for POS TablesView layout state
    localStorage.setItem(`corgi_table_order_${tableId}`, newOrder.id);

    setSuccessOrder({
      ...newOrder,
      pointsEarned
    });
    
    // Clear state
    setCart([]);
    setIsCartOpen(false);
    setLinkedGuest(null);
  };

  return (
    <div className="min-h-screen bg-[#FAF7F3] font-sans pb-24 text-gray-900 select-none">
      
      {/* Confetti / Success Modal */}
      <AnimatePresence>
        {successOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[32px] p-6 max-w-sm w-full text-center shadow-xl space-y-6"
            >
              <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto text-3xl font-black">
                ✓
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-gray-900">Order Placed!</h2>
                <p className="text-xs text-gray-400 font-semibold">Your payment was simulated successfully. The kitchen has received your order for {tableId}.</p>
              </div>

              {successOrder.pointsEarned > 0 && (
                <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 flex items-center gap-3 text-left">
                  <div className="w-10 h-10 rounded-xl bg-corgi/10 text-corgi flex items-center justify-center shrink-0">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">Loyalty Cashback</span>
                    <span className="text-sm font-bold text-amber-900">Earned +{successOrder.pointsEarned} points!</span>
                  </div>
                </div>
              )}

              <button 
                onClick={() => setSuccessOrder(null)}
                className="w-full py-3 bg-black hover:bg-gray-800 text-white rounded-2xl font-bold text-sm transition-colors cursor-pointer active:scale-95"
              >
                Close Menu
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Header */}
      <header className="p-4 bg-white border-b border-gray-100 sticky top-0 z-20 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xl font-black tracking-tight text-gray-950 uppercase">🐾 Corgi Cafe</span>
        </div>
        <span className="bg-corgi text-black font-black text-xs px-3 py-1.5 rounded-full shadow-sm">
          {tableId}
        </span>
      </header>

      {/* Hero Header */}
      <div className="px-4 py-6 bg-white border-b border-gray-150 flex flex-col gap-1.5">
        <h1 className="text-2xl font-extrabold text-gray-950">Self-Order & Pay</h1>
        <p className="text-xs text-gray-500 font-medium">Scan QR codes on table base, order your favorites, and pay without waiting for the waiter!</p>
      </div>

      {/* Horizontal scrolling Categories */}
      <div className="sticky top-[61px] bg-[#FAF7F3] py-3.5 z-10 border-b border-gray-200/50 overflow-x-auto whitespace-nowrap flex gap-2.5 px-4 scrollbar-none">
        {categories.map(cat => {
          const Icon = cat.icon;
          const isActive = cat.id === activeCategoryId;
          return (
            <button 
              key={cat.id}
              onClick={() => setActiveCategoryId(cat.id)}
              className={`flex items-center gap-1.5 px-4.5 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95 ${
                isActive ? 'bg-black text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon size={14} /> {cat.name}
            </button>
          );
        })}
      </div>

      {/* Active Category Dish list */}
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {activeCategoryDishes.map(dish => (
          <div 
            key={dish.id}
            onClick={() => handleOpenDish(dish)}
            className="bg-white border border-gray-100/70 rounded-3xl p-4 flex gap-4 hover:border-gray-200 hover:shadow-md transition-all cursor-pointer"
          >
            <div className="w-20 h-20 bg-gray-50 rounded-2xl overflow-hidden shrink-0 relative">
              <img src={dish.image} alt={dish.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-0.5">
                  <h3 className="font-extrabold text-sm text-gray-900 leading-tight">{dish.name}</h3>
                  <span className="font-extrabold text-xs text-gray-950 shrink-0 ml-2">€{dish.basePrice.toFixed(2)}</span>
                </div>
                <p className="text-[11px] text-gray-400 font-semibold line-clamp-2 leading-relaxed">{dish.description}</p>
              </div>

              {dish.allergens.length > 0 && (
                <div className="flex gap-1 mt-2.5">
                  {dish.allergens.map((alg, i) => (
                    <span key={i} className="text-[8px] font-black uppercase bg-red-50 text-red-700 px-1.5 py-0.5 rounded-md">{alg}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Dish Detail/Modifier Modal */}
      <AnimatePresence>
        {selectedDish && (
          <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-sm">
            <div className="absolute inset-0" onClick={() => setSelectedDish(null)}></div>
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white rounded-t-[32px] sm:rounded-[32px] w-full max-w-md p-6 relative z-10 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <button onClick={() => setSelectedDish(null)} className="absolute right-4 top-4 p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-900 cursor-pointer">
                <X size={18} />
              </button>

              <div className="flex gap-4 items-center">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl overflow-hidden shrink-0">
                  <img src={selectedDish.image} alt={selectedDish.name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-gray-950">{selectedDish.name}</h2>
                  <p className="text-xs text-gray-400 font-semibold">€{selectedDish.basePrice.toFixed(2)}</p>
                </div>
              </div>

              {/* Milk Selection Modifiers */}
              {selectedDish.categoryId === '1' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Choose Milk</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'none', label: 'Black' },
                      { id: 'cow', label: 'Cow Milk' },
                      { id: 'oat', label: 'Oat Milk (+€0.80)' },
                      { id: 'almond', label: 'Almond (+€0.80)' }
                    ].map(opt => (
                      <button 
                        key={opt.id}
                        onClick={() => setSelectedMilk(opt.id)}
                        className={`py-2 px-1 text-center rounded-xl text-[11px] font-black transition-all border ${
                          selectedMilk === opt.id ? 'bg-black border-black text-white shadow' : 'bg-gray-50 border-transparent text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Extra Espresso Shot Modifier */}
              {selectedDish.categoryId === '1' && (
                <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl">
                  <div>
                    <span className="text-xs font-bold text-gray-950 block">Extra Espresso Shot</span>
                    <span className="text-[10px] text-gray-400 font-semibold">+€1.50</span>
                  </div>
                  <button 
                    onClick={() => setExtraShot(!extraShot)}
                    className={`w-11 h-6 rounded-full transition-all duration-300 relative ${extraShot ? 'bg-corgi' : 'bg-gray-200'}`}
                  >
                    <div className={`absolute w-5 h-5 rounded-full bg-white top-0.5 transition-all shadow-md ${extraShot ? 'right-0.5' : 'left-0.5'}`}></div>
                  </button>
                </div>
              )}

              {/* Comment inputs */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Comments for Bar/Kitchen</label>
                <input 
                  type="text" 
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="e.g. decaf, cold milk, no ice"
                  className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-2.5 text-xs font-semibold text-gray-900 outline-none focus:bg-white focus:border-gray-200 transition-all" 
                />
              </div>

              <button 
                onClick={handleAddToCart}
                className="w-full py-3 bg-black hover:bg-gray-800 text-white rounded-2xl font-bold text-sm shadow-sm transition-colors cursor-pointer active:scale-95"
              >
                Add to Cart
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Bottom Cart Bar */}
      {cart.length > 0 && !isCartOpen && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white/95 to-transparent z-30">
          <button 
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-black hover:bg-gray-800 text-white flex items-center justify-between px-6 py-4 rounded-2xl shadow-xl transition-all hover:scale-[1.01] active:scale-[0.98] cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <div className="bg-corgi text-black font-black text-xs w-6 h-6 rounded-full flex items-center justify-center">
                {cart.reduce((acc, c) => acc + c.quantity, 0)}
              </div>
              <span className="text-xs font-extrabold uppercase tracking-wider">View Cart</span>
            </div>
            <span className="text-sm font-bold">€{getSubtotal().toFixed(2)}</span>
          </button>
        </div>
      )}

      {/* Checkout Summary Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/45 backdrop-blur-sm">
            <div className="absolute inset-0" onClick={() => setIsCartOpen(false)}></div>
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white rounded-t-[32px] w-full max-w-md p-6 relative z-10 shadow-2xl flex flex-col justify-between max-h-[92vh]"
            >
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-black text-gray-950">Cart Summary</h2>
                  <button onClick={() => setIsCartOpen(false)} className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-900 cursor-pointer"><X size={18} /></button>
                </div>

                {/* Items List */}
                <div className="space-y-4 max-h-[30vh] overflow-y-auto pr-1">
                  {cart.map((c, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-extrabold text-sm text-gray-900 truncate">{c.dish.name}</h4>
                        {c.notes && <p className="text-[10px] text-amber-800 font-semibold italic">{c.notes}</p>}
                        <span className="text-[11px] text-gray-400 font-semibold">€{c.unitPrice.toFixed(2)} each</span>
                      </div>
                      
                      {/* Qty adjustments */}
                      <div className="flex items-center gap-3">
                        <button onClick={() => updateCartQty(i, -1)} className="w-7 h-7 rounded-xl bg-gray-50 border border-gray-150 flex items-center justify-center text-gray-500 hover:bg-gray-100 cursor-pointer"><Minus size={12}/></button>
                        <span className="text-xs font-extrabold text-gray-950">{c.quantity}</span>
                        <button onClick={() => updateCartQty(i, 1)} className="w-7 h-7 rounded-xl bg-gray-50 border border-gray-150 flex items-center justify-center text-gray-500 hover:bg-gray-100 cursor-pointer"><Plus size={12}/></button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tip Customizer */}
                <div className="border-t border-gray-100 mt-6 pt-5 space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Add Tip for Barista</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { val: 5, label: '5%' },
                      { val: 10, label: '10%' },
                      { val: 15, label: '15%' },
                      { val: null, label: 'Custom' }
                    ].map((opt, index) => (
                      <button 
                        key={index}
                        onClick={() => {
                          setTipPercent(opt.val);
                          if (opt.val !== null) setCustomTip('');
                        }}
                        className={`py-2 text-center rounded-xl text-[11px] font-black transition-all border ${
                          tipPercent === opt.val ? 'bg-black border-black text-white shadow' : 'bg-gray-50 border-transparent text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {tipPercent === null && (
                    <input 
                      type="text" 
                      value={customTip}
                      onChange={(e) => {
                        const val = e.target.value.replace(',', '.');
                        if (/^\d*\.?\d{0,2}$/.test(val)) setCustomTip(val);
                      }}
                      placeholder="Enter Tip € amount..."
                      className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-2 text-xs font-semibold text-gray-900 outline-none focus:bg-white focus:border-gray-200 mt-2" 
                    />
                  )}
                </div>

                {/* Loyalty Link Box */}
                <div className="border-t border-gray-100 mt-5 pt-5 space-y-2.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Loyalty Program (Email / Phone)</label>
                  {linkedGuest ? (
                    <div className="flex items-center justify-between p-3.5 bg-amber-50/50 border border-amber-100 rounded-2xl">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-corgi/15 text-corgi flex items-center justify-center font-black text-xs uppercase">{linkedGuest.tier[0]}</div>
                        <div>
                          <span className="text-xs font-bold text-gray-950 block">{linkedGuest.name}</span>
                          <span className="text-[9px] text-gray-400 font-extrabold uppercase tracking-wider">{linkedGuest.tier} tier</span>
                        </div>
                      </div>
                      <button onClick={() => setLinkedGuest(null)} className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg cursor-pointer"><X size={14}/></button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={guestSearch}
                        onChange={(e) => setGuestSearch(e.target.value)}
                        placeholder="Search Guest name, email or phone..."
                        className="flex-1 bg-gray-50 border border-transparent rounded-xl px-4 py-2.5 text-xs font-semibold text-gray-900 outline-none focus:bg-white focus:border-gray-200" 
                      />
                      <button onClick={handleLinkGuest} className="px-4 py-2.5 bg-black hover:bg-gray-800 text-white rounded-xl text-xs font-extrabold cursor-pointer active:scale-95 transition-all shadow-sm">Link</button>
                    </div>
                  )}
                </div>
              </div>

              {/* Checkout Calculation and payment buttons */}
              <div className="border-t border-gray-100 mt-6 pt-5 space-y-4">
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-gray-500 font-semibold">
                    <span>Subtotal:</span>
                    <span>€{getSubtotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500 font-semibold">
                    <span>Tip:</span>
                    <span>€{getTipAmount().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-black text-gray-950 text-base pt-1">
                    <span>Total:</span>
                    <span>€{getTotal().toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <button 
                    onClick={handlePlaceOrder}
                    className="w-full py-3.5 bg-black hover:bg-gray-850 text-white rounded-2xl font-bold text-sm shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
                  >
                    <ShoppingCart size={16} /> Place Order & Pay at Table
                  </button>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default function EMenuPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-[#FAF7F3] flex items-center justify-center font-bold text-gray-500">Loading Corgi E-Menu...</div>}>
      <EMenuContent />
    </Suspense>
  );
}
