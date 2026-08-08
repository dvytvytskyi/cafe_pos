'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Coffee,
  Croissant,
  Sandwich,
  CupSoda,
  Plus,
  Minus,
  X,
  Sparkles,
  ShoppingCart,
  Search,
  Filter,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getGuestsAsync, Guest } from '@/lib/crm';
import { createOrderAsync, OrderItem } from '@/lib/orders';
import { getMenuCategoriesAsync } from '@/lib/menu';
import { mapCategoriesToEmenuMenu } from '@/lib/mappers/menu.mapper';
import { updateTableStatusAsync } from '@/lib/tables';
import { DEFAULT_LOCATION_ID } from '@/lib/constants';
import {
  EMenuDish,
  EMenuCategory,
  DEFAULT_EMENU_IMAGE,
  normalizeTableId,
  searchDishesByName,
  filterDishesByAllergens,
  ALLERGEN_FILTER_OPTIONS,
  isCoffeeCategory,
} from '@/lib/emenu';

const fallbackDishes: EMenuDish[] = [
  { id: 'd1', categoryId: '1', categoryName: 'Coffee', name: 'Espresso', description: 'Single shot of rich espresso', image: DEFAULT_EMENU_IMAGE, basePrice: 2.5, allergens: [] },
  { id: 'd2', categoryId: '1', categoryName: 'Coffee', name: 'Macchiato', description: 'Espresso with a dash of frothy milk', image: DEFAULT_EMENU_IMAGE, basePrice: 2.8, allergens: ['Dairy'] },
  { id: 'd5', categoryId: '1', categoryName: 'Coffee', name: 'Flat White', description: 'Espresso with microfoam', image: DEFAULT_EMENU_IMAGE, basePrice: 3.5, allergens: ['Dairy'] },
  { id: 'd7', categoryId: '1', categoryName: 'Coffee', name: 'Latte', description: 'Espresso with steamed milk and foam', image: DEFAULT_EMENU_IMAGE, basePrice: 4.0, allergens: ['Dairy'] },
  { id: 'd9', categoryId: '2', categoryName: 'Pastries', name: 'Croissant', description: 'Buttery, flaky pastry', image: DEFAULT_EMENU_IMAGE, basePrice: 3.0, allergens: ['Gluten', 'Dairy'] },
  { id: 'd11', categoryId: '2', categoryName: 'Pastries', name: 'Almond Croissant', description: 'Filled with almond paste', image: DEFAULT_EMENU_IMAGE, basePrice: 4.0, allergens: ['Gluten', 'Dairy', 'Nuts'] },
  { id: 'd15', categoryId: '3', categoryName: 'Sandwiches', name: 'Ham & Cheese Sandwich', description: 'Ham and gruyere on baguette', image: DEFAULT_EMENU_IMAGE, basePrice: 5.5, allergens: ['Gluten', 'Dairy'] },
  { id: 'd21', categoryId: '4', categoryName: 'Smoothies', name: 'Berry Blast Smoothie', description: 'Strawberry, blueberry, raspberry blend', image: DEFAULT_EMENU_IMAGE, basePrice: 5.0, allergens: [] },
];

const fallbackCategories: EMenuCategory[] = [
  { id: '1', name: 'Coffee' },
  { id: '2', name: 'Pastries' },
  { id: '3', name: 'Sandwiches' },
  { id: '4', name: 'Smoothies' },
];

const categoryIcons: Record<string, React.ComponentType<{ size?: number }>> = {
  Coffee,
  Pastries: Croissant,
  Sandwiches: Sandwich,
  Smoothies: CupSoda,
};

function getCategoryIcon(name: string) {
  return categoryIcons[name] || Coffee;
}

const isDevMenu = process.env.NODE_ENV === 'development';

