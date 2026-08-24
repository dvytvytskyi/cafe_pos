'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Search, ChevronDown, ChevronUp, MoreHorizontal, Edit2, Trash2, Image as ImageIcon, GripVertical, Coffee, Croissant, Sandwich, CupSoda, Utensils, LayoutGrid, List, Eye, EyeOff, X, Check, Archive, Star, Sliders, Ruler, Tags } from 'lucide-react';
import { Reorder, motion, AnimatePresence } from 'framer-motion';
import DishModal, { type DishEditData } from './DishModal';
import ModifiersManagerModal from './ModifiersManagerModal';
import { getMenuCategoriesAsync, createCategoryAsync, updateCategoryAsync, reorderCategoriesAsync, updateMenuItemAsync, archiveMenuItemAsync, filterDishesBySearch, clearMenuClientCache } from '@/lib/menu';
import {
  getModifierGroupsAsync,
  createModifierGroupAsync,
  updateModifierGroupAsync,
  archiveModifierGroupAsync,
  type ModifierGroup,
} from '@/lib/modifiers';
import { ALLERGEN_ICONS, EU_ALLERGENS, globalAllergenCatalog } from '@/lib/allergens';
import { formatPriceDisplay } from '@/lib/format-price';
import { getMenuListingPrice, getMenuListingPriceRange, resolveVariantPricingGroup } from '@corgi/contracts';

type Category = { id: string; name: string; count: number; icon: React.ElementType; sortOrder?: number };
type DishModifierGroup = {
  id: string;
  name: string;
  minQty: number;
  maxQty: number;
  options: Array<{ id: string; name: string; price: number }>;
};

type Dish = {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  image: string | null;
  basePrice: number;
  modifierGroups?: DishModifierGroup[];
  allergens: string[];
  isArchived?: boolean;
  isActive: boolean;
};

function formatDishPrice(dish: Pick<Dish, 'name' | 'basePrice' | 'modifierGroups'>): string {
  const range = getMenuListingPriceRange(dish.basePrice, dish.modifierGroups, dish.name);
  if (range.hasVariants && range.min !== range.max) {
    return `${formatPriceDisplay(range.min)} – ${formatPriceDisplay(range.max)}`;
  }
  return formatPriceDisplay(getMenuListingPrice(dish.basePrice, dish.modifierGroups, dish.name));
}

function getModifierCounts(groups: DishModifierGroup[], itemName?: string) {
  const variantGroup = resolveVariantPricingGroup(groups, itemName);
  const sizeGroups = variantGroup ? [variantGroup] : groups.filter((g) => g.minQty >= 1);
  const sizeIds = new Set(sizeGroups.map((g) => g.id));
  const attributeGroups = groups.filter((g) => !sizeIds.has(g.id) && g.minQty === 0);
  return {
    sizes: sizeGroups.reduce((sum, g) => sum + g.options.length, 0),
    attributes: attributeGroups.reduce((sum, g) => sum + g.options.length, 0),
  };
}

