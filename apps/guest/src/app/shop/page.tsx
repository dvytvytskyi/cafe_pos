'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useGuest } from '@/lib/guest-context';
import { getMerchCatalog, createMerchOrder } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  ChevronDown, 
  ChevronLeft,
  ChevronRight,
  Sliders, 
  X, 
  Sparkle, 
  ShoppingBag, 
  ArrowRight,
  Plus,
  Minus,
  Check,
  Info,
  Store,
  RefreshCw,
  Tag,
  FileText,
  CreditCard,
  HelpCircle,
  AlertCircle,
  MessageSquare
} from 'lucide-react';

const MOCK_MERCH_ITEMS = [
  {
    id: "merch-1",
    sku: "HOODIE-GREEN",
    name: "Midnight Bloom Hoodie",
    description: "Stylish heavy cotton blend hoodie with premium embroidered logos and custom stitching.",
    price: 80.00,
    category: "Hoodie",
    image: "https://optim.tildacdn.com/stor3562-3232-4362-b736-316565383739/-/format/webp/99960808.jpg.webp",
    options: [
      { name: "Size", choices: ["S", "M", "L", "XL"] }
    ]
  },
  {
    id: "merch-2",
    sku: "HOODIE-BLUE",
    name: "Crimson Wave Hoodie",
    description: "Classic casual hoodie featuring clean minimal branding and premium warm fleece inner lining.",
    price: 35.00,
    category: "Hoodie",
    image: "https://optim.tildacdn.com/stor6265-3164-4538-a234-373835663732/-/format/webp/40046535.jpg.webp",
    options: [
      { name: "Size", choices: ["S", "M", "L", "XL"] }
    ]
  },
  {
    id: "merch-3",
    sku: "HOODIE-PURPLE",
    name: "Signature Purple Hoodie",
    description: "Our signature double-brushed cotton hoodie in vibrant, eye-catching midnight violet.",
    price: 65.00,
    category: "Hoodie",
    image: "https://optim.tildacdn.com/stor6236-3330-4237-b566-366465633238/-/format/webp/93517017.jpg.webp",
    options: [
      { name: "Size", choices: ["S", "M", "L", "XL"] }
    ]
  },
  {
    id: "merch-4",
    sku: "CAP-BLUE",
    name: "Crimson Wave Cap",
    description: "Premium adjustable baseball cap featuring breathable panels and direct front embroidery.",
    price: 25.00,
    category: "Face Cap",
    image: "https://optim.tildacdn.com/stor6265-3164-4538-a234-373835663732/-/format/webp/40046535.jpg.webp",
    options: [
      { name: "Fit", choices: ["Standard Fit", "Flex Fit"] }
    ]
  },
  {
    id: "merch-5",
    sku: "CAP-GREEN",
    name: "Midnight Bloom Cap",
    description: "Structured 6-panel cap with direct embroidered branding, matching the floral collection.",
    price: 25.00,
    category: "Face Cap",
    image: "https://optim.tildacdn.com/stor3562-3232-4362-b736-316565383739/-/format/webp/99960808.jpg.webp",
    options: [
      { name: "Fit", choices: ["Standard Fit", "Flex Fit"] }
    ]
  }
];

