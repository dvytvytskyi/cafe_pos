import React, { useState, useEffect } from 'react';
import { X, Globe2, Plus, Info, Image as ImageIcon, GripVertical, Trash2, Settings, Tag, Layers, AlertCircle, Check, AlertTriangle, MapPin, Castle, Church, Landmark, LayoutGrid, Coffee, Star, History, Clock, ArrowLeft, Edit2 } from 'lucide-react';
import { Reorder } from 'framer-motion';

type DishModalProps = {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'create' | 'edit';
};

type Section = 'general' | 'price' | 'modifiers' | 'allergens' | 'locations';
type Language = 'en' | 'ru' | 'es';

const AVAILABLE_MODIFIER_CATEGORIES = [
  {
    name: 'Milk options',
    selections: [
      { name: 'Oat milk', price: '0.40' },
      { name: 'Almond milk', price: '0.40' },
      { name: 'Soy milk', price: '0.30' },
      { name: 'Lactose-free milk', price: '0.30' },
      { name: 'Normal milk', price: '0.00' }
    ]
  },
  {
    name: 'Ice',
    selections: [
      { name: 'No ice', price: '0.00' },
      { name: 'Less ice', price: '0.00' },
      { name: 'Regular ice', price: '0.00' },
      { name: 'Extra ice', price: '0.00' }
    ]
  },
  {
    name: 'Extras',
    selections: [
      { name: 'Chocolate drizzle', price: '0.50' },
      { name: 'Whipped cream', price: '0.60' },
      { name: 'Cinnamon powder', price: '0.20' }
    ]
  }
];

