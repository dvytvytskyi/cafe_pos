'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useGuest } from '@/lib/guest-context';
import { getMerchCatalog, createMerchOrder } from '@/lib/api-client';
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

const MOCK_MERCH_ITEMS = [
  // 1. Hoodies Category (Bandanas)
  {
    id: "merch-1",
    sku: "BANDANA-GREEN",
    name: "Midnight Bloom Bandana",
    description: "Premium cotton doggie bandana with direct embroidered mascot logo.",
    price: 15.00,
    category: "Hoodie",
    image: "https://optim.tildacdn.com/stor3562-3232-4362-b736-316565383739/-/format/webp/99960808.jpg.webp",
    options: [
      { name: "Size", choices: ["S", "M"] }
    ]
  },
  {
    id: "merch-2",
    sku: "BANDANA-CLASSIC",
    name: "Classic Corgi Bandana",
    description: "Our signature original design bandana made with durable, lightweight canvas.",
    price: 18.00,
    category: "Hoodie",
    image: "https://optim.tildacdn.com/stor3562-3232-4362-b736-316565383739/-/format/webp/99960808.jpg.webp",
    options: [
      { name: "Size", choices: ["S", "M", "L"] }
    ]
  },
  {
    id: "merch-3",
    sku: "BANDANA-FOREST",
    name: "Forest Green Doggie Scarf",
    description: "Warm forest green cotton blend scarf designed for cozy walks.",
    price: 14.50,
    category: "Hoodie",
    image: "https://optim.tildacdn.com/stor3562-3232-4362-b736-316565383739/-/format/webp/99960808.jpg.webp",
    options: [
      { name: "Size", choices: ["S", "M"] }
    ]
  },
  {
    id: "merch-4",
    sku: "BANDANA-FLORAL",
    name: "Retro Floral Bandana",
    description: "Vintage-inspired floral pattern dog accessory with custom leather brand tag.",
    price: 16.00,
    category: "Hoodie",
    image: "https://optim.tildacdn.com/stor3562-3232-4362-b736-316565383739/-/format/webp/99960808.jpg.webp",
    options: [
      { name: "Size", choices: ["S", "M", "L"] }
    ]
  },

  // 2. Sneakers Category (Tumblers)
  {
    id: "merch-5",
    sku: "TUMBLER-PINK",
    name: "Crimson Wave Tumbler",
    description: "Double-wall insulated travel tumbler to keep your drinks hot or cold.",
    price: 28.00,
    category: "Sneaker",
    image: "https://optim.tildacdn.com/stor6265-3164-4538-a234-373835663732/-/format/webp/40046535.jpg.webp",
    options: [
      { name: "Volume", choices: ["350ml", "450ml"] }
    ]
  },
  {
    id: "merch-6",
    sku: "TUMBLER-BLUSH",
    name: "Blush Insulated Mug",
    description: "Premium stainless steel travel mug with leak-proof lid and soft pastel grip.",
    price: 24.00,
    category: "Sneaker",
    image: "https://optim.tildacdn.com/stor6265-3164-4538-a234-373835663732/-/format/webp/40046535.jpg.webp",
    options: [
      { name: "Volume", choices: ["350ml"] }
    ]
  },
  {
    id: "merch-7",
    sku: "TUMBLER-THERMO",
    name: "Mascot Thermo Bottle",
    description: "Heavy duty thermos flask featuring direct print sleeping corgi illustration.",
    price: 32.00,
    category: "Sneaker",
    image: "https://optim.tildacdn.com/stor6265-3164-4538-a234-373835663732/-/format/webp/40046535.jpg.webp",
    options: [
      { name: "Volume", choices: ["500ml", "750ml"] }
    ]
  },
  {
    id: "merch-8",
    sku: "TUMBLER-SHAKER",
    name: "Signature Pink Shaker",
    description: "Pastel pink shaker bottle with dynamic filter grid for matcha and protein mixes.",
    price: 26.00,
    category: "Sneaker",
    image: "https://optim.tildacdn.com/stor6265-3164-4538-a234-373835663732/-/format/webp/40046535.jpg.webp",
    options: [
      { name: "Volume", choices: ["450ml"] }
    ]
  },

  // 3. Caps Category (Apparel)
  {
    id: "merch-9",
    sku: "TEE-PINK",
    name: "Signature Pink Tee",
    description: "Classic lightweight organic cotton tee featuring our cute mascot logo on the chest.",
    price: 24.90,
    category: "Face Cap",
    image: "https://optim.tildacdn.com/stor6236-3330-4237-b566-366465633238/-/format/webp/93517017.jpg.webp",
    options: [
      { name: "Size", choices: ["S", "M", "L"] }
    ]
  },
  {
    id: "merch-10",
    sku: "HOODIE-PINK-COZY",
    name: "Cozy Pink Mascot Hoodie",
    description: "Ultra-soft heavy fleece hoodie with embroidered Corgi emblem on front.",
    price: 49.90,
    category: "Face Cap",
    image: "https://optim.tildacdn.com/stor6236-3330-4237-b566-366465633238/-/format/webp/93517017.jpg.webp",
    options: [
      { name: "Size", choices: ["S", "M", "L", "XL"] }
    ]
  },
  {
    id: "merch-11",
    sku: "LONGSLEEVE-PINK",
    name: "Retro Pink Longsleeve",
    description: "Relaxed fit lightweight long sleeve shirt with printed sleeve graphics.",
    price: 34.90,
    category: "Face Cap",
    image: "https://optim.tildacdn.com/stor6236-3330-4237-b566-366465633238/-/format/webp/93517017.jpg.webp",
    options: [
      { name: "Size", choices: ["S", "M", "L"] }
    ]
  },
  {
    id: "merch-12",
    sku: "CREWNECK-PINK",
    name: "Summer Cotton Crewneck",
    description: "Comfortable fleece crewneck sweatshirt, perfect for summer nights.",
    price: 39.90,
    category: "Face Cap",
    image: "https://optim.tildacdn.com/stor6236-3330-4237-b566-366465633238/-/format/webp/93517017.jpg.webp",
    options: [
      { name: "Size", choices: ["S", "M", "L", "XL"] }
    ]
  }
];