export default function ShopPage() {
  const { 
    bootstrap, 
    orderMode, 
    setOrderMode,
    merchCart, 
    addMerchToCart, 
    updateMerchQty, 
    clearMerchCart 
  } = useGuest();

  const router = useRouter();
  
  // Local Catalog / Filter states
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>("All");
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<{ [key: string]: string }>({});
  const [quantity, setQuantity] = useState(1);

  // Modals visibility
  const [showOrderModeModal, setShowOrderModeModal] = useState(false);
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdOrderNumber, setCreatedOrderNumber] = useState<string | null>(null);

  // Store switcher states (matching Menu Page logic)
  const [selectedStore, setSelectedStore] = useState<'pedralbes' | 'eixample'>('pedralbes');
  const [isStoreChanging, setIsStoreChanging] = useState(false);

  useEffect(() => {
    if (selectedItem) {
      setQuantity(1);
      // Initialize selected options with the first choices
      const initialOptions: { [key: string]: string } = {};
      (selectedItem.options || []).forEach((opt: any) => {
        initialOptions[opt.name] = opt.choices[0];
      });
      setSelectedOptions(initialOptions);
    }
  }, [selectedItem]);

  const handleOptionSelect = (optionName: string, choice: string) => {
    setSelectedOptions(prev => ({
      ...prev,
      [optionName]: choice
    }));
  };

  const handleAddToCart = () => {
    if (!selectedItem) return;
    
    const optionLabels = Object.values(selectedOptions).join(" / ");
    const displayName = optionLabels ? `${selectedItem.name} (${optionLabels})` : selectedItem.name;

    addMerchToCart({
      merchSkuId: selectedItem.sku,
      itemType: 'merch',
      name: displayName,
      unitPrice: selectedItem.price,
      quantity: quantity,
    });

    setSelectedItem(null);
  };

  const handleCheckout = async () => {
    if (!bootstrap?.location?.id || merchCart.length === 0) return;
    try {
      const order = await createMerchOrder({
        locationId: bootstrap.location.id,
        items: merchCart,
      });
      setCreatedOrderNumber(`MERCH-${order.orderNumber}`);
      clearMerchCart();
      setShowCartDrawer(false);
      setShowSuccessModal(true);
    } catch (err: any) {
      alert(`Merch order failed: ${err.message}`);
    }
  };

  const getOrderModeLabel = () => {
    switch (orderMode) {
      case 'delivery': return 'Delivery';
      case 'pickup': return 'Pick Up';
      default: return 'Eat In';
    }
  };

  const getOrderModeEmoji = () => {
    switch (orderMode) {
      case 'delivery': return '🚲';
      case 'pickup': return '🛍️';
      default: return '🥗';
    }
  };

  const categories = [
    { id: "All", label: "All Items", emoji: "🛍️" },
    { id: "Hoodie", label: "Hoodie", emoji: "🧥" },
    { id: "Sneaker", label: "Sneaker", emoji: "👟" },
    { id: "Face Cap", label: "Face Cap", emoji: "🧢" }
  ];

  const filteredItems = MOCK_MERCH_ITEMS.filter(item => {
    if (activeCategoryTab === "All") return true;
    return item.category === activeCategoryTab;
  });

  const cartTotal = merchCart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);

  return (
    <div className="h-screen overflow-y-auto bg-gray-50 flex flex-col items-center select-none overflow-x-hidden pb-[90px] scroll-smooth">
      {/* Sticky Header Container */}
      <div className="sticky top-0 z-40 bg-gradient-to-b from-[#FDBD38] to-[#FDB01A] text-gray-900 flex flex-col w-full pb-4">
        <div className="flex items-center justify-between px-4 pt-4 gap-3">
          {/* Back button returning to Menu */}
          <button 
            onClick={() => router.push('/menu')}
            className="w-10 h-10 bg-white/95 rounded-full flex items-center justify-center shadow-sm shadow-black/5 hover:bg-white transition-all text-gray-900 active:scale-95 flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-gray-900" strokeWidth={2.2} />
          </button>

          {/* Central premium combined location/order-mode capsule selector */}
          <div className="flex-1 flex justify-center min-w-0">
            <div 
              onClick={() => setShowOrderModeModal(true)}
              className="bg-white/95 hover:bg-white border border-black/5 rounded-full px-4 py-2 flex items-center gap-2 shadow-sm shadow-black/5 cursor-pointer transition-all active:scale-[0.98] min-w-0 max-w-full"
            >
              <span className="w-2 h-2 rounded-full bg-[#4ADE80] animate-pulse flex-shrink-0" />
              <div className="flex items-center gap-1.5 text-xs text-gray-900 min-w-0">
                <span className="font-extrabold tracking-tight truncate max-w-[110px]">
                  {selectedStore === 'pedralbes' ? 'Pedralbes Centre' : 'Eixample Cafe'}
                </span>
                <span className="text-gray-300 font-light flex-shrink-0">|</span>
                <span className="font-semibold text-gray-500 flex items-center gap-1 min-w-0">
                  <span className="flex-shrink-0">{getOrderModeEmoji()}</span>
                  <span className="truncate max-w-[80px]">{getOrderModeLabel()}</span>
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 ml-0.5 flex-shrink-0" strokeWidth={2} />
            </div>
          </div>

          {/* Shopping Bag Button */}
          <button 
            onClick={() => setShowCartDrawer(true)}
            className="w-10 h-10 bg-white/95 rounded-full flex items-center justify-center shadow-sm shadow-black/5 hover:bg-white transition-all text-gray-900 active:scale-95 flex-shrink-0 relative"
          >
            <ShoppingBag className="w-4 h-4 text-gray-900" strokeWidth={2.2} />
            {merchCart.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-[#FDBD38] text-white text-[9px] font-bold rounded-full border border-white flex items-center justify-center">
                {merchCart.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-[480px] flex-1 bg-white px-5 py-6 flex flex-col gap-6">
        
        {/* Horizontal Promo Banner Card (Midnight Purple Hoodie) */}
        <div className="w-full bg-gray-100 rounded-[24px] p-6 flex items-center justify-between overflow-hidden relative min-h-[140px]">
          <div className="flex flex-col items-start gap-2.5 z-10 text-left max-w-[60%]">
            <h2 className="text-[17px] font-extrabold text-gray-900 leading-tight">
              Buy 1 hoodie,<br />get 45% off caps
            </h2>
            <button 
              onClick={() => setActiveCategoryTab("Face Cap")}
              className="bg-white hover:bg-gray-50 text-gray-900 px-4 py-2 rounded-full font-bold text-[12px] flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer border-none"
            >
              <span>Shop now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {/* Purple hoodie image positioned absolute on the right */}
          <img 
            src="https://optim.tildacdn.com/stor6236-3330-4237-b566-366465633238/-/format/webp/93517017.jpg.webp" 
            alt="Promo hoodie" 
            className="absolute right-[-15px] bottom-[-15px] w-[140px] h-[140px] object-contain rotate-[-12deg] drop-shadow-md"
          />
        </div>

        {/* Horizontal Category Filtering Tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
          {categories.map((cat) => {
            const active = activeCategoryTab === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategoryTab(cat.id)}
                className={`rounded-full py-1.5 pl-1.5 pr-4 flex items-center gap-2 border-none transition-all active:scale-[0.98] whitespace-nowrap ${
                  active 
                    ? 'bg-black text-white' 
                    : 'bg-[#F4F4F5] text-gray-900 hover:bg-[#E4E4E7]'
                }`}
              >
                <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-sm shadow-sm">
                  {cat.emoji}
                </div>
                <span className="font-semibold text-[13px]">
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Catalog Items Product Grid */}
        <div className="grid grid-cols-2 gap-4 pb-24">
          {filteredItems.map((item) => (
            <div 
              key={item.id} 
              onClick={() => setSelectedItem(item)}
              className="bg-white border border-gray-100 rounded-[24px] overflow-hidden flex flex-col hover:opacity-98 transition-all cursor-pointer group active:scale-[0.98] relative"
            >
              {/* Heart icon on top-right */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                }}
                className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-white flex items-center justify-center z-10 border border-gray-100 text-gray-400 hover:text-red-500 transition-colors shadow-sm active:scale-90"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              </button>

              {/* Product Image Wrapper */}
              <div className="aspect-square bg-gray-50 flex items-center justify-center overflow-hidden relative">
                {item.image ? (
                  <img 
                    src={item.image} 
                    alt={item.name} 
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                  />
                ) : (
                  <ShoppingBag className="w-12 h-12 text-gray-300" strokeWidth={1} />
                )}
              </div>

              {/* Product Card Text Details */}
              <div className="p-4 flex flex-col justify-between flex-grow gap-2 text-left">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[13.5px] font-bold text-gray-900 truncate">
                    {item.name}
                  </span>
                  <p className="text-[11px] text-gray-400 font-semibold leading-snug line-clamp-1">
                    {item.description}
                  </p>
                </div>

                <div className="flex justify-between items-center mt-1">
                  <span className="text-[14px] font-black text-gray-900">
                    {item.price.toFixed(2)}€
                  </span>
                  <div className="w-8 h-8 rounded-full bg-white border border-gray-150 text-gray-700 flex items-center justify-center transition-all group-hover:bg-gray-50 shadow-sm">
                    <Plus className="w-4 h-4 text-gray-600" strokeWidth={2.2} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Bottom Cart Bar */}
      {merchCart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-45 p-4 flex justify-center bg-gradient-to-t from-white via-white/95 to-transparent pointer-events-none">
          <button 
            onClick={() => setShowCartDrawer(true)}
            className="w-full max-w-[440px] bg-[#FDBD38] hover:bg-[#e5a420] text-white py-4 rounded-full font-semibold flex items-center justify-between px-6 transition-all active:scale-[0.99] shadow-none pointer-events-auto"
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-white" strokeWidth={2.2} />
              <span className="text-[15px] font-semibold text-white">View bag</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-full font-bold text-white">
                {merchCart.reduce((sum, item) => sum + item.quantity, 0)} items
              </span>
              <span className="text-[15px] font-semibold text-white">{cartTotal.toFixed(2)}€</span>
            </div>
          </button>
        </div>
      )}

      {/* 1. Item Details Bottom Sheet Modal */}
      {selectedItem && (
        <div 
          className="fixed inset-0 bg-transparent z-50 transition-all duration-300 flex items-end justify-center backdrop-blur-[3px]"
          onClick={() => setSelectedItem(null)}
        >
          <div 
            className="w-full max-w-[480px] bg-white rounded-t-[16px] overflow-hidden transition-transform duration-300 ease-out transform flex flex-col shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Cross Button */}
            <button 
              onClick={() => setSelectedItem(null)}
              className="absolute top-5 left-5 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center text-black hover:bg-white transition-all z-50 shadow-sm cursor-pointer"
            >
              <X className="w-4 h-4" strokeWidth={1.8} />
            </button>

            {/* Product Cover Image */}
            <div className="w-full h-72 bg-gray-50 flex items-center justify-center overflow-hidden">
              {selectedItem.image ? (
                <img 
                  src={selectedItem.image} 
                  alt={selectedItem.name} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <ShoppingBag className="w-20 h-20 text-gray-300" strokeWidth={1} />
              )}
            </div>

            {/* Content Details Block */}
            <div className="px-6 py-6 flex flex-col gap-5 text-left bg-white">
              <div className="flex justify-between items-start gap-3">
                <div className="flex flex-col gap-0.5">
                  <h2 className="text-[20px] font-bold text-gray-900 uppercase tracking-tight leading-none">
                    {selectedItem.name}
                  </h2>
                  <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-1">
                    SKU: {selectedItem.sku}
                  </span>
                </div>
                <span className="text-[20px] font-bold text-gray-900">
                  {selectedItem.price.toFixed(2)}€
                </span>
              </div>

              {/* Description */}
              <p className="text-[13px] text-gray-500 font-medium leading-relaxed">
                {selectedItem.description}
              </p>

              {/* Dynamic Modifiers Options */}
              {(selectedItem.options || []).map((opt: any) => (
                <div key={opt.name} className="flex flex-col gap-2.5">
                  <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider pl-1">
                    {opt.name}
                  </span>
                  <div className="flex gap-2">
                    {opt.choices.map((choice: string) => {
                      const active = selectedOptions[opt.name] === choice;
                      return (
                        <button
                          key={choice}
                          onClick={() => handleOptionSelect(opt.name, choice)}
                          className={`px-5 py-3 rounded-2xl font-semibold text-[13px] border transition-all cursor-pointer ${
                            active 
                              ? 'bg-[#FDBD38] border-[#FDBD38] text-white shadow-none' 
                              : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50/50'
                          }`}
                        >
                          {choice}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Quantity selector and Add to bag CTA Button */}
              <div className="flex gap-4 items-center pt-2 mt-2">
                <div className="flex items-center gap-4 bg-gray-100 rounded-full px-4 py-3">
                  <button 
                    onClick={() => quantity > 1 && setQuantity(quantity - 1)}
                    className="p-0.5 hover:bg-white rounded-full transition-colors text-black"
                  >
                    <Minus className="w-4 h-4" strokeWidth={2.2} />
                  </button>
                  <span className="text-base font-bold text-gray-900 w-4 text-center">
                    {quantity}
                  </span>
                  <button 
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-0.5 hover:bg-white rounded-full transition-colors text-black"
                  >
                    <Plus className="w-4 h-4" strokeWidth={2.2} />
                  </button>
                </div>
                
                <button
                  onClick={handleAddToCart}
                  className="flex-1 bg-[#FDBD38] hover:bg-[#e5a420] text-white py-4 rounded-full font-semibold text-center text-[15px] transition-all active:scale-[0.98] shadow-none flex justify-between px-6 items-center"
                >
                  <span>Add to bag</span>
                  <span>{(selectedItem.price * quantity).toFixed(2)}€</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Unified Cart / Bag Modal Drawer */}
      {showCartDrawer && (
        <div 
          className="fixed inset-0 bg-transparent z-50 transition-all duration-300 flex items-end justify-center backdrop-blur-[3px]"
          onClick={() => setShowCartDrawer(false)}
        >
          <div 
            className="w-full max-w-[480px] bg-white rounded-t-[16px] pt-8 px-6 pb-8 transition-transform duration-300 ease-out transform flex flex-col gap-6 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex flex-col w-full gap-1">
              <div className="flex justify-between items-center w-full">
                <h2 className="text-[22px] font-bold text-gray-900 uppercase tracking-tight leading-none">
                  Your Basket
                </h2>
                <button 
                  onClick={() => setShowCartDrawer(false)}
                  className="p-1 hover:bg-gray-150 rounded-full transition-colors text-black -mr-1"
                >
                  <X className="w-5 h-5" strokeWidth={1.8} />
                </button>
              </div>
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                Review your items
              </span>
            </div>

            {/* Cart list items */}
            <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto no-scrollbar">
              {merchCart.map((item) => (
                <div key={item.key} className="flex justify-between items-center py-2.5 border-b border-gray-100">
                  <div className="flex flex-col text-left">
                    <span className="text-[14px] font-semibold text-gray-900">{item.name}</span>
                    <span className="text-[11px] text-gray-400 font-medium">
                      {(item.unitPrice).toFixed(2)}€ each
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 bg-gray-50 rounded-full px-3 py-1.5 border border-gray-100">
                      <button 
                        onClick={() => updateMerchQty(item.key, -1)}
                        className="text-gray-500 hover:text-black"
                      >
                        <Minus className="w-3.5 h-3.5" strokeWidth={2.2} />
                      </button>
                      <span className="text-[13px] font-bold text-gray-900 w-4 text-center">
                        {item.quantity}
                      </span>
                      <button 
                        onClick={() => updateMerchQty(item.key, 1)}
                        className="text-gray-500 hover:text-black"
                      >
                        <Plus className="w-3.5 h-3.5" strokeWidth={2.2} />
                      </button>
                    </div>
                    <span className="text-[14px] font-bold text-gray-900 min-w-[50px] text-right">
                      {((item.unitPrice * item.quantity)).toFixed(2)}€
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Total price calculations */}
            <div className="flex flex-col gap-2 pt-2 border-t border-gray-100 text-left">
              <div className="flex justify-between text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <span>Subtotal</span>
                <span className="text-gray-800">{cartTotal.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <span>Pickup Method</span>
                <span className="text-gray-800">Counter Pickup</span>
              </div>
              <div className="flex justify-between items-center text-[15px] font-semibold text-gray-900 uppercase tracking-wider pt-2 border-t border-dashed border-gray-200">
                <span>Total</span>
                <span>{cartTotal.toFixed(2)}€</span>
              </div>
            </div>

            {/* Submit checkout CTA button */}
            <button
              onClick={handleCheckout}
              className="w-full bg-[#FDBD38] hover:bg-[#e5a420] text-white py-4 rounded-full font-semibold text-center text-[15px] transition-all active:scale-[0.98] shadow-none flex justify-between px-6 items-center mt-2"
            >
              <span>Confirm order</span>
              <span>{cartTotal.toFixed(2)}€</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Order Mode selection Modal (Shared with Menu Page switcher) */}
      {showOrderModeModal && (
        <div 
          className="fixed inset-0 bg-transparent z-50 transition-all duration-300 flex items-end justify-center backdrop-blur-[3px]"
          onClick={() => setShowOrderModeModal(false)}
        >
          <div 
            className="w-full max-w-[480px] bg-white rounded-t-[16px] pt-8 px-6 pb-8 transition-transform duration-300 ease-out transform flex flex-col gap-6 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex flex-col w-full gap-1">
              <div className="flex justify-between items-center w-full">
                <h2 className="text-[22px] font-bold text-gray-900 uppercase tracking-tight leading-none">
                  Order Mode
                </h2>
                <button 
                  onClick={() => setShowOrderModeModal(false)}
                  className="p-1 hover:bg-gray-150 rounded-full transition-colors text-black -mr-1"
                >
                  <X className="w-5 h-5" strokeWidth={1.8} />
                </button>
              </div>
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                Choose how you want to receive your order
              </span>
            </div>

            {/* Options */}
            <div className="flex flex-col gap-3">
              {[
                { id: 'store', label: 'Eat In', desc: 'Enjoy your food and drinks inside the cafe', emoji: '🥗' },
                { id: 'pickup', label: 'Pick up / Takeaway', desc: 'Order ahead and collect it when ready', emoji: '🛍️' },
                { id: 'delivery', label: 'Delivery', desc: 'Get it delivered directly to your address', emoji: '🚲' }
              ].map((opt) => {
                const active = orderMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setOrderMode(opt.id as 'store' | 'pickup' | 'delivery');
                    }}
                    className={`w-full p-4 rounded-2xl text-left border transition-all flex items-center justify-between ${
                      active 
                        ? 'bg-[#FDBD38]/10 border-[#FDBD38] text-gray-900' 
                        : 'bg-white border-gray-100 text-gray-800 hover:bg-gray-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <span className="text-2xl flex-shrink-0">{opt.emoji}</span>
                      <div className="flex flex-col gap-0.5 text-left">
                        <span className="text-[14px] font-bold text-gray-900">{opt.label}</span>
                        <span className="text-[11px] text-gray-400 font-medium leading-tight">{opt.desc}</span>
                      </div>
                    </div>
                    {active && (
                      <span className="w-5 h-5 rounded-full bg-[#FDBD38] flex items-center justify-center">
                        <span className="w-2 h-2 rounded-full bg-white" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Select Cafe Section */}
            <div className="flex flex-col gap-3 text-left border-t border-gray-100 pt-5 mt-1">
              <h3 className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider pl-1 mb-1">Select Store</h3>
              <div className="flex items-center justify-between w-full bg-white py-2 px-1">
                <button
                  onClick={() => {
                    setIsStoreChanging(true);
                    setTimeout(() => {
                      setSelectedStore(prev => prev === 'pedralbes' ? 'eixample' : 'pedralbes');
                      setIsStoreChanging(false);
                    }, 150);
                  }}
                  className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-800 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" strokeWidth={2.2} />
                </button>

                <span className={`text-[16px] font-bold text-gray-900 uppercase tracking-tight text-center flex-1 mx-4 transition-all duration-150 transform ${
                  isStoreChanging ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                }`}>
                  {selectedStore === 'pedralbes' ? 'Pedralbes Centre.' : 'Eixample Cafe.'}
                </span>

                <button
                  onClick={() => {
                    setIsStoreChanging(true);
                    setTimeout(() => {
                      setSelectedStore(prev => prev === 'pedralbes' ? 'eixample' : 'pedralbes');
                      setIsStoreChanging(false);
                    }, 150);
                  }}
                  className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-800 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" strokeWidth={2.2} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Success Order Modal Popup */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-[#18181b]/60 z-50 flex items-center justify-center p-4 backdrop-blur-[3px]">
          <div className="bg-white w-full max-w-[400px] rounded-3xl p-6 flex flex-col items-center justify-center gap-6 shadow-2xl relative">
            <div className="w-16 h-16 rounded-full bg-[#FDBD38]/10 flex items-center justify-center text-[#FDBD38]">
              <Check className="w-8 h-8" strokeWidth={3} />
            </div>
            <div className="flex flex-col gap-1.5 text-center">
              <h3 className="text-[20px] font-bold text-gray-900 leading-tight">
                Order Confirmed!
              </h3>
              <p className="text-[13px] text-gray-500 font-medium leading-normal">
                Your order {createdOrderNumber} has been received. Please show this screen at the counter to pick up your merch.
              </p>
            </div>
            <button
              onClick={() => {
                setShowSuccessModal(false);
                router.push('/orders');
              }}
              className="w-full bg-[#FDBD38] hover:bg-[#e5a420] text-white py-3.5 rounded-full font-semibold text-[14px] text-center transition-all active:scale-[0.98]"
            >
              Go to Order History
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