export default function MenusView() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string>('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [isDishModalOpen, setIsDishModalOpen] = useState(false);
  const [showModifiersModal, setShowModifiersModal] = useState(false);
  const [dishModalMode, setDishModalMode] = useState<'create' | 'edit'>('create');
  const [editingDishId, setEditingDishId] = useState<string | null>(null);

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

  const loadMenu = async () => {
    try {
      clearMenuClientCache();
      const dbCategories = await getMenuCategoriesAsync(false);
      if (dbCategories && dbCategories.length > 0) {
        const sorted = [...dbCategories].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
        setCategories(sorted.map(c => ({
          id: c.id,
          name: c.name,
          count: c.items.filter(i => !i.isArchived).length,
          sortOrder: c.sortOrder,
          icon: Coffee
        })));
        setActiveCategoryId((prev) => prev || sorted[0].id);

        setDishes(sorted.flatMap(c => c.items.map(item => ({
          id: item.id,
          categoryId: item.categoryId,
          name: item.name,
          description: item.description || '',
          image: item.imageUrl ?? null,
          basePrice: item.price,
          allergens: item.allergens ?? [],
          modifierGroups: (item.modifierGroups ?? []).map((g) => ({
            id: g.id,
            name: g.name,
            minQty: g.minQty ?? 0,
            maxQty: g.maxQty ?? 1,
            options: (g.options ?? []).map((o) => ({
              id: o.id,
              name: o.name,
              price: o.price ?? 0,
            })),
          })),
          isArchived: item.isArchived,
          isActive: !item.isArchived
        }))));
      }
    } catch (error) {
      console.error('Failed to load menu layout from PostgreSQL:', error);
    }
  };

  const loadModifierGroups = async () => {
    try {
      const groups = await getModifierGroupsAsync(true);
      setGlobalModifiers(
        groups.flatMap((g) =>
          g.options.length > 0
            ? g.options.map((o) => ({
                id: o.id,
                groupId: g.id,
                optionId: o.id,
                name: o.name,
                price: o.price.toFixed(2),
                minQty: String(g.minQty),
                maxQty: String(g.maxQty),
                isActive: !g.isArchived && !o.isArchived,
              }))
            : [
                {
                  id: g.id,
                  groupId: g.id,
                  optionId: '',
                  name: g.name,
                  price: '0.00',
                  minQty: String(g.minQty),
                  maxQty: String(g.maxQty),
                  isActive: !g.isArchived,
                },
              ]
        )
      );
    } catch (error) {
      console.error('Failed to load modifier groups:', error);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hidden = localStorage.getItem('corgi_hide_menu_toggle_confirm') === 'true';
      setHideToggleConfirm(hidden);
    }
    void loadMenu();
    void loadModifierGroups();
  }, []);
  
  const [highlightedAllergenId, setHighlightedAllergenId] = useState<string | null>(null);
  
  const [globalModifiers, setGlobalModifiers] = useState<
    Array<{ id: string; groupId: string; optionId: string; name: string; price: string; minQty: string; maxQty: string; isActive: boolean }>
  >([]);
  
  const [globalAllergens, setGlobalAllergens] = useState(() =>
    globalAllergenCatalog().map((a) => ({ id: a.id, name: a.name, isActive: a.isActive }))
  );

  const handleSaveCategoryName = async (id: string) => {
    const trimmed = editingCategoryName.trim();
    if (!trimmed) {
      setEditingCategoryId(null);
      return;
    }
    try {
      const updated = await updateCategoryAsync(id, trimmed);
      setCategories(categories.map(c => c.id === id ? { ...c, name: updated.name } : c));
    } catch (error) {
      console.error('Failed to update category:', error);
    }
    setEditingCategoryId(null);
  };

  const handleReorderCategories = async (newOrder: Category[]) => {
    setCategories(newOrder);
    try {
      await reorderCategoriesAsync(newOrder.map(c => c.id));
    } catch (error) {
      console.error('Failed to reorder categories:', error);
    }
  };

  const handleToggleDishVisibility = async (dishId: string, currentlyVisible: boolean) => {
    try {
      if (currentlyVisible) {
        await archiveMenuItemAsync(dishId);
      } else {
        await updateMenuItemAsync(dishId, { isArchived: false });
      }
      setDishes((prev) => {
        const next = prev.map((d) =>
          d.id === dishId
            ? { ...d, isArchived: currentlyVisible, isActive: !currentlyVisible }
            : d
        );
        setCategories((cats) =>
          cats.map((c) => ({
            ...c,
            count: next.filter((d) => d.categoryId === c.id && !d.isArchived).length,
          }))
        );
        return next;
      });
    } catch (error) {
      console.error('Failed to toggle dish visibility:', error);
    }
  };

  const [dishes, setDishes] = useState<Dish[]>([]);

  const openCreateDish = () => {
    setDishModalMode('create');
    setEditingDishId(null);
    setIsDishModalOpen(true);
  };

  const openEditDish = (dishId: string) => {
    setDishModalMode('edit');
    setEditingDishId(dishId);
    setIsDishModalOpen(true);
  };

  const editingDish: DishEditData | null = editingDishId
    ? (() => {
        const d = dishes.find((x) => x.id === editingDishId);
        if (!d) return null;
        return {
          id: d.id,
          categoryId: d.categoryId,
          name: d.name,
          description: d.description,
          price: d.basePrice,
          allergens: d.allergens,
          isArchived: d.isArchived,
          imageUrl: d.image,
          modifierGroups: d.modifierGroups,
        };
      })()
    : null;

  const handleDishSaved = async () => {
    await loadMenu();
    setEditingDishId(null);
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      setIsAddingCategory(false);
      return;
    }
    try {
      const dbCat = await createCategoryAsync(newCategoryName.trim());
      const newCat: Category = {
        id: dbCat.id,
        name: dbCat.name,
        count: 0,
        icon: Utensils
      };
      setCategories([...categories, newCat]);
      setNewCategoryName('');
      setIsAddingCategory(false);
      setActiveCategoryId(newCat.id);
    } catch (e) {
      console.error(e);
    }
  };

  const activeCategory = categories.find(c => c.id === activeCategoryId);
  let filteredDishes = mainView === 'archived' 
    ? dishes.filter(d => d.isArchived)
    : dishes.filter(d => d.categoryId === activeCategoryId && !d.isArchived);

  if (searchQuery.trim()) {
    filteredDishes = filterDishesBySearch(filteredDishes, searchQuery);
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
    <div className="flex flex-col xl:flex-row h-full w-full animate-in fade-in slide-in-from-right-4 duration-500">
      {/* Left Sidebar: Categories */}
      <div className="w-full xl:w-72 shrink-0 flex flex-col border-b xl:border-b-0 xl:border-r border-gray-100 pb-6 mb-6 xl:pb-0 xl:mb-0 xl:pr-6 xl:mr-6 overflow-x-hidden overflow-y-auto scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex items-center justify-between mb-4 xl:mb-8 mt-2">
          <h3 className="text-[12px] font-bold text-gray-400 tracking-widest uppercase">Categories</h3>
          <button 
            onClick={() => setIsAddingCategory(true)}
            className="w-8 h-8 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-corgi hover:text-white hover:border-corgi transition-all cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
          >
            <Plus size={16} strokeWidth={3} />
          </button>
        </div>

        <Reorder.Group axis="y" values={categories} onReorder={handleReorderCategories} className="flex flex-row flex-wrap xl:flex-col gap-2 xl:gap-1 list-none p-0 w-full overflow-x-hidden">
          {categories.map((cat) => (
            <Reorder.Item 
              key={cat.id}
              value={cat}
              data-testid={`menu-category-${cat.id}`}
              onClick={() => { setActiveCategoryId(cat.id); setMainView('dishes'); }}
              className={`group/item flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 mb-1 shrink-0 ${
                activeCategoryId === cat.id 
                  ? 'bg-gray-100 text-gray-900 shadow-sm' 
                  : 'text-gray-500 hover:bg-gray-50/80 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className={`hidden xl:block cursor-grab active:cursor-grabbing opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0 ${activeCategoryId === cat.id ? 'text-gray-400 hover:text-gray-600' : 'text-gray-300 hover:text-gray-500'}`}>
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
                      className="hidden xl:block opacity-0 group-hover/item:opacity-100 p-1 hover:bg-gray-200/50 rounded transition-colors text-gray-400 hover:text-gray-600 ml-auto shrink-0 cursor-pointer"
                    >
                      <Edit2 size={12} />
                    </button>
                  </>
                )}
              </div>
              <span className={`text-[12px] font-semibold px-2 py-0.5 rounded-md shrink-0 ml-1 ${
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
        <div className="flex flex-wrap 2xl:flex-nowrap items-center gap-y-2 gap-x-3 mb-8 shrink-0 w-full">
          {/* 1. Title */}
          <h2 className="w-full lg:w-auto text-2xl font-bold text-gray-900 truncate order-1 2xl:mr-auto">
            {mainView === 'modifiers' ? 'Global Modifiers' : mainView === 'allergens' ? 'Global Allergens' : mainView === 'archived' ? 'Archived Dishes' : activeCategory?.name || 'Menu'}
          </h2>

          {/* 2. Search */}
          <div className="relative group shrink-0 w-full sm:w-[270px] xl:w-[200px] order-2 lg:ml-auto 2xl:ml-0 2xl:order-3">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dishes..." 
              className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-[13px] font-semibold text-gray-800 outline-none hover:border-gray-300 focus:border-corgi focus:ring-4 focus:ring-corgi/10 transition-all placeholder:font-medium placeholder:text-gray-400"
            />
          </div>

          {/* Line Break for lg (iPad Pro) */}
          <div className="hidden lg:block 2xl:hidden w-full order-3" style={{ height: 0 }}></div>

          {/* 4. Tabs */}
          <div className="order-5 lg:order-4 2xl:order-2 shrink-0">
            <div className="flex items-center gap-0.5 h-9 bg-gray-50/80 p-1 rounded-xl border border-gray-200/60">
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
          </div>

          {/* 5. Sort, Archive, Sliders */}
          <div className="flex items-center gap-3 order-4 lg:order-5 2xl:order-4 ml-auto 2xl:ml-0">
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
              data-testid="menu-archived-toggle"
              className={`flex items-center justify-center w-9 h-9 rounded-lg transition-all cursor-pointer shrink-0 ${mainView === 'archived' ? 'bg-corgi text-white border-transparent hover:bg-corgi/90' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}
              title={mainView === 'archived' ? 'Back to Menu' : 'Archive'}
            >
              <Archive size={16} strokeWidth={2} />
            </button>

            {/* Modifiers Manager Button */}
            <button
              onClick={() => setShowModifiersModal(true)}
              className="flex items-center justify-center w-9 h-9 rounded-lg transition-all bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 cursor-pointer shrink-0"
              title="Global Modifiers Options Manager"
            >
              <Sliders size={16} strokeWidth={2} />
            </button>
          </div>

          {/* 6. Toggle & Add Dish */}
          <div className="flex justify-end items-center gap-3 order-6 ml-auto lg:ml-0 shrink-0">
            {/* View Toggle */}
            <div className={`flex bg-gray-50/80 p-1 rounded-xl shrink-0 border border-gray-100 transition-opacity ${mainView !== 'dishes' ? 'opacity-30 pointer-events-none' : ''}`}>
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

            {/* Add Dish */}
            <button 
              data-testid="menu-add-dish-btn"
              onClick={openCreateDish}
              className={`flex items-center gap-1.5 px-4 py-2 bg-black text-white text-[13px] font-bold rounded-xl transition-all cursor-pointer shrink-0 shadow-sm ${(mainView !== 'dishes' && mainView !== 'archived') ? 'opacity-30 pointer-events-none' : 'hover:bg-gray-800 hover:-translate-y-0.5 active:translate-y-0'}`}
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
                              className="hidden xl:block w-full bg-gray-50 border border-gray-200 rounded-xl pl-3 pr-7 py-3 text-[14px] font-bold text-gray-900 outline-none focus:border-corgi transition-all text-center"
                            />
                            <div className="hidden xl:flex absolute right-2 top-1/2 -translate-y-1/2 flex-col gap-0.5">
                              <button onClick={() => setNewModMin((parseInt(newModMin || '0') + 1).toString())} className="text-gray-400 hover:text-gray-900 bg-gray-200/50 hover:bg-gray-200 rounded p-0.5 cursor-pointer transition-colors"><ChevronUp size={11}/></button>
                              <button onClick={() => setNewModMin(Math.max(0, parseInt(newModMin || '0') - 1).toString())} className="text-gray-400 hover:text-gray-900 bg-gray-200/50 hover:bg-gray-200 rounded p-0.5 cursor-pointer transition-colors"><ChevronDown size={11}/></button>
                            </div>
                            <select
                              value={newModMin || '0'}
                              onChange={(e) => setNewModMin(e.target.value)}
                              className="xl:hidden w-full bg-gray-50 border border-gray-200 rounded-xl pl-3 pr-7 py-3 text-[14px] font-bold text-gray-900 outline-none focus:border-corgi transition-all appearance-none text-center"
                            >
                              {[...Array(21)].map((_, i) => <option key={i} value={i}>{i}</option>)}
                            </select>
                            <ChevronDown size={14} className="xl:hidden absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
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
                              className="hidden xl:block w-full bg-gray-50 border border-gray-200 rounded-xl pl-3 pr-7 py-3 text-[14px] font-bold text-gray-900 outline-none focus:border-corgi transition-all text-center"
                            />
                            <div className="hidden xl:flex absolute right-2 top-1/2 -translate-y-1/2 flex-col gap-0.5">
                              <button onClick={() => setNewModMax((parseInt(newModMax || '1') + 1).toString())} className="text-gray-400 hover:text-gray-900 bg-gray-200/50 hover:bg-gray-200 rounded p-0.5 cursor-pointer transition-colors"><ChevronUp size={11}/></button>
                              <button onClick={() => setNewModMax(Math.max(0, parseInt(newModMax || '1') - 1).toString())} className="text-gray-400 hover:text-gray-900 bg-gray-200/50 hover:bg-gray-200 rounded p-0.5 cursor-pointer transition-colors"><ChevronDown size={11}/></button>
                            </div>
                            <select
                              value={newModMax || '1'}
                              onChange={(e) => setNewModMax(e.target.value)}
                              className="xl:hidden w-full bg-gray-50 border border-gray-200 rounded-xl pl-3 pr-7 py-3 text-[14px] font-bold text-gray-900 outline-none focus:border-corgi transition-all appearance-none text-center"
                            >
                              {[...Array(21)].map((_, i) => <option key={i} value={i}>{i}</option>)}
                            </select>
                            <ChevronDown size={14} className="xl:hidden absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                          </div>
                        </div>
                        <button 
                          data-testid="menu-add-modifier-btn"
                          disabled={isAddingMod}
                          onClick={() => {
                            if (newModName.trim() && !isAddingMod) {
                              setIsAddingMod(true);
                              void (async () => {
                                try {
                                  const created = await createModifierGroupAsync({
                                    name: newModName.trim(),
                                    minQty: parseInt(newModMin || '0', 10),
                                    maxQty: parseInt(newModMax || '1', 10),
                                    options: [
                                      {
                                        name: newModName.trim(),
                                        price: parseFloat(newModPrice || '0'),
                                      },
                                    ],
                                  });
                                  await loadModifierGroups();
                                  setNewModName('');
                                  setNewModPrice('');
                                  setNewModMin('');
                                  setNewModMax('');
                                  setHighlightedModId(created.options[0]?.id ?? created.id);
                                  setTimeout(() => setHighlightedModId(null), 800);
                                } catch (error) {
                                  console.error('Failed to create modifier:', error);
                                } finally {
                                  setIsAddingMod(false);
                                }
                              })();
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
                        }} onBlur={() => {
                          if (mod.optionId) {
                            void updateModifierOptionAsync(mod.optionId, { price: parseFloat(mod.price || '0') }).catch(console.error);
                          }
                        }} className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-7 pr-3 py-1.5 text-[14px] font-bold text-gray-900 outline-none focus:border-corgi transition-all hover:bg-white focus:bg-white" />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-bold text-gray-400">MIN:</span>
                      <div className="relative w-16 md:w-16">
                        <input type="number" value={mod.minQty} onChange={(e) => setGlobalModifiers(globalModifiers.map(m => m.id === mod.id ? { ...m, minQty: e.target.value } : m))} onBlur={() => {
                          void updateModifierGroupAsync(mod.groupId, {
                            minQty: parseInt(mod.minQty || '0', 10),
                            maxQty: parseInt(mod.maxQty || '1', 10),
                          }).catch(console.error);
                        }} className="hidden xl:block w-full bg-gray-50 border border-gray-200 rounded-lg pl-2 pr-6 py-1.5 text-[14px] font-bold text-gray-900 outline-none focus:border-corgi transition-all text-center hover:bg-white focus:bg-white" />
                        <div className="hidden xl:flex absolute right-1 top-1/2 -translate-y-1/2 flex-col gap-0.5">
                          <button onClick={() => setGlobalModifiers(globalModifiers.map(m => m.id === mod.id ? { ...m, minQty: (parseInt(m.minQty || '0') + 1).toString() } : m))} className="text-gray-400 hover:text-gray-900 rounded p-px cursor-pointer"><ChevronUp size={9}/></button>
                          <button onClick={() => setGlobalModifiers(globalModifiers.map(m => m.id === mod.id ? { ...m, minQty: Math.max(0, parseInt(m.minQty || '0') - 1).toString() } : m))} className="text-gray-400 hover:text-gray-900 rounded p-px cursor-pointer"><ChevronDown size={9}/></button>
                        </div>
                        <select
                          value={mod.minQty || '0'}
                          onChange={(e) => setGlobalModifiers(globalModifiers.map(m => m.id === mod.id ? { ...m, minQty: e.target.value } : m))}
                          className="xl:hidden w-full bg-gray-50 border border-gray-200 rounded-lg pl-1 pr-5 py-1.5 text-[14px] font-bold text-gray-900 outline-none focus:border-corgi transition-all appearance-none text-center hover:bg-white focus:bg-white"
                        >
                          {[...Array(21)].map((_, i) => <option key={i} value={i}>{i}</option>)}
                        </select>
                        <ChevronDown size={12} className="xl:hidden absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-bold text-gray-400">MAX:</span>
                      <div className="relative w-16 md:w-16">
                        <input type="number" value={mod.maxQty} onChange={(e) => setGlobalModifiers(globalModifiers.map(m => m.id === mod.id ? { ...m, maxQty: e.target.value } : m))} onBlur={() => {
                          void updateModifierGroupAsync(mod.groupId, {
                            minQty: parseInt(mod.minQty || '0', 10),
                            maxQty: parseInt(mod.maxQty || '1', 10),
                          }).catch(console.error);
                        }} className="hidden xl:block w-full bg-gray-50 border border-gray-200 rounded-lg pl-2 pr-6 py-1.5 text-[14px] font-bold text-gray-900 outline-none focus:border-corgi transition-all text-center hover:bg-white focus:bg-white" />
                        <div className="hidden xl:flex absolute right-1 top-1/2 -translate-y-1/2 flex-col gap-0.5">
                          <button onClick={() => setGlobalModifiers(globalModifiers.map(m => m.id === mod.id ? { ...m, maxQty: (parseInt(m.maxQty || '1') + 1).toString() } : m))} className="text-gray-400 hover:text-gray-900 rounded p-px cursor-pointer"><ChevronUp size={9}/></button>
                          <button onClick={() => setGlobalModifiers(globalModifiers.map(m => m.id === mod.id ? { ...m, maxQty: Math.max(0, parseInt(m.maxQty || '1') - 1).toString() } : m))} className="text-gray-400 hover:text-gray-900 rounded p-px cursor-pointer"><ChevronDown size={9}/></button>
                        </div>
                        <select
                          value={mod.maxQty || '1'}
                          onChange={(e) => setGlobalModifiers(globalModifiers.map(m => m.id === mod.id ? { ...m, maxQty: e.target.value } : m))}
                          className="xl:hidden w-full bg-gray-50 border border-gray-200 rounded-lg pl-1 pr-5 py-1.5 text-[14px] font-bold text-gray-900 outline-none focus:border-corgi transition-all appearance-none text-center hover:bg-white focus:bg-white"
                        >
                          {[...Array(21)].map((_, i) => <option key={i} value={i}>{i}</option>)}
                        </select>
                        <ChevronDown size={12} className="xl:hidden absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 md:ml-auto pl-6 border-l border-gray-100">
                    <button 
                      data-testid={`modifier-visibility-${mod.groupId}`}
                      onClick={() => {
                        if (hideToggleConfirm) {
                          void (async () => {
                            try {
                              if (mod.isActive) await archiveModifierGroupAsync(mod.groupId);
                              else await updateModifierGroupAsync(mod.groupId, { isArchived: false });
                              await loadModifierGroups();
                            } catch (e) { console.error(e); }
                          })();
                        } else {
                          setPendingToggleInfo({ id: mod.groupId, type: 'modifier', currentState: mod.isActive, name: mod.name });
                          setDontShowAgainCheck(false);
                        }
                      }}
                      className={`relative w-10 h-5.5 rounded-full transition-colors cursor-pointer ${mod.isActive ? 'bg-corgi' : 'bg-gray-200'}`}
                    >
                      <div className={`absolute top-[2px] left-[2px] bg-white w-4.5 h-4.5 rounded-full transition-transform ${mod.isActive ? 'translate-x-4.5 shadow-sm' : 'translate-x-0'}`} />
                    </button>
                    <button 
                      onClick={() => {
                        void archiveModifierGroupAsync(mod.groupId).then(() => loadModifierGroups()).catch(console.error);
                      }}
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
            <div className="bg-orange-50/60 border border-orange-100 rounded-2xl p-4 mb-6">
              <p className="text-[13px] font-semibold text-gray-800">
                EU mandatory allergens (Regulation EU 1169/2011, Annex II) — 14 substances for food labelling in the EU.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AnimatePresence>
                {globalAllergens.map((allergen) => {
                  const meta = EU_ALLERGENS.find((a) => a.id === allergen.name);
                  return (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    key={allergen.id}
                    className={`flex items-center justify-between bg-white rounded-2xl p-5 transition-all duration-500 group border ${highlightedAllergenId === allergen.id ? 'border-corgi shadow-md shadow-corgi/20' : 'border-gray-100 hover:border-gray-200 hover:shadow-sm'}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xl shrink-0">{meta?.icon ?? ALLERGEN_ICONS[allergen.name] ?? '⚠️'}</span>
                      <div className="min-w-0">
                        <span className="text-[15px] font-bold text-gray-900 block">{allergen.name}</span>
                        {meta && (
                          <span className="text-[11px] font-medium text-gray-400 truncate block">{meta.annexName}</span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (hideToggleConfirm) {
                          setGlobalAllergens(globalAllergens.map(a => a.id === allergen.id ? { ...a, isActive: !a.isActive } : a));
                        } else {
                          setPendingToggleInfo({ id: allergen.id, type: 'allergen', currentState: allergen.isActive, name: allergen.name });
                          setDontShowAgainCheck(false);
                        }
                      }}
                      className={`relative w-10 h-5.5 rounded-full transition-colors cursor-pointer shrink-0 ${allergen.isActive ? 'bg-corgi' : 'bg-gray-200'}`}
                    >
                      <div className={`absolute top-[2px] left-[2px] bg-white w-4.5 h-4.5 rounded-full transition-transform ${allergen.isActive ? 'translate-x-4.5 shadow-sm' : 'translate-x-0'}`} />
                    </button>
                  </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
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
                    data-testid={`dish-card-${dish.id}`}
                    onClick={() => openEditDish(dish.id)}
                    className={`bg-white border border-gray-100 rounded-2xl overflow-hidden hover:border-gray-200 hover:shadow-lg hover:shadow-gray-100/50 transition-all duration-300 group flex flex-col cursor-pointer ${dish.isActive === false ? 'opacity-60 grayscale-[0.8]' : ''}`}
                  >
                    <div className="aspect-square w-full relative bg-gray-100 overflow-hidden">
                      {dish.image ? (
                        <img src={dish.image} alt={dish.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                          <ImageIcon size={32} strokeWidth={1.5} />
                        </div>
                      )}
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
                        data-testid={`dish-visibility-${dish.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleToggleDishVisibility(dish.id, dish.isActive !== false);
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
                        <span className="text-[16px] font-bold text-gray-900 bg-gray-50 px-2.5 py-1 rounded-lg shrink-0">€{formatDishPrice(dish)}</span>
                      </div>
                      <p className="text-[14px] text-gray-500 font-medium line-clamp-2 leading-relaxed flex-1">{dish.description}</p>
                      {dish.allergens.length > 0 && (
                        <div
                          data-testid={`dish-allergens-${dish.id}`}
                          className="flex gap-1 mt-2"
                        >
                          {dish.allergens.map((a) => (
                            <span key={a} title={a} className="text-base leading-none">
                              {ALLERGEN_ICONS[a] || '⚠️'}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="mt-5 pt-4 border-t border-gray-100 flex gap-2">
                         <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-50 border border-gray-100 text-gray-500 rounded text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">
                            {getModifierCounts(dish.modifierGroups, dish.name).sizes} <span className="hidden xl:inline">Size</span><Ruler className="xl:hidden" size={12} />
                         </span>
                         <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-50 border border-gray-100 text-gray-500 rounded text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">
                            {getModifierCounts(dish.modifierGroups, dish.name).attributes} <span className="hidden xl:inline">Attributes</span><Tags className="xl:hidden" size={12} />
                         </span>
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
                    data-testid={`dish-card-${dish.id}`}
                    onClick={() => openEditDish(dish.id)}
                    className={`flex items-center gap-4 bg-white border border-gray-100 rounded-2xl p-3 hover:border-gray-200 hover:shadow-sm transition-all duration-300 cursor-pointer ${dish.isActive === false ? 'opacity-60 grayscale-[0.8]' : ''}`}
                  >
                    <div className="w-14 h-14 rounded-xl relative bg-gray-100 overflow-hidden shrink-0">
                      {dish.image ? (
                        <img src={dish.image} alt={dish.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <ImageIcon size={20} strokeWidth={1.5} />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <h3 className="text-[15px] font-bold text-gray-900 truncate">{dish.name}</h3>
                      <p className="text-[13px] text-gray-500 font-medium truncate mt-0.5">{dish.description}</p>
                      <div className="mt-1.5 flex gap-2">
                         <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-50 border border-gray-100 text-gray-500 rounded text-[9px] font-bold uppercase tracking-wider whitespace-nowrap">
                            {getModifierCounts(dish.modifierGroups, dish.name).sizes} <span className="hidden xl:inline">Size</span><Ruler className="xl:hidden" size={10} />
                         </span>
                         <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-50 border border-gray-100 text-gray-500 rounded text-[9px] font-bold uppercase tracking-wider whitespace-nowrap">
                            {getModifierCounts(dish.modifierGroups, dish.name).attributes} <span className="hidden xl:inline">Attributes</span><Tags className="xl:hidden" size={10} />
                         </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-5 shrink-0 pl-2">
                      <span className="text-[15px] font-bold text-gray-900 bg-gray-50 px-3 py-1.5 rounded-xl">€{formatDishPrice(dish)}</span>
                      
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
                            data-testid={`dish-visibility-${dish.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleToggleDishVisibility(dish.id, dish.isActive !== false);
                            }}
                            className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${dish.isActive !== false ? 'bg-corgi' : 'bg-gray-200'}`}
                          >
                            <div className={`absolute top-[2px] left-[2px] bg-white w-4 h-4 rounded-full transition-transform ${dish.isActive !== false ? 'translate-x-4 shadow-sm' : 'translate-x-0'}`} />
                          </button>
                        </div>

                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditDish(dish.id);
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
                data-testid="menu-add-first-dish-btn"
                onClick={openCreateDish}
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
        onClose={() => {
          setIsDishModalOpen(false);
          setEditingDishId(null);
        }} 
        mode={dishModalMode}
        categoryId={activeCategoryId}
        dish={editingDish}
        onSaved={() => void handleDishSaved()}
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
                    void (async () => {
                      try {
                        if (pendingToggleInfo.currentState) {
                          await archiveModifierGroupAsync(pendingToggleInfo.id);
                        } else {
                          await updateModifierGroupAsync(pendingToggleInfo.id, { isArchived: false });
                        }
                        await loadModifierGroups();
                      } catch (e) { console.error(e); }
                    })();
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
        categories={categories}
      />
    </div>
  );
}
