import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Edit2, Sliders, Check, GripVertical, ChevronDown } from 'lucide-react';
import { Reorder, motion, AnimatePresence } from 'framer-motion';
import {
  getModifierGroupsAsync,
  linkModifierGroupCategoriesAsync,
  addModifierOptionAsync,
  updateModifierGroupAsync,
  archiveModifierGroupAsync,
  createModifierGroupAsync,
  updateModifierOptionAsync,
  archiveModifierOptionAsync,
  type ModifierGroup,
} from '@/lib/modifiers';
import { formatPriceDisplay, parsePriceInput } from '@/lib/format-price';
import { onPriceInputChange, onPriceInputBlur, onPriceInputKeyDown } from '@/lib/price-input-handlers';

interface ModifierItem {
  id: string;
  name: string;
  price: number;
  isActive: boolean;
  isDefault: boolean;
  translations?: Record<string, string>;
}

interface ModifierCategory {
  id: string;
  name: string;
  isMultiChoice: boolean;
  isFreeSelection: boolean;
  freeSelectionsCount: number;
  isActive: boolean;
  selections: ModifierItem[];
  assignedDishIds: string[];
}

function mapGroupToCategory(g: ModifierGroup): ModifierCategory {
  return {
    id: g.id,
    name: g.name,
    isMultiChoice: g.maxQty > 1,
    isFreeSelection: g.minQty === 0,
    freeSelectionsCount: g.maxQty,
    isActive: !g.isArchived,
    selections: g.options.map((o) => ({
      id: o.id,
      name: o.name,
      price: o.price,
      isActive: !o.isArchived,
      isDefault: false,
    })),
    assignedDishIds: (g.categories ?? []).map((c) => c.id),
  };
}

function categoryToMinMax(cat: Pick<ModifierCategory, 'isMultiChoice' | 'isFreeSelection' | 'freeSelectionsCount'>) {
  const minQty = cat.isFreeSelection ? 0 : 1;
  let maxQty = cat.freeSelectionsCount || 1;
  if (cat.isMultiChoice) {
    maxQty = Math.max(2, maxQty);
  } else {
    maxQty = Math.max(1, maxQty);
  }
  return { minQty, maxQty };
}

function mergeCategoryFromApi(prev: ModifierCategory, fromApi: ModifierCategory): ModifierCategory {
  return {
    ...fromApi,
    selections: fromApi.selections.map((s) => {
      const old = prev.selections.find((o) => o.id === s.id);
      return { ...s, isDefault: old?.isDefault ?? false };
    }),
  };
}

interface ModifiersManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  dishes: any[];
  categories?: Array<{ id: string; name: string }>;
}