const categories = [
  { 
    id: "Hoodie", 
    label: "Hoodies", 
    image: "https://optim.tildacdn.com/stor3562-3232-4362-b736-316565383739/-/format/webp/99960808.jpg.webp",
    slides: [
      {
        storyImage: "https://optim.tildacdn.com/stor3562-3232-4362-b736-316565383739/-/format/webp/99960808.jpg.webp",
        tagline: "Midnight Bloom green bandana. Premium cotton fabric."
      },
      {
        storyImage: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=600&auto=format&fit=crop",
        tagline: "Ultra soft oversized streetwear hoodies in classic beige."
      },
      {
        storyImage: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=600&auto=format&fit=crop",
        tagline: "Midnight Bloom Drop: Pastel aesthetics for active days."
      }
    ]
  },
  { 
    id: "Sneaker", 
    label: "Sneakers", 
    image: "https://optim.tildacdn.com/stor6265-3164-4538-a234-373835663732/-/format/webp/40046535.jpg.webp",
    slides: [
      {
        storyImage: "https://optim.tildacdn.com/stor6265-3164-4538-a234-373835663732/-/format/webp/40046535.jpg.webp",
        tagline: "Crimson Wave insulated tumbler. Keeps your coffee hot."
      },
      {
        storyImage: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=600&auto=format&fit=crop",
        tagline: "Retro chunky sneakers. Premium cushion for everyday steps."
      }
    ]
  },
  { 
    id: "Face Cap", 
    label: "Caps", 
    image: "https://optim.tildacdn.com/stor6236-3330-4237-b566-366465633238/-/format/webp/93517017.jpg.webp",
    slides: [
      {
        storyImage: "https://optim.tildacdn.com/stor6236-3330-4237-b566-366465633238/-/format/webp/93517017.jpg.webp",
        tagline: "Signature Pink Tee. Cozy fit with custom details."
      },
      {
        storyImage: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?q=80&w=600&auto=format&fit=crop",
        tagline: "Minimalist cotton baseball caps. Vintage washed colors."
      }
    ]
  },
  { 
    id: "Sneaker", 
    label: "Matcha Set", 
    image: "https://optim.tildacdn.com/stor6265-3164-4538-a234-373835663732/-/format/webp/40046535.jpg.webp",
    slides: [
      {
        storyImage: "https://optim.tildacdn.com/stor6265-3164-4538-a234-373835663732/-/format/webp/40046535.jpg.webp",
        tagline: "New Matcha Insulated Sets. Limited edition release."
      },
      {
        storyImage: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?q=80&w=600&auto=format&fit=crop",
        tagline: "Organic ceremonial grade matcha whisks & bowls."
      }
    ]
  },
  { 
    id: "Hoodie", 
    label: "Doggie Style", 
    image: "https://optim.tildacdn.com/stor3562-3232-4362-b736-316565383739/-/format/webp/99960808.jpg.webp",
    slides: [
      {
        storyImage: "https://optim.tildacdn.com/stor3562-3232-4362-b736-316565383739/-/format/webp/99960808.jpg.webp",
        tagline: "Cozy accessories for your pets. Made with love."
      },
      {
        storyImage: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?q=80&w=600&auto=format&fit=crop",
        tagline: "Doggie sweaters to keep your best friend stylishly warm."
      }
    ]
  },
  { 
    id: "Face Cap", 
    label: "Streetwear", 
    image: "https://optim.tildacdn.com/stor6236-3330-4237-b566-366465633238/-/format/webp/93517017.jpg.webp",
    slides: [
      {
        storyImage: "https://optim.tildacdn.com/stor6236-3330-4237-b566-366465633238/-/format/webp/93517017.jpg.webp",
        tagline: "Limited drop summer streetwear. Soft pastel fabrics."
      },
      {
        storyImage: "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=600&auto=format&fit=crop",
        tagline: "Oversized graphic tees & streetwear essentials."
      }
    ]
  },
  { 
    id: "Sneaker", 
    label: "Drinkware", 
    image: "https://optim.tildacdn.com/stor6265-3164-4538-a234-373835663732/-/format/webp/40046535.jpg.webp",
    slides: [
      {
        storyImage: "https://optim.tildacdn.com/stor6265-3164-4538-a234-373835663732/-/format/webp/40046535.jpg.webp",
        tagline: "Pastel drinkware & accessories. Keep hydrated in style."
      },
      {
        storyImage: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?q=80&w=600&auto=format&fit=crop",
        tagline: "Thermal water bottles & tumblers with matte finishes."
      }
    ]
  },
  { 
    id: "Hoodie", 
    label: "New Drops", 
    image: "https://optim.tildacdn.com/stor3562-3232-4362-b736-316565383739/-/format/webp/99960808.jpg.webp",
    slides: [
      {
        storyImage: "https://optim.tildacdn.com/stor3562-3232-4362-b736-316565383739/-/format/webp/99960808.jpg.webp",
        tagline: "Weekly fresh merchandise drop. Be first to grab yours!"
      },
      {
        storyImage: "https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=600&auto=format&fit=crop",
        tagline: "Don't miss out on our limited collectibles drops."
      }
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
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>("Hoodie");
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<{ [key: string]: string }>({});
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [lastSelectedItem, setLastSelectedItem] = useState<any | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<Record<string, number>>({});
  const [showNavPopup, setShowNavPopup] = useState(false);
  const imageScrollRef = useRef<HTMLDivElement>(null);

  const ADDONS = [
    {
      id: 'addon-giftbox',
      name: 'Premium Gift Box',
      price: 4.00,
      image: 'https://optim.tildacdn.com/stor3766-3735-4962-a663-303362346637/-/format/webp/12011235.jpg.webp'
    },
    {
      id: 'addon-stickers',
      name: 'Mascot Stickers Pack',
      price: 3.00,
      image: 'https://optim.tildacdn.com/stor3932-6134-4537-a137-373464316263/-/format/webp/84660139.jpg.webp'
    }
  ];

  const getDetailsTotalPrice = () => {
    if (!lastSelectedItem) return 0;
    const baseTotal = lastSelectedItem.price * quantity;
    const addonsTotal = ADDONS.reduce((acc, addon) => {
      const q = selectedAddons[addon.id] || 0;
      return acc + (addon.price * q);
    }, 0);
    return baseTotal + addonsTotal;
  };

  const getItemImages = (item: any): string[] => {
    if (!item) return [];
    const base = item.image || '';
    return [
      base,
      'https://optim.tildacdn.com/stor6236-3330-4237-b566-366465633238/-/format/webp/93517017.jpg.webp',
      'https://optim.tildacdn.com/stor3739-3364-4261-b461-303831643236/-/format/webp/25245024.jpg.webp',
      'https://optim.tildacdn.com/stor6539-6437-4337-b332-333736623135/-/format/webp/99869443.jpg.webp'
    ];
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

  // Instagram Lookbook Story states
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [prevStoryIndex, setPrevStoryIndex] = useState<number | null>(null);
  const [animType, setAnimType] = useState<'next' | 'prev' | null>(null);
  const [isStoryAnimating, setIsStoryAnimating] = useState(false);
  const [storyProgress, setStoryProgress] = useState(0);
  const [viewedStories, setViewedStories] = useState<string[]>([]);

  const markStoryAsViewed = (catId: string) => {
    if (!viewedStories.includes(catId)) {
      setViewedStories(prev => [...prev, catId]);
    }
  };

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
      document.body.classList.add('item-detail-open');
      setLastSelectedItem(selectedItem);
      setQuantity(1);
      setActiveImageIndex(0);
      setSelectedAddons({});
      if (imageScrollRef.current) {
        imageScrollRef.current.scrollTop = 0;
      }
      // Initialize selected options with the first choices
      const initialOptions: { [key: string]: string } = {};
      (selectedItem.options || []).forEach((opt: any) => {
        initialOptions[opt.name] = opt.choices[0];
      });
      setSelectedOptions(initialOptions);
    } else {
      document.body.classList.remove('item-detail-open');
    }
    return () => {
      document.body.classList.remove('item-detail-open');
    };
  }, [selectedItem]);

  const handleNextStory = () => {
    if (activeStoryIndex === null || isStoryAnimating) return;
    if (activeStoryIndex < categories.length - 1) {
      setPrevStoryIndex(activeStoryIndex);
      setAnimType('next');
      setIsStoryAnimating(true);
      setActiveStoryIndex(activeStoryIndex + 1);
      setActiveSlideIndex(0);
      markStoryAsViewed(categories[activeStoryIndex + 1].id);
      setActiveCategoryTab(categories[activeStoryIndex + 1].id);
      setStoryProgress(0);
      setTimeout(() => {
        setIsStoryAnimating(false);
        setAnimType(null);
      }, 400);
    } else {
      setActiveStoryIndex(null);
      setStoryProgress(0);
    }
  };

  const handlePrevStory = () => {
    if (activeStoryIndex === null || isStoryAnimating) return;
    if (activeStoryIndex > 0) {
      setPrevStoryIndex(activeStoryIndex);
      setAnimType('prev');
      setIsStoryAnimating(true);
      setActiveStoryIndex(activeStoryIndex - 1);
      setActiveSlideIndex(categories[activeStoryIndex - 1].slides.length - 1);
      markStoryAsViewed(categories[activeStoryIndex - 1].id);
      setActiveCategoryTab(categories[activeStoryIndex - 1].id);
      setStoryProgress(0);
      setTimeout(() => {
        setIsStoryAnimating(false);
        setAnimType(null);
      }, 400);
    } else {
      setActiveStoryIndex(null);
      setStoryProgress(0);
    }
  };

  const handleNextSlide = () => {
    if (activeStoryIndex === null || isStoryAnimating) return;
    const currentCategory = categories[activeStoryIndex];
    if (activeSlideIndex < currentCategory.slides.length - 1) {
      setActiveSlideIndex(prev => prev + 1);
      setStoryProgress(0);
    } else {
      handleNextStory();
    }
  };

  const handlePrevSlide = () => {
    if (activeStoryIndex === null || isStoryAnimating) return;
    if (activeSlideIndex > 0) {
      setActiveSlideIndex(prev => prev - 1);
      setStoryProgress(0);
    } else {
      handlePrevStory();
    }
  };

  // Instagram Story automatic progress bar timer
  useEffect(() => {
    if (activeStoryIndex === null || isStoryAnimating) {
      setStoryProgress(0);
      return;
    }
    setStoryProgress(0);
    const interval = setInterval(() => {
      setStoryProgress((prev) => {
        if (prev >= 100) {
          const currentCategory = categories[activeStoryIndex];
          if (activeSlideIndex < currentCategory.slides.length - 1) {
            setActiveSlideIndex((curr) => curr + 1);
            return 0;
          } else {
            handleNextStory();
            return 0;
          }
        }
        return prev + 1; // Increments to 100 over 4 seconds (100 * 40ms)
      });
    }, 40);
    return () => {
      clearInterval(interval);
    };
  }, [activeStoryIndex, activeSlideIndex, isStoryAnimating]);

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

    ADDONS.forEach(addon => {
      const q = selectedAddons[addon.id] || 0;
      if (q > 0) {
        addMerchToCart({
          merchSkuId: addon.id,
          itemType: 'merch',
          name: addon.name,
          unitPrice: addon.price,
          quantity: q,
        });
      }
    });

    setSelectedItem(null);
  };

  const handleCheckout = async () => {
    if (!bootstrap?.locationId || merchCart.length === 0) return;
    try {
      const order = await createMerchOrder({
        locationId: bootstrap.locationId,
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

  const filteredItems = MOCK_MERCH_ITEMS.filter(item => {
    return item.category === activeCategoryTab;
  });

  const cartTotal = merchCart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);

  return (
    <div className="h-screen overflow-y-auto bg-white flex flex-col items-center select-none overflow-x-hidden pb-[90px] scroll-smooth">
      {/* Sticky Header Container */}
      <div className="sticky top-0 z-40 bg-[#EE635E] text-gray-900 flex flex-col w-full pb-4">
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
              <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-[#EE635E] text-white text-[9px] font-bold rounded-full border border-white flex items-center justify-center">
                {merchCart.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-[480px] flex-1 bg-white px-5 py-6 flex flex-col gap-6">
        
        {/* Horizontal Promo Banner Card (Pink background with smooth bottom white wave, white font, and white button) */}
        <div className="w-full rounded-[16px] overflow-hidden relative min-h-[140px] shadow-sm flex items-center justify-between p-6">
          {/* Background layer: Pink base with organic white wave at the bottom */}
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-[#EE635E]" />
            <svg 
              className="absolute bottom-0 left-0 w-full h-[55px] text-white fill-current translate-y-[1px]" 
              viewBox="0 0 1440 320" 
              preserveAspectRatio="none"
            >
              <path d="M0,96 C288,192 576,96 864,160 C1152,224 1344,160 1440,128 L1440,320 L0,320 Z" />
            </svg>
          </div>

          <div className="flex flex-col items-start gap-2.5 z-10 text-left max-w-[60%]">
            <h2 className="text-[17px] font-bold text-white leading-tight">
              Buy 1 hoodie,<br />get 45% off caps
            </h2>
            <button 
              onClick={() => {
                setActiveCategoryTab("Face Cap");
                const idx = categories.findIndex(c => c.id === "Face Cap");
                if (idx !== -1) {
                  setActiveStoryIndex(idx);
                  setActiveSlideIndex(0);
                  setPrevStoryIndex(null);
                  setAnimType(null);
                  setIsStoryAnimating(false);
                  setStoryProgress(0);
                }
              }}
              className="bg-white hover:bg-gray-50 text-[#EE635E] px-4 py-2 rounded-full font-bold text-[12px] flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer border-none z-10"
            >
              <span>Shop now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {/* Pink shirt image positioned absolute on the right */}
          <img 
            src="https://optim.tildacdn.com/stor6236-3330-4237-b566-366465633238/-/format/webp/93517017.jpg.webp" 
            alt="Promo product" 
            className="absolute right-[-10px] bottom-[-20px] w-[145px] h-[145px] object-cover rotate-[-8deg] rounded-[12px] border border-white/10 shadow-md z-10"
          />
        </div>

        {/* Horizontal Instagram-like Stories Categories list (Edge-to-edge scrollable, clipped by the screen boundary) */}
        <div className="flex flex-row flex-nowrap gap-4 overflow-x-auto scrollbar-none -mx-5 px-5 py-2">
          {categories.map((cat) => {
            const isViewed = viewedStories.includes(cat.id);
            const active = activeCategoryTab === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategoryTab(cat.id);
                  const idx = categories.findIndex(c => c.label === cat.label);
                  if (idx !== -1) {
                    setActiveStoryIndex(idx);
                    setActiveSlideIndex(0);
                    markStoryAsViewed(cat.id);
                    setPrevStoryIndex(null);
                    setAnimType(null);
                    setIsStoryAnimating(false);
                    setStoryProgress(0);
                  }
                }}
                className="flex flex-col items-center flex-shrink-0 active:scale-95 transition-all outline-none border-none bg-transparent cursor-pointer"
              >
                {/* Circular Story Ring and Avatar */}
                <div className={`p-[2.5px] rounded-full transition-all duration-300 ${
                  active 
                    ? 'scale-102 ring-2 ring-white' 
                    : ''
                } ${
                  isViewed ? 'bg-gray-200' : 'bg-[#EE635E]'
                }`}>
                  <div className="bg-white p-[2px] rounded-full">
                    <img 
                      src={cat.image} 
                      alt={cat.label} 
                      className="w-14 h-14 rounded-full object-cover" 
                    />
                  </div>
                </div>
                {/* Story Label Text */}
                <span className={`text-[11.5px] mt-1.5 transition-all ${
                  active 
                    ? 'font-bold text-gray-900' 
                    : 'font-medium text-gray-500'
                }`}>
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
              className="bg-white border border-gray-100 rounded-[16px] overflow-hidden flex flex-col hover:opacity-98 transition-all cursor-pointer group active:scale-[0.98] relative"
            >
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
      </div>

      {/* Floating Bottom Cart Bar */}
      {merchCart.length > 0 && (
        <>
          <div className="fixed bottom-0 left-0 right-0 z-45 p-4 flex justify-center bg-gradient-to-t from-white via-white/95 to-transparent pointer-events-none">
            <button 
              onClick={() => setShowCartDrawer(true)}
              className="w-full max-w-[440px] bg-[#EE635E] hover:opacity-90 text-white py-4 rounded-full font-semibold flex items-center justify-between px-6 transition-all active:scale-[0.99] shadow-none pointer-events-auto"
            >
              {/* Menu Navigation Button on the left */}
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNavPopup(!showNavPopup);
                }}
                className="flex items-center gap-1.5 bg-white/20 hover:bg-white/35 px-3.5 py-1.5 rounded-full transition-colors cursor-pointer z-50 border border-white/10"
              >
                <MenuIcon className="w-3.5 h-3.5 text-white" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-white pr-1 select-none">Menu</span>
              </div>

              <div className="flex items-center gap-2 pl-2">
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

          {/* Navigation Popup Menu */}
          {showNavPopup && (
            <div 
              className="fixed bottom-24 left-6 right-6 z-50 max-w-[400px] mx-auto bg-white/95 backdrop-blur-md border border-gray-100 rounded-[22px] shadow-[0_8px_30px_rgba(0,0,0,0.15)] p-4 flex flex-col gap-3 animate-fadeIn text-left"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                <span className="text-[11px] text-gray-400 font-extrabold uppercase tracking-wider">Navigate To</span>
                <button 
                  onClick={() => setShowNavPopup(false)}
                  className="text-[11px] font-bold text-[#EE635E] hover:opacity-80"
                >
                  Close
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { href: '/menu', icon: Coffee, label: 'Menu', activeColor: 'text-corgi bg-corgi/10' },
                  { href: '/shop', icon: ShoppingBag, label: 'Shop', activeColor: 'text-[#EE635E] bg-[#EE635E]/10' },
                  { href: '/loyalty', icon: Gift, label: 'Loyalty', activeColor: 'text-corgi bg-corgi/10' },
                  { href: '/orders', icon: ClipboardList, label: 'Orders', activeColor: 'text-corgi bg-corgi/10' }
                ].map((tab) => {
                  const isActive = tab.href === '/shop';
                  return (
                    <Link
                      key={tab.href}
                      href={tab.href}
                      onClick={() => setShowNavPopup(false)}
                      className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl transition-all ${
                        isActive 
                          ? `${tab.activeColor} scale-102` 
                          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <tab.icon size={20} strokeWidth={isActive ? 2.8 : 2} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">{tab.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </>
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
                    <div key={index} className="w-full h-full flex-shrink-0 snap-start snap-always relative">
                      <img 
                        src={imgUrl} 
                        alt={`${lastSelectedItem.name} ${index + 1}`} 
                        className="w-full h-full object-cover"
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
                        className={`w-[45px] h-[55px] rounded-lg overflow-hidden shadow-md transition-all border-[1.5px] cursor-pointer flex items-center justify-center p-0 ${
                          active 
                            ? 'border-[#EE635E] bg-transparent scale-105' 
                            : 'border-white bg-transparent'
                        }`}
                      >
                        <img 
                          src={imgUrl} 
                          alt="Thumbnail" 
                          className="w-full h-full object-cover"
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

              {/* Add-ons Section */}
              <div className="flex flex-col gap-3 mt-1.5 pt-1.5 border-t border-gray-100">
                <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider pl-1">
                  Add-ons
                </span>
                <div className="flex gap-4 overflow-x-auto scrollbar-none py-2 -mx-1 px-1">
                  {ADDONS.map((addon) => {
                    const q = selectedAddons[addon.id] || 0;
                    const isSelected = q > 0;
                    return (
                      <div 
                        key={addon.id} 
                        onClick={() => {
                          if (!isSelected) {
                            setSelectedAddons(prev => ({ ...prev, [addon.id]: 1 }));
                          }
                        }}
                        className="relative w-[110px] flex-shrink-0 flex flex-col items-center gap-2.5 transition-all text-center select-none cursor-pointer"
                      >
                        {/* Round Image at Top with Checkmark Badge */}
                        <div className="relative">
                          <div className="w-[72px] h-[72px] rounded-full overflow-hidden bg-white shadow-sm border border-gray-100 flex-shrink-0 flex items-center justify-center">
                            <img 
                              src={addon.image} 
                              alt={addon.name} 
                              className="w-full h-full object-cover"
                            />
                          </div>
                          {/* Top-right Pink Checkmark Circle Badge */}
                          {isSelected && (
                            <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#EE635E] text-white flex items-center justify-center shadow-md animate-pop z-10">
                              <Check className="w-3.5 h-3.5" strokeWidth={3.5} />
                            </span>
                          )}
                        </div>

                        {/* Title and Price */}
                        <div className="flex flex-col gap-0.5 min-h-[36px] justify-center">
                          <span className="text-[12px] font-bold text-gray-900 leading-tight">
                            {addon.name}
                          </span>
                          <span className="text-[11px] font-extrabold text-[#EE635E] mt-0.5">
                            + {addon.price.toFixed(2)}€
                          </span>
                        </div>

                        {/* Bottom Quantity Selector (only if selected) */}
                        {isSelected && (
                          <div 
                            className="w-full mt-1.5 z-20 flex justify-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-center gap-3">
                              <button 
                                onClick={() => {
                                  setSelectedAddons(prev => {
                                    const next = { ...prev };
                                    if (next[addon.id] <= 1) {
                                      delete next[addon.id];
                                    } else {
                                      next[addon.id]--;
                                    }
                                    return next;
                                  });
                                }}
                                className="w-7 h-7 bg-gray-100 hover:bg-gray-200 active:scale-95 rounded-full flex items-center justify-center transition-all text-gray-600 cursor-pointer shadow-sm border border-gray-200/50"
                              >
                                <Minus className="w-3.5 h-3.5" strokeWidth={2.8} />
                              </button>
                              <span className="text-[13px] font-extrabold text-gray-900 min-w-[12px] text-center">
                                {q}
                              </span>
                              <button 
                                onClick={() => {
                                  setSelectedAddons(prev => ({ ...prev, [addon.id]: (prev[addon.id] || 0) + 1 }));
                                }}
                                className="w-7 h-7 bg-gray-100 hover:bg-gray-200 active:scale-95 rounded-full flex items-center justify-center transition-all text-gray-600 cursor-pointer shadow-sm border border-gray-200/50"
                              >
                                <Plus className="w-3.5 h-3.5" strokeWidth={2.8} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

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
                  <span className="font-extrabold text-[16px]">{getDetailsTotalPrice().toFixed(2)}€</span>
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

      {/* 5. Fullscreen Instagram Lookbook Story Modal */}
      {activeStoryIndex !== null && (
        <div className="fixed inset-0 bg-black z-55 flex flex-col justify-between">
          <style>{`
            .cube-container {
              perspective: 1200px;
              transform-style: preserve-3d;
              position: relative;
              width: 100%;
              height: 100%;
              overflow: hidden;
              background-color: #000;
            }
            .cube-slide-next-out {
              animation: cubeNextOut 0.4s forwards cubic-bezier(0.25, 0.46, 0.45, 0.94);
            }
            .cube-slide-next-in {
              animation: cubeNextIn 0.4s forwards cubic-bezier(0.25, 0.46, 0.45, 0.94);
            }
            .cube-slide-prev-out {
              animation: cubePrevOut 0.4s forwards cubic-bezier(0.25, 0.46, 0.45, 0.94);
            }
            .cube-slide-prev-in {
              animation: cubePrevIn 0.4s forwards cubic-bezier(0.25, 0.46, 0.45, 0.94);
            }
            @keyframes cubeNextOut {
              0% { transform: translateX(0) rotateY(0deg); transform-origin: 100% 50%; opacity: 1; }
              100% { transform: translateX(-100%) rotateY(-90deg); transform-origin: 100% 50%; opacity: 0; }
            }
            @keyframes cubeNextIn {
              0% { transform: translateX(100%) rotateY(90deg); transform-origin: 0% 50%; opacity: 0; }
              100% { transform: translateX(0) rotateY(0deg); transform-origin: 0% 50%; opacity: 1; }
            }
            @keyframes cubePrevOut {
              0% { transform: translateX(0) rotateY(0deg); transform-origin: 0% 50%; opacity: 1; }
              100% { transform: translateX(100%) rotateY(90deg); transform-origin: 0% 50%; opacity: 0; }
            }
            @keyframes cubePrevIn {
              0% { transform: translateX(-100%) rotateY(-90deg); transform-origin: 100% 50%; opacity: 0; }
              100% { transform: translateX(0) rotateY(0deg); transform-origin: 100% 50%; opacity: 1; }
            }
          `}</style>

          <div className="cube-container">
            {isStoryAnimating && prevStoryIndex !== null ? (
              <>
                {/* Outgoing slide */}
                <div 
                  className={`absolute inset-0 w-full h-full flex flex-col justify-between p-4 bg-[#09090b] ${
                    animType === 'next' ? 'cube-slide-next-out' : 'cube-slide-prev-out'
                  }`}
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-[#09090b] z-0">
                    <img 
                      src={categories[prevStoryIndex].slides[animType === 'next' ? categories[prevStoryIndex].slides.length - 1 : 0].storyImage} 
                      alt="Story lookbook" 
                      className="w-full h-full object-cover opacity-90 select-none pointer-events-none"
                    />
                  </div>
                  <div className="w-full flex flex-col gap-3 z-10">
                    <div className="w-full flex gap-1.5 z-10">
                      {categories[prevStoryIndex].slides.map((_, slideIdx) => {
                        const width = animType === 'next' ? '100%' : '0%';
                        return (
                          <div key={slideIdx} className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                            <div className="h-full bg-white" style={{ width }} />
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-between text-white px-1">
                      <div className="flex items-center gap-2.5">
                        <img 
                          src={categories[prevStoryIndex].image} 
                          alt={categories[prevStoryIndex].label} 
                          className="w-8 h-8 rounded-full object-cover border border-white/20"
                        />
                        <div className="flex flex-col text-left">
                          <span className="text-sm font-bold leading-tight">{categories[prevStoryIndex].label} Lookbook</span>
                          <span className="text-[10px] text-white/50 font-medium leading-none">Corgi Shop</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="w-full flex flex-col gap-4 items-center z-10 text-center pb-6">
                    <p className="text-white text-sm font-bold tracking-wide drop-shadow-md max-w-[80%] select-none">
                      {categories[prevStoryIndex].slides[animType === 'next' ? categories[prevStoryIndex].slides.length - 1 : 0].tagline}
                    </p>
                  </div>
                </div>

                {/* Incoming slide */}
                <div 
                  className={`absolute inset-0 w-full h-full flex flex-col justify-between p-4 bg-[#09090b] ${
                    animType === 'next' ? 'cube-slide-next-in' : 'cube-slide-prev-in'
                  }`}
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-[#09090b] z-0">
                    <img 
                      src={categories[activeStoryIndex].slides[activeSlideIndex].storyImage} 
                      alt="Story lookbook" 
                      className="w-full h-full object-cover opacity-90 select-none pointer-events-none"
                    />
                  </div>
                  <div className="w-full flex flex-col gap-3 z-10">
                    <div className="w-full flex gap-1.5 z-10">
                      {categories[activeStoryIndex].slides.map((_, slideIdx) => {
                        const width = slideIdx < activeSlideIndex ? '100%' : '0%';
                        return (
                          <div key={slideIdx} className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                            <div className="h-full bg-white" style={{ width }} />
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-between text-white px-1">
                      <div className="flex items-center gap-2.5">
                        <img 
                          src={categories[activeStoryIndex].image} 
                          alt={categories[activeStoryIndex].label} 
                          className="w-8 h-8 rounded-full object-cover border border-white/20"
                        />
                        <div className="flex flex-col text-left">
                          <span className="text-sm font-bold leading-tight">{categories[activeStoryIndex].label} Lookbook</span>
                          <span className="text-[10px] text-white/50 font-medium leading-none">Corgi Shop</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="w-full flex flex-col gap-4 items-center z-10 text-center pb-6">
                    <p className="text-white text-sm font-bold tracking-wide drop-shadow-md max-w-[80%] select-none">
                      {categories[activeStoryIndex].slides[activeSlideIndex].tagline}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              /* Active slide (interactive, responds to clicks) */
              <div 
                className="absolute inset-0 w-full h-full flex flex-col justify-between p-4 bg-[#09090b]"
                style={{ backfaceVisibility: 'hidden' }}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  if (clickX < rect.width * 0.3) {
                    handlePrevSlide();
                  } else {
                    handleNextSlide();
                  }
                }}
              >
                <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-[#09090b] z-0">
                  <img 
                    src={categories[activeStoryIndex].slides[activeSlideIndex].storyImage} 
                    alt="Story lookbook" 
                    className="w-full h-full object-cover opacity-90 select-none pointer-events-none"
                  />
                </div>

                <div className="w-full flex flex-col gap-3 z-10">
                  <div className="w-full flex gap-1.5 z-10">
                    {categories[activeStoryIndex].slides.map((_, slideIdx) => {
                      let width = '0%';
                      if (slideIdx < activeSlideIndex) width = '100%';
                      else if (slideIdx === activeSlideIndex) width = `${storyProgress}%`;
                      return (
                        <div key={slideIdx} className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-white transition-all duration-[40ms] ease-linear" 
                            style={{ width }}
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between text-white px-1">
                    <div className="flex items-center gap-2.5">
                      <img 
                        src={categories[activeStoryIndex].image} 
                        alt={categories[activeStoryIndex].label} 
                        className="w-8 h-8 rounded-full object-cover border border-white/20"
                      />
                      <div className="flex flex-col text-left">
                        <span className="text-sm font-bold leading-tight">{categories[activeStoryIndex].label} Lookbook</span>
                        <span className="text-[10px] text-white/50 font-medium leading-none">Corgi Shop</span>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveStoryIndex(null);
                      }}
                      className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white border-none cursor-pointer z-20"
                    >
                      <X className="w-4 h-4" strokeWidth={2} />
                    </button>
                  </div>
                </div>

                <div className="w-full flex flex-col gap-4 items-center z-10 text-center pb-6">
                  <p className="text-white text-sm font-bold tracking-wide drop-shadow-md max-w-[80%] select-none">
                    {categories[activeStoryIndex].slides[activeSlideIndex].tagline}
                  </p>
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveStoryIndex(null);
                    }}
                    className="bg-[#EE635E] hover:opacity-90 text-white px-8 py-3 rounded-full font-bold text-sm shadow-lg active:scale-95 transition-all flex items-center gap-2 border-none cursor-pointer z-20"
                  >
                    <span>Tap to Shop Now</span>
                    <ArrowRight className="w-4 h-4" strokeWidth={2.2} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
