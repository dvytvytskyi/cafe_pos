import React, { useState, useRef, useEffect } from 'react';
import { X, Minus, Plus, Search, MessageSquare, CreditCard, Receipt, ChefHat, Check, UserMinus, Users, Star, Trash2 } from 'lucide-react';
import { Order, getOrdersAsync } from '@/lib/orders';
import { Guest, getGuestsAsync, saveGuestAsync } from '@/lib/crm';
import { getMenuCategoriesAsync } from '@/lib/menu';
import { mapCategoriesToPosMenu, PosMenuCategory } from '@/lib/mappers/menu.mapper';
import { DEFAULT_LOCATION_ID } from '@/lib/constants';

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  comments?: string;
}

interface OrderTerminalModalProps {
  tableId: string;
  tableName: string;
  onClose: () => void;
  onAction: (action: 'send_to_kitchen' | 'print_check' | 'pay' | 'clean', items: OrderItem[], discountPercent: number, customerId?: string, keepOpen?: boolean) => void;
  currentStatus: 'available' | 'occupied' | 'billed' | 'dirty';
  initialOrder?: Order | null;
  guests?: Guest[];
  locationId?: string;
}

export default function OrderTerminalModal({
  tableId,
  tableName,
  onClose,
  onAction,
  currentStatus,
  initialOrder,
  guests: guestsProp,
  locationId = DEFAULT_LOCATION_ID,
}: OrderTerminalModalProps) {
  const [menu, setMenu] = useState<PosMenuCategory[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    setMenuLoading(true);
    setMenuError(null);

    getMenuCategoriesAsync()
      .then((data) => {
        if (cancelled) return;
        const mapped = mapCategoriesToPosMenu(data);
        setMenu(mapped);
        setActiveCategory(mapped[0]?.id || '');
      })
      .catch((err) => {
        console.error('Error fetching menu categories:', err);
        if (!cancelled) {
          setMenu([]);
          setMenuError('Could not load menu from server.');
        }
      })
      .finally(() => {
        if (!cancelled) setMenuLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const [orderItems, setOrderItems] = useState<OrderItem[]>(() => {
    if (initialOrder) {
      return initialOrder.items.map((item, idx) => ({
        id: `m-${idx}-${Date.now()}`,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        comments: item.comments
      }));
    }
    return [];
  });
  const [discount, setDiscount] = useState(() => {
    if (initialOrder && initialOrder.discount) {
      return initialOrder.discount.value / 100;
    }
    return 0;
  });
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [deleteConfirmItemId, setDeleteConfirmItemId] = useState<string | null>(null);
  const [isSentToKitchen, setIsSentToKitchen] = useState(() => {
    if (initialOrder) {
      return initialOrder.status === 'preparing' || initialOrder.status === 'completed' || initialOrder.status === 'ready';
    }
    return false;
  });
  const [isReady, setIsReady] = useState(initialOrder ? initialOrder.status === 'ready' : false);

  useEffect(() => {
    if (!initialOrder) {
      setOrderItems([]);
      setDiscount(0);
      setIsSentToKitchen(false);
      setIsReady(false);
      setSelectedCustomer(null);
      return;
    }

    setOrderItems(
      initialOrder.items.map((item, idx) => ({
        id: `m-${idx}-${initialOrder.id}`,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        comments: item.comments,
      }))
    );
    setDiscount(initialOrder.discount ? initialOrder.discount.value / 100 : 0);
    setIsSentToKitchen(['preparing', 'ready', 'served', 'completed'].includes(initialOrder.status));
    setIsReady(initialOrder.status === 'ready');
  }, [initialOrder]);

  // Poll active order status from API
  useEffect(() => {
    if (!initialOrder) return;

    const interval = setInterval(async () => {
      try {
        const orders = await getOrdersAsync(locationId);
        const currentOrder = orders.find((o) => o.id === initialOrder.id);
        if (!currentOrder) return;

        if (currentOrder.status === 'ready') {
          setIsSentToKitchen(true);
          setIsReady(true);
        } else if (currentOrder.status === 'preparing') {
          setIsSentToKitchen(true);
          setIsReady(false);
        } else if (currentOrder.status === 'completed' || currentOrder.paid) {
          setIsSentToKitchen(true);
          setIsReady(false);
        }
      } catch (error) {
        console.error('Failed to poll order status:', error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [initialOrder, locationId]);
  
  const [crmGuests, setCrmGuests] = useState<Guest[]>(guestsProp || []);
  const loadCrmGuests = async () => {
    if (guestsProp && guestsProp.length > 0) {
      setCrmGuests(guestsProp);
      return;
    }
    try {
      const guests = await getGuestsAsync();
      setCrmGuests(guests);
    } catch (e) {
      console.error(e);
      setCrmGuests([]);
    }
  };
  useEffect(() => {
    loadCrmGuests();
  }, [guestsProp]);

  const [selectedCustomer, setSelectedCustomer] = useState<Guest | null>(null);
  useEffect(() => {
    if (!initialOrder?.customerId) return;
    const source = guestsProp && guestsProp.length > 0 ? guestsProp : crmGuests;
    const found = source.find((g) => g.id === initialOrder.customerId);
    if (found) setSelectedCustomer(found);
  }, [initialOrder, guestsProp, crmGuests]);
  const [guestSearchQuery, setGuestSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  
  // Quick Add Customer States
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddName, setQuickAddName] = useState('');
  const [quickAddPhone, setQuickAddPhone] = useState('');

  // Dropdown click outside handling
  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const addItem = (item: any, size?: string) => {
    setIsSentToKitchen(false);
    setIsReady(false);
    const itemName = size ? `${item.name} (${size})` : item.name;
    setOrderItems(prev => {
      const existing = prev.find(i => i.name === itemName);
      if (existing) {
        return prev.map(i => i.name === itemName ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { id: `m-${Date.now()}-${item.id}`, name: itemName, price: item.price, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setOrderItems(prev => prev.map(i => {
      if (i.id === id) {
        const newQ = Math.max(0, i.quantity + delta);
        return { ...i, quantity: newQ };
      }
      return i;
    }).filter(i => i.quantity > 0));
  };

  const handleMinusClick = (itemId: string, currentQuantity: number) => {
    setIsSentToKitchen(false);
    setIsReady(false);
    if (currentQuantity === 1) {
      if (deleteConfirmItemId === itemId) {
        // Second click: delete item
        updateQuantity(itemId, -1);
        setDeleteConfirmItemId(null);
      } else {
        // First click: activate delete confirmation
        setDeleteConfirmItemId(itemId);
      }
    } else {
      // Normal decrement
      updateQuantity(itemId, -1);
      if (deleteConfirmItemId === itemId) {
        setDeleteConfirmItemId(null);
      }
    }
  };

  const handlePlusClick = (itemId: string) => {
    setIsSentToKitchen(false);
    setIsReady(false);
    updateQuantity(itemId, 1);
    if (deleteConfirmItemId === itemId) {
      setDeleteConfirmItemId(null);
    }
  };

  const menuList = menu;
  const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const total = subtotal * (1 - discount);
  const activeCategoryItems = menuList.find((c) => c.id === activeCategory)?.items ?? [];

  const renderCategories = () => {
    if (menuLoading) {
      return <div className="p-4 text-sm font-semibold text-gray-500 border-b border-gray-100">Loading menu…</div>;
    }
    if (menuError) {
      return <div className="p-4 text-sm font-semibold text-red-600 border-b border-gray-100">{menuError}</div>;
    }
    if (menuList.length === 0) return null;
    return (
      <div className="grid grid-cols-6 gap-2 p-4 border-b border-gray-100 bg-gray-50/30 shrink-0">
        {menuList.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`py-2 px-1 rounded-xl font-black text-xs text-center transition-colors cursor-pointer truncate ${
              activeCategory === cat.id
                ? 'bg-corgi text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200/60'
            }`}
            title={cat.name}
          >
            {cat.name}
          </button>
        ))}
      </div>
    );
  };

  const renderMenuItems = () => {
    if (menuLoading) {
      return <div className="flex items-center justify-center h-full text-gray-500 font-semibold">Loading menu…</div>;
    }
    if (menuList.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 gap-2">
          <p className="font-bold text-gray-700">No menu items configured</p>
          <p className="text-sm">Add categories and dishes in Menu settings to use the POS terminal.</p>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {activeCategoryItems.map((item) => (
          <div
            key={item.id}
            className="flex flex-col bg-white border border-gray-100 hover:border-corgi/40 hover:shadow-md rounded-2xl transition-all overflow-hidden relative group"
          >
            <div className="h-28 w-full bg-gray-100 relative overflow-hidden shrink-0">
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">No Image</div>
              )}
            </div>
            <div className="p-3 flex-1 flex flex-col justify-between">
              <div className="min-h-[36px] flex flex-col justify-start">
                <h4 className="font-extrabold text-gray-900 text-xs line-clamp-2 leading-tight" title={item.name}>
                  {item.name}
                </h4>
              </div>
              <span className="text-xs font-black text-corgi mt-0.5 block">€{item.price.toFixed(2)}</span>
              <div className="mt-2">
                <div className="flex gap-1 flex-wrap min-h-[16px] mb-1 items-center">
                  {item.allergens?.map((alg: string) => (
                    <span
                      key={alg}
                      className={`text-[8px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded border ${
                        alg === 'gluten-free'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : alg === 'dairy'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : alg === 'nuts'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : alg === 'egg'
                                ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                : 'bg-orange-50 text-orange-700 border-orange-200'
                      }`}
                    >
                      {alg}
                    </span>
                  ))}
                </div>
                {item.sizes && item.sizes.length > 0 ? (
                  <div className="flex gap-1">
                    {item.sizes.map((sz: string) => (
                      <button
                        key={sz}
                        onClick={() => addItem(item, sz)}
                        className="flex-1 py-1 bg-gray-50 hover:bg-corgi border border-gray-100 hover:border-corgi hover:text-white rounded-lg text-[10px] font-black text-gray-700 transition-all cursor-pointer active:scale-95 text-center"
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                ) : (
                  <button
                    onClick={() => addItem(item)}
                    className="w-full py-1.5 bg-gray-50 hover:bg-corgi border border-gray-200 hover:border-corgi hover:text-white rounded-xl text-[10px] font-black text-gray-700 transition-all cursor-pointer active:scale-95 text-center flex items-center justify-center gap-1"
                  >
                    <Plus size={10} /> Add to Order
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-6">
      <div className="bg-gray-50 w-full max-w-6xl h-[90vh] rounded-3xl overflow-hidden flex flex-row shadow-2xl relative animate-in zoom-in-95 duration-200">
        
        {/* Left Side: Menu */}
        <div className="flex-1 min-w-0 flex flex-col h-full bg-white">
          {/* Header */}
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-gray-900">Table {tableName}</h2>
              <p className="text-sm font-medium text-gray-500 capitalize">{currentStatus}</p>
            </div>
            <button 
              onClick={onClose} 
              className="w-9 h-9 rounded-full bg-gray-50 text-gray-500 flex items-center justify-center hover:bg-gray-100 hover:text-gray-800 transition-colors cursor-pointer border border-transparent hover:border-gray-200 shrink-0"
              title="Close terminal"
            >
              <X size={20} />
            </button>
          </div>

          {renderCategories()}

          <div className="flex-1 p-4 overflow-y-auto">{renderMenuItems()}</div>
        </div>

        {/* Right Side: Ticket */}
        <div className="w-[380px] lg:w-[450px] bg-gray-50 flex flex-col h-full shrink-0 border-l border-gray-200">
          <div className="p-5 border-b border-gray-200 bg-white flex flex-col gap-3 shrink-0">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-lg text-gray-900">Current Order</h3>
            </div>
            
            {/* Guest Selector Component */}
            {isQuickAddOpen ? (
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!quickAddName.trim()) return;
                  try {
                    const saved = await saveGuestAsync({
                      name: quickAddName.trim(),
                      phone: quickAddPhone.trim() || '00000000',
                      email: quickAddName.trim().toLowerCase().replace(/[^a-z0-9]/g, '') + '@placeholder.com'
                    });
                    setSelectedCustomer(saved);
                    await loadCrmGuests();
                    setIsQuickAddOpen(false);
                    setQuickAddName('');
                    setQuickAddPhone('');
                  } catch (err) {
                    console.error('Failed to quick register guest:', err);
                  }
                }}
                className="bg-orange-50/30 border border-orange-100/60 rounded-2xl p-4 flex flex-col gap-3 animate-in slide-in-from-top-2 duration-200 shadow-sm"
              >
                <div className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Quick Register Guest</div>
                <input
                  type="text"
                  placeholder="Guest name (required)..."
                  value={quickAddName}
                  onChange={(e) => setQuickAddName(e.target.value)}
                  className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 outline-none focus:border-corgi focus:ring-1 focus:ring-corgi/20 transition-all"
                  required
                  autoFocus
                />
                <input
                  type="text"
                  placeholder="Phone number..."
                  value={quickAddPhone}
                  onChange={(e) => setQuickAddPhone(e.target.value)}
                  className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 outline-none focus:border-corgi focus:ring-1 focus:ring-corgi/20 transition-all"
                />
                <div className="flex gap-2 justify-end mt-1">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsQuickAddOpen(false);
                      setQuickAddName('');
                      setQuickAddPhone('');
                    }}
                    className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-[11px] font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-3.5 py-2 bg-corgi hover:bg-orange-600 text-white text-[11px] font-bold rounded-xl transition-all cursor-pointer shadow-sm shadow-corgi/10"
                  >
                    Save & Link
                  </button>
                </div>
              </form>
            ) : selectedCustomer === null ? (
              <div className="relative" ref={dropdownRef}>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Link customer (Name, Phone)..."
                    value={guestSearchQuery}
                    onChange={(e) => {
                      setGuestSearchQuery(e.target.value);
                      setShowSearchDropdown(true);
                    }}
                    onFocus={() => setShowSearchDropdown(true)}
                    className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-xs font-semibold text-gray-800 outline-none hover:border-gray-300 focus:border-corgi focus:ring-4 focus:ring-corgi/10 transition-all placeholder:font-medium placeholder:text-gray-400"
                  />
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  {guestSearchQuery && (
                    <button 
                      onClick={() => { setGuestSearchQuery(''); setShowSearchDropdown(false); }}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {showSearchDropdown && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-white/95 backdrop-blur-md border border-gray-100 rounded-2xl shadow-[0_12px_30px_rgba(0,0,0,0.08)] z-30 max-h-64 overflow-y-auto py-1.5 divide-y divide-gray-100/60 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Header for recent/VIP suggestion */}
                    {guestSearchQuery === '' && (
                      <div className="px-4 py-2 text-[9px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/30 flex items-center gap-1">
                        VIP & Frequent Guests
                      </div>
                    )}
                    
                    {(() => {
                      const list = guestSearchQuery
                        ? crmGuests.filter(g => 
                            g.name.toLowerCase().includes(guestSearchQuery.toLowerCase()) || 
                            g.phone.includes(guestSearchQuery) ||
                            (g.email && g.email.toLowerCase().includes(guestSearchQuery.toLowerCase()))
                          )
                        : crmGuests.filter(g => g.tier === 'VIP' || g.tier === 'Gold').slice(0, 4);

                      return (
                        <>
                          {list.map(guest => (
                            <button
                              key={guest.id}
                              onClick={() => {
                                setSelectedCustomer(guest);
                                setGuestSearchQuery('');
                                setShowSearchDropdown(false);
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-gray-50/85 flex items-center justify-between cursor-pointer transition-all active:scale-[0.99] group"
                            >
                              <div className="flex flex-col">
                                <span className="text-xs font-extrabold text-gray-900 group-hover:text-corgi transition-colors">{guest.name}</span>
                                <span className="text-[10px] font-bold text-gray-400 mt-0.5">{guest.phone}</span>
                              </div>
                            </button>
                          ))}
                          
                          {guestSearchQuery !== '' && list.length === 0 && (
                            <div className="px-4 py-4 text-xs font-bold text-gray-400 text-center">No customers found</div>
                          )}
                        </>
                      );
                    })()}
                    
                    <button
                      onClick={() => {
                        setIsQuickAddOpen(true);
                        setShowSearchDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2.5 hover:bg-orange-50 text-corgi text-xs font-bold flex items-center gap-1.5 cursor-pointer bg-white"
                    >
                      <Plus size={14} /> Add new customer {guestSearchQuery ? `"${guestSearchQuery}"` : ''}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gradient-to-r from-amber-50/70 to-orange-50/50 border border-orange-100 rounded-2xl p-3.5 flex items-start justify-between gap-3 shadow-sm hover:shadow-md hover:border-orange-200 transition-all duration-300">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-gray-900 tracking-tight">{selectedCustomer.name}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 text-[11px] text-gray-500 font-bold">
                    <span className="flex items-center gap-0.5 text-amber-600">
                      <Star size={11} fill="currentColor" className="animate-pulse" />
                      {selectedCustomer.points.toFixed(2)} pts
                    </span>
                    <span>•</span>
                    <span>{selectedCustomer.phone}</span>
                  </div>
                  {selectedCustomer.allergyNotes && (
                    <div className="mt-2 text-[10px] font-bold text-red-700 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1 w-fit flex items-center gap-1">
                      <span>Allergy: {selectedCustomer.allergyNotes}</span>
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => setSelectedCustomer(null)}
                  className="p-1.5 hover:bg-red-50 hover:text-red-600 text-gray-400 rounded-xl transition-all cursor-pointer border border-transparent hover:border-red-100"
                  title="Remove Customer"
                >
                  <UserMinus size={15} />
                </button>
              </div>
            )}
          </div>

          {/* Order Items */}
          <div className="flex-1 overflow-y-auto p-5">
            {orderItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <Receipt size={48} className="mb-4 opacity-20" />
                <p className="font-medium">No items added yet</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {orderItems.map(item => {
                  const parseItemDetails = (fullName: string) => {
                    const sizeMatch = fullName.match(/\((S|M|L)\)$/);
                    const size = sizeMatch ? sizeMatch[1] : null;
                    const baseName = sizeMatch ? fullName.replace(/\s*\((S|M|L)\)$/, '').trim() : fullName;

                    const ALLERGEN_MAP: Record<string, string> = {
                      'dairy': '🥛',
                      'gluten': '🌾',
                      'gluten-free': '🌱',
                      'nuts': '🥜',
                      'egg': '🥚',
                      'fish': '🐟',
                      'soy': '🫘',
                    };

                    let allergens: string[] = [];
                    for (const cat of menuList) {
                      const dish = cat.items.find((d: any) => d.name === baseName || d.name.startsWith(baseName));
                      if (dish && dish.allergens) {
                        allergens = dish.allergens;
                        break;
                      }
                    }

                    return { baseName, size, allergenIcons: allergens.map(a => ALLERGEN_MAP[a] || '⚠️') };
                  };

                  const { baseName, size, allergenIcons } = parseItemDetails(item.name);

                  return (
                    <div key={item.id} className="bg-white p-3.5 rounded-2xl border border-gray-150 flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-extrabold text-sm text-gray-900 leading-tight line-clamp-2" title={item.name}>
                            {baseName}
                          </div>
                          {(size || allergenIcons.length > 0) && (
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              {size && (
                                <span className="text-[9px] font-black bg-gray-50 text-gray-600 px-1 py-0.5 rounded border border-gray-200/60 uppercase tracking-wider select-none">
                                  Size: {size}
                                </span>
                              )}
                              {allergenIcons.length > 0 && (
                                <div className="flex gap-0.5 items-center">
                                  {allergenIcons.map((icon, idx) => (
                                    <span key={idx} className="text-xs select-none">{icon}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-1 shrink-0">
                          <button 
                            onClick={() => handleMinusClick(item.id, item.quantity)} 
                            className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-all cursor-pointer ${
                              deleteConfirmItemId === item.id
                                ? 'bg-red-500 hover:bg-red-650 border-red-500 text-white animate-pulse'
                                : 'bg-white text-gray-600 border-gray-200/50 hover:text-corgi'
                            }`}
                            title={deleteConfirmItemId === item.id ? "Click again to delete" : "Decrease quantity"}
                          >
                            {deleteConfirmItemId === item.id ? <Trash2 size={14} /> : <Minus size={16} />}
                          </button>
                          <span className="font-extrabold w-4 text-center text-gray-950 text-sm select-none">{item.quantity}</span>
                          <button 
                            onClick={() => handlePlusClick(item.id)} 
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white text-gray-600 border border-gray-200/50 hover:text-corgi cursor-pointer"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Inline Comment Editor */}
                      {editingCommentId === item.id ? (
                        <div className="flex gap-2 mt-2 w-full items-center animate-in fade-in slide-in-from-top-1 duration-150">
                          <input
                            type="text"
                            defaultValue={item.comments || ''}
                            placeholder="Add prep notes (e.g. No ice, extra hot)..."
                            onBlur={(e) => {
                              const val = e.target.value.trim();
                              setOrderItems(prev => prev.map(i => i.id === item.id ? { ...i, comments: val || undefined } : i));
                              setEditingCommentId(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const val = (e.target as HTMLInputElement).value.trim();
                                setOrderItems(prev => prev.map(i => i.id === item.id ? { ...i, comments: val || undefined } : i));
                                setEditingCommentId(null);
                              }
                            }}
                            className="flex-1 bg-gray-50/70 focus:bg-white border border-gray-200 focus:border-corgi focus:ring-2 focus:ring-corgi/20 rounded-xl px-3 py-2 text-xs text-gray-900 placeholder-gray-400 font-extrabold outline-none transition-all"
                            autoFocus
                          />
                          <button 
                            onClick={() => setEditingCommentId(null)} 
                            className="w-8 h-8 bg-corgi hover:bg-orange-600 text-white rounded-xl transition-all cursor-pointer active:scale-95 flex items-center justify-center shrink-0 shadow-sm"
                          >
                            <Check size={16} className="stroke-[3px]" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-xs mt-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-bold text-gray-500">€{item.price.toFixed(2)}</span>
                            {item.comments ? (
                              <span 
                                onClick={() => setEditingCommentId(item.id)}
                                className="text-[10px] bg-amber-50 hover:bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200 font-bold cursor-pointer truncate max-w-[150px]"
                                title="Click to edit comment"
                              >
                                "{item.comments}"
                              </span>
                            ) : (
                              <button
                                onClick={() => setEditingCommentId(item.id)}
                                className="text-[10px] text-gray-400 hover:text-gray-900 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                              >
                                <MessageSquare size={10} /> Add Comment
                              </button>
                            )}
                          </div>
                          <span className="font-black text-gray-950">€{(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Totals & Actions */}
          <div className="p-5 bg-white border-t border-gray-200 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
            <div className="flex justify-between items-center mb-2 text-sm">
              <span className="text-gray-500 font-medium">Subtotal</span>
              <span className="font-bold text-gray-900">€{subtotal.toFixed(2)}</span>
            </div>
            
            {discount > 0 && (
              <div className="flex justify-between items-center mb-2 text-sm text-green-600">
                <span className="font-medium">Discount ({(discount * 100).toFixed(0)}%)</span>
                <span className="font-bold">-€{(subtotal * discount).toFixed(2)}</span>
              </div>
            )}
            
            <div className="flex justify-between items-center mb-6 pt-3 border-t border-gray-100">
              <span className="text-xl font-black text-gray-900">Total</span>
              <span className="text-3xl font-black text-gray-900">€{total.toFixed(2)}</span>
            </div>

            {currentStatus === 'dirty' ? (
              <button 
                onClick={() => onAction('clean', [], 0)}
                className="w-full py-4 rounded-2xl font-black text-sm bg-blue-600 hover:bg-blue-700 text-white transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 shadow-sm"
              >
                Mark as Clean
              </button>
            ) : (
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    if (!isReady) {
                      onAction('send_to_kitchen', orderItems, discount, selectedCustomer?.id, true);
                      setIsSentToKitchen(true);
                    }
                  }}
                  disabled={orderItems.length === 0}
                  className={`flex-1 py-4 rounded-2xl font-black text-sm transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 ${
                    isReady
                      ? 'bg-green-50 text-green-750 border border-green-200/80 cursor-default pointer-events-none'
                      : isSentToKitchen 
                        ? 'bg-gray-100 text-gray-500 border border-gray-200 cursor-default pointer-events-none'
                        : 'bg-gray-900 hover:bg-gray-800 text-white disabled:opacity-40 disabled:cursor-not-allowed'
                  }`}
                >
                  <ChefHat size={20} /> {isReady ? 'Ready' : isSentToKitchen ? 'Preparing' : 'Kitchen'}
                </button>
                
                <button 
                  onClick={() => onAction('pay', orderItems, discount, selectedCustomer?.id, true)}
                  disabled={orderItems.length === 0 && currentStatus !== 'billed'}
                  className="flex-[1.5] py-4 bg-corgi hover:brightness-105 text-white rounded-2xl font-black transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 text-lg disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <CreditCard size={20} /> Pay €{total.toFixed(2)}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
