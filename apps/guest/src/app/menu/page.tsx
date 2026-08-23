'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useGuest } from '@/lib/guest-context';
import { getMenu, createOrder, requestOtp, verifyOtp } from '@/lib/api-client';
import type { GuestMenuResponse, GuestMenuItem } from '@corgi/contracts';
import Link from 'next/link';
import { 
  ArrowLeft, 
  ChevronDown, 
  ChevronLeft,
  ChevronRight,
  Sliders, 
  X, 
  Sparkle, 
  Sparkles,
  ShoppingBag, 
  ArrowRight,
  Plus,
  Minus,
  Check,
  Info,
  Store,
  RefreshCw,
  Tag,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
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
  locale: "en",
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
      categoryName: "Coffee",
      name: "Bacon & Egg Bagel",
      description: "A freshly toasted artisanal bagel loaded with organic pasture-raised fried egg, thick-cut crispy bacon, melted local cheddar, and our homemade signature herb garlic sauce.",
      image: "",
      basePrice: 7.50,
      allergens: ["gluten", "eggs", "milk", "sesame"],
      tags: [],
      modifierGroups: [
        {
          id: "mod-bagel-extras",
          name: "Add Extras",
          minQty: 0,
          maxQty: 2,
          options: [
            { id: "opt-bagel-egg", name: "Extra Egg", price: 1.00 },
            { id: "opt-bagel-avocado", name: "Avocado Slices", price: 1.50 }
          ]
        }
      ]
    },
    {
      id: "item-2",
      categoryId: "cat-coffee",
      categoryName: "Coffee",
      name: "Corgi Signature Espresso",
      description: "Our signature house blend coffee prepared with double shot espresso, organic whole milk, and topped with our secret recipe sweet cream for a rich, velvety finish.",
      image: "",
      basePrice: 4.50,
      allergens: ["milk"],
      tags: [],
      modifierGroups: [
        {
          id: "mod-milk",
          name: "Milk options",
          minQty: 0,
          maxQty: 1,
          options: [
            { id: "opt-oat", name: "Oat Milk", price: 0.50 },
            { id: "opt-almond", name: "Almond Milk", price: 0.50 },
            { id: "opt-extra-shot", name: "Extra Espresso Shot", price: 1.00 }
          ]
        }
      ]
    },
    {
      id: "item-3",
      categoryId: "cat-brunch",
      categoryName: "Brunch",
      name: "Avocado Toast",
      description: "Slices of toasted sourdough loaded with creamy smashed avocado, drizzled with premium cold-pressed extra virgin olive oil, toasted pumpkin seeds, pine nuts, fresh cucumbers, radishes, and a touch of flaky Maldon salt.",
      image: "",
      basePrice: 6.75,
      allergens: ["gluten", "nuts"],
      tags: [],
      modifierGroups: [
        {
          id: "mod-fancy-bread",
          name: "Add Extras",
          minQty: 0,
          maxQty: 2,
          options: [
            { id: "opt-poached-egg", name: "Poached Egg", price: 1.20 },
            { id: "opt-feta-cheese", name: "Crumbled Feta", price: 1.00 }
          ]
        }
      ]
    },
    {
      id: "item-4",
      categoryId: "cat-brunch",
      categoryName: "Brunch",
      name: "Brunch Plate",
      description: "A hearty plate featuring two organic eggs cooked to your liking, roasted cherry tomatoes, freshly toasted sourdough bread, fragrant garden herbs, and a crisp side salad dressed with house vinaigrette.",
      image: "",
      basePrice: 12.50,
      allergens: ["gluten", "eggs"],
      tags: [],
      modifierGroups: [
        {
          id: "mod-extras",
          name: "Add Extras",
          minQty: 0,
          maxQty: 2,
          options: [
            { id: "opt-bacon", name: "Bacon", price: 1.50 },
            { id: "opt-cheese", name: "Cheese", price: 1.00 },
            { id: "opt-salmon", name: "Smoked Salmon", price: 3.00 }
          ]
        }
      ]
    },
    {
      id: "item-5",
      categoryId: "cat-pastry",
      categoryName: "Pastry",
      name: "Butter Croissant",
      description: "Flaky, multi-layered French butter pastry crafted with Normandy butter, baked fresh in-house every morning until golden brown and crispy on the outside, soft on the inside.",
      image: "",
      basePrice: 2.80,
      allergens: ["gluten", "milk", "eggs"],
      tags: [],
      modifierGroups: [
        {
          id: "mod-croissant-spread",
          name: "Add Jam / Spread",
          minQty: 0,
          maxQty: 2,
          options: [
            { id: "opt-croissant-jam", name: "Strawberry Jam", price: 0.50 },
            { id: "opt-croissant-nutella", name: "Nutella", price: 0.80 }
          ]
        }
      ]
    },
    {
      id: "item-6",
      categoryId: "cat-drinks",
      categoryName: "Drinks",
      name: "Matcha Latte",
      description: "Vibrant, premium organic stone-ground Japanese ceremonial grade matcha whisked to perfection and served with warm, velvety steamed organic oat milk.",
      image: "",
      basePrice: 4.80,
      allergens: ["gluten"],
      tags: [],
      modifierGroups: [
        {
          id: "mod-matcha-sweetener",
          name: "Add Sweetener",
          minQty: 0,
          maxQty: 1,
          options: [
            { id: "opt-honey", name: "Honey", price: 0.30 },
            { id: "opt-agave", name: "Agave Syrup", price: 0.30 }
          ]
        }
      ]
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
  },
  {
    id: "upsell-sweet-4",
    name: "Chocolate Cookie",
    price: 2.50,
    image: "/shoyu_pecan_pie.jpg"
  },
  {
    id: "upsell-sweet-5",
    name: "Blueberry Muffin",
    price: 2.80,
    image: "/carrot_cake.jpg"
  },
  {
    id: "upsell-sweet-6",
    name: "Cinnamon Roll",
    price: 3.90,
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
  },
  {
    id: "upsell-drink-4",
    name: "Matcha Latte",
    price: 4.80,
    image: "/cold_pressed.jpg"
  },
  {
    id: "upsell-drink-5",
    name: "Cappuccino",
    price: 3.50,
    image: "/beer.jpg"
  },
  {
    id: "upsell-drink-6",
    name: "Lemon Mint Soda",
    price: 3.80,
    image: "/fresh_juice.jpg"
  }
];

