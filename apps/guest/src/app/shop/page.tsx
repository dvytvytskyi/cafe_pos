'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useGuest } from '@/lib/guest-context';
import { getMerchCatalog, createMerchOrder } from '@/lib/api-client';
import { GUEST_STORE_LOCATIONS, getGuestStoreLocation } from '@/lib/locations';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  MessageSquare,
  Menu as MenuIcon,
  Coffee,
  Gift,
  ClipboardList
} from 'lucide-react';

type ShopMerchItem = {
  id: string;
  sku: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  options: { name: string; choices: string[] }[];
};

export default function ShopPage() {
  const { 
    bootstrap, 
    locationId,
    setLocationId,
    orderMode, 
    setOrderMode,
    merchCart, 
    addMerchToCart, 
    updateMerchQty, 
    clearMerchCart,
    showCartBarInsteadOfNav,
    setShowCartBarInsteadOfNav
  } = useGuest();

  const activeStore = getGuestStoreLocation(locationId);
  const activeStoreIndex = Math.max(
    0,
    GUEST_STORE_LOCATIONS.findIndex((store) => store.id === activeStore.id)
  );
  const storeDisplayName = bootstrap?.locationName || activeStore.name;

  const router = useRouter();

  const [merchItems, setMerchItems] = useState<ShopMerchItem[]>([]);
  const [loadingMerch, setLoadingMerch] = useState(true);
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [showOrderModeModal, setShowOrderModeModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdOrderNumber, setCreatedOrderNumber] = useState<string | null>(null);
  const [isStoreChanging, setIsStoreChanging] = useState(false);

  useEffect(() => {
    if (!locationId) return;
    setLoadingMerch(true);
    getMerchCatalog(locationId)
      .then((res) => {
        setMerchItems(
          res.items.map((item) => ({
            id: item.id,
            sku: item.sku,
            name: item.name,
            description: item.description,
            price: item.price,
            category: 'merch',
            image: item.image,
            options: [],
          }))
        );
      })
      .catch((err) => {
        console.error('Failed to load merch catalog:', err);
        setMerchItems([]);
      })
      .finally(() => setLoadingMerch(false));
  }, [locationId]);

  const cycleStore = (direction: 1 | -1) => {
    if (GUEST_STORE_LOCATIONS.length <= 1) return;
    setIsStoreChanging(true);
    setTimeout(() => {
      const nextIndex =
        (activeStoreIndex + direction + GUEST_STORE_LOCATIONS.length) % GUEST_STORE_LOCATIONS.length;
      setLocationId(GUEST_STORE_LOCATIONS[nextIndex].id);
      setIsStoreChanging(false);
    }, 150);
  };

  // Local Catalog / Filter states
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<{ [key: string]: string }>({});
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [lastSelectedItem, setLastSelectedItem] = useState<any | null>(null);
  const imageScrollRef = useRef<HTMLDivElement>(null);


  const getDetailsTotalPrice = () => {
    if (!lastSelectedItem) return 0;
    return lastSelectedItem.price * quantity;
  };

  const getItemImages = (item: any): string[] => {
    if (!item?.image) return [];
    return [item.image];
  };

  const handleImageScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const index = Math.round(container.scrollTop / container.clientHeight);
    if (index !== activeImageIndex && index >= 0 && index < 4) {
      setActiveImageIndex(index);
    }
  };

  const scrollToImage = (index: number) => {
    if (imageScrollRef.current) {
      const containerHeight = imageScrollRef.current.clientHeight;
      imageScrollRef.current.scrollTo({
        top: index * containerHeight,
        behavior: 'smooth'
      });
      setActiveImageIndex(index);
    }
  };


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
    if (!locationId || merchCart.length === 0) return;
    try {
      const order = await createMerchOrder({
        locationId,
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

  const filteredItems = merchItems;

  const cartTotal = merchCart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);

  return (
    <div className="h-screen overflow-y-auto bg-white flex flex-col items-center select-none overflow-x-hidden pb-[90px] scroll-smooth">
      {/* Sticky Header Container */}
      <div className="sticky top-0 z-40 bg-[#EE635E] text-white flex flex-col w-full pb-4">
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
                <span className="font-bold tracking-tight truncate max-w-[110px]">
                  {storeDisplayName}
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
              <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-[#EE635E] text-white text-[9px] font-bold rounded-full border border-white flex items-center justify-center">
                {merchCart.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-[480px] flex-1 bg-white px-5 py-6 flex flex-col gap-6">
        
        <h2 className="text-xl font-bold text-gray-900">Merch</h2>

        {loadingMerch ? (
          <div className="grid grid-cols-2 gap-4 pb-24">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white border border-gray-100/90 rounded-[16px] overflow-hidden flex flex-col p-3 gap-2">
                <div className="w-full aspect-square rounded-[12px] bg-gray-200/70 animate-pulse relative" />
                <div className="w-3/4 h-4 rounded bg-gray-200 animate-pulse mt-1" />
                <div className="w-1/2 h-4 rounded bg-gray-100 animate-pulse" />
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <p className="text-gray-500 text-sm">No merch items available.</p>
        ) : null}

        {/* Catalog Items Product Grid */}
        {!loadingMerch && (
          <div className="grid grid-cols-2 gap-4 pb-24">
          {filteredItems.map((item) => (
            <div 
              key={item.id} 
              onClick={() => setSelectedItem(item)}
              className="bg-white border border-gray-100 rounded-[16px] overflow-hidden flex flex-col hover:opacity-98 transition-all cursor-pointer group active:scale-[0.98] relative"
            >
              {/* Product Image Wrapper */}
              <div className="w-full aspect-square bg-gray-50 flex items-center justify-center overflow-hidden relative flex-shrink-0">
                {item.image ? (
                  <img 
                    src={item.image} 
                    alt={item.name} 
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                  />
                ) : (
                  <ShoppingBag className="w-12 h-12 text-gray-300" strokeWidth={1} />
                )}
              </div>

              {/* Product Card Text Details */}
              <div className="p-4 flex flex-col justify-between flex-grow gap-2 text-left">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[13px] font-bold text-gray-900 line-clamp-2 min-h-[36px] leading-tight">
                    {item.name}
                  </span>
                  <p className="text-[11px] text-gray-400 font-semibold leading-snug line-clamp-1">
                    {item.description}
                  </p>
                </div>

                <div className="flex justify-between items-center mt-1">
                  <span className="text-[14px] font-bold text-gray-900">
                    {item.price.toFixed(2)}€
                  </span>
                  <div className="w-8 h-8 rounded-full bg-[#EE635E] hover:opacity-90 text-white flex items-center justify-center transition-all shadow-sm">
                    <Plus className="w-4 h-4 text-white" strokeWidth={2.2} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>

      {/* Floating Bottom Cart Bar */}
      {merchCart.length > 0 && (
        <div 
          className={`fixed bottom-0 left-0 right-0 z-45 p-4 flex justify-center bg-gradient-to-t from-white via-white/95 to-transparent pointer-events-none transition-all duration-500 ease-in-out transform ${
            showCartBarInsteadOfNav
              ? 'translate-y-0 opacity-100'
              : 'translate-y-20 opacity-0 pointer-events-none'
          }`}
        >
          <button 
            onClick={() => setShowCartDrawer(true)}
            className="w-full max-w-[440px] bg-[#EE635E] hover:opacity-90 text-white py-4 rounded-full font-semibold flex items-center justify-between px-6 transition-all active:scale-[0.99] shadow-none pointer-events-auto"
          >
            {/* Menu Toggle Button on the left */}
            <div 
              onClick={(e) => {
                e.stopPropagation();
                setShowCartBarInsteadOfNav(false);
              }}
              className="flex items-center justify-center w-9 h-9 bg-white/20 hover:bg-white/30 rounded-full transition-colors cursor-pointer z-50 border border-white/10"
            >
              <MenuIcon className="w-4 h-4 text-white" />
            </div>

            {/* Vertical Divider */}
            <div className="w-[1px] h-6 bg-white/20 mx-2" />

            <div className="flex-1 flex justify-between items-center pl-2">
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
            </div>
          </button>
        </div>
      )}

      {/* 1. Item Details Fullscreen Modal */}
      <div 
        className={`fixed inset-0 bg-[#18181b]/60 z-50 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[3px] ${
          selectedItem ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setSelectedItem(null)}
      >
        <div 
          className={`w-full max-w-[480px] h-screen bg-white transition-transform duration-300 ease-out transform flex flex-col shadow-2xl relative overflow-y-auto ${
            selectedItem ? 'translate-y-0' : 'translate-y-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Back Button */}
          <button 
            onClick={() => setSelectedItem(null)}
            className="absolute top-5 left-5 w-10 h-10 bg-white/95 rounded-full flex items-center justify-center text-gray-900 hover:bg-white transition-all z-50 shadow-md cursor-pointer active:scale-95"
          >
            <ArrowLeft className="w-5 h-5 text-gray-900" strokeWidth={2.2} />
          </button>

          {/* Product Cover Vertical Gallery */}
          {lastSelectedItem && (() => {
            const images = getItemImages(lastSelectedItem);
            return (
              <div className="relative w-full h-[380px] flex-shrink-0 bg-gray-50 flex">
                {/* Vertical Swiper/Scroll view */}
                <div 
                  ref={imageScrollRef}
                  onScroll={handleImageScroll}
                  className="w-full h-full overflow-y-auto snap-y snap-mandatory scroll-smooth scrollbar-none flex flex-col"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {images.map((imgUrl, index) => (
                    <div key={index} className="w-full h-full flex-shrink-0 snap-start snap-always relative overflow-hidden">
                      <img 
                        src={imgUrl} 
                        alt={`${lastSelectedItem.name} ${index + 1}`} 
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>

                {/* Vertical Thumbnails List on the right */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-30">
                  {images.map((imgUrl, index) => {
                    const active = activeImageIndex === index;
                    return (
                      <button
                        key={index}
                        onClick={() => scrollToImage(index)}
                        className={`w-[45px] h-[55px] rounded-lg overflow-hidden shadow-md transition-all border-[1.5px] cursor-pointer flex items-center justify-center p-0 relative ${
                          active 
                            ? 'border-[#EE635E] bg-transparent scale-105' 
                            : 'border-white bg-transparent'
                        }`}
                      >
                        <img 
                          src={imgUrl} 
                          alt="Thumbnail" 
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Content Details Block */}
          {lastSelectedItem && (
            <div className="px-6 py-6 flex flex-col gap-5 text-left bg-white flex-1">
              <div className="flex justify-between items-start gap-3">
                <div className="flex flex-col gap-0.5">
                  <h2 className="text-[20px] font-bold text-gray-900 uppercase tracking-tight leading-none animate-fadeIn">
                    {lastSelectedItem.name}
                  </h2>
                  <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-1">
                    SKU: {lastSelectedItem.sku}
                  </span>
                </div>
                <span className="text-[20px] font-bold text-gray-900">
                  {lastSelectedItem.price.toFixed(2)}€
                </span>
              </div>

              {/* Description */}
              <p className="text-[13px] text-gray-500 font-medium leading-relaxed">
                {lastSelectedItem.description}
              </p>

              {/* Dynamic Modifiers Options */}
              {(lastSelectedItem.options || []).map((opt: any) => (
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
                              ? 'bg-[#EE635E] border-[#EE635E] text-white shadow-none animate-pop' 
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

              {/* Unified Quantity Selector & Add to Bag CTA Button */}
              <div className="w-full bg-[#EE635E] text-white p-2 rounded-full flex items-center shadow-none mt-4 transition-all hover:opacity-[0.98]">
                {/* Standalone Quantity selectors */}
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => quantity > 1 && setQuantity(quantity - 1)}
                    className="w-10 h-10 hover:bg-white/10 active:scale-95 rounded-full flex items-center justify-center text-white cursor-pointer transition-colors"
                  >
                    <Minus className="w-4 h-4" strokeWidth={3.2} />
                  </button>
                  <span className="text-[16px] font-bold text-white w-5 text-center select-none">
                    {quantity}
                  </span>
                  <button 
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 hover:bg-white/10 active:scale-95 rounded-full flex items-center justify-center text-white cursor-pointer transition-colors"
                  >
                    <Plus className="w-4 h-4" strokeWidth={3.2} />
                  </button>
                </div>

                {/* Vertical Divider */}
                <div className="w-[1px] h-8 bg-white/20 mx-2" />

                {/* Primary Add to bag trigger */}
                <button
                  onClick={handleAddToCart}
                  className="flex-1 flex justify-between items-center pl-3 pr-4 py-2 text-white font-semibold text-[15px] cursor-pointer active:scale-[0.99] transition-all"
                >
                  <span>Add to bag</span>
                  <span className="font-bold text-[16px]">{getDetailsTotalPrice().toFixed(2)}€</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

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
              className="w-full bg-[#EE635E] hover:opacity-90 text-white py-4 rounded-full font-semibold text-center text-[15px] transition-all active:scale-[0.98] shadow-none flex justify-between px-6 items-center mt-2"
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
                        ? 'bg-[#EE635E]/10 border-[#EE635E] text-gray-900' 
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
                      <span className="w-5 h-5 rounded-full bg-[#EE635E] flex items-center justify-center">
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
                  onClick={() => cycleStore(-1)}
                  className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-800 transition-colors disabled:opacity-40"
                  disabled={GUEST_STORE_LOCATIONS.length <= 1}
                >
                  <ChevronLeft className="w-5 h-5" strokeWidth={2.2} />
                </button>

                <span className={`text-[16px] font-bold text-gray-900 uppercase tracking-tight text-center flex-1 mx-4 transition-all duration-150 transform ${
                  isStoreChanging ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                }`}>
                  {storeDisplayName}
                </span>

                <button
                  onClick={() => cycleStore(1)}
                  className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-800 transition-colors disabled:opacity-40"
                  disabled={GUEST_STORE_LOCATIONS.length <= 1}
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
            <div className="w-16 h-16 rounded-full bg-[#EE635E]/10 flex items-center justify-center text-[#EE635E]">
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
              className="w-full bg-[#EE635E] hover:opacity-90 text-white py-3.5 rounded-full font-semibold text-[14px] text-center transition-all active:scale-[0.98]"
            >
              Go to Order History
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