export default function ModifiersManagerModal({ isOpen, onClose, dishes, categories: menuCategories = [] }: ModifiersManagerModalProps) {
  const [categories, setCategories] = useState<ModifierCategory[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadGroups = async (selectId?: string) => {
    setLoading(true);
    setActionError(null);
    try {
      const groups = await getModifierGroupsAsync();
      const mapped = groups.map(mapGroupToCategory);
      setCategories(mapped);
      if (selectId && mapped.some((c) => c.id === selectId)) {
        setActiveCategoryId(selectId);
      } else if (mapped[0]) {
        setActiveCategoryId((prev) => (mapped.some((c) => c.id === prev) ? prev : mapped[0].id));
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to load modifier groups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    void loadGroups();
  }, [isOpen]);

  const setCategory = (updated: ModifierCategory) => {
    setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const persistGroup = async (cat: ModifierCategory) => {
    const { minQty, maxQty } = categoryToMinMax(cat);
    const saved = await updateModifierGroupAsync(cat.id, {
      name: cat.name,
      minQty,
      maxQty,
      isArchived: !cat.isActive,
    });
    const mapped = mapGroupToCategory(saved);
    setCategory(mergeCategoryFromApi(cat, mapped));
  };

  const [editingField, setEditingField] = useState<'name' | 'free_count' | null>(null);
  const [tempInputValue, setTempInputValue] = useState('');
  const [editingSelectionId, setEditingSelectionId] = useState<string | null>(null);
  const [tempSelectionName, setTempSelectionName] = useState('');
  const [tempSelectionPrice, setTempSelectionPrice] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Selection Add/Edit multi-step modal states
  const [isSelModalOpen, setIsSelModalOpen] = useState(false);
  const [selModalMode, setSelModalMode] = useState<'create' | 'edit'>('create');
  const [activeSelItem, setActiveSelItem] = useState<ModifierItem | null>(null);
  const [selStep, setSelStep] = useState<1 | 2>(1);
  const [selPrice, setSelPrice] = useState('0,00');
  const [selSourceLang, setSelSourceLang] = useState('English');
  const [selName, setSelName] = useState('');
  const [selWithoutTranslation, setSelWithoutTranslation] = useState(false);
  const [selTranslations, setSelTranslations] = useState<Record<string, string>>({
    EN: '',
    ES: '',
    IT: '',
    FR: '',
    CA: ''
  });

  if (!isOpen) return null;

  const activeCategory = categories.find(c => c.id === activeCategoryId) || categories[0];

  const handleAddCategory = async () => {
    setActionError(null);
    try {
      const created = await createModifierGroupAsync({
        name: 'New option category',
        minQty: 1,
        maxQty: 1,
        options: [{ name: 'Default Item', price: 0 }],
      });
      const mapped = mapGroupToCategory(created);
      setCategories((prev) => [...prev, mapped]);
      setActiveCategoryId(mapped.id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to create modifier group');
    }
  };

  const handleUpdateCategory = (updated: ModifierCategory) => {
    setCategory(updated);
  };

  const handlePersistCategory = async (updated: ModifierCategory) => {
    setActionError(null);
    setCategory(updated);
    try {
      await persistGroup(updated);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to save modifier group');
      await loadGroups(updated.id);
    }
  };

  const handleOpenAddSelection = () => {
    setSelModalMode('create');
    setActiveSelItem(null);
    setSelStep(1);
    setSelPrice('0,00');
    setSelSourceLang('English');
    setSelName('');
    setSelWithoutTranslation(false);
    setSelTranslations({
      EN: '',
      ES: '',
      IT: '',
      FR: '',
      CA: ''
    });
    setIsSelModalOpen(true);
  };

  const handleOpenEditSelection = (item: ModifierItem) => {
    setSelModalMode('edit');
    setActiveSelItem(item);
    setSelStep(1);
    setSelPrice(item.price.toFixed(2).replace('.', ','));
    setSelSourceLang('English');
    setSelName(item.name);
    setSelWithoutTranslation(false);
    setSelTranslations(item.translations || {
      EN: item.name,
      ES: item.name,
      IT: item.name + 'e',
      FR: item.name,
      CA: item.name
    });
    setIsSelModalOpen(true);
  };

  const handleSaveSelectionModal = async () => {
    if (!selName.trim() || !activeCategory) return;
    const finalPrice = parsePriceInput(selPrice);
    const currentName = selTranslations.EN?.trim() || selName.trim();
    setActionError(null);

    try {
      if (selModalMode === 'create') {
        const created = await addModifierOptionAsync(activeCategory.id, {
          name: currentName,
          price: finalPrice,
        });
        handleUpdateCategory({
          ...activeCategory,
          selections: [
            ...activeCategory.selections,
            {
              id: created.id,
              name: created.name,
              price: created.price,
              isActive: true,
              isDefault: false,
              translations: selTranslations,
            },
          ],
        });
      } else if (selModalMode === 'edit' && activeSelItem) {
        const updated = await updateModifierOptionAsync(activeSelItem.id, {
          name: currentName,
          price: finalPrice,
        });
        handleUpdateCategory({
          ...activeCategory,
          selections: activeCategory.selections.map((s) =>
            s.id === activeSelItem.id
              ? { ...s, name: updated.name, price: updated.price, translations: selTranslations }
              : s
          ),
        });
      }
      setIsSelModalOpen(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to save selection');
    }
  };

  const handleRemoveSelection = async (itemId: string) => {
    if (!activeCategory) return;
    setActionError(null);
    try {
      await archiveModifierOptionAsync(itemId);
      handleUpdateCategory({
        ...activeCategory,
        selections: activeCategory.selections.filter((item) => item.id !== itemId),
      });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to remove selection');
    }
  };

  const handleSaveInlineSelection = async (itemId: string) => {
    if (!activeCategory) return;
    const finalPrice = parsePriceInput(tempSelectionPrice);
    const finalName = tempSelectionName.trim();
    setActionError(null);
    try {
      const updated = await updateModifierOptionAsync(itemId, {
        name: finalName || undefined,
        price: Number.isFinite(finalPrice) ? finalPrice : undefined,
      });
      handleUpdateCategory({
        ...activeCategory,
        selections: activeCategory.selections.map((s) =>
          s.id === itemId ? { ...s, name: updated.name, price: updated.price } : s
        ),
      });
      setEditingSelectionId(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to save selection');
    }
  };

  const handleToggleSelectionActive = async (item: ModifierItem) => {
    if (!activeCategory) return;
    setActionError(null);
    const nextActive = !item.isActive;
    handleUpdateCategory({
      ...activeCategory,
      selections: activeCategory.selections.map((s) =>
        s.id === item.id ? { ...s, isActive: nextActive } : s
      ),
    });
    try {
      await updateModifierOptionAsync(item.id, { isArchived: !nextActive });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update selection');
      await loadGroups(activeCategory.id);
    }
  };

  const handleDeleteCategory = async () => {
    if (!activeCategory) return;
    setActionError(null);
    try {
      await archiveModifierGroupAsync(activeCategory.id);
      const remaining = categories.filter((c) => c.id !== activeCategory.id);
      setCategories(remaining);
      setActiveCategoryId(remaining[0]?.id ?? '');
      setShowDeleteConfirm(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete category');
    }
  };

  const handleToggleDishAssignment = async (categoryId: string) => {
    if (!activeCategory) return;
    const isAssigned = activeCategory.assignedDishIds.includes(categoryId);
    const newAssigned = isAssigned
      ? activeCategory.assignedDishIds.filter((id) => id !== categoryId)
      : [...activeCategory.assignedDishIds, categoryId];
    handleUpdateCategory({ ...activeCategory, assignedDishIds: newAssigned });
    setActionError(null);
    try {
      const saved = await linkModifierGroupCategoriesAsync(activeCategory.id, newAssigned);
      setCategory(mergeCategoryFromApi(activeCategory, mapGroupToCategory(saved)));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to link categories');
      await loadGroups(activeCategory.id);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-55 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-6"
        >
          <motion.div 
            initial={{ scale: 0.96, y: 15 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="bg-white w-full max-w-6xl h-[85vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl relative"
          >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1">
            <div>
              <h2 className="text-lg font-black text-gray-900">Modifiers (Options Manager)</h2>
              <p className="text-xs font-semibold text-gray-500">Configure global modifier categories and assign them to menu dishes</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-9 h-9 rounded-full bg-gray-50 text-gray-500 flex items-center justify-center hover:bg-gray-100 hover:text-gray-800 transition-all cursor-pointer border border-transparent hover:border-gray-200"
          >
            <X size={18} />
          </button>
        </div>

        {actionError && (
          <div className="mx-6 mt-3 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm font-semibold shrink-0">
            {actionError}
          </div>
        )}

        {/* Workspace Body */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Left Column: Options List */}
          <div className="w-80 border-r border-gray-100 flex flex-col shrink-0 bg-gray-50/20">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center shrink-0">
              <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider">Options list</span>
              <button 
                onClick={() => void handleAddCategory()}
                className="p-1 text-corgi hover:bg-orange-50 rounded-lg cursor-pointer transition-colors"
                title="Add new category"
              >
                <Plus size={18} />
              </button>
            </div>
            <Reorder.Group 
              axis="y" 
              values={categories} 
              onReorder={setCategories}
              className="flex-1 overflow-y-auto p-3 space-y-1.5"
            >
              {categories.map(cat => (
                <Reorder.Item
                  key={cat.id}
                  value={cat}
                  className="list-none"
                >
                  <div
                    onClick={() => {
                      setActiveCategoryId(cat.id);
                      setEditingField(null);
                      setEditingSelectionId(null);
                      setShowDeleteConfirm(false);
                    }}
                    className={`w-full p-3.5 rounded-2xl flex items-center justify-between cursor-pointer transition-all border ${
                      activeCategoryId === cat.id
                        ? 'bg-orange-50/50 border-orange-300 text-gray-900 font-black'
                        : 'bg-white hover:bg-gray-50/80 border-gray-200 text-gray-600 hover:text-gray-900 font-bold'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <GripVertical size={14} className="text-gray-400 cursor-grab active:cursor-grabbing shrink-0" />
                      <div className="min-w-0">
                        <span className="block text-sm truncate">{cat.name}</span>
                        <span className="block text-[10px] text-gray-400 font-bold mt-0.5">
                          Option in {cat.assignedDishIds.length} items
                        </span>
                      </div>
                    </div>
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                      cat.isActive
                        ? 'bg-green-50 text-green-700 border border-green-200/80'
                        : 'bg-gray-50 text-gray-400 border border-gray-200/60'
                    }`}>
                      {cat.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </Reorder.Item>
              ))}
            </Reorder.Group>
            <div className="p-3 border-t border-gray-100 bg-white shrink-0">
              <button
                onClick={() => void handleAddCategory()}
                className="w-full py-3 rounded-xl border border-dashed border-gray-300 hover:border-corgi text-gray-400 hover:text-corgi flex items-center justify-center gap-1.5 text-xs font-black cursor-pointer transition-all active:scale-[0.98]"
              >
                <Plus size={14} className="stroke-[3px]" /> Add new option
              </button>
            </div>
          </div>

          {/* Right Column: Editor Panel */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {activeCategory ? (
              <>
                {/* Section: Option Title & Status Badge */}
                <div className="flex justify-between items-start">
                  <div>
                    {editingField === 'name' ? (
                      <div className="flex gap-2 items-center h-9">
                        <input
                          type="text"
                          defaultValue={activeCategory.name}
                          onChange={(e) => setTempInputValue(e.target.value)}
                          className="h-9 w-56 bg-white border border-gray-200 focus:border-corgi focus:ring-4 focus:ring-corgi/10 rounded-xl px-3.5 text-sm font-black text-gray-950 outline-none transition-all"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              void handlePersistCategory({ ...activeCategory, name: tempInputValue.trim() || activeCategory.name });
                              setEditingField(null);
                            }
                          }}
                        />
                        <button 
                          onClick={() => {
                            void handlePersistCategory({ ...activeCategory, name: tempInputValue.trim() || activeCategory.name });
                            setEditingField(null);
                          }}
                          className="w-9 h-9 rounded-xl bg-corgi text-white flex items-center justify-center cursor-pointer hover:bg-corgi/90 transition-all shrink-0"
                        >
                          <Check size={15} className="stroke-[3.5px]" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 h-9">
                        <h3 className="text-xl font-black text-gray-900 leading-none">{activeCategory.name}</h3>
                        <button 
                          onClick={() => {
                            setTempInputValue(activeCategory.name);
                            setEditingField('name');
                          }}
                          className="p-1 text-gray-400 hover:text-gray-800 rounded-lg cursor-pointer hover:bg-gray-50 flex items-center justify-center"
                        >
                          <Edit2 size={14} />
                        </button>
                      </div>
                    )}
                    <p className="text-xs text-gray-400 font-semibold mt-1">Configure selection types and base prices for this variant class</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Active Toggle Badge */}
                    <button
                      onClick={() => void handlePersistCategory({ ...activeCategory, isActive: !activeCategory.isActive })}
                      className={`h-9 px-4 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all cursor-pointer border shrink-0 flex items-center justify-center ${
                        activeCategory.isActive
                          ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100/50'
                          : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200/50'
                      }`}
                    >
                      {activeCategory.isActive ? 'Active' : 'Inactive'}
                    </button>

                    {/* Delete Category Button with Frame */}
                    {showDeleteConfirm ? (
                      <div className="h-9 flex items-center gap-2 bg-red-50 border border-red-200 px-3 rounded-xl animate-in fade-in duration-100 shrink-0">
                        <span className="text-[11px] font-black text-red-700">Delete?</span>
                        <button
                          type="button"
                          onClick={() => void handleDeleteCategory()}
                          className="h-6 px-2.5 flex items-center justify-center bg-red-600 hover:bg-red-700 text-white text-[10px] font-black rounded-lg cursor-pointer transition-colors"
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirm(false)}
                          className="h-6 px-2.5 flex items-center justify-center bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-[10px] font-black rounded-lg cursor-pointer transition-colors"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="w-9 h-9 rounded-xl border border-gray-200 text-gray-400 hover:text-red-600 hover:bg-red-50/50 hover:border-red-200/50 flex items-center justify-center transition-all cursor-pointer shrink-0"
                        title="Delete Category"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Section: Option Info / Rules */}
                <div className="bg-gray-50/50 border border-gray-150 rounded-2xl p-4 space-y-4">
                  <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider block">Option information</span>
                  <div className="grid grid-cols-2 gap-6">
                    {/* Multi choice & Services toggle */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-gray-700">Multi choice selection</span>
                        <button
                          onClick={() => void handlePersistCategory({ ...activeCategory, isMultiChoice: !activeCategory.isMultiChoice })}
                          className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${activeCategory.isMultiChoice ? 'bg-corgi' : 'bg-gray-200'}`}
                        >
                          <div className={`w-5 h-5 rounded-full bg-white transition-transform ${activeCategory.isMultiChoice ? 'translate-x-5' : ''}`} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-gray-700">Free selection of services</span>
                        <button
                          onClick={() => void handlePersistCategory({ ...activeCategory, isFreeSelection: !activeCategory.isFreeSelection })}
                          className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${activeCategory.isFreeSelection ? 'bg-corgi' : 'bg-gray-200'}`}
                        >
                          <div className={`w-5 h-5 rounded-full bg-white transition-transform ${activeCategory.isFreeSelection ? 'translate-x-5' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {/* Free selections count input */}
                    {activeCategory.isFreeSelection && (
                      <div className="flex flex-col justify-end">
                        <span className="text-xs font-extrabold text-gray-500 mb-1.5">Number of selections for free</span>
                        {editingField === 'free_count' ? (
                          <div className="flex gap-2 items-center">
                            <input
                              type="number"
                              defaultValue={activeCategory.freeSelectionsCount}
                              onChange={(e) => setTempInputValue(e.target.value)}
                              className="bg-white border border-gray-300 focus:border-corgi focus:ring-2 focus:ring-corgi/20 rounded-xl px-3 py-1.5 text-xs font-black text-gray-950 outline-none w-20 transition-all"
                              autoFocus
                            />
                            <button 
                              onClick={() => {
                                void handlePersistCategory({
                                  ...activeCategory,
                                  freeSelectionsCount: parseInt(tempInputValue, 10) || 0,
                                });
                                setEditingField(null);
                              }}
                              className="w-7 h-7 rounded-lg bg-corgi text-white flex items-center justify-center cursor-pointer hover:bg-orange-600 transition-all"
                            >
                              <Check size={14} className="stroke-[3px]" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-black text-gray-900">{activeCategory.freeSelectionsCount}</span>
                            <button 
                              onClick={() => {
                                setTempInputValue(activeCategory.freeSelectionsCount.toString());
                                setEditingField('free_count');
                              }}
                              className="text-xs font-bold text-corgi hover:underline cursor-pointer"
                            >
                              Edit
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Section: Selections Table */}
                <div className="bg-white border border-gray-150 rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                    <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider">Selections</span>
                  </div>
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-400 font-extrabold bg-gray-50/20">
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Price</th>
                        <th className="px-4 py-3 text-center">Active</th>
                        <th className="px-4 py-3 text-center">Default value</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-semibold text-gray-700">
                      {activeCategory.selections.map(item => (
                        <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3">
                            {editingSelectionId === item.id ? (
                              <input
                                type="text"
                                value={tempSelectionName}
                                onChange={(e) => setTempSelectionName(e.target.value)}
                                className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold outline-none"
                              />
                            ) : (
                              <span className="text-gray-900 font-extrabold">{item.name}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {editingSelectionId === item.id ? (
                              <input
                                type="text"
                                value={tempSelectionPrice}
                                onChange={(e) => onPriceInputChange(e, setTempSelectionPrice)}
                                onBlur={(e) => onPriceInputBlur(e, setTempSelectionPrice)}
                                onKeyDown={(e) => onPriceInputKeyDown(e, setTempSelectionPrice)}
                                placeholder="0,00"
                                className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold outline-none w-20"
                              />
                            ) : (
                              <span>€{formatPriceDisplay(item.price)}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => void handleToggleSelectionActive(item)}
                              className={`w-9 h-5 rounded-full p-0.5 mx-auto transition-colors cursor-pointer ${item.isActive ? 'bg-corgi' : 'bg-gray-200'}`}
                            >
                              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${item.isActive ? 'translate-x-4' : ''}`} />
                            </button>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              disabled={activeCategory.isMultiChoice}
                              onClick={() => {
                                const updatedSel = activeCategory.selections.map(s => ({ ...s, isDefault: s.id === item.id }));
                                handleUpdateCategory({ ...activeCategory, selections: updatedSel });
                              }}
                              className={`w-4 h-4 rounded-full border flex items-center justify-center mx-auto transition-all cursor-pointer ${
                                item.isDefault 
                                  ? 'border-corgi bg-orange-50 text-corgi' 
                                  : 'border-gray-300 hover:border-gray-400 bg-white'
                              }`}
                            >
                              {item.isDefault && <div className="w-2 h-2 rounded-full bg-corgi" />}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex gap-2 justify-end">
                              {editingSelectionId === item.id ? (
                                <button
                                  onClick={() => void handleSaveInlineSelection(item.id)}
                                  className="text-xs font-bold text-corgi hover:underline cursor-pointer"
                                >
                                  Save
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setEditingSelectionId(item.id);
                                    setTempSelectionName(item.name);
                                    setTempSelectionPrice(formatPriceDisplay(item.price));
                                  }}
                                  className="p-1 text-gray-400 hover:text-gray-900 rounded cursor-pointer"
                                  title="Edit selection"
                                >
                                  <Edit2 size={13} />
                                </button>
                              )}
                              <button
                                onClick={() => void handleRemoveSelection(item.id)}
                                className="p-1 text-gray-400 hover:text-red-500 rounded cursor-pointer"
                                title="Remove selection"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="p-3 bg-gray-50/30 border-t border-gray-100">
                    <button
                      onClick={handleOpenAddSelection}
                      className="text-xs font-black text-corgi hover:text-orange-600 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Plus size={14} className="stroke-[3px]" /> Add selection
                    </button>
                  </div>
                </div>

                {/* Section: Menu categories linked to this modifier group */}
                <div className="space-y-3" data-testid="modifier-category-links">
                  <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider block">Menu categories linked to this group</span>
                  <div className="flex flex-wrap gap-2">
                    {menuCategories.map((cat) => {
                      const isLinked = activeCategory.assignedDishIds.includes(cat.id);
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          data-testid={`modifier-link-category-${cat.id}`}
                          onClick={() => void handleToggleDishAssignment(cat.id)}
                          className={`px-3 py-2 rounded-xl text-[13px] font-bold border transition-all cursor-pointer ${
                            isLinked
                              ? 'border-corgi bg-corgi/10 text-corgi'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          {cat.name}
                        </button>
                      );
                    })}
                    {menuCategories.length === 0 && (
                      <span className="text-sm text-gray-400 font-medium">No menu categories available.</span>
                    )}
                  </div>
                </div>

                {/* Legacy dish grid hidden — category M2M replaces per-dish assignment */}
                <div className="hidden">
                  <div className="grid grid-cols-5 gap-3.5">
                    {dishes.map(dish => {
                      const isLinked = false;
                      return (
                        <div
                          key={dish.id}
                          className={`rounded-2xl border transition-all overflow-hidden flex flex-col bg-white relative select-none text-left w-full ${
                            isLinked
                              ? 'border-corgi ring-2 ring-corgi/10'
                              : 'border-gray-200 opacity-40'
                          }`}
                        >
                          {/* Card Image */}
                          <div className="h-28 w-full bg-gray-50 relative overflow-hidden shrink-0 border-b border-gray-100 pointer-events-none">
                            {dish.image ? (
                              <img src={dish.image} alt={dish.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-350">No Image</div>
                            )}

                            {/* Linked Indicator checkmark */}
                            {isLinked && (
                              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-corgi text-white flex items-center justify-center shadow animate-in zoom-in-90 duration-100">
                                <Check size={12} className="stroke-[3.5px]" />
                              </div>
                            )}
                          </div>

                          {/* Card Details */}
                          <div className="p-3 flex-1 flex flex-col justify-between pointer-events-none">
                            <span className="text-xs font-black text-gray-900 truncate w-full" title={dish.name}>
                              {dish.name}
                            </span>
                            <span className="text-[11px] font-black text-corgi mt-1.5 block">
                              €{dish.basePrice?.toFixed(2).replace('.', ',') || '0,00'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 font-semibold">
                No active category selected
              </div>
            )}
      {/* Step-by-Step Add/Edit Selection Modal */}
      <AnimatePresence>
        {isSelModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="fixed inset-0 z-58 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.96, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-gray-100 flex flex-col"
            >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h4 className="text-sm font-black text-gray-900">
                  {selModalMode === 'create' ? 'Add selection' : 'Edit selection'}
                </h4>
                <p className="text-[10px] text-gray-400 font-bold mt-0.5">Define translation properties and item offsets</p>
              </div>
              <button 
                type="button"
                onClick={() => setIsSelModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white text-gray-500 flex items-center justify-center border border-gray-200/60 hover:bg-gray-50 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 flex-1 space-y-5">
              {/* Progress Line */}
              <div className="space-y-1.5">
                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-corgi transition-all duration-300" 
                    style={{ width: selStep === 1 ? '50%' : '100%' }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-wider">
                  <span className={selStep === 1 ? 'text-corgi' : ''}>1. Base details</span>
                  <span className={selStep === 2 ? 'text-corgi' : ''}>2. Translations</span>
                </div>
              </div>

              {selStep === 1 ? (
                /* Step 1: Base Details */
                <div className="space-y-4">
                  {/* Price Field */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider block">Price (€)</span>
                    <div className="relative">
                      <input
                        type="text"
                        value={selPrice}
                        onChange={(e) => onPriceInputChange(e, setSelPrice)}
                        onBlur={(e) => onPriceInputBlur(e, setSelPrice)}
                        onKeyDown={(e) => onPriceInputKeyDown(e, setSelPrice)}
                        className="h-10 w-full bg-white border border-gray-200 focus:border-corgi focus:ring-4 focus:ring-corgi/10 rounded-xl px-4 pr-12 text-sm font-extrabold text-gray-900 outline-none transition-all"
                        placeholder="0,00"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-gray-400">EUR</span>
                    </div>
                  </div>

                  {/* Language Selector */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider block">Language selection</span>
                    <div className="relative">
                      <select
                        value={selSourceLang}
                        onChange={(e) => setSelSourceLang(e.target.value)}
                        className="h-10 w-full bg-white border border-gray-200 focus:border-corgi focus:ring-4 focus:ring-corgi/10 rounded-xl px-4 pr-10 text-sm font-extrabold text-gray-900 outline-none transition-all appearance-none cursor-pointer"
                      >
                        <option>English</option>
                        <option>Spanish</option>
                        <option>Italian</option>
                        <option>French</option>
                        <option>Catalan</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                    <span className="text-[10px] text-gray-450 font-bold block mt-1">Source language for the translation</span>
                  </div>

                  {/* Name field */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider block">Selection name</span>
                    <textarea
                      value={selName}
                      onChange={(e) => {
                        setSelName(e.target.value);
                        // pre-fill English translation with source input name
                        setSelTranslations(prev => ({ ...prev, EN: e.target.value, ES: e.target.value, FR: e.target.value, CA: e.target.value }));
                      }}
                      className="w-full bg-white border border-gray-200 focus:border-corgi focus:ring-4 focus:ring-corgi/10 rounded-xl p-3.5 text-sm font-extrabold text-gray-900 outline-none transition-all resize-none h-20"
                      placeholder="e.g. Normal, Extra Shot..."
                    />
                  </div>

                  {/* Checkbox without translations */}
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <button
                      type="button"
                      onClick={() => setSelWithoutTranslation(!selWithoutTranslation)}
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                        selWithoutTranslation 
                          ? 'border-corgi bg-orange-50 text-corgi' 
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      {selWithoutTranslation && <Check size={12} className="stroke-[3.5px]" />}
                    </button>
                    <span className="text-xs font-bold text-gray-600">Without translation</span>
                  </label>
                </div>
              ) : (
                /* Step 2: Translations */
                <div className="space-y-4">
                  <div className="flex border-b border-gray-100 pb-2 gap-4 text-xs font-black text-gray-400">
                    <span className="text-corgi border-b border-corgi pb-2">Fill the information</span>
                    <span className="hover:text-gray-600 cursor-pointer">Check translation</span>
                  </div>

                  <div className="space-y-3.5 max-h-60 overflow-y-auto pr-1">
                     {Object.keys(selTranslations).map((lang) => {
                       const langNames: Record<string, string> = {
                         EN: 'English',
                         ES: 'Spanish',
                         IT: 'Italian',
                         FR: 'French',
                         CA: 'Catalan'
                       };
                       return (
                         <div key={lang} className="flex gap-4 items-center">
                           <span className="w-20 text-xs font-black text-gray-500 text-center uppercase tracking-wider bg-gray-50 py-1.5 rounded-lg border border-gray-150 shrink-0">
                             {langNames[lang] || lang}
                           </span>
                           <input
                             type="text"
                             value={selTranslations[lang]}
                             onChange={(e) => {
                               const val = e.target.value;
                               setSelTranslations(prev => ({ ...prev, [lang]: val }));
                             }}
                             className="h-10 flex-1 bg-white border border-gray-200 focus:border-corgi focus:ring-4 focus:ring-corgi/10 rounded-xl px-4 text-xs font-extrabold text-gray-900 outline-none transition-all"
                             placeholder={`Enter name in ${langNames[lang] || lang}`}
                           />
                         </div>
                       );
                     })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0 bg-gray-50/20">
              {selStep === 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIsSelModalOpen(false)}
                    className="px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-xs font-black rounded-xl text-gray-600 cursor-pointer transition-all active:scale-[0.98]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!selName.trim()) return;
                      if (selWithoutTranslation) {
                        void handleSaveSelectionModal();
                      } else {
                        setSelStep(2);
                      }
                    }}
                    disabled={!selName.trim()}
                    className={`px-5 py-2.5 text-xs font-black rounded-xl text-white cursor-pointer transition-all active:scale-[0.98] ${
                      selName.trim() ? 'bg-corgi hover:bg-corgi/90' : 'bg-gray-200 cursor-not-allowed text-gray-400'
                    }`}
                  >
                    Next
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setSelStep(1)}
                    className="px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-xs font-black rounded-xl text-gray-600 cursor-pointer transition-all active:scale-[0.98]"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSaveSelectionModal()}
                    className="px-5 py-2.5 bg-corgi hover:bg-corgi/90 text-xs font-black rounded-xl text-white cursor-pointer transition-all active:scale-[0.98]"
                  >
                    Save
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
          </div>
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}