function EMenuContent() {
  const searchParams = useSearchParams();
  const locationId = searchParams.get('location') || DEFAULT_LOCATION_ID;
  const rawTable = searchParams.get('table');
  const tableId = normalizeTableId(rawTable);
  const displayTable = rawTable?.replace(/^[Tt]/, '') || tableId.replace(/^t/i, '');

  const [categories, setCategories] = useState<EMenuCategory[]>(isDevMenu ? fallbackCategories : []);
  const [allDishes, setAllDishes] = useState<EMenuDish[]>(isDevMenu ? fallbackDishes : []);
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuFromApi, setMenuFromApi] = useState(false);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState(isDevMenu ? fallbackCategories[0].id : '');
  const [searchQuery, setSearchQuery] = useState('');
  const [excludedAllergens, setExcludedAllergens] = useState<string[]>([]);
  const [showAllergenPanel, setShowAllergenPanel] = useState(false);

  const [cart, setCart] = useState<
    Array<{ dish: EMenuDish; quantity: number; unitPrice: number; notes: string }>
  >([]);
  const [selectedDish, setSelectedDish] = useState<EMenuDish | null>(null);
  const [selectedMilk, setSelectedMilk] = useState('none');
  const [extraShot, setExtraShot] = useState(false);
  const [comment, setComment] = useState('');

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [tipPercent, setTipPercent] = useState<number | null>(10);
  const [customTip, setCustomTip] = useState('');
  const [guestSearch, setGuestSearch] = useState('');
  const [linkedGuest, setLinkedGuest] = useState<Guest | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [successOrder, setSuccessOrder] = useState<{ id: string; tableId?: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const apiCategories = await getMenuCategoriesAsync(false);
        const mapped = mapCategoriesToEmenuMenu(apiCategories);
        if (!cancelled && mapped.dishes.length > 0) {
          setCategories(mapped.categories);
          setAllDishes(mapped.dishes);
          setActiveCategoryId(mapped.categories[0]?.id || fallbackCategories[0].id);
          setMenuFromApi(true);
          setMenuError(null);
        } else if (!cancelled) {
          setMenuError('Menu is empty — add items in admin to enable eMenu ordering.');
          setCategories([]);
          setAllDishes([]);
        }
      } catch (e) {
        console.warn('eMenu: menu API load failed:', e);
        if (!cancelled) {
          if (isDevMenu) {
            setCategories(fallbackCategories);
            setAllDishes(fallbackDishes);
            setActiveCategoryId(fallbackCategories[0].id);
            setMenuError('Could not load menu from server — showing dev sample dishes.');
          } else {
            setCategories([]);
            setAllDishes([]);
            setMenuError('Could not load menu from server. Please try again later.');
          }
        }
      } finally {
        if (!cancelled) setMenuLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const categoryDishes = useMemo(() => {
    let list = allDishes.filter((d) => d.categoryId === activeCategoryId);
    list = searchDishesByName(list, searchQuery);
    list = filterDishesByAllergens(list, excludedAllergens);
    return list;
  }, [allDishes, activeCategoryId, searchQuery, excludedAllergens]);

  const toggleAllergen = (allergen: string) => {
    setExcludedAllergens((prev) =>
      prev.includes(allergen) ? prev.filter((a) => a !== allergen) : [...prev, allergen]
    );
  };

  const handleOpenDish = (dish: EMenuDish) => {
    setSelectedDish(dish);
    setSelectedMilk('none');
    setExtraShot(false);
    setComment('');
  };

  const handleAddToCart = () => {
    if (!selectedDish) return;

    let unitPrice = selectedDish.basePrice;
    const notes: string[] = [];

    if (selectedMilk === 'oat' || selectedMilk === 'almond') {
      unitPrice += 0.8;
      notes.push(`${selectedMilk === 'oat' ? 'Oat' : 'Almond'} Milk`);
    } else if (selectedMilk === 'cow') {
      notes.push('Cow Milk');
    }

    if (extraShot) {
      unitPrice += 1.5;
      notes.push('Extra Shot');
    }

    if (comment.trim()) notes.push(comment.trim());

    const itemNotesString = notes.join(', ');
    const existingIndex = cart.findIndex(
      (c) => c.dish.id === selectedDish.id && c.notes === itemNotesString
    );

    if (existingIndex > -1) {
      const newCart = [...cart];
      newCart[existingIndex].quantity += 1;
      setCart(newCart);
    } else {
      setCart([
        ...cart,
        { dish: selectedDish, quantity: 1, unitPrice, notes: itemNotesString },
      ]);
    }

    setSelectedDish(null);
  };

  const updateCartQty = (index: number, change: number) => {
    const newCart = [...cart];
    newCart[index].quantity += change;
    if (newCart[index].quantity <= 0) newCart.splice(index, 1);
    setCart(newCart);
  };

  const getSubtotal = () => cart.reduce((acc, c) => acc + c.unitPrice * c.quantity, 0);

  const getTipAmount = () => {
    const subtotal = getSubtotal();
    if (tipPercent !== null) return subtotal * (tipPercent / 100);
    return parseFloat(customTip) || 0;
  };

  const getTotal = () => getSubtotal() + getTipAmount();

  const handleLinkGuest = async () => {
    if (!guestSearch.trim()) return;
    try {
      const guests = await getGuestsAsync();
      const q = guestSearch.trim().toLowerCase();
      const found = guests.find(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          g.phone.includes(guestSearch.trim()) ||
          g.email.toLowerCase().includes(q)
      );
      if (found) {
        setLinkedGuest(found);
        setGuestSearch('');
      } else {
        alert('Guest not found. Register at the counter to link loyalty.');
      }
    } catch {
      alert('Could not search guests. Try again.');
    }
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      const orderTotal = parseFloat(getTotal().toFixed(2));
      const tipVal = getTipAmount();

      const orderItems: OrderItem[] = cart.map((c) => ({
        name: c.dish.name + (c.notes ? ` (${c.notes})` : ''),
        price: c.unitPrice,
        quantity: c.quantity,
        comments: c.notes || undefined,
      }));

      const created = await createOrderAsync({
        locationId,
        tableId,
        source: 'dine_in',
        status: 'incoming',
        customerName: linkedGuest ? linkedGuest.name : `Table ${displayTable} Guest`,
        customerId: linkedGuest?.id,
        total: orderTotal,
        paid: false,
        items: orderItems,
        orderedBy: 'app',
        ...(tipVal > 0
          ? {
              tip:
                tipPercent !== null
                  ? { type: 'percent' as const, value: tipPercent, amountAdded: tipVal }
                  : { type: 'fixed' as const, value: tipVal, amountAdded: tipVal },
            }
          : {}),
      });

      updateTableStatusAsync(tableId, 'occupied').catch((e) =>
        console.warn('Table status update skipped:', e)
      );

      setSuccessOrder({ id: created.id, tableId: created.tableId });
      setCart([]);
      setIsCartOpen(false);
      setLinkedGuest(null);
    } catch (e) {
      console.error('eMenu order failed:', e);
      alert(e instanceof Error ? e.message : 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F3] font-sans pb-24 text-gray-900 select-none">
      {menuError && !menuFromApi && (
        <div className="mx-4 mt-3 px-4 py-2.5 rounded-xl bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200">
          {menuError}
        </div>
      )}
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
                <p className="text-xs text-gray-400 font-semibold">
                  Order {successOrder.id} sent to kitchen for table {tableId.toUpperCase()}. Pay with your
                  waiter when ready.
                </p>
              </div>
              {linkedGuest && (
                <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 flex items-center gap-3 text-left">
                  <div className="w-10 h-10 rounded-xl bg-corgi/10 text-corgi flex items-center justify-center shrink-0">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
                      Loyalty linked
                    </span>
                    <span className="text-sm font-bold text-amber-900">{linkedGuest.name}</span>
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

      <header className="p-4 bg-white border-b border-gray-100 sticky top-0 z-20 flex justify-between items-center shadow-sm">
        <span className="text-xl font-black tracking-tight text-gray-950 uppercase">🐾 Corgi Cafe</span>
        <span className="bg-corgi text-black font-black text-xs px-3 py-1.5 rounded-full shadow-sm">
          {tableId.toUpperCase()}
        </span>
      </header>

      <div className="px-4 py-6 bg-white border-b border-gray-150 flex flex-col gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-950">Self-Order & Pay</h1>
          <p className="text-xs text-gray-500 font-medium mt-1">
            Scan the QR on your table, order favorites, pay with the waiter.
          </p>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dishes..."
              className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-transparent rounded-xl text-xs font-semibold outline-none focus:bg-white focus:border-gray-200"
            />
          </div>
          <button
            onClick={() => setShowAllergenPanel((v) => !v)}
            className={`px-3 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
              excludedAllergens.length
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-white border-gray-200 text-gray-600'
            }`}
          >
            <Filter size={14} />
            {excludedAllergens.length ? `−${excludedAllergens.length}` : 'Allergens'}
          </button>
        </div>

        <AnimatePresence>
          {showAllergenPanel && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="flex flex-wrap gap-2 overflow-hidden"
            >
              {ALLERGEN_FILTER_OPTIONS.map((alg) => (
                <button
                  key={alg}
                  onClick={() => toggleAllergen(alg)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wide border cursor-pointer ${
                    excludedAllergens.includes(alg)
                      ? 'bg-red-600 border-red-600 text-white'
                      : 'bg-white border-gray-200 text-gray-500'
                  }`}
                >
                  No {alg}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="sticky top-[61px] bg-[#FAF7F3] py-3.5 z-10 border-b border-gray-200/50 overflow-x-auto whitespace-nowrap flex gap-2.5 px-4 scrollbar-none">
        {categories.map((cat) => {
          const Icon = getCategoryIcon(cat.name);
          const isActive = cat.id === activeCategoryId;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategoryId(cat.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95 ${
                isActive ? 'bg-black text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon size={14} /> {cat.name}
            </button>
          );
        })}
      </div>

      {menuLoading ? (
        <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm font-bold">Loading menu...</span>
        </div>
      ) : categoryDishes.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm font-semibold px-4">
          No dishes match your search or allergen filters.
        </div>
      ) : (
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {categoryDishes.map((dish) => (
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
                    <span className="font-extrabold text-xs text-gray-950 shrink-0 ml-2">
                      €{dish.basePrice.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 font-semibold line-clamp-2 leading-relaxed">
                    {dish.description}
                  </p>
                </div>
                {dish.allergens.length > 0 && (
                  <div className="flex gap-1 mt-2.5 flex-wrap">
                    {dish.allergens.map((alg) => (
                      <span
                        key={alg}
                        className="text-[8px] font-black uppercase bg-red-50 text-red-700 px-1.5 py-0.5 rounded-md"
                      >
                        {alg}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {selectedDish && (
          <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-sm">
            <div className="absolute inset-0" onClick={() => setSelectedDish(null)} />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white rounded-t-[32px] sm:rounded-[32px] w-full max-w-md p-6 relative z-10 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <button
                onClick={() => setSelectedDish(null)}
                className="absolute right-4 top-4 p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-900 cursor-pointer"
              >
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

              {isCoffeeCategory(selectedDish.categoryName) && (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
                      Choose Milk
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'none', label: 'Black' },
                        { id: 'cow', label: 'Cow Milk' },
                        { id: 'oat', label: 'Oat (+€0.80)' },
                        { id: 'almond', label: 'Almond (+€0.80)' },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => setSelectedMilk(opt.id)}
                          className={`py-2 px-1 text-center rounded-xl text-[11px] font-black transition-all border ${
                            selectedMilk === opt.id
                              ? 'bg-black border-black text-white shadow'
                              : 'bg-gray-50 border-transparent text-gray-500 hover:bg-gray-100'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl">
                    <div>
                      <span className="text-xs font-bold text-gray-950 block">Extra Espresso Shot</span>
                      <span className="text-[10px] text-gray-400 font-semibold">+€1.50</span>
                    </div>
                    <button
                      onClick={() => setExtraShot(!extraShot)}
                      className={`w-11 h-6 rounded-full transition-all duration-300 relative ${extraShot ? 'bg-corgi' : 'bg-gray-200'}`}
                    >
                      <div
                        className={`absolute w-5 h-5 rounded-full bg-white top-0.5 transition-all shadow-md ${extraShot ? 'right-0.5' : 'left-0.5'}`}
                      />
                    </button>
                  </div>
                </>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
                  Comments for Bar/Kitchen
                </label>
                <input
                  type="text"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="e.g. decaf, cold milk"
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

      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/45 backdrop-blur-sm">
            <div className="absolute inset-0" onClick={() => setIsCartOpen(false)} />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white rounded-t-[32px] w-full max-w-md p-6 relative z-10 shadow-2xl flex flex-col justify-between max-h-[92vh]"
            >
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-black text-gray-950">Cart Summary</h2>
                  <button
                    onClick={() => setIsCartOpen(false)}
                    className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-900 cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-4 max-h-[30vh] overflow-y-auto pr-1">
                  {cart.map((c, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-extrabold text-sm text-gray-900 truncate">{c.dish.name}</h4>
                        {c.notes && (
                          <p className="text-[10px] text-amber-800 font-semibold italic">{c.notes}</p>
                        )}
                        <span className="text-[11px] text-gray-400 font-semibold">
                          €{c.unitPrice.toFixed(2)} each
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => updateCartQty(i, -1)}
                          className="w-7 h-7 rounded-xl bg-gray-50 border border-gray-150 flex items-center justify-center text-gray-500 hover:bg-gray-100 cursor-pointer"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="text-xs font-extrabold text-gray-950">{c.quantity}</span>
                        <button
                          onClick={() => updateCartQty(i, 1)}
                          className="w-7 h-7 rounded-xl bg-gray-50 border border-gray-150 flex items-center justify-center text-gray-500 hover:bg-gray-100 cursor-pointer"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-100 mt-6 pt-5 space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
                    Add Tip for Barista
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { val: 5, label: '5%' },
                      { val: 10, label: '10%' },
                      { val: 15, label: '15%' },
                      { val: null, label: 'Custom' },
                    ].map((opt, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setTipPercent(opt.val);
                          if (opt.val !== null) setCustomTip('');
                        }}
                        className={`py-2 text-center rounded-xl text-[11px] font-black transition-all border ${
                          tipPercent === opt.val
                            ? 'bg-black border-black text-white shadow'
                            : 'bg-gray-50 border-transparent text-gray-500 hover:bg-gray-100'
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

                <div className="border-t border-gray-100 mt-5 pt-5 space-y-2.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
                    Loyalty Program (Email / Phone)
                  </label>
                  {linkedGuest ? (
                    <div className="flex items-center justify-between p-3.5 bg-amber-50/50 border border-amber-100 rounded-2xl">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-corgi/15 text-corgi flex items-center justify-center font-black text-xs uppercase">
                          {linkedGuest.tier[0]}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-gray-950 block">{linkedGuest.name}</span>
                          <span className="text-[9px] text-gray-400 font-extrabold uppercase tracking-wider">
                            {linkedGuest.tier} tier
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setLinkedGuest(null)}
                        className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={guestSearch}
                        onChange={(e) => setGuestSearch(e.target.value)}
                        placeholder="Search name, email or phone..."
                        className="flex-1 bg-gray-50 border border-transparent rounded-xl px-4 py-2.5 text-xs font-semibold text-gray-900 outline-none focus:bg-white focus:border-gray-200"
                      />
                      <button
                        onClick={handleLinkGuest}
                        className="px-4 py-2.5 bg-black hover:bg-gray-800 text-white rounded-xl text-xs font-extrabold cursor-pointer active:scale-95 transition-all shadow-sm"
                      >
                        Link
                      </button>
                    </div>
                  )}
                </div>
              </div>

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
                <button
                  onClick={handlePlaceOrder}
                  disabled={submitting}
                  className="w-full py-3.5 bg-black hover:bg-gray-850 disabled:opacity-60 text-white rounded-2xl font-bold text-sm shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
                >
                  {submitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <ShoppingCart size={16} />
                  )}
                  {submitting ? 'Sending...' : 'Place Order & Pay at Table'}
                </button>
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
    <Suspense
      fallback={
        <div className="h-screen bg-[#FAF7F3] flex items-center justify-center font-bold text-gray-500">
          Loading Corgi E-Menu...
        </div>
      }
    >
      <EMenuContent />
    </Suspense>
  );
}
