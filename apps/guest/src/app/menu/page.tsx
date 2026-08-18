'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useGuest } from '@/lib/guest-context';
import { getMenu, createOrder } from '@/lib/api-client';
import type { GuestMenuResponse, GuestMenuItem } from '@corgi/contracts';
import { 
  ArrowLeft, 
  ChevronDown, 
  Sliders, 
  X, 
  Sparkle, 
  ShoppingBag, 
  ArrowRight,
  Plus,
  Minus,
  Check,
  Info
} from 'lucide-react';

const foodImages = [
  "https://pnp-storage.fra1.digitaloceanspaces.com/restaurant/b21fe648-99e5-422d-a478-0b4c351af252/menuitem/ababffa2-2838-428f-89a1-f541f94e89cb.jpeg",
  "https://pnp-storage.fra1.digitaloceanspaces.com/restaurant/b21fe648-99e5-422d-a478-0b4c351af252/menuitem/3f401ed6-bc76-4948-96c1-0e80a73e5886.jpeg",
  "https://pnp-storage.fra1.digitaloceanspaces.com/restaurant/b21fe648-99e5-422d-a478-0b4c351af252/menuitem/81e793b0-d126-42c7-8924-f465cf740f59.png"
];

const getFoodImage = (name: string, categoryName: string) => {
  const upperName = name.toUpperCase();
  if (upperName.includes("SALMON") || upperName.includes("GOAT") || upperName.includes("123")) {
    return foodImages[0];
  }
  if (upperName.includes("STRACCIATELLA") || upperName.includes("SIGNATURE") || upperName.includes("CORGI")) {
    return foodImages[1];
  }
  if (upperName.includes("AVOCADO") || upperName.includes("TOAST") || upperName.includes("BRUNCH")) {
    return foodImages[2];
  }
  return foodImages[name.length % foodImages.length];
};

const MOCK_MENU: GuestMenuResponse = {
  categories: [
    { id: "cat-coffee", name: "Coffee" },
    { id: "cat-brunch", name: "Brunch" },
    { id: "cat-pastry", name: "Pastry" },
    { id: "cat-drinks", name: "Drinks" }
  ],
  items: [
    {
      id: "item-1",
      categoryId: "cat-coffee",
      name: "123",
      description: "Organic fried egg, sliced bacon, local cheese, freshly toasted bagel, homemade signature sauce.",
      basePrice: 123.00,
      allergens: []
    },
    {
      id: "item-2",
      categoryId: "cat-coffee",
      name: "Corgi Signature",
      description: "House blend with corgi signature cream, double shot espresso, organic milk.",
      basePrice: 4.50,
      allergens: [],
      modifierGroups: [
        {
          id: "mod-milk",
          name: "Milk options",
          minQty: 0,
          maxQty: 1,
          options: [
            { id: "opt-oat", name: "Oat Milk", price: 0.50 },
            { id: "opt-almond", name: "Almond Milk", price: 0.50 }
          ]
        }
      ]
    },
    {
      id: "item-3",
      categoryId: "cat-brunch",
      name: "Avocado Toast",
      description: "Extra virgin olive oil, pumpkin seeds, pine nuts, cucumber, radish, flaky salt.",
      basePrice: 6.75,
      allergens: [],
      modifierGroups: [
        {
          id: "mod-fancy-bread",
          name: "Combine with",
          minQty: 0,
          maxQty: 1,
          options: [
            { id: "opt-double-bread", name: "Double Bread", price: 0.95 }
          ]
        }
      ]
    },
    {
      id: "item-4",
      categoryId: "cat-brunch",
      name: "Brunch Plate",
      description: "Organic eggs, cherry tomatoes, toasted sourdough, fresh herbs, side salad.",
      basePrice: 12.50,
      allergens: [],
      modifierGroups: [
        {
          id: "mod-extras",
          name: "Add Extras",
          minQty: 0,
          maxQty: 2,
          options: [
            { id: "opt-bacon", name: "Bacon", price: 1.50 },
            { id: "opt-cheese", name: "Cheese", price: 1.00 }
          ]
        }
      ]
    },
    {
      id: "item-5",
      categoryId: "cat-pastry",
      name: "Butter Croissant",
      description: "Flaky french butter pastry baked fresh daily.",
      basePrice: 2.80,
      allergens: []
    },
    {
      id: "item-6",
      categoryId: "cat-drinks",
      name: "Matcha Latte",
      description: "Organic stone-ground ceremonial matcha with steamed oat milk.",
      basePrice: 4.80,
      allergens: []
    }
  ]
};

const UPSELL_SWEETS = [
  {
    id: "upsell-sweet-1",
    name: "Shoyu Pecan Pie",
    price: 4.95,
    image: "/shoyu_pecan_pie.jpg"
  },
  {
    id: "upsell-sweet-2",
    name: "Yellow Carrot Chai Cake",
    price: 3.45,
    image: "/carrot_cake.jpg"
  },
  {
    id: "upsell-sweet-3",
    name: "Banana Bread",
    price: 3.45,
    image: "/banana_bread.jpg"
  }
];

const UPSELL_DRINKS = [
  {
    id: "upsell-drink-1",
    name: "Cold Pressed",
    price: 4.95,
    image: "/cold_pressed.jpg"
  },
  {
    id: "upsell-drink-2",
    name: "Beer",
    price: 3.75,
    image: "/beer.jpg"
  },
  {
    id: "upsell-drink-3",
    name: "Fresh Juice",
    price: 2.75,
    image: "/fresh_juice.jpg"
  }
];

