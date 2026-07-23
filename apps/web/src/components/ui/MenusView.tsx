'use client';

import React, { useState } from 'react';
import { Plus, Search, ChevronDown, ChevronUp, MoreHorizontal, Edit2, Trash2, Image as ImageIcon, GripVertical, Coffee, Croissant, Sandwich, CupSoda, Utensils, LayoutGrid, List, Eye, EyeOff, X, Check, Archive, Star, Sliders } from 'lucide-react';
import { Reorder, motion, AnimatePresence } from 'framer-motion';
import DishModal from './DishModal';
import ModifiersManagerModal from './ModifiersManagerModal';

type Category = { id: string; name: string; count: number; icon: React.ElementType };
type Dish = {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  image: string;
  basePrice: number;
  isActive?: boolean;
  isRecommended?: boolean;
  isArchived?: boolean;
};

export default function MenusView() {
  const [categories, setCategories] = useState<Category[]>([
    { id: '1', name: 'Coffee', count: 8, icon: Coffee },
    { id: '2', name: 'Pastries', count: 6, icon: Croissant },
    { id: '3', name: 'Sandwiches', count: 6, icon: Sandwich },
    { id: '4', name: 'Smoothies', count: 4, icon: CupSoda },
  ]);
  const [activeCategoryId, setActiveCategoryId] = useState<string>('1');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [isDishModalOpen, setIsDishModalOpen] = useState(false);
  const [showModifiersModal, setShowModifiersModal] = useState(false);
  const [dishModalMode, setDishModalMode] = useState<'create' | 'edit'>('create');

  // Quick Manage State
  const [searchQuery, setSearchQuery] = useState('');
  const [mainView, setMainView] = useState<'dishes' | 'modifiers' | 'allergens' | 'archived'>('dishes');
  const [sortMode, setSortMode] = useState<'name' | 'price_asc' | 'price_desc' | 'recommended'>('name');
  
  const [newModName, setNewModName] = useState('');
  const [newModPrice, setNewModPrice] = useState('');
  const [newModMin, setNewModMin] = useState('');
  const [newModMax, setNewModMax] = useState('');
  const [isAddingMod, setIsAddingMod] = useState(false);
  const [isCreateModOpen, setIsCreateModOpen] = useState(true);
  const [highlightedModId, setHighlightedModId] = useState<string | null>(null);
  
  const [pendingToggleInfo, setPendingToggleInfo] = useState<{ id: string, type: 'modifier' | 'allergen', currentState: boolean, name: string } | null>(null);
  const [hideToggleConfirm, setHideToggleConfirm] = useState(false);
  const [dontShowAgainCheck, setDontShowAgainCheck] = useState(false);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const hidden = localStorage.getItem('corgi_hide_menu_toggle_confirm') === 'true';
      setHideToggleConfirm(hidden);
    }
  }, []);
  
  const [newAllergenName, setNewAllergenName] = useState('');
  const [isAddingAllergen, setIsAddingAllergen] = useState(false);
  const [highlightedAllergenId, setHighlightedAllergenId] = useState<string | null>(null);
  
  const [globalModifiers, setGlobalModifiers] = useState([
    { id: '1', name: 'Extra Shot', price: '1.50', minQty: '0', maxQty: '1', isActive: true },
    { id: '2', name: 'Almond Milk', price: '0.80', minQty: '0', maxQty: '1', isActive: true },
    { id: '3', name: 'Oat Milk', price: '0.80', minQty: '0', maxQty: '1', isActive: true }
  ]);
  
  const [globalAllergens, setGlobalAllergens] = useState([
    { id: '1', name: 'Dairy', isActive: true },
    { id: '2', name: 'Nuts', isActive: true },
    { id: '3', name: 'Gluten', isActive: true }
  ]);

  const handleSaveCategoryName = (id: string) => {
    if (editingCategoryName.trim()) {
      setCategories(categories.map(c => c.id === id ? { ...c, name: editingCategoryName.trim() } : c));
    }
    setEditingCategoryId(null);
  };

  const imgUrl = 'https://images.pexels.com/photos/37417630/pexels-photo-37417630.jpeg';

  const [dishes, setDishes] = useState<Dish[]>([
    // Coffee (8)
    { id: 'd1', categoryId: '1', name: 'Espresso', description: 'Single shot of rich espresso', image: imgUrl, basePrice: 2.50 },
    { id: 'd2', categoryId: '1', name: 'Macchiato', description: 'Espresso with a dash of frothy milk', image: imgUrl, basePrice: 2.80 },
    { id: 'd3', categoryId: '1', name: 'Cortado', description: 'Equal parts espresso and steamed milk', image: imgUrl, basePrice: 3.00 },
    { id: 'd4', categoryId: '1', name: 'Americano', description: 'Espresso with hot water', image: imgUrl, basePrice: 2.50 },
    { id: 'd5', categoryId: '1', name: 'Flat White', description: 'Espresso with microfoam', image: imgUrl, basePrice: 3.50 },
    { id: 'd6', categoryId: '1', name: 'Cappuccino', description: 'Espresso with steamed milk and thick foam', image: imgUrl, basePrice: 3.50 },
    { id: 'd7', categoryId: '1', name: 'Latte', description: 'Espresso with lots of steamed milk and a light layer of foam', image: imgUrl, basePrice: 4.00 },
    { id: 'd8', categoryId: '1', name: 'Mocha', description: 'Espresso with chocolate and steamed milk', image: imgUrl, basePrice: 4.50 },
    // Pastries (6)
    { id: 'd9', categoryId: '2', name: 'Croissant', description: 'Buttery, flaky, viennoiserie pastry', image: imgUrl, basePrice: 3.00 },
    { id: 'd10', categoryId: '2', name: 'Pain au Chocolat', description: 'Croissant dough with dark chocolate', image: imgUrl, basePrice: 3.50 },
    { id: 'd11', categoryId: '2', name: 'Almond Croissant', description: 'Croissant filled with almond paste', image: imgUrl, basePrice: 4.00 },
    { id: 'd12', categoryId: '2', name: 'Cinnamon Roll', description: 'Sweet roll with cinnamon and glaze', image: imgUrl, basePrice: 3.50 },
    { id: 'd13', categoryId: '2', name: 'Blueberry Muffin', description: 'Classic muffin bursting with blueberries', image: imgUrl, basePrice: 3.00 },
    { id: 'd14', categoryId: '2', name: 'Banana Bread', description: 'Slice of moist banana bread', image: imgUrl, basePrice: 3.00 },
    // Sandwiches (6)
    { id: 'd15', categoryId: '3', name: 'Ham & Cheese', description: 'Classic ham and gruyere on baguette', image: imgUrl, basePrice: 5.50 },
    { id: 'd16', categoryId: '3', name: 'Turkey Club', description: 'Turkey, bacon, lettuce, tomato', image: imgUrl, basePrice: 6.50 },
    { id: 'd17', categoryId: '3', name: 'Caprese', description: 'Mozzarella, tomato, basil, balsamic', image: imgUrl, basePrice: 6.00 },
    { id: 'd18', categoryId: '3', name: 'Tuna Salad', description: 'Tuna salad with lettuce on whole wheat', image: imgUrl, basePrice: 5.50 },
    { id: 'd19', categoryId: '3', name: 'BLT', description: 'Bacon, lettuce, tomato with mayo', image: imgUrl, basePrice: 6.00 },
    { id: 'd20', categoryId: '3', name: 'Chicken Avocado', description: 'Grilled chicken with smashed avocado', image: imgUrl, basePrice: 7.00 },
    // Smoothies (4)
    { id: 'd21', categoryId: '4', name: 'Berry Blast', description: 'Strawberry, blueberry, raspberry blend', image: imgUrl, basePrice: 5.00 },
    { id: 'd22', categoryId: '4', name: 'Tropical Mango', description: 'Mango, pineapple, coconut water', image: imgUrl, basePrice: 5.50 },
    { id: 'd23', categoryId: '4', name: 'Green Detox', description: 'Spinach, kale, apple, ginger', image: imgUrl, basePrice: 5.50 },
    { id: 'd24', categoryId: '4', name: 'Protein PB', description: 'Peanut butter, banana, whey protein', image: imgUrl, basePrice: 6.00 },
    // Archived (for testing)
    { id: 'd25', categoryId: '1', name: 'Pumpkin Spice Latte', description: 'Seasonal favorite with pumpkin spices', image: imgUrl, basePrice: 4.50, isArchived: true },
    { id: 'd26', categoryId: '2', name: 'Gingerbread Cookie', description: 'Festive soft gingerbread cookie', image: imgUrl, basePrice: 2.00, isArchived: true },
    { id: 'd27', categoryId: '3', name: 'Holiday Turkey Panini', description: 'Turkey, cranberry sauce, and stuffing', image: imgUrl, basePrice: 7.50, isArchived: true },
  ]);

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) {
      setIsAddingCategory(false);
      return;
    }
    const newCat: Category = {
      id: Date.now().toString(),
      name: newCategoryName.trim(),
      count: 0,
      icon: Utensils
    };
    setCategories([...categories, newCat]);
    setNewCategoryName('');
    setIsAddingCategory(false);
    setActiveCategoryId(newCat.id);
  };

  const activeCategory = categories.find(c => c.id === activeCategoryId);
  let filteredDishes = mainView === 'archived' 
    ? dishes.filter(d => d.isArchived)
    : dishes.filter(d => d.categoryId === activeCategoryId && !d.isArchived);

  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filteredDishes = filteredDishes.filter(d => 
      d.name.toLowerCase().includes(query) || 
      d.description.toLowerCase().includes(query)
    );
  }

  filteredDishes = [...filteredDishes].sort((a, b) => {
    if (sortMode === 'price_asc') return a.basePrice - b.basePrice;
    if (sortMode === 'price_desc') return b.basePrice - a.basePrice;
    if (sortMode === 'recommended') {
      const aRec = a.isRecommended ? 1 : 0;
      const bRec = b.isRecommended ? 1 : 0;
      if (aRec !== bRec) return bRec - aRec;
    }
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="flex h-full w-full animate-in fade-in slide-in-from-right-4 duration-500">
      {/* Left Sidebar: Categories */}
      <div className="w-72 shrink-0 flex flex-col border-r border-gray-100 pr-6 mr-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-8 mt-2">
          <h3 className="text-[12px] font-extrabold text-gray-400 tracking-widest uppercase">Categories</h3>
          <button 
            onClick={() => setIsAddingCategory(true)}
            className="w-8 h-8 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-corgi hover:text-white hover:border-corgi transition-all shadow-sm cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
          >
            <Plus size={16} strokeWidth={3} />
          </button>
        </div>

        <Reorder.Group axis="y" values={categories} onReorder={setCategories} className="flex flex-col gap-1 list-none p-0">
          {categories.map((cat) => (
            <Reorder.Item 
              key={cat.id}
              value={cat}
              onClick={() => { setActiveCategoryId(cat.id); setMainView('dishes'); }}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors group/item relative ${
                activeCategoryId === cat.id 
                  ? 'bg-gray-100/80 text-gray-900' 
                  : 'bg-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className={`cursor-grab active:cursor-grabbing opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0 ${activeCategoryId === cat.id ? 'text-gray-400 hover:text-gray-600' : 'text-gray-300 hover:text-gray-500'}`}>
                  <GripVertical size={14} />
                </div>
                {editingCategoryId === cat.id ? (
                  <input
                    type="text"
                    value={editingCategoryName}
                    autoFocus
                    onChange={(e) => setEditingCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveCategoryName(cat.id);
                      if (e.key === 'Escape') setEditingCategoryId(null);
                    }}
                    onBlur={() => handleSaveCategoryName(cat.id)}
                    className="w-full bg-white border border-corgi/40 rounded px-2 py-0.5 text-[14px] font-semibold text-gray-800 outline-none focus:border-corgi shadow-sm mr-2"
                  />
                ) : (
                  <>
                    <span className={`text-[14px] truncate ${activeCategoryId === cat.id ? 'font-semibold' : 'font-medium'}`}>{cat.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCategoryId(cat.id);
                        setEditingCategoryName(cat.name);
                      }}
                      className="opacity-0 group-hover/item:opacity-100 p-1 hover:bg-gray-200/50 rounded transition-colors text-gray-400 hover:text-gray-600 ml-auto shrink-0 cursor-pointer"
                    >
                      <Edit2 size={12} />
                    </button>
                  </>
                )}
              </div>
              <span className={`text-[12px] font-semibold px-2 py-0.5 rounded-md ${
                activeCategoryId === cat.id ? 'bg-white text-gray-600 shadow-sm border border-gray-200/50' : 'bg-transparent text-gray-400 group-hover/item:bg-gray-100'
              }`}>
                {cat.count}
              </span>
            </Reorder.Item>
          ))}
        </Reorder.Group>

          {isAddingCategory && (
            <div className="mt-1">
              <input
                type="text"
                autoFocus
                placeholder="Category name..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddCategory();
                  if (e.key === 'Escape') {
                    setIsAddingCategory(false);
                    setNewCategoryName('');
                  }
                }}
                onBlur={handleAddCategory}
                className="w-full bg-white border-2 border-corgi/40 rounded-xl px-4 py-3 text-[14px] font-bold text-gray-800 outline-none focus:border-corgi focus:ring-4 focus:ring-corgi/10 transition-all shadow-sm"
              />
            </div>
          )}
        </div>

      {/* Right Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {mainView === 'modifiers' ? 'Global Modifiers' : mainView === 'allergens' ? 'Global Allergens' : mainView === 'archived' ? 'Archived Dishes' : activeCategory?.name || 'Menu'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative group shrink-0">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search dishes..." 
                className="w-[270px] bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-[13px] font-semibold text-gray-800 outline-none hover:border-gray-300 focus:border-corgi focus:ring-4 focus:ring-corgi/10 transition-all placeholder:font-medium placeholder:text-gray-400"
              />
            </div>

            {/* Sort Dropdown */}
            <div className="relative group shrink-0">
              <select 
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as any)}
                className="bg-white border border-gray-200 text-gray-700 text-[13px] font-semibold rounded-xl pl-4 pr-9 py-2 cursor-pointer outline-none hover:border-gray-300 focus:border-corgi focus:ring-4 focus:ring-corgi/10 transition-all appearance-none"
              >
                <option value="name">Sort by: Name</option>
                <option value="price_asc">Sort by: Lower price</option>
                <option value="price_desc">Sort by: Higher price</option>
                <option value="recommended">Sort by: Recommended</option>
              </select>
              <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none transition-transform group-hover:text-gray-600" />
            </div>

            {/* Archive Button */}
            <button
              onClick={() => setMainView(mainView === 'archived' ? 'dishes' : 'archived')}
              className={`flex items-center justify-center w-9 h-9 rounded-lg transition-all cursor-pointer shrink-0 ml-1 ${mainView === 'archived' ? 'bg-corgi text-white border-transparent hover:bg-corgi/90' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}
              title={mainView === 'archived' ? 'Back to Menu' : 'Archive'}
            >
              <Archive size={16} strokeWidth={2} />
            </button>

            {/* Modifiers Manager Button */}
            <button
              onClick={() => setShowModifiersModal(true)}
              className="flex items-center justify-center w-9 h-9 rounded-lg transition-all bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 cursor-pointer shrink-0 ml-1"
              title="Global Modifiers Options Manager"
            >
              <Sliders size={16} strokeWidth={2} />
            </button>

            {/* View Toggle */}
            <div className={`flex bg-gray-50/80 p-1 rounded-xl shrink-0 border border-gray-100 mr-2 transition-opacity ${mainView !== 'dishes' ? 'opacity-30 pointer-events-none' : ''}`}>
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg cursor-pointer transition-all ${viewMode === 'grid' ? 'bg-white text-gray-800 font-semibold shadow-sm' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100/50'}`}
              >
                <LayoutGrid size={16} />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg cursor-pointer transition-all ${viewMode === 'list' ? 'bg-white text-gray-800 font-semibold shadow-sm' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100/50'}`}
              >
                <List size={16} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-0.5 h-9 bg-gray-50/80 p-1 rounded-xl border border-gray-200/60 mr-1 shrink-0">
              <button 
                onClick={() => setMainView('dishes')}
                className={`cursor-pointer whitespace-nowrap h-7 flex items-center justify-center px-4 text-[13px] font-semibold rounded-lg transition-all duration-200 ${
                  mainView === 'dishes' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'
                }`}
              >
                Dishes
              </button>
              <button 
                onClick={() => setMainView('modifiers')}
                className={`cursor-pointer whitespace-nowrap h-7 flex items-center justify-center px-4 text-[13px] font-semibold rounded-lg transition-all duration-200 ${
                  mainView === 'modifiers' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'
                }`}
              >
                Modifiers
              </button>
              <button 
                onClick={() => setMainView('allergens')}
                className={`cursor-pointer whitespace-nowrap h-7 flex items-center justify-center px-4 text-[13px] font-semibold rounded-lg transition-all duration-200 ${
                  mainView === 'allergens' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'
                }`}
              >
                Allergens
              </button>
            </div>

            <button 
              onClick={() => {
                setDishModalMode('create');
                setIsDishModalOpen(true);
              }}
              className={`flex items-center gap-1.5 px-4 py-2 bg-black text-white text-[13px] font-bold rounded-xl transition-all cursor-pointer shrink-0 ml-1 shadow-sm ${(mainView !== 'dishes' && mainView !== 'archived') ? 'opacity-30 pointer-events-none' : 'hover:bg-gray-800 hover:-translate-y-0.5 active:translate-y-0'}`}
            >
              <Plus size={16} strokeWidth={2.5} />
              Add Dish
            </button>
          </div>
        </div>
        {/* Modifiers Content */}
        {mainView === 'modifiers' && (
          <div className="flex-1 overflow-y-auto pb-10 pr-2 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <motion.div layout className="bg-white rounded-[24px] border border-gray-100 shadow-sm mb-8 overflow-hidden">
              <AnimatePresence initial={false} mode="wait">
                {isCreateModOpen ? (
                  <motion.div 
                    key="open"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-6">
                    <div className="flex justify-between items-center mb-5">
                      <h3 className="text-[16px] font-bold text-gray-900">Create New Modifier</h3>
                      <button 
                        onClick={() => setIsCreateModOpen(false)} 
                        className="text-[13px] font-bold text-gray-400 hover:text-gray-800 transition-colors cursor-pointer bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg"
                      >
                        Hide
                      </button>
                    </div>
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                      <div className="flex-[2] min-w-0 w-full">
                        <label className="block text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-2">Modifier Name</label>
                        <input 
                          type="text" 
                          value={newModName}
                          onChange={(e) => setNewModName(e.target.value)}
                          placeholder="e.g. Extra Shot"
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[14px] font-bold text-gray-900 outline-none focus:border-corgi transition-all"
                        />
                      </div>
                      
                      <div className="flex-1 w-full">
                        <label className="block text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-2">Added Price</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-[14px]">€</span>
                          <input 
                            type="text" 
                            value={newModPrice}
                            onChange={(e) => {
                              const val = e.target.value.replace(',', '.');
                              if (/^\d*\.?\d{0,2}$/.test(val)) setNewModPrice(val);
                            }}
                            placeholder="0.00"
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-3 text-[14px] font-bold text-gray-900 outline-none focus:border-corgi transition-all"
                          />
                        </div>
                      </div>

                      <div className="flex gap-4 w-full md:w-auto items-end">
                        <div className="w-24">
                          <label className="block text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-2 text-center">Min Qty</label>
                          <div className="relative">
                            <input 
                              type="number" 
                              value={newModMin}
                              onChange={(e) => setNewModMin(e.target.value)}
                              placeholder="0"
                              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-3 pr-7 py-3 text-[14px] font-bold text-gray-900 outline-none focus:border-corgi transition-all text-center"
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
                              <button onClick={() => setNewModMin((parseInt(newModMin || '0') + 1).toString())} className="text-gray-400 hover:text-gray-900 bg-gray-200/50 hover:bg-gray-200 rounded p-0.5 cursor-pointer transition-colors"><ChevronUp size={11}/></button>
                              <button onClick={() => setNewModMin(Math.max(0, parseInt(newModMin || '0') - 1).toString())} className="text-gray-400 hover:text-gray-900 bg-gray-200/50 hover:bg-gray-200 rounded p-0.5 cursor-pointer transition-colors"><ChevronDown size={11}/></button>
                            </div>
                          </div>
                        </div>
                        <div className="w-24">
                          <label className="block text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-2 text-center">Max Qty</label>
                          <div className="relative">
                            <input 
                              type="number" 
                              value={newModMax}
                              onChange={(e) => setNewModMax(e.target.value)}
                              placeholder="1"
                              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-3 pr-7 py-3 text-[14px] font-bold text-gray-900 outline-none focus:border-corgi transition-all text-center"
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
                              <button onClick={() => setNewModMax((parseInt(newModMax || '1') + 1).toString())} className="text-gray-400 hover:text-gray-900 bg-gray-200/50 hover:bg-gray-200 rounded p-0.5 cursor-pointer transition-colors"><ChevronUp size={11}/></button>
                              <button onClick={() => setNewModMax(Math.max(0, parseInt(newModMax || '1') - 1).toString())} className="text-gray-400 hover:text-gray-900 bg-gray-200/50 hover:bg-gray-200 rounded p-0.5 cursor-pointer transition-colors"><ChevronDown size={11}/></button>
                            </div>
                          </div>
                        </div>
                        <button 
                          disabled={isAddingMod}
                          onClick={() => {
                            if (newModName.trim() && !isAddingMod) {
                              setIsAddingMod(true);
                              setTimeout(() => {
                                const newId = Date.now().toString();
                                setGlobalModifiers([{ id: newId, name: newModName.trim(), price: newModPrice || '0.00', minQty: newModMin || '0', maxQty: newModMax || '1', isActive: true }, ...globalModifiers]);
                                setNewModName('');
                                setNewModPrice('');
                                setNewModMin('');
                                setNewModMax('');
                                setIsAddingMod(false);
                                
                                setHighlightedModId(newId);
                                setTimeout(() => setHighlightedModId(null), 800);
                              }, 500);
                            }
                          }}
                          className={`h-[46px] px-6 text-white text-[14px] font-bold rounded-xl transition-colors cursor-pointer active:scale-95 shadow-sm whitespace-nowrap w-full md:w-auto flex items-center justify-center shrink-0 ${isAddingMod ? 'bg-gray-400 cursor-not-allowed' : 'bg-black hover:bg-gray-800'}`}
                        >
                          {isAddingMod ? 'Adding...' : 'Add Modifier'}
                        </button>
                      </div>
                    </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="closed"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => setIsCreateModOpen(true)}
                    className="h-12 flex items-center justify-center cursor-pointer bg-gray-50/50 hover:bg-gray-100 transition-colors group"
                  >
                    <ChevronDown size={20} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            <div className="flex flex-col gap-3">
              <AnimatePresence>
                {globalModifiers.map(mod => (
                  <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    key={mod.id} 
                    className={`flex flex-col md:flex-row md:items-center gap-4 bg-white rounded-2xl p-5 transition-all duration-500 group border ${highlightedModId === mod.id ? 'border-corgi shadow-md shadow-corgi/20' : 'border-gray-100 hover:border-gray-200 hover:shadow-sm'}`}
                  >
                  <div className="flex-[2] min-w-0">
                    <h4 className="text-[15px] font-bold text-gray-900">{mod.name}</h4>
                  </div>
                  
                  <div className="flex flex-wrap md:flex-nowrap items-center gap-4 md:gap-6">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-bold text-gray-400">PRICE:</span>
                      <div className="relative w-28">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-[13px]">€</span>
                        <input type="text" value={mod.price} onChange={(e) => {
                          const val = e.target.value.replace(',', '.');
                          if (/^\d*\.?\d{0,2}$/.test(val)) {
                            setGlobalModifiers(globalModifiers.map(m => m.id === mod.id ? { ...m, price: val } : m));
                          }
                        }} className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-7 pr-3 py-1.5 text-[14px] font-bold text-gray-900 outline-none focus:border-corgi transition-all hover:bg-white focus:bg-white" />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-bold text-gray-400">MIN:</span>
                      <div className="relative w-16">
                        <input type="number" value={mod.minQty} onChange={(e) => setGlobalModifiers(globalModifiers.map(m => m.id === mod.id ? { ...m, minQty: e.target.value } : m))} className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-2 pr-6 py-1.5 text-[14px] font-bold text-gray-900 outline-none focus:border-corgi transition-all text-center hover:bg-white focus:bg-white" />
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
                          <button onClick={() => setGlobalModifiers(globalModifiers.map(m => m.id === mod.id ? { ...m, minQty: (parseInt(m.minQty || '0') + 1).toString() } : m))} className="text-gray-400 hover:text-gray-900 rounded p-px cursor-pointer"><ChevronUp size={9}/></button>
                          <button onClick={() => setGlobalModifiers(globalModifiers.map(m => m.id === mod.id ? { ...m, minQty: Math.max(0, parseInt(m.minQty || '0') - 1).toString() } : m))} className="text-gray-400 hover:text-gray-900 rounded p-px cursor-pointer"><ChevronDown size={9}/></button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-bold text-gray-400">MAX:</span>
                      <div className="relative w-16">
                        <input type="number" value={mod.maxQty} onChange={(e) => setGlobalModifiers(globalModifiers.map(m => m.id === mod.id ? { ...m, maxQty: e.target.value } : m))} className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-2 pr-6 py-1.5 text-[14px] font-bold text-gray-900 outline-none focus:border-corgi transition-all text-center hover:bg-white focus:bg-white" />
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
                          <button onClick={() => setGlobalModifiers(globalModifiers.map(m => m.id === mod.id ? { ...m, maxQty: (parseInt(m.maxQty || '1') + 1).toString() } : m))} className="text-gray-400 hover:text-gray-900 rounded p-px cursor-pointer"><ChevronUp size={9}/></button>
                          <button onClick={() => setGlobalModifiers(globalModifiers.map(m => m.id === mod.id ? { ...m, maxQty: Math.max(0, parseInt(m.maxQty || '1') - 1).toString() } : m))} className="text-gray-400 hover:text-gray-900 rounded p-px cursor-pointer"><ChevronDown size={9}/></button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 md:ml-auto pl-6 border-l border-gray-100">
                    <button 
                      onClick={() => {
                        if (hideToggleConfirm) {
                          setGlobalModifiers(globalModifiers.map(m => m.id === mod.id ? { ...m, isActive: !m.isActive } : m));
                        } else {
                          setPendingToggleInfo({ id: mod.id, type: 'modifier', currentState: mod.isActive, name: mod.name });
                          setDontShowAgainCheck(false);
                        }
                      }}
                      className={`relative w-10 h-5.5 rounded-full transition-colors cursor-pointer ${mod.isActive ? 'bg-corgi' : 'bg-gray-200'}`}
                    >
                      <div className={`absolute top-[2px] left-[2px] bg-white w-4.5 h-4.5 rounded-full transition-transform ${mod.isActive ? 'translate-x-4.5 shadow-sm' : 'translate-x-0'}`} />
                    </button>
                    <button 
                      onClick={() => setGlobalModifiers(globalModifiers.filter(m => m.id !== mod.id))}
                      className="text-gray-300 hover:text-red-500 transition-colors p-2 rounded-xl hover:bg-red-50 cursor-pointer"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
              {globalModifiers.length === 0 && (
                <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 border-dashed text-gray-400 text-[14px] font-medium mt-4">No modifiers added yet.</div>
              )}
            </div>
          </div>
        )}

        {/* Allergens Content */}
        {mainView === 'allergens' && (
          <div className="flex-1 overflow-y-auto pb-10 pr-2 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm mb-8">
              <h3 className="text-[16px] font-bold text-gray-900 mb-5">Create New Allergen</h3>
              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                  <label className="block text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-2">Allergen Name</label>
                  <input 
                    type="text" 
                    value={newAllergenName}
                    onChange={(e) => setNewAllergenName(e.target.value)}
                    placeholder="e.g. Peanuts"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newAllergenName.trim()) {
                        setGlobalAllergens([{ id: Date.now().toString(), name: newAllergenName.trim(), isActive: true }, ...globalAllergens]);
                        setNewAllergenName('');
                      }
                    }}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[14px] font-bold text-gray-900 outline-none focus:border-corgi transition-all"
                  />
                </div>
                <button 
                  disabled={isAddingAllergen}
                  onClick={() => {
                    if (newAllergenName.trim() && !isAddingAllergen) {
                      setIsAddingAllergen(true);
                      setTimeout(() => {
                        const newId = Date.now().toString();
                        setGlobalAllergens([{ id: newId, name: newAllergenName.trim(), isActive: true }, ...globalAllergens]);
                        setNewAllergenName('');
                        setIsAddingAllergen(false);
                        
                        setHighlightedAllergenId(newId);
                        setTimeout(() => setHighlightedAllergenId(null), 800);
                      }, 500);
                    }
                  }}
                  className={`h-[46px] px-6 text-white text-[14px] font-bold rounded-xl transition-colors cursor-pointer active:scale-95 shadow-sm whitespace-nowrap w-full sm:w-auto flex items-center justify-center ${isAddingAllergen ? 'bg-gray-400 cursor-not-allowed' : 'bg-black hover:bg-gray-800'}`}
                >
                  {isAddingAllergen ? 'Adding...' : 'Add Allergen'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <AnimatePresence>
                {globalAllergens.map(allergen => (
                  <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    key={allergen.id} 
                    className={`flex items-center justify-between bg-white rounded-2xl p-5 transition-all duration-500 group border ${highlightedAllergenId === allergen.id ? 'border-corgi shadow-md shadow-corgi/20' : 'border-gray-100 hover:border-gray-200 hover:shadow-sm'}`}
                  >
                    <span className="text-[15px] font-bold text-gray-900">{allergen.name}</span>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => {
                        if (hideToggleConfirm) {
                          setGlobalAllergens(globalAllergens.map(a => a.id === allergen.id ? { ...a, isActive: !a.isActive } : a));
                        } else {
                          setPendingToggleInfo({ id: allergen.id, type: 'allergen', currentState: allergen.isActive, name: allergen.name });
                          setDontShowAgainCheck(false);
                        }
                      }}
                      className={`relative w-10 h-5.5 rounded-full transition-colors cursor-pointer ${allergen.isActive ? 'bg-corgi' : 'bg-gray-200'}`}
                    >
                      <div className={`absolute top-[2px] left-[2px] bg-white w-4.5 h-4.5 rounded-full transition-transform ${allergen.isActive ? 'translate-x-4.5 shadow-sm' : 'translate-x-0'}`} />
                    </button>
                    <button 
                      onClick={() => setGlobalAllergens(globalAllergens.filter(a => a.id !== allergen.id))}
                      className="text-gray-300 hover:text-red-500 transition-colors p-2 rounded-xl hover:bg-red-50 cursor-pointer"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </motion.div>
                ))}
              </AnimatePresence>
            </div>
            {globalAllergens.length === 0 && (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 border-dashed text-gray-400 text-[14px] font-medium mt-4">No allergens added yet.</div>
            )}
          </div>
        )}

        {/* Dishes Content */}
        {(mainView === 'dishes' || mainView === 'archived') && (
          <div className="flex-1 overflow-y-auto pb-10 pr-2 animate-in fade-in zoom-in-95 duration-300">
            {filteredDishes.length > 0 ? (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                {filteredDishes.map(dish => (
                  <div 
                    key={dish.id} 
                    onClick={() => {
                      setDishModalMode('edit');
                      setIsDishModalOpen(true);
                    }}
                    className={`bg-white border border-gray-100 rounded-2xl overflow-hidden hover:border-gray-200 hover:shadow-lg hover:shadow-gray-100/50 transition-all duration-300 group flex flex-col cursor-pointer ${dish.isActive === false ? 'opacity-60 grayscale-[0.8]' : ''}`}
                  >
                    <div className="aspect-square w-full relative bg-gray-100 overflow-hidden">
                      <img src={dish.image} alt={dish.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                      {/* Recommend Toggle Button */}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setDishes(dishes.map(d => d.id === dish.id ? { ...d, isRecommended: !d.isRecommended } : d))
                        }}
                        className={`absolute top-3 right-3 w-8 h-8 rounded-xl backdrop-blur-sm shadow-sm flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow z-10 cursor-pointer ${dish.isRecommended ? 'bg-yellow-100/90 text-yellow-500' : 'bg-white/80 text-gray-400 hover:text-yellow-500 hover:bg-white'}`}
                      >
                        <Star size={15} className={dish.isRecommended ? 'fill-current' : ''} />
                      </button>

                      {/* Active Toggle Button */}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setDishes(dishes.map(d => d.id === dish.id ? { ...d, isActive: d.isActive === false ? true : false } : d))
                        }}
                        className="absolute top-3 left-3 w-8 h-8 rounded-xl bg-white/80 backdrop-blur-sm shadow-sm flex items-center justify-center transition-all duration-200 hover:bg-white hover:scale-110 hover:shadow z-10 cursor-pointer group/eye"
                      >
                        {dish.isActive !== false ? (
                          <Eye size={15} className="text-gray-600 transition-colors group-hover/eye:text-gray-900" />
                        ) : (
                          <EyeOff size={15} className="text-gray-400 transition-colors group-hover/eye:text-gray-600" />
                        )}
                      </button>


                    </div>
                    <div className="p-5 flex flex-col flex-1">
                      <div className="flex justify-between items-start gap-4 mb-2">
                        <h3 className="text-[17px] font-bold text-gray-900 leading-tight group-hover:text-corgi transition-colors">{dish.name}</h3>
                        <span className="text-[16px] font-extrabold text-gray-900 bg-gray-50 px-2.5 py-1 rounded-lg shrink-0">€{dish.basePrice.toFixed(2)}</span>
                      </div>
                      <p className="text-[14px] text-gray-500 font-medium line-clamp-2 leading-relaxed flex-1">{dish.description}</p>
                      <div className="mt-5 pt-4 border-t border-gray-100 flex gap-2">
                         <span className="inline-flex px-2 py-1 bg-gray-50 border border-gray-100 text-gray-500 rounded text-[11px] font-bold uppercase tracking-wider">1 Size</span>
                         <span className="inline-flex px-2 py-1 bg-gray-50 border border-gray-100 text-gray-500 rounded text-[11px] font-bold uppercase tracking-wider">0 Attributes</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredDishes.map(dish => (
                  <div 
                    key={dish.id} 
                    onClick={() => {
                      setDishModalMode('edit');
                      setIsDishModalOpen(true);
                    }}
                    className={`flex items-center gap-4 bg-white border border-gray-100 rounded-2xl p-3 hover:border-gray-200 hover:shadow-sm transition-all duration-300 cursor-pointer ${dish.isActive === false ? 'opacity-60 grayscale-[0.8]' : ''}`}
                  >
                    <div className="w-14 h-14 rounded-xl relative bg-gray-100 overflow-hidden shrink-0">
                      <img src={dish.image} alt={dish.name} className="w-full h-full object-cover" />
                    </div>
                    
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <h3 className="text-[15px] font-bold text-gray-900 truncate">{dish.name}</h3>
                      <p className="text-[13px] text-gray-500 font-medium truncate mt-0.5">{dish.description}</p>
                      <div className="mt-1.5 flex gap-2">
                         <span className="inline-flex px-1.5 py-0.5 bg-gray-50 border border-gray-100 text-gray-500 rounded text-[9px] font-bold uppercase tracking-wider">1 Size</span>
                         <span className="inline-flex px-1.5 py-0.5 bg-gray-50 border border-gray-100 text-gray-500 rounded text-[9px] font-bold uppercase tracking-wider">0 Attributes</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-5 shrink-0 pl-2">
                      <span className="text-[15px] font-extrabold text-gray-900 bg-gray-50 px-3 py-1.5 rounded-xl">€{dish.basePrice.toFixed(2)}</span>
                      
                      <div className="w-px h-8 bg-gray-100 mx-1"></div>

                      <div className="flex gap-2 items-center">
                        {/* Recommend Toggle Button */}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setDishes(dishes.map(d => d.id === dish.id ? { ...d, isRecommended: !d.isRecommended } : d))
                          }}
                          className={`mr-2 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer ${dish.isRecommended ? 'bg-yellow-100 text-yellow-500' : 'bg-gray-50 text-gray-400 hover:text-yellow-500 hover:bg-yellow-50'}`}
                        >
                          <Star size={15} className={dish.isRecommended ? 'fill-current' : ''} />
                        </button>

                        {/* Active/Hidden Toggle */}
                        <div className="flex items-center gap-2 mr-3">
                          <span className={`text-[11px] font-bold uppercase tracking-wider ${dish.isActive !== false ? 'text-gray-900' : 'text-gray-400'}`}>
                            {dish.isActive !== false ? 'Visible' : 'Hidden'}
                          </span>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setDishes(dishes.map(d => d.id === dish.id ? { ...d, isActive: dish.isActive === false ? true : false } : d))
                            }}
                            className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${dish.isActive !== false ? 'bg-corgi' : 'bg-gray-200'}`}
                          >
                            <div className={`absolute top-[2px] left-[2px] bg-white w-4 h-4 rounded-full transition-transform ${dish.isActive !== false ? 'translate-x-4 shadow-sm' : 'translate-x-0'}`} />
                          </button>
                        </div>

                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setDishModalMode('edit');
                            setIsDishModalOpen(true);
                          }}
                          className="w-9 h-9 rounded-xl bg-gray-50 text-gray-600 flex items-center justify-center hover:bg-white hover:shadow-sm hover:border-gray-200 border border-transparent transition-all cursor-pointer"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button className="w-9 h-9 rounded-xl bg-gray-50 text-gray-600 flex items-center justify-center hover:bg-red-50 hover:text-red-500 border border-transparent transition-all cursor-pointer">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center bg-gray-50/50 rounded-[32px] border-2 border-dashed border-gray-200">
              <div className="w-20 h-20 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center text-gray-300 mb-6">
                <ImageIcon size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No dishes in this category</h3>
              <p className="text-gray-500 font-medium mb-6">Get started by adding your first dish to the menu.</p>
              <button 
                onClick={() => {
                  setDishModalMode('create');
                  setIsDishModalOpen(true);
                }}
                className="px-6 py-3 bg-black text-white text-[14px] font-bold rounded-xl hover:bg-gray-800 transition-all shadow-sm hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                Add First Dish
              </button>
            </div>
          )}
        </div>
        )}
      </div>

      <DishModal 
        isOpen={isDishModalOpen} 
        onClose={() => setIsDishModalOpen(false)} 
        mode={dishModalMode}
      />

      {pendingToggleInfo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] p-6 w-full max-w-sm shadow-xl animate-in zoom-in-95 duration-200">
            <h3 className="text-[18px] font-bold text-gray-900 mb-2">
              {pendingToggleInfo.currentState ? 'Deactivate' : 'Activate'} {pendingToggleInfo.name}?
            </h3>
            <p className="text-gray-500 text-[14px] mb-6">
              Are you sure you want to {pendingToggleInfo.currentState ? 'hide' : 'show'} this {pendingToggleInfo.type} in the menu?
            </p>
            
            <label className="flex items-center gap-3 mb-6 cursor-pointer group">
              <div className={`w-5 h-5 rounded-[6px] flex items-center justify-center border transition-colors ${dontShowAgainCheck ? 'bg-corgi border-corgi text-white' : 'border-gray-300 bg-white group-hover:border-corgi'}`}>
                {dontShowAgainCheck && <Check size={14} strokeWidth={3} />}
              </div>
              <span className="text-[14px] font-semibold text-gray-700">Don't show this again</span>
              <input type="checkbox" className="hidden" checked={dontShowAgainCheck} onChange={(e) => setDontShowAgainCheck(e.target.checked)} />
            </label>

            <div className="flex gap-3">
              <button 
                onClick={() => setPendingToggleInfo(null)}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (dontShowAgainCheck) {
                    localStorage.setItem('corgi_hide_menu_toggle_confirm', 'true');
                    setHideToggleConfirm(true);
                  }
                  
                  if (pendingToggleInfo.type === 'modifier') {
                    setGlobalModifiers(globalModifiers.map(m => m.id === pendingToggleInfo.id ? { ...m, isActive: !m.isActive } : m));
                  } else {
                    setGlobalAllergens(globalAllergens.map(a => a.id === pendingToggleInfo.id ? { ...a, isActive: !a.isActive } : a));
                  }
                  
                  setPendingToggleInfo(null);
                }}
                className={`flex-1 py-3 font-bold rounded-xl text-white transition-colors cursor-pointer ${pendingToggleInfo.currentState ? 'bg-gray-900 hover:bg-black' : 'bg-corgi hover:bg-corgi-hover'}`}
              >
                {pendingToggleInfo.currentState ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modifiers Options Manager Modal */}
      <ModifiersManagerModal 
        isOpen={showModifiersModal} 
        onClose={() => setShowModifiersModal(false)} 
        dishes={dishes}
      />
    </div>
  );
}