export default function DishModal({ isOpen, onClose, mode = 'create' }: DishModalProps) {
  const [activeSection, setActiveSection] = useState<Section>('general');
  const [activeLang, setActiveLang] = useState<Language>('en');

  // Form State Placeholders
  const [name, setName] = useState({ en: '', ru: '', es: '' });
  const [description, setDescription] = useState({ en: '', ru: '', es: '' });
  const [notes, setNotes] = useState('');
  const [isRecommended, setIsRecommended] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Pricing State
  const [pricingType, setPricingType] = useState<'single' | 'variants'>('single');
  const [singlePrice, setSinglePrice] = useState('0.00');
  const [variants, setVariants] = useState([{ id: '1', name: 'Standard', price: '0.00', isActive: true }]);

  // Modifiers State
  const [modifiers, setModifiers] = useState([{ id: '1', name: 'Extra Shot', price: '1.50', maxQty: '1', isActive: true }]);

  // Allergens State
  const [allergens, setAllergens] = useState(['Dairy', 'Nuts']);
  const [customAllergens, setCustomAllergens] = useState<string[]>([]);
  const [newAllergen, setNewAllergen] = useState('');
  const allAvailableAllergens = [...['Dairy', 'Nuts', 'Gluten', 'Soy', 'Eggs', 'Fish', 'Shellfish'], ...customAllergens];

  // Tags State
  const [tags, setTags] = useState<string[]>(['Best Seller']);
  const [newTagInput, setNewTagInput] = useState('');
  const popularTags = ['Best Seller', 'New', 'Chef Special', 'Vegan', 'Organic', 'Spicy', 'Limited Edition', 'Healthy'];

  const handleAddTag = (tagStr: string) => {
    const cleaned = tagStr.trim();
    if (!cleaned) return;
    if (!tags.includes(cleaned)) {
      setTags([...tags, cleaned]);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleAddCustomAllergen = (e: React.KeyboardEvent | React.MouseEvent) => {
    if (e.type === 'keydown' && (e as React.KeyboardEvent).key !== 'Enter') return;
    e.preventDefault();
    if (!newAllergen.trim()) return;
    const capitalized = newAllergen.trim().charAt(0).toUpperCase() + newAllergen.trim().slice(1);
    if (!allAvailableAllergens.includes(capitalized)) {
      setCustomAllergens([...customAllergens, capitalized]);
    }
    if (!allergens.includes(capitalized)) {
      setAllergens([...allergens, capitalized]);
    }
    setNewAllergen('');
  };

  // Delete Confirmation State
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'variant' | 'modifier', id: string } | null>(null);
  
  // Toggle Confirmation State
  const [toggleConfirm, setToggleConfirm] = useState<{ type: 'variant' | 'modifier' | 'dish', id: string, willBeActive: boolean } | null>(null);

  const handleDeleteConfirm = () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === 'variant') {
      setVariants(variants.filter(v => v.id !== deleteConfirm.id));
    } else if (deleteConfirm.type === 'modifier') {
      setModifiers(modifiers.filter(m => m.id !== deleteConfirm.id));
    }
    setDeleteConfirm(null);
  };

  const handleToggleConfirm = () => {
    if (!toggleConfirm) return;
    if (toggleConfirm.type === 'variant') {
      setVariants(variants.map(v => v.id === toggleConfirm.id ? { ...v, isActive: toggleConfirm.willBeActive } : v));
    } else if (toggleConfirm.type === 'modifier') {
      setModifiers(modifiers.map(m => m.id === toggleConfirm.id ? { ...m, isActive: toggleConfirm.willBeActive } : m));
    } else if (toggleConfirm.type === 'dish') {
      setIsDishActive(toggleConfirm.willBeActive);
    }
    setToggleConfirm(null);
  };

  // Locations State
  const availableLocations = [
    { id: 'gothic', name: 'Gothic', icon: <Castle size={14} /> },
    { id: 'sagrada', name: 'Sagrada', icon: <Church size={14} /> },
    { id: 'arc', name: 'Arc de Triumph', icon: <Landmark size={14} /> },
    { id: 'eixample', name: 'Eixample', icon: <LayoutGrid size={14} /> },
    { id: 'gracia', name: 'Gracia', icon: <Coffee size={14} /> },
  ];
  const [selectedLocations, setSelectedLocations] = useState<string[]>(availableLocations.map(l => l.id));

  const [isSaved, setIsSaved] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isDishActive, setIsDishActive] = useState(true);

  // Modifier duplicates checker
  const duplicateModifierNames = modifiers
    .map(m => m.name.trim().toLowerCase())
    .filter((name, idx, self) => self.indexOf(name) !== idx && name !== '');
  const hasDuplicateModifiers = duplicateModifierNames.length > 0;

  const [initialStateHash, setInitialStateHash] = useState<string | null>(null);
  const [closeConfirm, setCloseConfirm] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  
  // Save Confirm State (Edit Mode)
  const [saveConfirm, setSaveConfirm] = useState(false);
  const [saveSelectedLocations, setSaveSelectedLocations] = useState<string[]>(['all']);
  
  // Category Link Preview State
  const [activePreviewCategoryName, setActivePreviewCategoryName] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setInitialStateHash(JSON.stringify({ name, description, notes, pricingType, singlePrice, variants, modifiers, allergens, customAllergens, photoPreview, isDishActive, selectedLocations, tags }));
      setCloseConfirm(false);
      setIsClosing(false);
      setSaveConfirm(false);
      if (mode === 'create') {
        setSelectedLocations(availableLocations.map(l => l.id));
      }
    } else {
      setInitialStateHash(null);
    }
  }, [isOpen, mode]);

  const hasUnsavedChanges = initialStateHash !== null && initialStateHash !== JSON.stringify({ name, description, notes, pricingType, singlePrice, variants, modifiers, allergens, customAllergens, photoPreview, isDishActive, selectedLocations, tags });

  const handleCloseAnimation = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200);
  };

  const handleCloseRequest = () => {
    if (hasUnsavedChanges) {
      setCloseConfirm(true);
    } else {
      handleCloseAnimation();
    }
  };

  const handleSaveClick = () => {
    if (hasDuplicateModifiers) {
      alert(`Please resolve duplicate modifier names: ${duplicateModifierNames.join(', ')}`);
      return;
    }
    if (mode === 'edit') {
      setSaveConfirm(true);
    } else {
      handleSave();
    }
  };

  const handleSave = () => {
    setSaveConfirm(false);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      setInitialStateHash(JSON.stringify({ name, description, notes, pricingType, singlePrice, variants, modifiers, allergens, customAllergens, photoPreview, isDishActive, selectedLocations }));
      handleCloseAnimation();
    }, 1000);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
    }
  };

  if (!isOpen) return null;

  const sections: { id: Section; label: string; icon: React.ElementType }[] = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'price', label: 'Pricing & Variants', icon: Tag },
    { id: 'modifiers', label: 'Modifiers', icon: Layers },
    { id: 'allergens', label: 'Allergens', icon: AlertCircle },
    ...(mode === 'create' ? [{ id: 'locations' as Section, label: 'Locations', icon: MapPin }] : []),
  ];

  const renderOverrideBadge = (field: string) => null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity duration-200 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
        onClick={handleCloseRequest}
      />

      {/* Modal Container */}
      <div className={`relative w-full max-w-5xl h-[85vh] bg-white rounded-[32px] shadow-2xl flex flex-col overflow-hidden duration-200 ${isClosing ? 'animate-out fade-out zoom-out-95' : 'animate-in fade-in zoom-in-95'}`}>
        
        {/* Header */}
        <div className="flex justify-between items-center px-8 py-5 border-b border-gray-100 bg-white z-10 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900">{mode === 'edit' ? 'Edit Dish' : 'Add New Dish'}</h2>
            {/* Selected Locations Badge in Header */}
            {availableLocations.every(loc => selectedLocations.includes(loc.id)) ? (
              <span className="flex items-center h-6 text-[12px] font-bold text-gray-600 bg-gray-100 px-2.5 rounded-md">All Locations</span>
            ) : selectedLocations.length === 0 ? (
              <span className="flex items-center h-6 text-[12px] font-bold text-red-500 bg-red-50 px-2.5 rounded-md">No Locations</span>
            ) : (
              <div className="flex -space-x-1">
                {availableLocations.filter(l => selectedLocations.includes(l.id)).map(loc => (
                  <div key={loc.id} className="w-6 h-6 rounded-full bg-gray-100 border border-white flex items-center justify-center text-gray-500" title={loc.name}>
                    {loc.icon}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-6">
            {/* Language Switcher */}
            <div className="flex items-center gap-0.5 h-9 bg-gray-50/80 p-1 rounded-xl border border-gray-200/60 shrink-0">
              {(['en', 'ru', 'es'] as Language[]).map(lang => (
                <button
                  key={lang}
                  onClick={() => setActiveLang(lang)}
                  className={`cursor-pointer whitespace-nowrap h-7 flex items-center justify-center gap-1.5 px-3 text-[13px] font-semibold rounded-lg uppercase transition-all duration-200 ${
                    activeLang === lang 
                      ? 'bg-white text-corgi shadow-sm' 
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'
                  }`}
                >
                  <Globe2 size={14} className={activeLang === lang ? 'text-corgi' : 'text-gray-400 group-hover:text-gray-500'} />
                  {lang}
                </button>
              ))}
            </div>

            <div className="h-6 w-px bg-gray-200" />

            {/* Dish Visibility Toggle */}
            <div className="relative group flex items-center justify-center">
              <button 
                onClick={() => setToggleConfirm({ type: 'dish', id: 'main', willBeActive: !isDishActive })}
                className={`relative w-9 h-5 rounded-full transition-all cursor-pointer ${isDishActive ? 'bg-corgi hover:bg-orange-500' : 'bg-gray-200 hover:bg-gray-300'}`}
              >
                <div className={`absolute top-[2px] left-[2px] bg-white w-4 h-4 rounded-full transition-transform ${isDishActive ? 'translate-x-4 shadow-sm' : 'translate-x-0'}`} />
              </button>
              
              {/* Tooltip */}
              <div className="absolute -bottom-8 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap bg-gray-900 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg">
                {isDishActive ? 'Visible in menu' : 'Hidden from menu'}
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
              </div>
            </div>

            {/* Recommend Toggle */}
            <div className="relative group flex items-center justify-center">
              <button 
                onClick={() => setIsRecommended(!isRecommended)}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer border ${isRecommended ? 'bg-yellow-50 text-yellow-500 border-yellow-200 shadow-sm' : 'bg-gray-50 text-gray-400 border-transparent hover:bg-gray-100 hover:text-gray-600'}`}
              >
                <Star size={18} className={isRecommended ? 'fill-current' : ''} />
              </button>
              <div className="absolute -bottom-8 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap bg-gray-900 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg">
                {isRecommended ? 'Recommended' : 'Not Recommended'}
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
              </div>
            </div>

            {/* History Button */}
            <div className="relative group flex items-center justify-center">
              <button 
                onClick={() => setShowHistory(true)}
                className="w-9 h-9 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center transition-all cursor-pointer border border-transparent hover:bg-gray-100 hover:text-gray-600"
              >
                <History size={18} />
              </button>
              <div className="absolute -bottom-8 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap bg-gray-900 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg">
                Version History
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
              </div>
            </div>

            {/* Close Button */}
            <button 
              onClick={handleCloseRequest}
              className="w-9 h-9 rounded-full bg-gray-50 text-gray-500 flex items-center justify-center hover:bg-gray-100 hover:text-gray-800 transition-colors cursor-pointer border border-transparent hover:border-gray-200 shrink-0"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-56 bg-gray-50/50 border-r border-gray-100 p-5 flex flex-col gap-1.5 shrink-0">
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer text-left text-[13px] font-semibold ${activeSection === section.id ? 'bg-white shadow-sm border border-gray-200/60 text-corgi' : 'text-gray-500 hover:bg-gray-100/80 hover:text-gray-900 border border-transparent'}`}
              >
                <section.icon size={16} className={activeSection === section.id ? 'text-corgi' : 'text-gray-400'} />
                {section.label}
              </button>
            ))}
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-10 bg-white">
            <div className="max-w-2xl mx-auto">
              {/* General Section */}
              {activeSection === 'general' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="flex gap-6">
                    {/* Photo Upload */}
                    <label className="w-40 h-40 shrink-0 rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 hover:bg-gray-50 hover:border-gray-300 transition-colors cursor-pointer relative overflow-hidden group">
                      <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                      {photoPreview ? (
                        <>
                          <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <ImageIcon size={24} className="text-white" />
                          </div>
                        </>
                      ) : (
                        <>
                          <ImageIcon size={28} className="mb-2" />
                          <span className="text-[13px] font-bold text-gray-500">Upload</span>
                        </>
                      )}
                    </label>

                    {/* Basic Info */}
                    <div className="flex-1 space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="block text-[14px] font-bold text-gray-900">
                            Dish Name <span className="text-corgi uppercase ml-1">({activeLang})</span>
                          </label>
                          {renderOverrideBadge('name')}
                        </div>
                        <input 
                          type="text" 
                          placeholder="e.g. Avocado Toast" 
                          value={name[activeLang]}
                          onChange={(e) => setName({ ...name, [activeLang]: e.target.value })}
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[14px] font-medium text-gray-800 outline-none hover:border-gray-300 focus:border-corgi focus:ring-4 focus:ring-corgi/10 transition-all"
                        />
                      </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-[14px] font-bold text-gray-900">
                        Description / Recipe <span className="text-corgi uppercase ml-1">({activeLang})</span>
                      </label>
                      {renderOverrideBadge('description')}
                    </div>
                    <textarea 
                      placeholder="Detailed description of the dish..." 
                      value={description[activeLang]}
                      onChange={(e) => setDescription({ ...description, [activeLang]: e.target.value })}
                      className="w-full h-32 bg-white border border-gray-200 rounded-xl px-4 py-3 text-[14px] font-medium text-gray-800 outline-none hover:border-gray-300 focus:border-corgi focus:ring-4 focus:ring-corgi/10 transition-all resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-[14px] font-bold text-gray-900">Internal Notes <span className="text-gray-400 font-medium">(Not visible to clients)</span></label>
                      {renderOverrideBadge('internal_notes')}
                    </div>
                    <textarea 
                      placeholder="e.g. Prep takes 10 minutes..." 
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full h-24 bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-3 text-[14px] font-medium text-gray-800 outline-none hover:border-gray-300 focus:border-corgi focus:ring-4 focus:ring-corgi/10 transition-all resize-none"
                    />
                  </div>

                  {/* Tags Section */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-[14px] font-bold text-gray-900">
                        Dish Tags
                      </label>
                    </div>

                    {/* Tags Input & Active tags bubble display */}
                    <div className="w-full bg-white border border-gray-200 rounded-xl p-3 flex flex-wrap gap-2 items-center focus-within:border-corgi focus-within:ring-4 focus-within:ring-corgi/10 transition-all">
                      {tags.map(tag => (
                        <span 
                          key={tag}
                          className="bg-orange-50 text-corgi border border-orange-200/60 rounded-lg px-2.5 py-1 text-xs font-bold flex items-center gap-1.5 select-none"
                        >
                          {tag}
                          <button 
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="text-orange-300 hover:text-corgi transition-colors cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                      <div className="flex-1 flex gap-2 items-center min-w-[150px]">
                        <input 
                          type="text"
                          placeholder={tags.length === 0 ? "Type new tag and press Enter..." : "Add tag..."}
                          value={newTagInput}
                          onChange={(e) => setNewTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddTag(newTagInput);
                              setNewTagInput('');
                            } else if (e.key === ',' || e.key === ' ') {
                              e.preventDefault();
                              handleAddTag(newTagInput);
                              setNewTagInput('');
                            }
                          }}
                          className="flex-1 bg-transparent text-[14px] font-medium text-gray-800 outline-none placeholder-gray-400"
                        />
                        {newTagInput.trim() && (
                          <button 
                            type="button"
                            onClick={() => {
                              handleAddTag(newTagInput);
                              setNewTagInput('');
                            }}
                            className="w-7 h-7 bg-corgi hover:bg-orange-600 text-white rounded-lg transition-all cursor-pointer active:scale-95 flex items-center justify-center shrink-0 shadow-sm animate-in zoom-in-95 duration-100"
                            title="Add tag"
                          >
                            <Plus size={14} className="stroke-[3px]" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Popular Tags List */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-black uppercase tracking-wider text-gray-400 block">Popular Tags:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {popularTags.map(pTag => {
                          const isSelected = tags.includes(pTag);
                          return (
                            <button
                              key={pTag}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  handleRemoveTag(pTag);
                                } else {
                                  handleAddTag(pTag);
                                }
                              }}
                              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-orange-50 text-corgi border border-orange-200/80'
                                  : 'bg-white text-gray-400 border border-gray-200/60 hover:bg-gray-50'
                              }`}
                            >
                              {pTag}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Price Section */}
              {activeSection === 'price' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-[16px] font-bold text-gray-900">Pricing & Variants</h3>
                      <p className="text-[13px] text-gray-500 font-medium">Set a fixed price or offer different sizes/options.</p>
                    </div>
                    
                    {/* Segmented Control */}
                    <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100">
                      <button 
                        onClick={() => setPricingType('single')}
                        className={`px-4 py-2 rounded-lg text-[13px] font-bold transition-all cursor-pointer ${pricingType === 'single' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'}`}
                      >
                        Single Price
                      </button>
                      <button 
                        onClick={() => setPricingType('variants')}
                        className={`px-4 py-2 rounded-lg text-[13px] font-bold transition-all cursor-pointer ${pricingType === 'variants' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'}`}
                      >
                        Variants (Sizes)
                      </button>
                    </div>
                  </div>

                  {pricingType === 'single' ? (
                    <div className="p-6 bg-gray-50/50 border border-gray-100 rounded-2xl">
                      <div className="flex items-center mb-2">
                        <label className="block text-[13px] font-bold text-gray-900">Base Price (€)</label>
                        {renderOverrideBadge('price')}
                      </div>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">€</span>
                        <input 
                          type="number" 
                          value={singlePrice}
                          onChange={(e) => setSinglePrice(e.target.value)}
                          className="w-48 bg-white border border-gray-200 rounded-xl pl-8 pr-4 py-3 text-[13px] font-semibold text-gray-800 outline-none hover:border-gray-300 focus:border-corgi"
                        />
                      </div>
                    </div>
                  ) : (
                    <Reorder.Group axis="y" values={variants} onReorder={setVariants} className="space-y-4">
                      {variants.map((variant) => (
                        <Reorder.Item key={variant.id} value={variant} className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl hover:border-gray-200 hover:shadow-sm transition-shadow group relative bg-white">
                          <div className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 transition-colors">
                            <GripVertical size={16} />
                          </div>
                          
                          <div className="flex-1 space-y-1">
                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Variant Name</label>
                            <input 
                              type="text" 
                              value={variant.name}
                              onChange={(e) => setVariants(variants.map(v => v.id === variant.id ? { ...v, name: e.target.value } : v))}
                              className="w-full bg-gray-50 border border-transparent hover:bg-white hover:border-gray-200 focus:bg-white focus:border-corgi rounded-lg px-3 py-2 text-[13px] font-semibold text-gray-900 outline-none transition-all"
                            />
                          </div>

                          <div className="w-32 space-y-1">
                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Price (€)</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-[13px]">€</span>
                              <input 
                                type="number" 
                                value={variant.price}
                                onChange={(e) => setVariants(variants.map(v => v.id === variant.id ? { ...v, price: e.target.value } : v))}
                                className="w-full bg-gray-50 border border-transparent hover:bg-white hover:border-gray-200 focus:bg-white focus:border-corgi rounded-lg pl-7 pr-3 py-2 text-[13px] font-semibold text-gray-900 outline-none transition-all"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-3 pl-4 border-l border-gray-100 h-10 mt-5">
                            <button 
                              onClick={() => setToggleConfirm({ type: 'variant', id: variant.id, willBeActive: !variant.isActive })}
                              className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${variant.isActive ? 'bg-corgi' : 'bg-gray-200'}`}
                            >
                              <div className={`absolute top-[2px] left-[2px] bg-white w-4 h-4 rounded-full transition-transform ${variant.isActive ? 'translate-x-4 shadow-sm' : 'translate-x-0'}`} />
                            </button>
                            <button 
                              onClick={() => setDeleteConfirm({ type: 'variant', id: variant.id })}
                              className="text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50 cursor-pointer"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </Reorder.Item>
                      ))}
                      
                      <button 
                        onClick={() => setVariants([...variants, { id: Date.now().toString(), name: 'New Variant', price: '0.00', isActive: true }])}
                        className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-[13px] font-semibold text-gray-500 hover:bg-gray-50 hover:text-gray-800 hover:border-gray-300 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Plus size={16} />
                        Add Another Variant
                      </button>
                    </Reorder.Group>
                  )}
                </div>
              )}

              {/* Modifiers Section */}
              {activeSection === 'modifiers' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div>
                    <h3 className="text-[16px] font-bold text-gray-900">Modifiers (Add-ons)</h3>
                    <p className="text-[13px] text-gray-500 font-medium mt-1">Allow customers to customize their dish with extras.</p>
                  </div>

                  {/* Auto-link Modifier Category */}
                  <div className="flex flex-col gap-3.5 bg-gray-50 border border-gray-150 p-4 rounded-2xl">
                    {!activePreviewCategoryName ? (
                      <>
                        <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider block">Link modifier category immediately</span>
                        <div className="flex flex-wrap gap-2">
                          {AVAILABLE_MODIFIER_CATEGORIES.map(category => (
                            <button
                              key={category.name}
                              type="button"
                              onClick={() => setActivePreviewCategoryName(category.name)}
                              className="px-3 py-1.5 rounded-xl border border-orange-200 bg-orange-50/50 hover:bg-orange-50 text-[12px] font-black text-corgi cursor-pointer transition-all active:scale-[0.98] flex items-center gap-1.5"
                            >
                              <Plus size={12} className="stroke-[3px]" /> {category.name}
                            </button>
                          ))}
                        </div>
                      </>
                    ) : (
                      (() => {
                        const previewCat = AVAILABLE_MODIFIER_CATEGORIES.find(c => c.name === activePreviewCategoryName);
                        if (!previewCat) return null;
                        return (
                          <div className="space-y-3 animate-in fade-in duration-200">
                            <div>
                              <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider block">Preview modifier category</span>
                              <h4 className="text-[13px] font-bold text-gray-900 mt-1">Import items from "{previewCat.name}" category?</h4>
                            </div>
                            
                            {/* Preview List of Items */}
                            <div className="bg-white border border-gray-150 rounded-xl divide-y divide-gray-100 p-1 max-h-48 overflow-y-auto">
                              {previewCat.selections.map(sel => {
                                const isDuplicate = modifiers.some(m => m.name.trim().toLowerCase() === sel.name.trim().toLowerCase());
                                return (
                                  <div key={sel.name} className="flex justify-between items-center px-3 py-2 text-xs font-semibold">
                                    <span className="text-gray-900">{sel.name}</span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-gray-400">€{parseFloat(sel.price).toFixed(2).replace('.', ',')}</span>
                                      {isDuplicate && (
                                        <span className="text-[9px] font-black uppercase bg-red-50 text-red-500 border border-red-100 px-1.5 py-0.5 rounded">Duplicate (will skip)</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-2 justify-end">
                              <button
                                type="button"
                                onClick={() => setActivePreviewCategoryName(null)}
                                className="px-3.5 py-2 bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-black rounded-xl cursor-pointer transition-all active:scale-[0.98]"
                              >
                                Decline
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const newItems = [];
                                  let dupCount = 0;
                                  
                                  previewCat.selections.forEach(sel => {
                                    const isDuplicate = modifiers.some(m => m.name.trim().toLowerCase() === sel.name.trim().toLowerCase());
                                    if (isDuplicate) {
                                      dupCount++;
                                    } else {
                                      newItems.push({
                                        id: 'mod-' + Date.now() + Math.random(),
                                        name: sel.name,
                                        price: sel.price,
                                        maxQty: '1',
                                        isActive: true
                                      });
                                    }
                                  });
                                  
                                  if (newItems.length > 0) {
                                    setModifiers([...modifiers, ...newItems]);
                                  }
                                  
                                  if (dupCount > 0) {
                                    alert(`Imported ${newItems.length} modifiers. ${dupCount} duplicate(s) were skipped.`);
                                  }
                                  
                                  setActivePreviewCategoryName(null);
                                }}
                                className="px-4 py-2 bg-corgi hover:bg-orange-600 text-white text-xs font-black rounded-xl cursor-pointer transition-all active:scale-[0.98]"
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        );
                      })()
                    )}
                  </div>

                  <Reorder.Group axis="y" values={modifiers} onReorder={setModifiers} className="space-y-4">
                    {modifiers.map((modifier) => (
                      <Reorder.Item key={modifier.id} value={modifier} className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl hover:border-gray-200 hover:shadow-sm transition-shadow group relative bg-white">
                        <div className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 transition-colors">
                          <GripVertical size={16} />
                        </div>
                        
                        <div className="flex-1 space-y-1">
                          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Modifier Name</label>
                          {(() => {
                            const isDuplicateName = modifiers.filter(m => m.name.trim().toLowerCase() === modifier.name.trim().toLowerCase() && m.name.trim() !== '').length > 1;
                            return (
                              <>
                                <input 
                                  type="text" 
                                  value={modifier.name}
                                  onChange={(e) => setModifiers(modifiers.map(m => m.id === modifier.id ? { ...m, name: e.target.value } : m))}
                                  className={`w-full border rounded-lg px-3 py-2 text-[13px] font-semibold outline-none transition-all ${
                                    isDuplicateName
                                      ? 'bg-red-50 border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-100 text-red-950 font-bold'
                                      : 'bg-gray-50 border-transparent hover:bg-white hover:border-gray-200 focus:bg-white focus:border-corgi text-gray-900'
                                  }`}
                                />
                                {isDuplicateName && (
                                  <span className="text-[10px] font-bold text-red-500 block mt-0.5 animate-in fade-in duration-100">Duplicate modifier name!</span>
                                )}
                              </>
                            );
                          })()}
                        </div>

                        <div className="w-24 space-y-1">
                          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Price (€)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-[13px]">€</span>
                            <input 
                              type="number" 
                              value={modifier.price}
                              onChange={(e) => setModifiers(modifiers.map(m => m.id === modifier.id ? { ...m, price: e.target.value } : m))}
                              className="w-full bg-gray-50 border border-transparent hover:bg-white hover:border-gray-200 focus:bg-white focus:border-corgi rounded-lg pl-7 pr-3 py-2 text-[13px] font-semibold text-gray-900 outline-none transition-all"
                            />
                          </div>
                        </div>

                        <div className="w-24 space-y-1">
                          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Max Qty</label>
                          <input 
                            type="number" 
                            placeholder="∞"
                            value={modifier.maxQty}
                            onChange={(e) => setModifiers(modifiers.map(m => m.id === modifier.id ? { ...m, maxQty: e.target.value } : m))}
                            className="w-full bg-gray-50 border border-transparent hover:bg-white hover:border-gray-200 focus:bg-white focus:border-corgi rounded-lg px-3 py-2 text-[13px] font-semibold text-gray-900 outline-none transition-all"
                          />
                        </div>

                        <div className="flex items-center gap-3 pl-4 border-l border-gray-100 h-10 mt-5">
                          <button 
                            onClick={() => setToggleConfirm({ type: 'modifier', id: modifier.id, willBeActive: !modifier.isActive })}
                            className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${modifier.isActive ? 'bg-corgi' : 'bg-gray-200'}`}
                          >
                            <div className={`absolute top-[2px] left-[2px] bg-white w-4 h-4 rounded-full transition-transform ${modifier.isActive ? 'translate-x-4 shadow-sm' : 'translate-x-0'}`} />
                          </button>
                          <button 
                            onClick={() => setDeleteConfirm({ type: 'modifier', id: modifier.id })}
                            className="text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </Reorder.Item>
                    ))}
                    
                    <button 
                      onClick={() => setModifiers([...modifiers, { id: Date.now().toString(), name: 'New Modifier', price: '0.00', maxQty: '1', isActive: true }])}
                      className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-[13px] font-semibold text-gray-500 hover:bg-gray-50 hover:text-gray-800 hover:border-gray-300 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Plus size={16} />
                      Add Modifier
                    </button>
                  </Reorder.Group>
                </div>
              )}

              {/* Allergens Section */}
              {activeSection === 'allergens' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div>
                    <h3 className="text-[16px] font-bold text-gray-900">Allergens</h3>
                    <p className="text-[13px] text-gray-500 font-medium mt-1">Select allergens present in this dish to keep customers informed.</p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {allAvailableAllergens.map(allergen => {
                      const isSelected = allergens.includes(allergen);
                      return (
                        <button
                          key={allergen}
                          onClick={() => setAllergens(isSelected ? allergens.filter(a => a !== allergen) : [...allergens, allergen])}
                          className={`px-3 py-1.5 rounded-xl text-[13px] font-semibold border-2 transition-all cursor-pointer ${isSelected ? 'border-corgi bg-corgi/10 text-corgi' : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200 hover:bg-gray-50 hover:text-gray-900'}`}
                        >
                          {allergen}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 w-max">
                    <input
                      type="text"
                      placeholder="Add custom allergen..."
                      value={newAllergen}
                      onChange={(e) => setNewAllergen(e.target.value)}
                      onKeyDown={handleAddCustomAllergen}
                      className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-[13px] font-semibold text-gray-800 outline-none hover:border-gray-300 focus:border-corgi w-48"
                    />
                    <button 
                      onClick={handleAddCustomAllergen} 
                      className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-500 hover:text-corgi hover:border-corgi transition-colors cursor-pointer"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* Locations Section (Create Mode Only) */}
              {activeSection === 'locations' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div>
                    <h3 className="text-[16px] font-bold text-gray-900">Publish Locations</h3>
                    <p className="text-[13px] text-gray-500 font-medium mt-1">Select the branches where this dish will be available.</p>
                  </div>
                  
                  <div className="space-y-3">
                    {availableLocations.map(loc => {
                      const isSelected = selectedLocations.includes(loc.id);
                      return (
                        <div 
                          key={loc.id}
                          onClick={() => {
                            setSelectedLocations(prev => 
                              prev.includes(loc.id) 
                                ? prev.filter(id => id !== loc.id) 
                                : [...prev, loc.id]
                            );
                          }}
                          className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${isSelected ? 'border-corgi bg-corgi/5' : 'border-gray-100 hover:border-gray-200 bg-white'}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-[14px] ${isSelected ? 'bg-corgi text-white' : 'bg-gray-100 text-gray-500'}`}>
                              {loc.icon}
                            </div>
                            <div>
                              <div className={`font-bold ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>{loc.name}</div>
                            </div>
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-corgi bg-corgi text-white' : 'border-gray-300'}`}>
                            {isSelected && <Check size={14} strokeWidth={3} />}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 shrink-0">
          <button 
            onClick={handleCloseRequest}
            className="px-6 py-2.5 rounded-xl text-[13px] font-bold text-gray-600 hover:bg-gray-200/50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button 
            onClick={handleSaveClick}
            className={`py-2.5 rounded-xl text-[13px] font-bold transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2 w-32 ${isSaved ? 'bg-green-500 text-white pointer-events-none' : 'bg-black text-white hover:bg-gray-800 active:scale-95'}`}
          >
            {isSaved ? (
              <>
                <Check size={16} className="animate-in zoom-in duration-300" />
                <span>Saved!</span>
              </>
            ) : (
              <span>Save Dish</span>
            )}
          </button>
        </div>

        {/* Delete Confirmation Overlay */}
        {deleteConfirm && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-900/20 backdrop-blur-sm rounded-[32px]">
            <div className="bg-white p-6 rounded-3xl shadow-xl w-80 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mb-4">
                <Trash2 size={24} />
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-2">Delete Item?</h4>
              <p className="text-[13px] text-gray-500 mb-6 font-medium leading-relaxed">
                Are you sure you want to remove this {deleteConfirm.type}? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setDeleteConfirm(null)} 
                  className="px-4 py-2.5 text-[13px] font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteConfirm} 
                  className="px-5 py-2.5 text-[13px] font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors cursor-pointer shadow-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toggle Confirmation Overlay */}
        {toggleConfirm && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-900/20 backdrop-blur-sm rounded-[32px]">
            <div className="bg-white p-6 rounded-3xl shadow-xl w-80 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-12 h-12 bg-corgi/10 rounded-2xl flex items-center justify-center text-corgi mb-4">
                <Info size={24} />
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-2">Change Visibility?</h4>
              <p className="text-[13px] text-gray-500 mb-6 font-medium leading-relaxed">
                Are you sure you want to make this {toggleConfirm.type} {toggleConfirm.willBeActive ? 'visible' : 'hidden'}?
              </p>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setToggleConfirm(null)} 
                  className="px-4 py-2.5 text-[13px] font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleToggleConfirm} 
                  className="px-5 py-2.5 text-[13px] font-bold text-white bg-corgi hover:bg-orange-600 rounded-xl transition-colors cursor-pointer shadow-sm"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Close Confirmation Overlay */}
        {closeConfirm && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-900/20 backdrop-blur-sm rounded-[32px]">
            <div className="bg-white p-6 rounded-3xl shadow-xl w-80 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 mb-4">
                <AlertTriangle size={24} />
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-2">Discard Changes?</h4>
              <p className="text-[13px] text-gray-500 mb-6 font-medium leading-relaxed">
                You have unsaved changes. Are you sure you want to discard them and close this window?
              </p>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setCloseConfirm(false)} 
                  className="px-4 py-2.5 text-[13px] font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  Continue Editing
                </button>
                <button 
                  onClick={() => {
                    setCloseConfirm(false);
                    handleCloseAnimation();
                  }} 
                  className="px-5 py-2.5 text-[13px] font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors cursor-pointer shadow-sm"
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Save Confirmation Overlay (Edit Mode) */}
        {saveConfirm && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-900/20 backdrop-blur-sm rounded-[32px]">
            <div className="bg-white p-6 rounded-3xl shadow-xl w-[400px] animate-in fade-in zoom-in-95 duration-200">
              <div className="w-12 h-12 bg-corgi/10 rounded-2xl flex items-center justify-center text-corgi mb-4">
                <MapPin size={24} />
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-2">Save Changes</h4>
              <p className="text-[13px] text-gray-500 mb-5 font-medium leading-relaxed">
                Where do you want to apply these changes?
              </p>
              
              <div className="space-y-3 mb-6">
                <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${saveSelectedLocations.includes('all') ? 'border-corgi bg-corgi/5' : 'border-gray-100 hover:border-gray-200'}`}>
                  <input 
                    type="radio" 
                    name="saveLoc" 
                    className="hidden"
                    checked={saveSelectedLocations.includes('all')}
                    onChange={() => setSaveSelectedLocations(['all'])}
                  />
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${saveSelectedLocations.includes('all') ? 'border-corgi bg-corgi' : 'border-gray-300'}`}>
                    {saveSelectedLocations.includes('all') && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                  <span className="font-bold text-[14px] text-gray-900">Apply to all locations</span>
                </label>
                
                <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${!saveSelectedLocations.includes('all') ? 'border-corgi bg-corgi/5' : 'border-gray-100 hover:border-gray-200'}`}>
                  <input 
                    type="radio" 
                    name="saveLoc" 
                    className="hidden"
                    checked={!saveSelectedLocations.includes('all')}
                    onChange={() => {
                      setSaveSelectedLocations(selectedLocations.length ? selectedLocations : availableLocations.map(l => l.id));
                    }}
                  />
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${!saveSelectedLocations.includes('all') ? 'border-corgi bg-corgi' : 'border-gray-300'}`}>
                    {!saveSelectedLocations.includes('all') && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                  <span className="font-bold text-[14px] text-gray-900">Select specific locations</span>
                </label>
                
                {/* Specific locations selector */}
                {!saveSelectedLocations.includes('all') && (
                  <div className="ml-8 mt-3 space-y-2">
                    {availableLocations.map(loc => {
                      const isSelected = saveSelectedLocations.includes(loc.id);
                      return (
                        <label key={loc.id} className="flex items-center gap-3 cursor-pointer group">
                          <div className={`w-5 h-5 rounded-[6px] border flex items-center justify-center transition-colors ${isSelected ? 'bg-corgi border-corgi text-white' : 'border-gray-300 bg-white group-hover:border-corgi'}`}>
                            {isSelected && <Check size={14} strokeWidth={3} />}
                          </div>
                          <span className="text-[13px] font-semibold text-gray-700">{loc.name}</span>
                          <input 
                            type="checkbox" 
                            className="hidden"
                            checked={isSelected}
                            onChange={(e) => {
                              setSaveSelectedLocations(prev => 
                                e.target.checked 
                                  ? [...prev, loc.id] 
                                  : prev.filter(id => id !== loc.id)
                              );
                            }}
                          />
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setSaveConfirm(false)} 
                  className="px-4 py-2.5 text-[13px] font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave} 
                  disabled={!saveSelectedLocations.includes('all') && saveSelectedLocations.length === 0}
                  className="px-5 py-2.5 text-[13px] font-bold text-white bg-black hover:bg-gray-800 rounded-xl transition-colors cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Version History Overlay */}
        {showHistory && (
          <div className="absolute inset-0 z-50 bg-white rounded-[32px] overflow-hidden flex flex-col animate-in slide-in-from-right-8 duration-300">
            <div className="flex items-center gap-4 px-8 pt-5 pb-4 border-b border-gray-100 bg-white shrink-0">
              <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer -ml-2">
                <ArrowLeft size={20} className="text-gray-600" />
              </button>
              <h2 className="text-xl font-bold text-gray-900">Version History</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 bg-gray-50/30">
              <div className="max-w-2xl mx-auto space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
                
                {[...Array(30)].map((_, i) => {
                  const isFirst = i === 0;
                  const isLast = i === 29;
                  const num = 30 - i;
                  
                  const dateStr = isFirst ? 'Today' : isLast ? '12 Oct 2023' : `1${i%9 + 1} Oct 2023`;
                  const timeStr = isFirst ? '14:32' : isLast ? '09:15' : `10:0${i % 10}`;
                  const author = isFirst ? 'Admin (Alex)' : isLast ? 'System' : 'Manager (Maria)';
                  const initial = author.charAt(0);

                  return (
                    <div key={i} className={`relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group ${isFirst ? 'is-active' : ''}`}>
                      <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm relative z-10 font-bold text-[14px] ${isFirst ? 'bg-corgi text-white' : 'bg-gray-100 text-gray-500'}`}>
                        {num}
                      </div>
                      <div className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all ${isFirst ? 'hover:border-corgi/30' : ''}`}>
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-bold text-gray-900 text-[15px]">
                            {isFirst ? 'Price Updated' : isLast ? 'Dish Created' : 'Description Changed'}
                          </span>
                          <div className="flex flex-col items-end">
                            <span className="text-gray-900 text-[12px] font-bold">{timeStr}</span>
                            <span className="text-gray-400 text-[11px] font-semibold">{dateStr}</span>
                          </div>
                        </div>
                        
                        <p className="text-[13px] text-gray-600 font-medium mb-4">
                          {isFirst ? (
                            <>Base price increased from <span className="text-gray-400 font-bold line-through mx-1">€3.50</span> to <span className="text-corgi font-bold mx-1">€4.00</span>.</>
                          ) : isLast ? (
                            <>Initial creation of the dish record.</>
                          ) : (
                            <>Updated Spanish translation for description.</>
                          )}
                        </p>
                        
                        <div className="flex items-center gap-2 pt-3 border-t border-gray-50">
                           <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center text-[10px] font-bold text-purple-700">
                             {initial}
                           </div>
                           <span className="text-[12px] font-medium text-gray-500">
                             by <span className="font-bold text-gray-700">{author}</span>
                           </span>
                        </div>
                      </div>
                    </div>
                  );
                })}

              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