export default function MenuPage() {
  const { 
    bootstrap, 
    locale, 
    orderMode, 
    setOrderMode,
    isLoggedIn, 
    profileName, 
    refreshAuth, 
    foodCart, 
    addFoodToCart, 
    updateFoodQty, 
    clearFoodCart,
    showCartBarInsteadOfNav,
    setShowCartBarInsteadOfNav
  } = useGuest();

  const isNewRecipe = (name: string) => {
    const n = name.toLowerCase();
    return n.includes('latte') || n.includes('bagel') || n.includes('croissant');
  };

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

  // Checkout and Order details states
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [activeTipTab, setActiveTipTab] = useState<string>('tip-no');
  const [customTipAmount, setCustomTipAmount] = useState<number>(0);
  const [createdOrderNumber, setCreatedOrderNumber] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showOrderModeModal, setShowOrderModeModal] = useState(false);
  const [selectedStore, setSelectedStore] = useState<'pedralbes' | 'eixample'>('pedralbes');
  const [isStoreChanging, setIsStoreChanging] = useState(false);
  const [isPromoOpen, setIsPromoOpen] = useState(false);
  const [isAllergiesOpen, setIsAllergiesOpen] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

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
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register_step1' | 'register_step2' | 'register_otp'>('login');
  const [authEmail, setAuthEmail] = useState("");
  const [authPhone, setAuthPhone] = useState("+34 ");
  const [authOtpCode, setAuthOtpCode] = useState("");
  const [authDevCode, setAuthDevCode] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authPassword, setAuthPassword] = useState("");
  const [authConfirmPassword, setAuthConfirmPassword] = useState("");
  const [authFullName, setAuthFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const formatSpanishPhoneNumber = (val: string): string => {
    const digits = val.replace(/\D/g, '');
    let local = digits;
    if (local.startsWith('34')) {
      local = local.slice(2);
    }
    local = local.slice(0, 9);

    if (local.length === 0) return '+34 ';
    if (local.length <= 3) return `+34 ${local}`;
    if (local.length <= 6) return `+34 ${local.slice(0, 3)} ${local.slice(3)}`;
    return `+34 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (sessionStorage.getItem('corgi_just_registered') === 'true') {
        setShowWelcomeModal(true);
        sessionStorage.removeItem('corgi_just_registered');
      }
    }
  }, []);

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

  const handleCheckout = () => {
    setShowCartOverlay(false);
    setShowOrderDetails(true);
  };

  const handleFinalPayment = async (method: 'applepay' | 'card') => {
    if (!bootstrap?.locationId || foodCart.length === 0) return;
    try {
      const order = await createOrder({
        locationId: bootstrap.locationId,
        tableId: bootstrap.tableId || undefined,
        items: foodCart,
      });
      setCreatedOrderNumber(`ORD-${order.orderNumber}`);
      clearFoodCart();
      setShowOrderDetails(false);
      setShowSuccessModal(true);
    } catch (err: any) {
      alert(`Payment failed: ${err.message}`);
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

  const cartTotal = foodCart.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0);
  
  const getTipAmount = () => {
    if (activeTipTab === 'tip-5') return Number((cartTotal * 0.05).toFixed(2));
    if (activeTipTab === 'tip-10') return Number((cartTotal * 0.10).toFixed(2));
    if (activeTipTab === 'tip-other') return customTipAmount;
    return 0;
  };
  const tipAmount = getTipAmount();

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
          <div className="flex-1 flex justify-center min-w-0">
            <div 
              onClick={() => setShowOrderModeModal(true)}
              className="bg-white/95 hover:bg-white border border-black/5 rounded-full px-4 py-2 flex items-center gap-2 shadow-sm shadow-black/5 cursor-pointer transition-all active:scale-[0.98] min-w-0 max-w-full"
            >
              <span className="w-2 h-2 rounded-full bg-[#4ADE80] animate-pulse flex-shrink-0" />
              <div className="flex items-center gap-1.5 text-xs text-gray-900 min-w-0">
                <span className="font-bold tracking-tight truncate max-w-[110px]">
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

          {/* Settings Control Filter icon */}
          <button 
            onClick={() => setShowFiltersModal(true)}
            className="w-10 h-10 bg-white/95 hover:bg-white text-gray-900 rounded-full flex items-center justify-center shadow-sm shadow-black/5 transition-all active:scale-95 flex-shrink-0 relative"
          >
            <Sliders className="w-4 h-4" strokeWidth={2.2} />
            {(selectedDiet || excludedAllergens.length > 0 || sortBy !== 'default') && (
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-[#FDBD38] rounded-full border-2 border-white" />
            )}
          </button>
        </div>

        {/* Search Bar Input Row */}
        <div className="px-4 pb-3">
          <div className="relative flex items-center bg-white border border-gray-100 rounded-full px-4 py-2.5 shadow-sm">
            <svg className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input 
              type="text" 
              placeholder="Search dishes, drinks..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-base text-gray-900 placeholder-gray-400 font-semibold"
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
                    isSelected ? 'text-black font-bold' : 'text-gray-400 hover:text-black'
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
              <h3 className="text-lg font-bold text-gray-900 mb-1 uppercase tracking-tight">No dishes found</h3>
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
                    <h2 className="text-lg font-bold uppercase tracking-wider text-black">
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
                            {isNewRecipe(item.name) && (
                              <div className="absolute top-3 left-3 bg-corgi text-gray-950 text-[10px] font-normal uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                                <Sparkle className="w-3 h-3 fill-current" />
                                <span>New recipe</span>
                              </div>
                            )}
                          </div>

                          {/* Text descriptions */}
                          <div className="flex flex-col gap-0.5">
                            <h4 className="font-bold text-[12px] text-black uppercase tracking-tight leading-snug truncate w-full">
                              {item.name}
                            </h4>
                            <p className="text-[10px] text-gray-400 font-normal leading-normal line-clamp-2">
                              {item.description || 'Nutritious honest food made fresh daily.'}
                            </p>
                          </div>

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
                              {isNewRecipe(item.name) && (
                                <div className="absolute top-4 left-4 bg-corgi text-gray-950 text-[10px] font-normal uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                                  <Sparkle className="w-3 h-3 fill-current" />
                                  <span>New recipe</span>
                                </div>
                              )}
                            </div>

                            {/* Item information area */}
                            <div className="p-6 bg-white flex flex-col gap-3 text-left">
                              <div className="flex flex-col gap-1">
                                <h3 className="font-bold text-[15px] text-black uppercase tracking-tight leading-snug truncate w-full">
                                  {item.name}
                                </h3>
                                <p className="text-[11px] text-gray-400 font-normal leading-relaxed line-clamp-2">
                                  {item.description || 'Extra virgin olive oil, pumpkin seeds, pine nuts, cucumber, radish, flaky salt.'}
                                </p>
                              </div>

                              {/* Price and tag row */}
                              <div className="flex items-center justify-between mt-1 pt-1">
                                <span className="text-[15px] font-bold text-black">
                                  {item.basePrice.toFixed(2)}€
                                </span>
                                <span className="border border-gray-200 rounded-[6px] px-2 py-0.5 text-[9px] font-bold text-gray-400 tracking-wide uppercase">
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
      {foodCart.length > 0 && (
        <div 
          className={`fixed bottom-0 left-0 right-0 z-45 p-4 flex justify-center bg-gradient-to-t from-white via-white/95 to-transparent pointer-events-none transition-all duration-500 ease-in-out transform ${
            (!selectedItem && !showUpsellModal && !showOrderDetails && showCartBarInsteadOfNav)
              ? 'translate-y-0 opacity-100'
              : 'translate-y-20 opacity-0 pointer-events-none'
          }`}
        >
          <button 
            onClick={() => setShowCartOverlay(true)}
            className="w-full max-w-[440px] bg-[#FDBD38] hover:bg-[#e5a420] text-white py-4 rounded-full font-semibold flex items-center justify-between px-6 transition-all active:scale-[0.99] shadow-none pointer-events-auto"
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
                  {foodCart.reduce((sum, item) => sum + item.quantity, 0)} items
                </span>
                <span className="text-[15px] font-semibold text-white">{cartTotal.toFixed(2)}€</span>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Item Customization Sheet (Bottom sheet overlay modal) */}
      <div 
        className={`fixed inset-0 bg-transparent z-50 transition-opacity duration-300 flex items-end justify-center ${
          selectedItem ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setSelectedItem(null)}
      >
        <div 
          className={`w-full max-w-[480px] h-[100dvh] bg-white rounded-t-none overflow-hidden transition-transform duration-300 ease-out transform flex flex-col shadow-2xl relative ${
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
                  <h2 className="text-[20px] font-bold tracking-tight leading-none text-black uppercase">
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
                       <h3 className="text-[13px] font-bold text-gray-900 uppercase tracking-wider mb-4">
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
                                   <div className="absolute -top-1 -right-1 bg-[#FDBD38] text-black w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm border border-white">
                                     ✓
                                   </div>
                                 )}
                               </div>
                               <span className="text-[12px] font-bold text-gray-900 mt-2 text-center max-w-[90px] leading-tight">
                                 {option.name}
                               </span>
                               <span className="w-4 border-t border-gray-250 my-1 group-hover:border-gray-400 transition-colors"></span>
                               <span className="text-[11px] font-bold text-gray-900 opacity-80">
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

          {/* Fixed Bottom Footer */}
          <div className="px-6 pb-4 pt-2 flex-shrink-0 bg-transparent">
            {/* Unified Quantity Selector & Add to Bag CTA Button */}
            <div className="w-full bg-[#FDBD38] text-white p-2 rounded-full flex items-center shadow-none mt-2 transition-all hover:opacity-[0.98]">
              {/* Standalone Quantity selectors */}
              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-10 h-10 hover:bg-white/10 active:scale-95 rounded-full flex items-center justify-center text-white cursor-pointer transition-colors"
                >
                  <Minus className="w-4 h-4" strokeWidth={3.2} />
                </button>
                <span className="text-[16px] font-bold text-white w-5 text-center select-none">
                  {quantity}
                </span>
                <button 
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-10 h-10 hover:bg-white/10 active:scale-95 rounded-full flex items-center justify-center text-white cursor-pointer transition-colors"
                >
                  <Plus className="w-4 h-4" strokeWidth={3.2} />
                </button>
              </div>

              {/* Vertical Divider */}
              <div className="w-[1px] h-8 bg-white/20 mx-2" />

              {/* Primary Add to bag trigger */}
              <button
                type="button"
                onClick={handleAddToCart}
                className="flex-1 flex justify-between items-center pl-3 pr-4 py-2 text-white font-semibold text-[15px] cursor-pointer active:scale-[0.99] transition-all"
              >
                 <span>Add to bag</span>
                 <span className="font-bold text-[16px]">{totalPrice.toFixed(2)}€</span>
               </button>
            </div>
          </div>
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
          className={`w-full max-w-[480px] bg-[#FAF7F2] rounded-t-[16px] pt-8 px-6 pb-6 transition-transform duration-300 ease-out transform flex flex-col gap-5 shadow-2xl relative ${
            showUpsellModal ? 'translate-y-0' : 'translate-y-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-start w-full mb-1">
            <div className="flex flex-col">
              <h2 className="text-[22px] font-bold text-gray-900 uppercase tracking-tight leading-none">
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
                <div key={item.id} className="flex-shrink-0 w-[135px] bg-white rounded-xl overflow-hidden flex flex-col border border-gray-100">
                  <img src={item.image} alt={item.name} className="w-full aspect-square object-cover" />
                  <div className="bg-white p-2 flex flex-col justify-between flex-grow gap-1.5">
                    <span className="text-[10px] font-bold text-gray-900 tracking-tight leading-tight uppercase line-clamp-2 min-h-[26px]">
                      {item.name}
                    </span>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[10px] font-bold text-gray-900">{item.price.toFixed(2)}€</span>
                      <button 
                        onClick={() => handleAddUpsellItem(item)}
                        className="w-5 h-5 bg-corgi text-white hover:bg-[#e5a420] rounded-md flex items-center justify-center transition-all duration-150 active:scale-90 cursor-pointer"
                      >
                        {count > 0 ? (
                          <span className="text-[9px] font-bold">{count}</span>
                        ) : (
                          <Plus size={10} strokeWidth={3} className="text-white" />
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
            <h2 className="text-[22px] font-bold text-gray-900 uppercase tracking-tight leading-none">
              Add a drink.
            </h2>
          </div>

          {/* Drinks Horizontal Scroll */}
          <div className="flex overflow-x-auto gap-4 pb-2 px-6 -mx-6 scrollbar-none scroll-smooth">
            {UPSELL_DRINKS.map((item) => {
              const count = getCartItemCount(item.id);
              return (
                <div key={item.id} className="flex-shrink-0 w-[135px] bg-white rounded-xl overflow-hidden flex flex-col border border-gray-100">
                  <img src={item.image} alt={item.name} className="w-full aspect-square object-cover" />
                  <div className="bg-white p-2 flex flex-col justify-between flex-grow gap-1.5">
                    <span className="text-[10px] font-bold text-gray-900 tracking-tight leading-tight uppercase line-clamp-2 min-h-[26px]">
                      {item.name}
                    </span>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[10px] font-bold text-gray-900">{item.price.toFixed(2)}€</span>
                      <button 
                        onClick={() => handleAddUpsellItem(item)}
                        className="w-5 h-5 bg-corgi text-white hover:bg-[#e5a420] rounded-md flex items-center justify-center transition-all duration-150 active:scale-90 cursor-pointer"
                      >
                        {count > 0 ? (
                          <span className="text-[9px] font-bold">{count}</span>
                        ) : (
                          <Plus size={10} strokeWidth={3} className="text-white" />
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
              className="w-full bg-[#FDBD38] hover:bg-[#e5a420] text-white py-3 pl-6 pr-4 rounded-full font-bold flex items-center justify-between active:scale-[0.98] transition-all duration-100 shadow-md shadow-black/10"
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
        className={`fixed inset-0 bg-transparent z-50 transition-all duration-300 flex items-end justify-center backdrop-blur-[3px] ${
          showCartOverlay ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setShowCartOverlay(false)}
      >
        <div 
          className={`w-full max-w-[480px] bg-white rounded-t-[16px] pt-8 px-6 pb-8 transition-transform duration-300 ease-out transform flex flex-col gap-6 shadow-2xl relative ${
            showCartOverlay ? 'translate-y-0' : 'translate-y-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex flex-col w-full gap-1">
            <div className="flex justify-between items-center w-full">
              <h2 className="text-[22px] font-bold text-gray-900 uppercase tracking-tight leading-none">
                YOUR BASKET
              </h2>
              <button 
                onClick={() => setShowCartOverlay(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors text-black -mr-1"
              >
                <X className="w-5 h-5" strokeWidth={1.8} />
              </button>
            </div>
            <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
              Review your items
            </span>
          </div>

          {/* List items */}
          <div className="flex flex-col gap-4 max-h-[220px] overflow-y-auto scrollbar-none py-1">
            {foodCart.map((item) => (
              <div key={item.key} className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-[13px] text-gray-800 uppercase tracking-tight">{item.name}</span>
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
                  <span className="text-[11px] font-medium text-gray-400 mt-0.5">{(item.unitPrice).toFixed(2)}€ each</span>
                </div>
                
                <div className="flex items-center gap-3 bg-gray-100 px-2.5 py-1 rounded-full">
                  <button 
                    onClick={() => updateFoodQty(item.key, -1)}
                    className="p-0.5 hover:bg-white rounded-full transition-colors text-black"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-xs font-semibold text-gray-700 w-4 text-center">{item.quantity}</span>
                  <button 
                    onClick={() => updateFoodQty(item.key, 1)}
                    className="p-0.5 hover:bg-white rounded-full transition-colors text-black"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="flex items-center justify-between text-sm border-t border-gray-100 pt-4 text-gray-900">
            <span className="font-semibold">Total</span>
            <span className="font-bold text-base text-black">{cartTotal.toFixed(2)}€</span>
          </div>

          {/* Place Order button */}
          <button 
            onClick={handleCheckout}
            className="w-full bg-[#FDBD38] hover:bg-[#e5a420] text-white py-4 rounded-full font-semibold text-center text-[15px] transition-all active:scale-[0.99] flex items-center justify-center gap-2 shadow-none"
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
          className={`w-full max-w-[480px] bg-white rounded-t-[16px] pt-8 px-6 pb-8 transition-transform duration-300 ease-out transform flex flex-col gap-6 shadow-2xl relative ${
            showLoginModal ? 'translate-y-0' : 'translate-y-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Block */}
          <div className="flex justify-between items-start w-full">
            <div className="flex flex-col">
              <h2 className="text-[28px] font-bold tracking-tight leading-none text-[#FDBD38] uppercase">
                {authMode === 'login' ? 'WELCOME BACK!' : 'CREATE ACCOUNT'}
              </h2>

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
                    className="w-full bg-[#F4F4F5] hover:bg-[#E4E4E7] focus:bg-white border border-gray-200/60 focus:border-[#FDBD38] rounded-2xl py-4 px-5 text-base text-black font-medium transition-all outline-none placeholder-gray-400 focus:ring-4 focus:ring-[#FDBD38]/10"
                  />
                </div>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full bg-[#F4F4F5] hover:bg-[#E4E4E7] focus:bg-white border border-gray-200/60 focus:border-[#FDBD38] rounded-2xl py-4 pl-5 pr-12 text-base text-black font-medium transition-all outline-none placeholder-gray-400 focus:ring-4 focus:ring-[#FDBD38]/10"
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
                  className="w-full bg-[#F4F4F5] hover:bg-[#E4E4E7] focus:bg-white border border-gray-200/60 focus:border-[#FDBD38] rounded-2xl py-4 px-5 text-base text-black font-medium transition-all outline-none placeholder-gray-400 focus:ring-4 focus:ring-[#FDBD38]/10"
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
                    className="w-full bg-[#F4F4F5] hover:bg-[#E4E4E7] focus:bg-white border border-gray-200/60 focus:border-[#FDBD38] rounded-2xl py-4 px-5 text-base text-black font-medium transition-all outline-none placeholder-gray-400 focus:ring-4 focus:ring-[#FDBD38]/10"
                  />
                </div>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full bg-[#F4F4F5] hover:bg-[#E4E4E7] focus:bg-white border border-gray-200/60 focus:border-[#FDBD38] rounded-2xl py-4 pl-5 pr-12 text-base text-black font-medium transition-all outline-none placeholder-gray-400 focus:ring-4 focus:ring-[#FDBD38]/10"
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
                    className="w-full bg-[#F4F4F5] hover:bg-[#E4E4E7] focus:bg-white border border-gray-200/60 focus:border-[#FDBD38] rounded-2xl py-4 pl-5 pr-12 text-base text-black font-medium transition-all outline-none placeholder-gray-400 focus:ring-4 focus:ring-[#FDBD38]/10"
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
            <div className="flex flex-col gap-3 w-full">
              <button 
                onClick={() => {
                  if (typeof window !== 'undefined') localStorage.setItem('corgi_mock_user', 'Apple User');
                  refreshAuth();
                  setShowLoginModal(false);
                }}
                className="w-full bg-[#F5F5F7] hover:bg-[#EBEBEF] rounded-full py-3.5 px-[15px] font-semibold text-[14px] text-gray-900 flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] cursor-pointer"
              >
                <svg className="w-5 h-5 fill-current text-gray-900" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-.96.04-2.13.64-2.82 1.45-.6.69-1.12 1.83-.98 2.94.1.08.2.12.31.12.87 0 1.94-.56 2.5-1.45z" />
                </svg>
                <span>Sign in with Apple</span>
              </button>
              <button 
                onClick={() => {
                  if (typeof window !== 'undefined') localStorage.setItem('corgi_mock_user', 'Google User');
                  refreshAuth();
                  setShowLoginModal(false);
                }}
                className="w-full bg-[#F5F5F7] hover:bg-[#EBEBEF] rounded-full py-3.5 px-[15px] font-semibold text-[14px] text-gray-900 flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] cursor-pointer"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.17-.63-.26-1.29-.26-1.89z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Sign in with Google</span>
              </button>
            </div>
          )}

          {/* Terms checkbox */}
          {(authMode === 'register_step1' || authMode === 'register_step2') && (
            <div 
              className="flex items-center justify-center gap-2.5 px-4 mx-auto cursor-pointer select-none text-center mt-1" 
              onClick={() => setAgreedToTerms(!agreedToTerms)}
            >
              <input 
                type="checkbox" 
                checked={agreedToTerms}
                onChange={() => {}} 
                className="w-4.5 h-4.5 rounded border-gray-300 text-black focus:ring-black accent-black cursor-pointer flex-shrink-0"
              />
              <span className="text-[12px] text-gray-500 font-medium leading-tight">
                By registering I confirm{' '}
                <span 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPrivacyModal(true);
                  }}
                  className="underline cursor-pointer hover:text-black"
                >
                  privacy policy
                </span> and <span className="underline cursor-pointer hover:text-black">terms</span>
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
                  ? 'bg-black text-white hover:bg-gray-900 active:scale-[0.99] cursor-pointer'
                  : 'bg-[#F4F4F5] text-gray-300 cursor-not-allowed'
              }`}
            >
              Enter
            </button>
          )}

          {authMode === 'register_step1' && (
            <button 
              disabled={!authEmail || !agreedToTerms}
              onClick={() => setAuthMode('register_step2')}
              className={`w-full py-4 rounded-full font-bold text-center text-base transition-all ${
                (authEmail && agreedToTerms)
                  ? 'bg-black text-white hover:bg-gray-900 active:scale-[0.99] cursor-pointer'
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
                if (typeof window !== 'undefined') {
                  localStorage.setItem('corgi_mock_user', authFullName.toUpperCase());
                  localStorage.removeItem('corgi_logged_out');
                }
                refreshAuth();
                setShowLoginModal(false);
                setShowWelcomeModal(true);
              }}
              className={`w-full py-4 rounded-full font-bold text-center text-base transition-all ${
                (authFullName && authPassword && authConfirmPassword && authPassword === authConfirmPassword && agreedToTerms)
                  ? 'bg-black text-white hover:bg-gray-900 active:scale-[0.99] cursor-pointer'
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
        className={`fixed inset-0 bg-transparent z-50 transition-all duration-300 flex items-end justify-center backdrop-blur-[3px] ${
          showFiltersModal ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setShowFiltersModal(false)}
      >
        <div 
          className={`w-full max-w-[480px] bg-white rounded-t-[16px] pt-8 px-6 pb-8 transition-transform duration-300 ease-out transform flex flex-col gap-6 shadow-2xl relative ${
            showFiltersModal ? 'translate-y-0' : 'translate-y-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex flex-col w-full gap-1">
            <div className="flex justify-between items-center w-full">
              <h2 className="text-[22px] font-bold text-gray-900 uppercase tracking-tight leading-none">
                FILTERS & DIET
              </h2>
              <button 
                onClick={() => setShowFiltersModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors text-black -mr-1"
              >
                <X className="w-5 h-5" strokeWidth={1.8} />
              </button>
            </div>
            <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
              Customize your meal
            </span>
          </div>

          {/* Content Scroll Area */}
          <div className="flex flex-col gap-6 max-h-[60vh] overflow-y-auto pr-1 scrollbar-none">
            
            {/* Dietary Preferences Section */}
            <div className="flex flex-col gap-3 px-0">
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Dietary Preference</span>
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
                      className={`px-4 py-2.5 rounded-2xl text-[13px] font-semibold transition-all border ${
                        active 
                          ? 'bg-[#FDBD38] border-[#FDBD38] text-white shadow-none' 
                          : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50/50'
                      }`}
                    >
                      {diet.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Exclude Allergens Section */}
            <div className="flex flex-col gap-3 px-0">
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Exclude Allergens</span>
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
                      className={`px-4 py-2.5 rounded-2xl text-[13px] font-semibold transition-all border ${
                        active 
                          ? 'bg-[#FDBD38] border-[#FDBD38] text-white shadow-none' 
                          : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50/50'
                      }`}
                    >
                      {active ? '✓ ' : ''}{allergen.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sort Options Section */}
            <div className="flex flex-col gap-3.5 px-0">
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Sort Dishes By</span>
              <div className="flex flex-col gap-4">
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
                      <span className={`text-[14px] ${active ? 'font-semibold text-black' : 'font-medium text-gray-500'}`}>
                        {option.label}
                      </span>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                        active ? 'border-[#FDBD38] bg-[#FDBD38] shadow-sm' : 'border-gray-200 bg-white'
                      }`}>
                        {active && <div className="w-2 h-2 rounded-full bg-white" />}
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
              className="flex-1 bg-[#FDBD38] hover:bg-[#e5a420] text-white py-4 rounded-full font-semibold text-center text-[15px] transition-all active:scale-[0.98] shadow-none"
            >
              Show {filteredItems.length} dishes
            </button>
          </div>

        </div>
      </div>

      {/* Bottom Sheet Order Mode Modal */}
      <div 
        className={`fixed inset-0 z-50 backdrop-blur-md bg-white/20 animate-backdrop-blur transition-all duration-300 flex items-end justify-center ${
          showOrderModeModal ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setShowOrderModeModal(false)}
      >
        <div 
          className={`w-full max-w-[480px] bg-white rounded-t-[28px] pt-8 px-6 pb-8 transition-transform duration-300 ease-out transform flex flex-col gap-6 shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-gray-100/90 relative ${
            showOrderModeModal ? 'translate-y-0' : 'translate-y-full'
          }`}
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
                  className={`w-full p-4 rounded-[20px] text-left transition-all flex items-center justify-between shadow-[0_2px_12px_rgba(0,0,0,0.04)] ${
                    active 
                      ? 'bg-amber-50/60 border-2 border-[#FDBD38] text-gray-900' 
                      : 'bg-white border border-gray-100/90 text-gray-800 hover:bg-gray-50/50'
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
 
      {/* Order Details Screen (Full height checkout overlay) */}
      <div 
        className={`fixed inset-0 bg-white z-50 transition-transform duration-300 ease-out transform flex items-center justify-center ${
          showOrderDetails ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="w-full max-w-[480px] h-[100dvh] bg-white flex flex-col shadow-2xl relative">
          
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 pb-6 flex flex-col gap-6 bg-white">
            
            {/* Header / Title Block */}
            <div className="flex flex-col w-full gap-1 mt-6">
              <div className="flex justify-between items-center w-full">
                <h2 className="text-[22px] font-bold text-gray-900 uppercase tracking-tight leading-none">
                  Review Order
                </h2>
                <button 
                  onClick={() => setShowOrderDetails(false)}
                  className="p-1 hover:bg-gray-200/55 rounded-full transition-colors text-black -mr-1"
                >
                  <X className="w-5 h-5" strokeWidth={1.8} />
                </button>
              </div>
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                {orderMode === 'pickup' ? 'Pick up' : orderMode === 'delivery' ? 'Delivery' : 'Eat in'}
              </span>
            </div>

            {/* Location details row */}
            <div className="border-y border-gray-200/55 py-5 flex flex-col gap-0.5 text-left w-full">
              <span className="text-[15px] font-semibold text-black">
                {selectedStore === 'pedralbes' ? 'Pedralbes Centre' : 'Eixample Cafe'}
              </span>
              <span className="text-[12px] text-gray-400 font-medium leading-tight">
                {selectedStore === 'pedralbes' 
                  ? 'Avinguda Diagonal, 609, 08028, Barcelona' 
                  : 'Carrer de València, 245, 08007, Barcelona'}
              </span>
              <button 
                onClick={() => setShowOrderModeModal(true)}
                className="flex items-center gap-1 text-[11px] font-bold text-gray-400 mt-2 hover:text-black transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Change store</span>
              </button>
            </div>

            {/* Summary Block */}
            <div className="flex flex-col gap-4 text-left">
              <h3 className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Summary</h3>
              
              <div className="flex flex-col gap-4">
                {foodCart.map((cartItem, idx) => {
                  return (
                    <div key={idx} className="flex items-start justify-between gap-4 pb-4 border-b border-gray-100">
                      <div className="flex items-start gap-3.5">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                          <img 
                            src={getFoodImage(cartItem.name, 'Market Plates')} 
                            alt={cartItem.name} 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="text-[14px] font-semibold text-black leading-tight">
                            {cartItem.name}
                          </span>
                          <span className="text-[11px] text-gray-400 font-semibold mt-1">
                            ({cartItem.unitPrice.toFixed(2)}€) × {cartItem.quantity}
                          </span>
                          {cartItem.comments && (
                            <span className="text-[11px] text-gray-400 font-normal italic mt-0.5">
                              "{cartItem.comments}"
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-[14px] font-semibold text-black">
                        {(cartItem.unitPrice * cartItem.quantity).toFixed(2)}€
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Staff tip section */}
            <div className="flex flex-col gap-4 text-left">
              <div className="flex justify-between items-center w-full">
                <h3 className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Staff tip</h3>
                <button onClick={() => alert('Tips support our staff directly.')} className="text-[11px] font-bold text-gray-400 hover:text-black transition-colors flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>How tips work</span>
                </button>
              </div>

              <div className="flex gap-2 w-full">
                {[
                  { id: 'tip-no', label: 'No tip' },
                  { id: 'tip-5', label: '5%' },
                  { id: 'tip-10', label: '10%' },
                  { id: 'tip-other', label: 'Other' }
                ].map((tipOpt) => {
                  const active = activeTipTab === tipOpt.id;
                  let displayLabel = tipOpt.label;
                  if (tipOpt.id === 'tip-5') {
                    displayLabel = `${(cartTotal * 0.05).toFixed(2)}€`;
                  } else if (tipOpt.id === 'tip-10') {
                    displayLabel = `${(cartTotal * 0.10).toFixed(2)}€`;
                  }
                  return (
                    <button
                      key={tipOpt.id}
                      onClick={() => {
                        setActiveTipTab(tipOpt.id);
                        if (tipOpt.id === 'tip-other') {
                          const custom = prompt('Enter tip amount (€):');
                          const parsed = parseFloat(custom || '0');
                          if (!isNaN(parsed) && parsed >= 0) {
                            setCustomTipAmount(parsed);
                          } else {
                            setActiveTipTab('tip-no');
                          }
                        }
                      }}
                      className={`flex-1 py-3 text-center rounded-2xl font-semibold text-[11px] transition-all border ${
                        active 
                          ? 'bg-[#FDBD38] border-[#FDBD38] text-white shadow-none' 
                          : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50/50'
                      }`}
                    >
                      {displayLabel}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Totals Section */}
            <div className="border-t border-gray-100 pt-5 flex flex-col gap-3 text-left">
              <div className="flex justify-between text-[13px] font-medium text-gray-800">
                <span>Subtotal</span>
                <span>{cartTotal.toFixed(2)}€</span>
              </div>
              {tipAmount > 0 && (
                <div className="flex justify-between text-[13px] font-medium text-gray-800">
                  <span>Staff Tip</span>
                  <span>{tipAmount.toFixed(2)}€</span>
                </div>
              )}
              <div className="border-t border-gray-100 my-1" />
              <div className="flex justify-between text-[16px] font-semibold text-gray-900">
                <span>Total</span>
                <span>{(cartTotal + tipAmount).toFixed(2)}€</span>
              </div>
            </div>

            {/* got a promo code accordion */}
            <div className="border-b border-gray-200/55 text-left">
              <button 
                onClick={() => setIsPromoOpen(!isPromoOpen)}
                className="flex justify-between items-center py-4 w-full cursor-pointer select-none focus:outline-none"
              >
                <div className="flex items-center gap-3">
                  <Tag className="w-4 h-4 text-gray-800" strokeWidth={1.5} />
                  <span className="text-[14px] font-semibold text-gray-900">Got a promo code?</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isPromoOpen ? 'rotate-180' : ''}`} />
              </button>
              <div 
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  isPromoOpen ? 'max-h-40 pb-4 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
                }`}
              >
                <div className="pt-1 flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Enter code" 
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-base outline-none focus:border-[#FDBD38] placeholder-gray-300 bg-white text-gray-900"
                  />
                  <button className="bg-[#FDBD38] hover:bg-[#e5a420] text-white px-5 py-3 rounded-xl text-[14px] font-semibold transition-all">
                    Apply
                  </button>
                </div>
              </div>
            </div>

            {/* any allergies accordion */}
            <div className="border-b border-gray-200/55 text-left">
              <button 
                onClick={() => setIsAllergiesOpen(!isAllergiesOpen)}
                className="flex justify-between items-center py-4 w-full cursor-pointer select-none focus:outline-none"
              >
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-4 h-4 text-gray-800" strokeWidth={1.5} />
                  <span className="text-[14px] font-semibold text-gray-900">Any allergies?</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isAllergiesOpen ? 'rotate-180' : ''}`} />
              </button>
              <div 
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  isAllergiesOpen ? 'max-h-40 pb-4 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
                }`}
              >
                <div className="pt-1 flex flex-col gap-2">
                  <p className="text-[12px] text-gray-400 font-medium leading-tight">
                    Please specify if you are allergic to any ingredients.
                  </p>
                  <input 
                    type="text" 
                    placeholder="e.g. peanuts, dairy" 
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base outline-none focus:border-[#FDBD38] placeholder-gray-300 bg-white text-gray-900"
                  />
                </div>
              </div>
            </div>

            {/* add a note section */}
            <div className="flex flex-col gap-2.5 text-left py-2">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-4 h-4 text-gray-800" strokeWidth={1.5} />
                <span className="text-[14px] font-semibold text-gray-900">Add a note (optional)</span>
              </div>
              <textarea 
                placeholder="Write a comment..." 
                rows={2}
                className="w-full border border-gray-200 rounded-xl p-4 text-base outline-none focus:border-[#FDBD38] placeholder-gray-300 resize-none bg-white text-gray-900"
              />
            </div>

            {/* Pay buttons section */}
            <div className="flex flex-col gap-3.5 text-left mt-2">
              <button 
                onClick={() => handleFinalPayment('card')}
                className="w-full bg-[#FDBD38] hover:bg-[#e5a420] text-white py-4 rounded-full font-semibold flex items-center justify-between px-6 transition-all active:scale-[0.99] shadow-none"
              >
                <span className="text-[15px] font-semibold text-white">Confirm order</span>
                <span className="text-[15px] font-semibold text-white">{(cartTotal + tipAmount).toFixed(2)}€</span>
              </button>
            </div>

          </div>

        </div>
      </div>

      {/* Order Success Modal */}
      <div 
        className={`fixed inset-0 bg-black/60 z-50 transition-opacity duration-300 flex items-center justify-center p-6 ${
          showSuccessModal ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div 
          className="bg-white w-full max-w-[400px] rounded-3xl p-6 flex flex-col items-center justify-center gap-6 shadow-2xl relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Big Checkmark */}
          <div className="w-16 h-16 rounded-full bg-[#D2EE99] flex items-center justify-center">
            <Check className="w-8 h-8 text-[#87B031]" strokeWidth={3} />
          </div>
          
          <div className="flex flex-col items-center justify-center gap-1.5 text-center">
            <h2 className="text-[20px] font-bold text-black uppercase tracking-tight leading-tight">
              Order Created!
            </h2>
            <span className="text-[14px] font-bold text-gray-800">
              {createdOrderNumber}
            </span>
            <p className="text-[12px] text-gray-400 font-medium leading-relaxed max-w-[280px] mt-2">
              Your order has been sent to the kitchen. You can track its status in the "My orders" section.
            </p>
          </div>

          <button 
            onClick={() => {
              setShowSuccessModal(false);
              router.push('/orders');
            }}
            className="w-full bg-[#FDBD38] hover:bg-[#e5a420] text-white py-3.5 rounded-full font-bold text-center text-sm shadow-md shadow-black/10 active:scale-[0.98] transition-all"
          >
            Go to My Orders
          </button>
        </div>
      </div>

      {/* Welcome Post-Registration Modal */}
      {showWelcomeModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-[2px] transition-all animate-in fade-in duration-200">
          <div 
            className="bg-white rounded-[28px] p-6 sm:p-8 max-w-[380px] w-full shadow-2xl relative text-center flex flex-col items-center gap-4 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button 
              onClick={() => setShowWelcomeModal(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Top Corgi Sticker */}
            <div className="w-24 h-24 relative mt-1 mb-1 flex items-center justify-center">
              <img 
                src="/stickers/corgi_fiesta_1.png" 
                alt="Welcome Corgi" 
                className="w-full h-full object-contain drop-shadow-md"
              />
            </div>

            {/* Title */}
            <div className="flex flex-col items-center gap-1">
              <h3 className="text-[22px] font-extrabold text-gray-900 leading-tight">
                Nice to see you, <span className="text-[#FDBD38]">{profileName || 'Friend'}</span>! 🐾
              </h3>
            </div>

            {/* Description */}
            <p className="text-[13px] text-gray-600 leading-relaxed font-normal px-2">
              We're excited to have you at Corgi Cafe! Discover our delicious <strong className="text-black font-semibold">Menu</strong>, exclusive <strong className="text-black font-semibold">Merch</strong>, and join our <strong className="text-black font-semibold">Loyalty Program</strong> to unlock rewards.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2.5 w-full mt-2">
              <button
                onClick={() => {
                  setShowWelcomeModal(false);
                  router.push('/loyalty');
                }}
                className="w-full bg-[#FDBD38] hover:bg-[#f5b328] text-white py-3.5 px-5 rounded-full font-bold text-[14px] flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-[0.98] transition-all cursor-pointer"
              >
                <span>Join Loyalty & Get 3€ Bonus</span>
                <Sparkles className="w-4.5 h-4.5 text-white fill-white" />
              </button>

              <button
                onClick={() => setShowWelcomeModal(false)}
                className="w-full bg-[#F4F4F5] hover:bg-[#E4E4E7] text-gray-800 py-3.5 px-5 rounded-full font-bold text-[14px] transition-all active:scale-[0.98] cursor-pointer"
              >
                Go to Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Policy Modal */}
      {showPrivacyModal && (
        <div 
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-[2px] transition-all animate-in fade-in duration-200"
          onClick={() => setShowPrivacyModal(false)}
        >
          <div 
            className="bg-white rounded-[28px] p-6 sm:p-8 max-w-[460px] w-full shadow-2xl relative flex flex-col gap-5 max-h-[85vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#FFF8E7] flex items-center justify-center text-[#FDBD38]">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 leading-tight">Privacy Policy</h3>
                  <span className="text-[11px] text-gray-400 font-medium">Last updated: August 2026</span>
                </div>
              </div>
              <button 
                onClick={() => setShowPrivacyModal(false)}
                className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="overflow-y-auto pr-2 flex flex-col gap-4 text-xs text-gray-600 leading-relaxed max-h-[55vh]">
              <section className="flex flex-col gap-1">
                <h4 className="font-bold text-gray-900 text-sm">1. Introduction</h4>
                <p>
                  At Corgi Cafe, we respect your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Guest Web Application, join our Loyalty Program, or place an order.
                </p>
              </section>

              <section className="flex flex-col gap-1">
                <h4 className="font-bold text-gray-900 text-sm">2. Information We Collect</h4>
                <p>
                  We may collect personal information that you voluntarily provide to us when registering, placing an order, or contacting us. This includes:
                </p>
                <ul className="list-disc pl-4 space-y-1 mt-1 text-gray-500">
                  <li>Full name, email address, and contact phone number.</li>
                  <li>Order details, purchase history, and allergen preferences.</li>
                  <li>Loyalty points, cashback balance, and rewards activity.</li>
                  <li>Technical device data (browser type, IP address, location permissions).</li>
                </ul>
              </section>

              <section className="flex flex-col gap-1">
                <h4 className="font-bold text-gray-900 text-sm">3. How We Use Your Information</h4>
                <p>
                  We process your information to fulfill your orders, manage your loyalty account, process payments, improve our services, and communicate order updates or promotional rewards.
                </p>
              </section>

              <section className="flex flex-col gap-1">
                <h4 className="font-bold text-gray-900 text-sm">4. Data Security & Protection</h4>
                <p>
                  We implement robust technical and organizational security measures designed to protect your personal data against unauthorized access, loss, or alteration in full compliance with EU GDPR requirements.
                </p>
              </section>

              <section className="flex flex-col gap-1">
                <h4 className="font-bold text-gray-900 text-sm">5. Third-Party Services</h4>
                <p>
                  We do not sell your personal data. We only share necessary information with trusted third-party providers (such as secure payment processors and delivery mapping tools) strictly to operate our services.
                </p>
              </section>

              <section className="flex flex-col gap-1">
                <h4 className="font-bold text-gray-900 text-sm">6. Your Data Rights</h4>
                <p>
                  Under European privacy laws, you have the right to access, rectify, request erasure, or export your personal information at any time by contacting support.
                </p>
              </section>

              <section className="flex flex-col gap-1 border-t border-gray-100 pt-3">
                <h4 className="font-bold text-gray-900 text-sm">7. Contact Us</h4>
                <p>
                  If you have any questions or requests regarding this policy, please reach out to our privacy team at <a href="mailto:privacy@corgicafe.com" className="text-[#FDBD38] font-semibold underline">privacy@corgicafe.com</a>.
                </p>
              </section>
            </div>

            {/* Footer Close Button */}
            <div className="pt-2 border-t border-gray-100 w-full">
              <button
                onClick={() => setShowPrivacyModal(false)}
                className="w-full bg-[#FDBD38] hover:bg-[#e5a420] text-white py-3.5 rounded-full font-bold text-sm shadow-md transition-all active:scale-[0.98] cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