export default function MenuPage() {
  const { 
    bootstrap, 
    locale, 
    orderMode, 
    isLoggedIn, 
    profileName, 
    refreshAuth, 
    foodCart, 
    addFoodToCart, 
    updateFoodQty, 
    clearFoodCart 
  } = useGuest();

  const router = useRouter();
  const [menu, setMenu] = useState<GuestMenuResponse | null>(MOCK_MENU);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [selectedItem, setSelectedItem] = useState<GuestMenuItem | null>(null);
  const [itemComments, setItemComments] = useState('');
  const [selectedModifiers, setSelectedModifiers] = useState<any[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [showUpsellModal, setShowUpsellModal] = useState(false);

  useEffect(() => {
    if (selectedItem) {
      setItemComments('');
      setSelectedModifiers([]);
      setQuantity(1);
    }
  }, [selectedItem]);

  useEffect(() => {
    if (selectedItem || showUpsellModal) {
      document.body.classList.add('item-detail-open');
    } else {
      document.body.classList.remove('item-detail-open');
    }
    return () => {
      document.body.classList.remove('item-detail-open');
    };
  }, [selectedItem, showUpsellModal]);
  
  // Custom states matching designs
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('cat-coffee');
  
  // Filters and sorting states
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDiet, setSelectedDiet] = useState<string | null>(null);
  const [excludedAllergens, setExcludedAllergens] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>('default');

  const filteredItems = React.useMemo(() => {
    if (!menu?.items) return [];
    
    let items = [...menu.items];
    
    // 1. Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter(
        item => 
          item.name.toLowerCase().includes(q) || 
          (item.description || '').toLowerCase().includes(q)
      );
    }
    
    // 2. Dietary Filter
    if (selectedDiet) {
      items = items.filter(item => {
        const nameLower = item.name.toLowerCase();
        const descLower = (item.description || '').toLowerCase();
        const allergensLower = item.allergens.map(a => a.toLowerCase());
        
        if (selectedDiet === 'gluten-free') {
          return !allergensLower.includes('gluten') && !allergensLower.includes('wheat');
        }
        if (selectedDiet === 'vegan') {
          const animalProducts = ['meat', 'fish', 'dairy', 'lactose', 'eggs', 'egg', 'cheese', 'chicken', 'bacon', 'salmon'];
          return !animalProducts.some(ap => 
            nameLower.includes(ap) || 
            descLower.includes(ap) || 
            allergensLower.includes(ap)
          );
        }
        if (selectedDiet === 'vegetarian') {
          const meatProducts = ['meat', 'fish', 'chicken', 'bacon', 'salmon'];
          return !meatProducts.some(mp => 
            nameLower.includes(mp) || 
            descLower.includes(mp) || 
            allergensLower.includes(mp)
          );
        }
        return true;
      });
    }
    
    // 3. Excluded Allergens Filter
    if (excludedAllergens.length > 0) {
      items = items.filter(item => {
        const itemAllergens = item.allergens.map(a => a.toLowerCase());
        return !excludedAllergens.some(allergen => 
          itemAllergens.includes(allergen.toLowerCase()) || 
          item.name.toLowerCase().includes(allergen.toLowerCase())
        );
      });
    }
    
    // 4. Sorting
    if (sortBy === 'price-asc') {
      items.sort((a, b) => a.basePrice - b.basePrice);
    } else if (sortBy === 'price-desc') {
      items.sort((a, b) => b.basePrice - a.basePrice);
    }
    
    return items;
  }, [menu, searchQuery, selectedDiet, excludedAllergens, sortBy]);

  const [showBanner, setShowBanner] = useState(true);
  const [showCartOverlay, setShowCartOverlay] = useState(false);
  
  // Login modal triggers
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register_step1' | 'register_step2'>('login');
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authConfirmPassword, setAuthConfirmPassword] = useState("");
  const [authFullName, setAuthFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const categoriesRef = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const isManualClickRef = useRef(false);

  useEffect(() => {
    if (bootstrap?.locationId) {
      getMenu(bootstrap.locationId, locale)
        .then((data) => {
          setMenu(data);
          if (data?.categories?.length > 0) {
            setSelectedCategoryTab(data.categories[0].id);
          }
        })
        .catch(console.error)
        .finally(() => setLoadingMenu(false));
    }
  }, [bootstrap, locale]);

  useEffect(() => {
    const parent = pageContainerRef.current;
    if (!parent) return;

    const handleScroll = () => {
      if (isManualClickRef.current) return;
      const categoryIds = Object.keys(categoriesRef.current);
      const parentRect = parent.getBoundingClientRect();

      let activeId = categoryIds[0];
      let minDistance = Infinity;

      for (const id of categoryIds) {
        const el = categoriesRef.current[id];
        if (el) {
          const rect = el.getBoundingClientRect();
          const distance = Math.abs(rect.top - parentRect.top - 160);
          if (distance < minDistance) {
            minDistance = distance;
            activeId = id;
          }
        }
      }

      if (activeId && activeId !== selectedCategoryTab) {
        setSelectedCategoryTab(activeId);
        const tabEl = document.getElementById(`tab-${activeId}`);
        if (tabEl) {
          tabEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      }
    };

    parent.addEventListener('scroll', handleScroll);
    return () => {
      parent.removeEventListener('scroll', handleScroll);
    };
  }, [menu, selectedCategoryTab]);

  const handleCategoryClick = (catId: string) => {
    setSelectedCategoryTab(catId);
    isManualClickRef.current = true;
    const element = categoriesRef.current[catId];
    if (element) {
      const headerOffset = 160;
      const elementPosition = element.getBoundingClientRect().top;
      const parent = pageContainerRef.current;
      if (parent) {
        const parentPosition = parent.getBoundingClientRect().top;
        const relativePosition = elementPosition - parentPosition + parent.scrollTop - headerOffset;
        parent.scrollTo({
          top: relativePosition,
          behavior: 'smooth'
        });
        setTimeout(() => {
          isManualClickRef.current = false;
        }, 800);
      }
    }
  };

  const getModifierImage = (name: string) => {
    const upper = name.toUpperCase();
    if (upper.includes("BREAD") || upper.includes("PAN") || upper.includes("TOAST")) {
      return foodImages[2]; // Avocado Toast image
    }
    if (
      upper.includes("EGG") || 
      upper.includes("HUEVO") || 
      upper.includes("CHEESE") || 
      upper.includes("QUESO") || 
      upper.includes("BACON") || 
      upper.includes("TOCINO")
    ) {
      return foodImages[0]; // Brunch Plate image
    }
    if (upper.includes("MILK") || upper.includes("LECHE") || upper.includes("OAT") || upper.includes("ALMOND")) {
      return foodImages[1]; // Corgi Signature Drink image
    }
    return foodImages[0]; // default fallback
  };

  const toggleModifier = (group: any, option: any) => {
    setSelectedModifiers((prev) => {
      const isSelected = prev.some((m) => m.optionId === option.id);
      if (group.maxQty === 1) {
        if (isSelected) {
          if (group.minQty === 0) {
            return prev.filter((m) => m.groupId !== group.id);
          }
          return prev;
        } else {
          const filtered = prev.filter((m) => m.groupId !== group.id);
          return [
            ...filtered,
            {
              groupId: group.id,
              groupName: group.name,
              optionId: option.id,
              optionName: option.name,
              price: option.price,
            },
          ];
        }
      } else {
        if (isSelected) {
          return prev.filter((m) => m.optionId !== option.id);
        } else {
          const groupCount = prev.filter((m) => m.groupId === group.id).length;
          if (groupCount >= group.maxQty) return prev;
          return [
            ...prev,
            {
              groupId: group.id,
              groupName: group.name,
              optionId: option.id,
              optionName: option.name,
              price: option.price,
            },
          ];
        }
      }
    });
  };

  const handleAddToCart = () => {
    if (!selectedItem) return;
    const addedPrice = selectedModifiers.reduce((acc, m) => acc + m.price, 0);
    addFoodToCart({
      menuItemId: selectedItem.id,
      itemType: 'food',
      name: selectedItem.name,
      unitPrice: selectedItem.basePrice + addedPrice,
      quantity: quantity,
      comments: itemComments || undefined,
      modifiers: selectedModifiers.length > 0 ? selectedModifiers : undefined,
    });
    setShowUpsellModal(true);
  };

  const handleAddUpsellItem = (item: { id: string; name: string; price: number }) => {
    addFoodToCart({
      menuItemId: item.id,
      itemType: 'food',
      name: item.name,
      unitPrice: item.price,
      quantity: 1,
    });
  };

  const handleCloseUpsell = () => {
    setShowUpsellModal(false);
    setSelectedItem(null);
    setItemComments('');
    setSelectedModifiers([]);
    setQuantity(1);
  };

  const getCartItemCount = (itemId: string) => {
    return foodCart.filter(item => item.menuItemId === itemId).reduce((sum, item) => sum + item.quantity, 0);
  };

  const handleCheckout = async () => {
    if (!bootstrap?.locationId || foodCart.length === 0) return;
    try {
      const order = await createOrder({
        locationId: bootstrap.locationId,
        tableId: bootstrap.tableId || undefined,
        items: foodCart,
      });
      alert(`Order ORD-${order.orderNumber} created successfully! Status: ${order.status}`);
      clearFoodCart();
      setShowCartOverlay(false);
    } catch (err: any) {
      alert(`Checkout failed: ${err.message}`);
    }
  };

  const getOrderModeLabel = () => {
    switch (orderMode) {
      case 'delivery': return 'Delivery';
      case 'pickup': return 'Pick Up';
      default: return 'Eat In Store';
    }
  };

  const getOrderModeEmoji = () => {
    switch (orderMode) {
      case 'delivery': return '🚲';
      case 'pickup': return '🛍️';
      default: return '🥗';
    }
  };

  const cartTotal = foodCart.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0);
  const totalPrice = selectedItem ? (selectedItem.basePrice + selectedModifiers.reduce((acc: any, m: any) => acc + m.price, 0)) * quantity : 0;

  if (loadingMenu) {
    return (
      <div className="h-screen w-full bg-white flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-semibold text-gray-500">Loading Corgi Menu...</span>
      </div>
    );
  }

  return (
    <div ref={pageContainerRef} className="h-screen overflow-y-auto bg-gray-50 text-gray-900 pb-[90px] font-sans select-none scroll-smooth">
      
      {/* Fixed Header section */}
      <div className="sticky top-0 z-40 bg-gradient-to-b from-[#FDBD38] to-[#FDB01A] text-gray-900 flex flex-col w-full">
        <div className="flex items-center justify-between px-4 pt-4 pb-3 gap-3">
          {/* Back button */}
          <button 
            onClick={() => router.push('/')}
            className="w-10 h-10 bg-white/95 rounded-full flex items-center justify-center shadow-sm shadow-black/5 hover:bg-white transition-all text-gray-900 active:scale-95 flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-gray-900" strokeWidth={2.2} />
          </button>

          {/* Central premium combined location/order-mode capsule selector */}
          <div className="flex-1 flex justify-center">
            <div className="bg-white/95 hover:bg-white border border-black/5 rounded-full px-4 py-2 flex items-center gap-2 shadow-sm shadow-black/5 cursor-pointer transition-all active:scale-[0.98]">
              <span className="w-2 h-2 rounded-full bg-[#4ADE80] animate-pulse flex-shrink-0" />
              <div className="flex items-center gap-1.5 text-xs text-gray-900">
                <span className="font-extrabold tracking-tight">
                  {bootstrap?.locationName || 'Eixample'}
                </span>
                <span className="text-gray-300 font-light">|</span>
                <span className="font-semibold text-gray-500 flex items-center gap-1">
                  <span>{getOrderModeEmoji()}</span>
                  <span>{getOrderModeLabel()}</span>
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 ml-0.5 flex-shrink-0" strokeWidth={2} />
            </div>
          </div>

          {/* Settings Control Filter icon */}
          <button 
            onClick={() => setShowFiltersModal(true)}
            className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm shadow-black/5 transition-all active:scale-95 flex-shrink-0 relative ${
              (selectedDiet || excludedAllergens.length > 0 || sortBy !== 'default')
                ? 'bg-[#FDBD38] hover:bg-[#e5a420] text-black font-bold'
                : 'bg-white/95 hover:bg-white text-gray-900'
            }`}
          >
            <Sliders className="w-4 h-4" strokeWidth={2.2} />
            {(selectedDiet || excludedAllergens.length > 0 || sortBy !== 'default') && (
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
            )}
          </button>
        </div>

        {/* Search Bar Input Row */}
        <div className="px-4 pb-3">
          <div className="relative flex items-center bg-white/95 border border-black/5 rounded-full px-4 py-2.5 shadow-sm">
            <svg className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input 
              type="text" 
              placeholder="Search dishes, drinks..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-sm text-gray-900 placeholder-gray-400 font-semibold"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="p-1 hover:bg-gray-150 rounded-full transition-colors"
              >
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Categories List bar (White Background, sticky inside header wrapper) */}
        <div className="bg-white flex w-full">
          <div 
            ref={tabsContainerRef}
            className="flex gap-6 overflow-x-auto scrollbar-none px-6 py-4 w-full"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {menu?.categories.map((category) => {
              const isSelected = selectedCategoryTab === category.id;
              return (
                <button
                  id={`tab-${category.id}`}
                  key={category.id}
                  onClick={() => handleCategoryClick(category.id)}
                  className={`flex-shrink-0 text-sm font-semibold tracking-tight pb-1 relative transition-colors ${
                    isSelected ? 'text-black font-extrabold' : 'text-gray-400 hover:text-black'
                  }`}
                >
                  <span>{category.name}</span>
                  {isSelected && (
                    <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-corgi rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-[480px] mx-auto px-6 pt-5 flex flex-col gap-6">



        {/* Menu Items Categories sections block */}
        <div className="flex flex-col gap-8">
          {filteredItems.length === 0 && menu ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white rounded-3xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] animate-fadeIn my-4">
              <span className="text-5xl mb-4">🐕</span>
              <h3 className="text-lg font-black text-gray-900 mb-1 uppercase tracking-tight">No dishes found</h3>
              <p className="text-xs text-gray-400 font-medium max-w-[280px] leading-relaxed mb-6">
                We couldn't find any items matching your active search or filters. Try modifying them.
              </p>
              <button 
                onClick={() => {
                  setSearchQuery('');
                  setSelectedDiet(null);
                  setExcludedAllergens([]);
                  setSortBy('default');
                }}
                className="px-6 py-2.5 bg-[#FDBD38] text-black hover:bg-[#e5a420] active:scale-[0.98] font-bold text-xs rounded-full transition-all shadow-md shadow-black/10 uppercase tracking-wider"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            menu?.categories.map((category, catIdx) => {
              const categoryItems = filteredItems.filter(i => i.categoryId === category.id);
              if (categoryItems.length === 0) return null;

              const isFirstCategory = catIdx === 0;

              return (
                <div 
                  key={category.id}
                  ref={el => { categoriesRef.current[category.id] = el; }}
                  className="flex flex-col gap-4"
                >
                  {/* Category Title Heading */}
                  {!isFirstCategory && (
                    <h2 className="text-lg font-black uppercase tracking-wider text-black">
                      {category.name}
                    </h2>
                  )}

                  {isFirstCategory ? (
                    /* Row 1: Horizontal slider list cards layout (Matches first layout) */
                    <div 
                      className="-mx-6 px-6 flex gap-4 overflow-x-auto scrollbar-none pb-2 animate-fadeIn"
                      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                      {categoryItems.map((item) => (
                        <div 
                          key={item.id}
                          onClick={() => setSelectedItem(item)}
                          className="w-[220px] flex-shrink-0 flex flex-col gap-3 cursor-pointer hover:opacity-95 transition-opacity"
                        >
                          {/* Food image (First Style) */}
                          <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 relative">
                            <img 
                              src={getFoodImage(item.name, category.name)} 
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                            {/* Spark tag if new */}
                            {item.allergens.length === 0 && (
                              <div className="absolute top-3 left-3 bg-corgi text-gray-950 text-[10px] font-normal uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                                <Sparkle className="w-3 h-3 fill-current" />
                                <span>New recipe</span>
                              </div>
                            )}
                          </div>

                          {/* Text descriptions */}
                          <div className="flex flex-col gap-0.5">
                            <h4 className="font-bold text-[12px] text-black uppercase tracking-tight leading-snug">
                              {item.name}
                            </h4>
                            <p className="text-[10px] text-gray-400 font-normal leading-normal line-clamp-2">
                              {item.description || 'Nutritious honest food made fresh daily.'}
                            </p>
                          </div>

                          {/* Spark tag indicator list */}
                          {item.allergens.length > 0 && (
                            <div className="flex items-center gap-1 text-[11px] font-normal text-gray-400">
                              <Sparkle className="w-3 h-3 text-gray-400" />
                              <span>New recipe</span>
                            </div>
                          )}

                          {/* Price tag */}
                          <div className="text-[14px] font-bold text-black">
                            {item.basePrice.toFixed(2)}€
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Row 2+: Vertical stack list (Matches second layout: menu 11.png style) */
                    <div className="flex flex-col gap-6 w-full animate-fadeIn">
                      {categoryItems.map((item) => {
                        const dietaryTag = item.name.toLowerCase().includes('salmon') ? 'GF' : item.name.toLowerCase().includes('cheese') ? 'VE' : 'PB';
                        return (
                          <div 
                            key={item.id}
                            onClick={() => setSelectedItem(item)}
                            className="w-full bg-white rounded-3xl overflow-hidden border border-gray-100 flex flex-col hover:opacity-98 transition-all cursor-pointer"
                          >
                            {/* Image container on beige bg */}
                            <div className="w-full aspect-[4/3] bg-[#f2f2ee] relative">
                              <img 
                                src={getFoodImage(item.name, category.name)} 
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                              {/* Spark tag if new */}
                              {item.allergens.length === 0 && (
                                <div className="absolute top-4 left-4 bg-corgi text-gray-950 text-[10px] font-normal uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                                  <Sparkle className="w-3 h-3 fill-current" />
                                  <span>New recipe</span>
                                </div>
                              )}
                            </div>

                            {/* Item information area */}
                            <div className="p-6 bg-white flex flex-col gap-3 text-left">
                              <div className="flex flex-col gap-1">
                                <h3 className="font-extrabold text-[15px] text-black uppercase tracking-tight leading-snug">
                                  {item.name}
                                </h3>
                                <p className="text-[11px] text-gray-400 font-normal leading-relaxed">
                                  {item.description || 'Extra virgin olive oil, pumpkin seeds, pine nuts, cucumber, radish, flaky salt.'}
                                </p>
                              </div>

                              {/* Price and tag row */}
                              <div className="flex items-center justify-between mt-1 pt-1">
                                <span className="text-[15px] font-extrabold text-black">
                                  {item.basePrice.toFixed(2)}€
                                </span>
                                <span className="border border-gray-200 rounded-[6px] px-2 py-0.5 text-[9px] font-extrabold text-gray-400 tracking-wide uppercase">
                                  {dietaryTag}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Floating Bottom Cart Bar */}
      {foodCart.length > 0 && !selectedItem && !showUpsellModal && (
        <div className="fixed bottom-6 left-6 right-6 z-40 max-w-[432px] mx-auto animate-slideUp">
          <button 
            onClick={() => setShowCartOverlay(true)}
            className="w-full bg-black hover:bg-gray-900 text-white p-4 rounded-full font-bold flex items-center justify-between shadow-2xl active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-full flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-medium">View ordered items ({foodCart.length})</span>
            </div>
            
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold bg-white/20 px-3 py-1 rounded-full text-xs">
                {cartTotal.toFixed(2)}€
              </span>
              <ArrowRight className="w-5 h-5 text-white" />
            </div>
          </button>
        </div>
      )}

      {/* Item Customization Sheet (Bottom sheet overlay modal) */}
      <div 
        className={`fixed inset-0 bg-black/60 z-50 transition-opacity duration-300 flex items-end justify-center ${
          selectedItem ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setSelectedItem(null)}
      >
        <div 
          className={`w-full max-w-[480px] h-[95vh] bg-white rounded-t-[20px] overflow-hidden transition-transform duration-300 ease-out transform flex flex-col shadow-2xl relative ${
            selectedItem ? 'translate-y-0' : 'translate-y-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Scrollable Content (Header, description, custom inputs, and total/quantity footer at the end) */}
          <div className="flex-1 overflow-y-auto scrollbar-none flex flex-col gap-6" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {/* Top Image Banner Section */}
            {selectedItem && (
              <div className="w-full h-[260px] relative bg-gray-150 flex-shrink-0">
                <img 
                  src={getFoodImage(selectedItem.name, 'Market Plates')} 
                  alt={selectedItem.name}
                  className="w-full h-full object-cover"
                />
                {/* Floating Back Button - Pinned to the photo, scrolls with it */}
                <button 
                  onClick={() => setSelectedItem(null)}
                  className="absolute top-5 left-5 w-9 h-9 bg-white/95 rounded-full flex items-center justify-center text-black hover:bg-white transition-all z-50 shadow-sm cursor-pointer"
                >
                  <ArrowLeft className="w-5 h-5" strokeWidth={2.2} />
                </button>
              </div>
            )}

            {/* Inner Content Block with paddings */}
            <div className="px-6 pb-6 flex flex-col gap-6">
              
              {/* Header & Description Combo Block */}
              <div className="flex flex-col text-left gap-2.5">
                <div className="flex flex-col">
                  <h2 className="text-[20px] font-extrabold tracking-tight leading-none text-black uppercase">
                    {selectedItem?.name}
                  </h2>
                  <div className="text-[16px] font-bold text-black mt-1">
                    {selectedItem?.basePrice.toFixed(2)}€
                  </div>
                </div>

                <p className="text-[14px] font-normal text-gray-800 leading-relaxed mt-0.5">
                  {selectedItem?.description || 'Select optionals and add special instructions for the preparation.'}
                </p>

                {selectedItem?.allergens && selectedItem.allergens.length > 0 && (
                  <p className="text-[12px] text-gray-400 font-normal">
                    Allergens: {selectedItem.allergens.map(a => a.charAt(0).toUpperCase() + a.slice(1)).join(' · ')}
                  </p>
                )}
              </div>

              {/* Modifier Groups Section */}
              {selectedItem?.modifierGroups && selectedItem.modifierGroups.length > 0 && (
                <div className="flex flex-col gap-6 mt-4 border-t border-gray-100 pt-6">
                  {selectedItem.modifierGroups.map((group) => (
                     <div key={group.id} className="flex flex-col text-left">
                       <h3 className="text-[13px] font-black text-gray-900 uppercase tracking-wider mb-4">
                         {group.name}
                       </h3>
                       <div className="flex flex-wrap gap-5">
                         {group.options.map((option) => {
                           const isSelected = selectedModifiers.some((m) => m.optionId === option.id);
                           return (
                             <button
                               key={option.id}
                               type="button"
                               onClick={() => toggleModifier(group, option)}
                               className="flex flex-col items-center bg-white cursor-pointer group"
                             >
                               <div className="relative">
                                 <img
                                   src={getModifierImage(option.name)}
                                   alt={option.name}
                                   className={`w-[84px] h-[84px] rounded-full object-cover transition-all duration-200 border-2 ${
                                     isSelected 
                                       ? 'border-[#FDBD38] ring-2 ring-[#FDBD38] ring-offset-2 scale-[1.03] shadow-md' 
                                       : 'border-transparent shadow-sm group-hover:scale-[1.02] group-hover:shadow-md'
                                   }`}
                                 />
                                 {isSelected && (
                                   <div className="absolute -top-1 -right-1 bg-[#FDBD38] text-black w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold shadow-sm border border-white">
                                     ✓
                                   </div>
                                 )}
                               </div>
                               <span className="text-[12px] font-bold text-gray-900 mt-2 text-center max-w-[90px] leading-tight">
                                 {option.name}
                               </span>
                               <span className="w-4 border-t border-gray-250 my-1 group-hover:border-gray-400 transition-colors"></span>
                               <span className="text-[11px] font-extrabold text-gray-900 opacity-80">
                                 +{option.price.toFixed(2)}€
                               </span>
                             </button>
                           );
                         })}
                       </div>
                     </div>
                   ))}
                </div>
              )}
            </div>

            {/* Footer nested inside the scrollable content view */}
            <div className="px-6 pb-6 pt-2 bg-white mt-auto border-t border-gray-100">
              {/* Total and Quantity Row */}
              <div className="flex items-center justify-between mb-5 pt-3">
                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Total</span>
                  <span className="text-[20px] font-extrabold text-black mt-0.5">
                    <span key={totalPrice} className="animate-pop inline-block">
                      {totalPrice.toFixed(2)}€
                    </span>
                  </span>
                </div>
                
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-400 hover:text-black hover:border-black transition-colors cursor-pointer"
                    aria-label="Decrease quantity"
                  >
                    <Minus size={14} strokeWidth={2.5} />
                  </button>
                  <div className="w-[42px] h-[34px] border border-black rounded-xl flex items-center justify-center text-[14px] font-black text-black overflow-hidden">
                    <span key={quantity} className="animate-pop inline-block">
                      {String(quantity).padStart(2, '0')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-400 hover:text-black hover:border-black transition-colors cursor-pointer"
                    aria-label="Increase quantity"
                  >
                    <Plus size={14} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Fixed Bottom Footer */}
          <div className="px-6 pb-4 pt-2 flex-shrink-0 bg-transparent">
            {/* Add to bag button */}
            <button 
              onClick={handleAddToCart}
              className="w-full bg-black hover:bg-gray-900 text-white py-3 pl-6 pr-4 rounded-full font-bold flex items-center justify-between active:scale-[0.98] transition-all duration-100 shadow-md shadow-black/20"
            >
              <span className="text-base font-semibold">+ Add to bag</span>
              <div className="bg-white/20 px-6 py-2 rounded-full text-white text-base font-bold overflow-hidden">
                <span key={totalPrice} className="animate-pop inline-block">
                  {totalPrice.toFixed(2)}€
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Upsell Bottom Sheet Overlay */}
      <div 
        className={`fixed inset-0 bg-black/60 z-[60] transition-opacity duration-300 flex items-end justify-center ${
          showUpsellModal ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={handleCloseUpsell}
      >
        <div 
          className={`w-full max-w-[480px] bg-[#FAF7F2] rounded-t-[32px] pt-8 px-6 pb-6 transition-transform duration-300 ease-out transform flex flex-col gap-5 shadow-2xl relative ${
            showUpsellModal ? 'translate-y-0' : 'translate-y-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-start w-full mb-1">
            <div className="flex flex-col">
              <h2 className="text-[20px] font-black tracking-tight leading-none text-black uppercase">
                Fancy a sweet ending?
              </h2>
            </div>
            
            <button 
              onClick={handleCloseUpsell}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors text-black -mt-2 -mr-2"
            >
              <X className="w-5 h-5" strokeWidth={2} />
            </button>
          </div>

          {/* Sweets Horizontal Scroll */}
          <div className="flex overflow-x-auto gap-4 pb-2 px-6 -mx-6 scrollbar-none scroll-smooth">
            {UPSELL_SWEETS.map((item) => {
              const count = getCartItemCount(item.id);
              return (
                <div key={item.id} className="flex-shrink-0 w-[110px] bg-white rounded-xl overflow-hidden flex flex-col">
                  <img src={item.image} alt={item.name} className="w-full aspect-square object-cover" />
                  <div className="bg-white p-2 flex flex-col justify-between flex-grow gap-1.5">
                    <span className="text-[10px] font-black text-gray-900 tracking-tight leading-tight uppercase line-clamp-2 min-h-[26px]">
                      {item.name}
                    </span>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[10px] font-extrabold text-gray-900">{item.price.toFixed(2)}€</span>
                      <button 
                        onClick={() => handleAddUpsellItem(item)}
                        className="w-5 h-5 bg-corgi text-gray-950 hover:bg-[#e5a420] rounded-md flex items-center justify-center transition-all duration-150 active:scale-90 cursor-pointer"
                      >
                        {count > 0 ? (
                          <span className="text-[9px] font-black">{count}</span>
                        ) : (
                          <Plus size={10} strokeWidth={3} className="text-gray-950" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Drinks Header */}
          <div className="flex flex-col mt-2">
            <h2 className="text-[20px] font-black tracking-tight leading-none text-black uppercase">
              Add a drink.
            </h2>
          </div>

          {/* Drinks Horizontal Scroll */}
          <div className="flex overflow-x-auto gap-4 pb-2 px-6 -mx-6 scrollbar-none scroll-smooth">
            {UPSELL_DRINKS.map((item) => {
              const count = getCartItemCount(item.id);
              return (
                <div key={item.id} className="flex-shrink-0 w-[110px] bg-white rounded-xl overflow-hidden flex flex-col">
                  <img src={item.image} alt={item.name} className="w-full aspect-square object-cover" />
                  <div className="bg-white p-2 flex flex-col justify-between flex-grow gap-1.5">
                    <span className="text-[10px] font-black text-gray-900 tracking-tight leading-tight uppercase line-clamp-2 min-h-[26px]">
                      {item.name}
                    </span>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[10px] font-extrabold text-gray-900">{item.price.toFixed(2)}€</span>
                      <button 
                        onClick={() => handleAddUpsellItem(item)}
                        className="w-5 h-5 bg-corgi text-gray-950 hover:bg-[#e5a420] rounded-md flex items-center justify-center transition-all duration-150 active:scale-90 cursor-pointer"
                      >
                        {count > 0 ? (
                          <span className="text-[9px] font-black">{count}</span>
                        ) : (
                          <Plus size={10} strokeWidth={3} className="text-gray-950" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Continue button */}
          <div className="w-full pt-2">
            <button 
              onClick={handleCloseUpsell}
              className="w-full bg-black hover:bg-gray-900 text-white py-3 pl-6 pr-4 rounded-full font-bold flex items-center justify-between active:scale-[0.98] transition-all duration-100 shadow-md shadow-black/20"
            >
              <span className="text-base font-semibold">Continue</span>
              <div className="bg-white/20 px-6 py-2 rounded-full text-white text-base font-bold overflow-hidden">
                <span key={cartTotal} className="animate-pop inline-block">
                  {cartTotal.toFixed(2)}€
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Cart Summary Bottom Sheet Overlay */}
      <div 
        className={`fixed inset-0 bg-black/60 z-50 transition-opacity duration-300 flex items-end justify-center ${
          showCartOverlay ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setShowCartOverlay(false)}
      >
        <div 
          className={`w-full max-w-[480px] bg-white rounded-t-[32px] pt-8 px-6 pb-8 transition-transform duration-300 ease-out transform flex flex-col gap-6 shadow-2xl relative ${
            showCartOverlay ? 'translate-y-0' : 'translate-y-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-start w-full">
            <div className="flex flex-col">
              <h2 className="text-[24px] font-black tracking-tight leading-none text-black uppercase">
                YOUR BASKET
              </h2>
              <span className="text-[14px] font-semibold text-gray-500 mt-2">
                Review your items
              </span>
            </div>
            
            <button 
              onClick={() => setShowCartOverlay(false)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors text-black"
            >
              <X className="w-6 h-6" strokeWidth={1.8} />
            </button>
          </div>

          {/* List items */}
          <div className="flex flex-col gap-4 max-h-[220px] overflow-y-auto scrollbar-none py-1">
            {foodCart.map((item) => (
              <div key={item.key} className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold text-sm text-black uppercase tracking-tight">{item.name}</span>
                  {item.modifiers && item.modifiers.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {item.modifiers.map((m, idx) => (
                        <span key={idx} className="text-[10px] bg-gray-50 text-gray-500 border border-gray-200 px-1.5 py-0.5 rounded-md font-semibold">
                          +{m.optionName}
                        </span>
                      ))}
                    </div>
                  )}
                  {item.comments && (
                    <span className="text-[11px] text-gray-400 font-medium italic">"{item.comments}"</span>
                  )}
                  <span className="text-xs font-bold text-gray-500 mt-1">{(item.unitPrice).toFixed(2)}€ each</span>
                </div>
                
                <div className="flex items-center gap-3.5 bg-gray-100 px-3 py-1.5 rounded-full">
                  <button 
                    onClick={() => updateFoodQty(item.key, -1)}
                    className="p-0.5 hover:bg-white rounded-full transition-colors text-black"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-sm font-bold text-black">{item.quantity}</span>
                  <button 
                    onClick={() => updateFoodQty(item.key, 1)}
                    className="p-0.5 hover:bg-white rounded-full transition-colors text-black"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="flex items-center justify-between font-bold text-base border-t border-gray-150 pt-4 text-black">
            <span>Total</span>
            <span>{cartTotal.toFixed(2)}€</span>
          </div>

          {/* Place Order button */}
          <button 
            onClick={handleCheckout}
            className="w-full bg-black hover:bg-gray-900 text-white py-4 rounded-full font-bold text-center text-base transition-all active:scale-[0.99] flex items-center justify-center gap-2"
          >
            <span>Place Order ({getOrderModeLabel()})</span>
            <Check className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Login & Signup bottom sheet modal */}
      <div 
        className={`fixed inset-0 bg-black/60 z-50 transition-opacity duration-300 flex items-end justify-center ${
          showLoginModal ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setShowLoginModal(false)}
      >
        <div 
          className={`w-full max-w-[480px] bg-white rounded-t-[32px] pt-8 px-6 pb-8 transition-transform duration-300 ease-out transform flex flex-col gap-6 shadow-2xl relative ${
            showLoginModal ? 'translate-y-0' : 'translate-y-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Block */}
          <div className="flex justify-between items-start w-full">
            <div className="flex flex-col">
              <h2 className="text-[28px] font-extrabold tracking-tight leading-none text-black uppercase">
                {authMode === 'login' ? 'WELCOME BACK!' : 'CREATE ACCOUNT'}
              </h2>
              
              {authMode === 'login' && (
                <button 
                  onClick={() => {
                    setAuthMode('register_step1');
                    setAuthPassword("");
                    setAuthConfirmPassword("");
                    setAuthFullName("");
                  }}
                  className="flex items-center gap-1 text-[14px] font-medium text-gray-500 hover:text-black transition-colors mt-2 text-left"
                >
                  <span>New user?</span>
                  <span className="font-bold text-black flex items-center gap-1">
                    Sign up
                    <ArrowRight className="w-4 h-4" strokeWidth={2} />
                  </span>
                </button>
              )}

              {authMode === 'register_step1' && (
                <button 
                  onClick={() => setAuthMode('login')}
                  className="flex items-center gap-1 text-[14px] font-medium text-gray-500 hover:text-black transition-colors mt-2 text-left"
                >
                  <span>Already have an account?</span>
                  <span className="font-bold text-black flex items-center gap-1">
                    Log in
                    <ArrowRight className="w-4 h-4" strokeWidth={2} />
                  </span>
                </button>
              )}

              {authMode === 'register_step2' && (
                <span className="text-[14px] font-medium text-gray-500 mt-2">
                  Step 2 of 2
                </span>
              )}
            </div>
            
            {/* Close X Button */}
            <button 
              onClick={() => setShowLoginModal(false)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors text-black"
            >
              <X className="w-6 h-6" strokeWidth={1.8} />
            </button>
          </div>

          {/* Form Fields */}
          <div className="flex flex-col gap-4 w-full">
            {authMode === 'login' && (
              <>
                <div className="relative">
                  <input 
                    type="email" 
                    placeholder="Email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full bg-[#F4F4F5] hover:bg-[#E4E4E7] focus:bg-white border-2 border-transparent focus:border-black rounded-2xl py-4 px-5 text-base text-black font-medium transition-all outline-none placeholder-gray-400"
                  />
                </div>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full bg-[#F4F4F5] hover:bg-[#E4E4E7] focus:bg-white border-2 border-transparent focus:border-black rounded-2xl py-4 pl-5 pr-12 text-base text-black font-medium transition-all outline-none placeholder-gray-400"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </>
            )}

            {authMode === 'register_step1' && (
              <div className="relative">
                <input 
                  type="email" 
                  placeholder="Email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full bg-[#F4F4F5] hover:bg-[#E4E4E7] focus:bg-white border-2 border-transparent focus:border-black rounded-2xl py-4 px-5 text-base text-black font-medium transition-all outline-none placeholder-gray-400"
                />
              </div>
            )}

            {authMode === 'register_step2' && (
              <>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Full name"
                    value={authFullName}
                    onChange={(e) => setAuthFullName(e.target.value)}
                    className="w-full bg-[#F4F4F5] hover:bg-[#E4E4E7] focus:bg-white border-2 border-transparent focus:border-black rounded-2xl py-4 px-5 text-base text-black font-medium transition-all outline-none placeholder-gray-400"
                  />
                </div>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full bg-[#F4F4F5] hover:bg-[#E4E4E7] focus:bg-white border-2 border-transparent focus:border-black rounded-2xl py-4 pl-5 pr-12 text-base text-black font-medium transition-all outline-none placeholder-gray-400"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                <div className="relative">
                  <input 
                    type={showConfirmPassword ? "text" : "password"} 
                    placeholder="Confirm password"
                    value={authConfirmPassword}
                    onChange={(e) => setAuthConfirmPassword(e.target.value)}
                    className="w-full bg-[#F4F4F5] hover:bg-[#E4E4E7] focus:bg-white border-2 border-transparent focus:border-black rounded-2xl py-4 pl-5 pr-12 text-base text-black font-medium transition-all outline-none placeholder-gray-400"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors"
                  >
                    {showConfirmPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                {authPassword && authConfirmPassword && authPassword !== authConfirmPassword && (
                  <span className="text-[12px] text-rose-500 font-semibold px-5 mt-[-4px]">
                    Passwords do not match
                  </span>
                )}
              </>
            )}
          </div>

          {/* Social buttons */}
          {authMode !== 'register_step2' && (
            <div className="flex flex-col gap-3 w-full px-[25px]">
              <button 
                onClick={() => {
                  if (typeof window !== 'undefined') localStorage.setItem('corgi_mock_user', 'Apple User');
                  refreshAuth();
                  setShowLoginModal(false);
                }}
                className="w-full border-[1.2px] border-black rounded-full py-3 px-6 font-bold text-black flex items-center justify-center gap-2 hover:bg-black/5 active:scale-[0.99] transition-all"
              >
                Sign in with Apple
              </button>
              <button 
                onClick={() => {
                  if (typeof window !== 'undefined') localStorage.setItem('corgi_mock_user', 'Google User');
                  refreshAuth();
                  setShowLoginModal(false);
                }}
                className="w-full border-[1.2px] border-black rounded-full py-3 px-6 font-bold text-black flex items-center justify-center gap-2 hover:bg-black/5 active:scale-[0.99] transition-all"
              >
                Sign in with Google
              </button>
            </div>
          )}

          {/* Terms checkbox on register step 2 */}
          {authMode === 'register_step2' && (
            <div 
              className="flex items-center gap-2.5 px-4 cursor-pointer select-none mt-1" 
              onClick={() => setAgreedToTerms(!agreedToTerms)}
            >
              <input 
                type="checkbox" 
                checked={agreedToTerms}
                onChange={() => {}} 
                className="w-4.5 h-4.5 rounded border-gray-300 text-black focus:ring-black accent-black cursor-pointer"
              />
              <span className="text-[12px] text-gray-500 font-medium leading-tight">
                By registering I confirm <span className="underline">privacy policy</span> and <span className="underline">terms</span>
              </span>
            </div>
          )}

          {/* Submit action */}
          {authMode === 'login' && (
            <button 
              disabled={!authEmail || !authPassword}
              onClick={() => {
                if (typeof window !== 'undefined') {
                  const nameFromEmail = authEmail.split('@')[0].toUpperCase();
                  localStorage.setItem('corgi_mock_user', nameFromEmail);
                }
                refreshAuth();
                setShowLoginModal(false);
              }}
              className={`w-full py-4 rounded-full font-bold text-center text-base transition-all ${
                (authEmail && authPassword)
                  ? 'bg-black text-white hover:bg-gray-900 active:scale-[0.99]'
                  : 'bg-[#F4F4F5] text-gray-300 cursor-not-allowed'
              }`}
            >
              Enter
            </button>
          )}

          {authMode === 'register_step1' && (
            <button 
              disabled={!authEmail}
              onClick={() => setAuthMode('register_step2')}
              className={`w-full py-4 rounded-full font-bold text-center text-base transition-all ${
                authEmail
                  ? 'bg-black text-white hover:bg-gray-900 active:scale-[0.99]'
                  : 'bg-[#F4F4F5] text-gray-300 cursor-not-allowed'
              }`}
            >
              Next
            </button>
          )}

          {authMode === 'register_step2' && (
            <button 
              disabled={!authFullName || !authPassword || !authConfirmPassword || authPassword !== authConfirmPassword || !agreedToTerms}
              onClick={() => {
                if (typeof window !== 'undefined') localStorage.setItem('corgi_mock_user', authFullName.toUpperCase());
                refreshAuth();
                setShowLoginModal(false);
              }}
              className={`w-full py-4 rounded-full font-bold text-center text-base transition-all ${
                (authFullName && authPassword && authConfirmPassword && authPassword === authConfirmPassword && agreedToTerms)
                  ? 'bg-black text-white hover:bg-gray-900 active:scale-[0.99]'
                  : 'bg-[#F4F4F5] text-gray-300 cursor-not-allowed'
              }`}
            >
              Enter
            </button>
          )}
        </div>
      </div>

      {/* Bottom Sheet Filters Modal */}
      <div 
        className={`fixed inset-0 bg-black/60 z-50 transition-opacity duration-300 flex items-end justify-center ${
          showFiltersModal ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setShowFiltersModal(false)}
      >
        <div 
          className={`w-full max-w-[480px] bg-white rounded-t-[32px] pt-8 px-6 pb-8 transition-transform duration-300 ease-out transform flex flex-col gap-6 shadow-2xl relative ${
            showFiltersModal ? 'translate-y-0' : 'translate-y-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-start w-full">
            <div className="flex flex-col pl-[25px]">
              <h2 className="text-[28px] font-extrabold tracking-tight leading-none text-black uppercase">
                FILTERS & DIET
              </h2>
              <span className="text-[12px] text-gray-500 font-bold uppercase tracking-wider mt-1.5">
                Customize your meal
              </span>
            </div>
            
            <button 
              onClick={() => setShowFiltersModal(false)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors text-black"
            >
              <X className="w-6 h-6" strokeWidth={1.8} />
            </button>
          </div>

          {/* Content Scroll Area */}
          <div className="flex flex-col gap-6 max-h-[60vh] overflow-y-auto pr-1 scrollbar-none">
            
            {/* Dietary Preferences Section */}
            <div className="flex flex-col gap-2.5 px-0">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Dietary Preference</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'gluten-free', label: 'Gluten-Free 🌾' },
                  { id: 'vegetarian', label: 'Vegetarian 🥬' },
                  { id: 'vegan', label: 'Vegan / PB 🌱' }
                ].map((diet) => {
                  const active = selectedDiet === diet.id;
                  return (
                    <button
                      key={diet.id}
                      onClick={() => setSelectedDiet(active ? null : diet.id)}
                      className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                        active 
                          ? 'bg-[#FDBD38] border-[#FDBD38] text-black shadow-sm' 
                          : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {diet.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Exclude Allergens Section */}
            <div className="flex flex-col gap-2.5 px-0">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Exclude Allergens</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'gluten', label: 'Gluten' },
                  { id: 'lactose', label: 'Dairy / Lactose' },
                  { id: 'nuts', label: 'Nuts' },
                  { id: 'eggs', label: 'Eggs' },
                  { id: 'fish', label: 'Fish / Seafood' },
                  { id: 'soy', label: 'Soy' }
                ].map((allergen) => {
                  const active = excludedAllergens.includes(allergen.id);
                  return (
                    <button
                      key={allergen.id}
                      onClick={() => {
                        if (active) {
                          setExcludedAllergens(excludedAllergens.filter(a => a !== allergen.id));
                        } else {
                          setExcludedAllergens([...excludedAllergens, allergen.id]);
                        }
                      }}
                      className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                        active 
                          ? 'bg-[#FDBD38] border-[#FDBD38] text-black shadow-sm' 
                          : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {active ? '✓ ' : ''}{allergen.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sort Options Section */}
            <div className="flex flex-col gap-2.5 px-0">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Sort Dishes By</span>
              <div className="flex flex-col gap-2.5">
                {[
                  { id: 'default', label: 'Recommended' },
                  { id: 'price-asc', label: 'Price: Low to High' },
                  { id: 'price-desc', label: 'Price: High to Low' }
                ].map((option) => {
                  const active = sortBy === option.id;
                  return (
                    <div 
                      key={option.id}
                      onClick={() => setSortBy(option.id)}
                      className="flex items-center justify-between py-1 cursor-pointer select-none"
                    >
                      <span className={`text-xs font-bold ${active ? 'text-black' : 'text-gray-600'}`}>
                        {option.label}
                      </span>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                        active ? 'border-[#FDBD38] bg-[#FDBD38]' : 'border-gray-300 bg-white'
                      }`}>
                        {active && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Action Buttons Footer */}
          <div className="flex gap-4 items-center pt-2">
            <button
              onClick={() => {
                setSelectedDiet(null);
                setExcludedAllergens([]);
                setSortBy('default');
              }}
              className="text-xs font-bold text-gray-500 hover:text-black uppercase tracking-wider px-4 py-2"
            >
              Clear all
            </button>
            
            <button
              onClick={() => setShowFiltersModal(false)}
              className="flex-1 bg-[#FDBD38] hover:bg-[#e5a420] text-black py-4 rounded-full font-bold text-center text-sm shadow-md shadow-black/10 active:scale-[0.98] transition-all"
            >
              Show {filteredItems.length} dishes
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
