import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, ChevronDown, GripVertical } from 'lucide-react';
import { validateBoardStages, validateStageLabel } from '@/lib/board-validation';

export type Stage = {
  id: string;
  label: string;
  color: string;
};

type BoardSettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  stages: Stage[];
  onSave: (newStages: Stage[], taskMigrations: { from: string; to: string }[]) => void | Promise<void>;
  tasksWithStatus: Record<string, number>;
  lockedStages?: string[];
  boardType?: 'tasks' | 'orders';
};

const COLORS = [
  'bg-blue-500', 'bg-orange-500', 'bg-purple-500', 'bg-red-500', 'bg-green-500', 'bg-gray-400',
  'bg-pink-500', 'bg-yellow-500', 'bg-indigo-500', 'bg-teal-500', 'bg-cyan-500'
];

export default function BoardSettingsModal({
  isOpen,
  onClose,
  stages,
  onSave,
  tasksWithStatus,
  lockedStages = [],
  boardType = 'tasks',
}: BoardSettingsModalProps) {
  const [localStages, setLocalStages] = useState<Stage[]>(stages);
  const [migrations, setMigrations] = useState<{from: string, to: string}[]>([]);
  const [newStageLabel, setNewStageLabel] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [deletingStage, setDeletingStage] = useState<Stage | null>(null);
  const [migrateTo, setMigrateTo] = useState<string>('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newStages = [...localStages];
    const draggedItem = newStages[draggedIndex];
    newStages.splice(draggedIndex, 1);
    newStages.splice(index, 0, draggedItem);
    
    setDraggedIndex(index);
    setLocalStages(newStages);
    setValidationError(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  React.useEffect(() => {
    if (isOpen) {
      setLocalStages(stages);
      setMigrations([]);
      setNewStageLabel('');
      setDeletingStage(null);
      setValidationError(null);
      setIsSaving(false);
    }
  }, [isOpen, stages]);

  if (!isOpen) return null;

  const validateStages = (nextStages: Stage[]): boolean => {
    const result = validateBoardStages(nextStages);
    if (!result.valid) {
      setValidationError(result.error ?? 'Invalid columns');
      return false;
    }
    setValidationError(null);
    return true;
  };

  const handleRename = (stageId: string, label: string) => {
    setLocalStages((prev) =>
      prev.map((s) => (s.id === stageId ? { ...s, label } : s))
    );
    setValidationError(null);
  };

  const handleAddStage = () => {
    const labelCheck = validateStageLabel(newStageLabel);
    if (!labelCheck.valid) {
      setValidationError(labelCheck.error ?? 'Invalid column name');
      return;
    }

    const trimmed = newStageLabel.trim();
    const duplicate = localStages.some(
      (s) => s.label.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      setValidationError('Duplicate column names are not allowed');
      return;
    }

    const newId = `stage_${Math.random().toString(36).substring(2, 9)}`;
    const next = [...localStages, { id: newId, label: trimmed, color: selectedColor }];
    setLocalStages(next);
    setNewStageLabel('');
    setValidationError(null);
  };

  const initiateDelete = (stage: Stage) => {
    const taskCount = tasksWithStatus[stage.id] || 0;
    if (taskCount > 0) {
      setDeletingStage(stage);
      const availableStages = localStages.filter(s => s.id !== stage.id);
      setMigrateTo(availableStages.length > 0 ? availableStages[0].id : '');
    } else {
      const newStages = localStages.filter(s => s.id !== stage.id);
      if (!validateStages(newStages)) return;
      setLocalStages(newStages);
    }
  };

  const confirmDelete = async () => {
    if (!deletingStage) return;

    const availableStages = localStages.filter((s) => s.id !== deletingStage.id);
    const targetId = migrateTo || availableStages[0]?.id || '';
    let newMigrations = migrations;
    if (targetId) {
      newMigrations = [...migrations, { from: deletingStage.id, to: targetId }];
      setMigrations(newMigrations);
    }
    const newStages = localStages.filter((s) => s.id !== deletingStage.id);
    if (!validateStages(newStages)) return;

    setLocalStages(newStages);
    setDeletingStage(null);
    setIsSaving(true);
    try {
      await onSave(newStages, newMigrations);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!validateStages(localStages)) return;
    setIsSaving(true);
    try {
      await onSave(localStages, migrations);
    } finally {
      setIsSaving(false);
    }
  };

  const itemLabel = boardType === 'orders' ? 'orders' : 'tasks';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            data-testid="board-settings-modal"
            onClick={onClose}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <h2 className="text-[18px] font-bold text-gray-900">Board Columns</h2>
                    <p className="text-[13px] text-gray-400 font-medium mt-0.5">
                      Manage {boardType} stages and migration
                    </p>
                  </div>
                </div>
                <button 
                  onClick={onClose} 
                  className="w-9 h-9 rounded-full bg-gray-50 text-gray-500 flex items-center justify-center hover:bg-gray-100 hover:text-gray-800 transition-colors cursor-pointer border border-transparent hover:border-gray-200 shrink-0 active:scale-95"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                {validationError && (
                  <div role="alert" className="mb-4 bg-red-50 border border-red-100 text-red-700 text-[13px] font-medium rounded-xl px-3 py-2">
                    {validationError}
                  </div>
                )}

                {deletingStage ? (
                  <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                    <h3 className="text-red-800 font-bold text-[14px] mb-2">Column has active {itemLabel}</h3>
                    <p className="text-red-600 text-[13px] mb-4">
                      The column <strong>{deletingStage.label}</strong> currently has {tasksWithStatus[deletingStage.id]} {itemLabel}. 
                      Where should we move them?
                    </p>
                    
                    <div className="relative mb-4">
                      <select 
                        value={migrateTo}
                        onChange={e => setMigrateTo(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-red-200 rounded-xl text-[14px] text-gray-900 font-bold focus:outline-none focus:ring-2 focus:ring-red-500/20 appearance-none cursor-pointer pr-10"
                      >
                        {localStages.filter(s => s.id !== deletingStage.id).map(s => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => void confirmDelete()}
                        disabled={isSaving}
                        className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold py-2 rounded-xl text-[13px] transition-all cursor-pointer active:scale-95"
                      >
                        Move & Delete
                      </button>
                      <button onClick={() => setDeletingStage(null)} className="flex-1 bg-white border border-red-200 hover:bg-red-50 text-red-700 font-bold py-2 rounded-xl text-[13px] transition-all cursor-pointer active:scale-95">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2 mb-6">
                      <h3 className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-3">Current Columns</h3>
                      {localStages.map((stage, index) => (
                        <div 
                          key={stage.id} 
                          draggable
                          onDragStart={() => handleDragStart(index)}
                          onDragEnter={(e) => handleDragEnter(e, index)}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => e.preventDefault()}
                          className={`flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50 cursor-grab active:cursor-grabbing transition-opacity ${draggedIndex === index ? 'opacity-30' : 'opacity-100'}`}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <GripVertical size={14} className="text-gray-400 shrink-0" />
                            <input
                              type="text"
                              value={stage.label}
                              onChange={(e) => handleRename(stage.id, e.target.value)}
                              className="flex-1 min-w-0 bg-transparent text-[14px] font-bold text-gray-700 focus:outline-none focus:bg-white focus:px-2 focus:py-1 focus:rounded-lg focus:border focus:border-gray-200"
                              aria-label={`Rename column ${stage.label}`}
                            />
                          </div>
                          <div className="flex items-center gap-3 shrink-0 ml-2">
                            <span className="text-[12px] font-medium text-gray-400 bg-white px-2 py-0.5 rounded-lg border border-gray-100">
                              {tasksWithStatus[stage.id] || 0} {itemLabel}
                            </span>
                            {!lockedStages.includes(stage.id) && (
                              <button onClick={() => initiateDelete(stage)} className="text-gray-400 hover:text-red-500 transition-colors p-1 cursor-pointer hover:scale-110 active:scale-90">
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                      <h3 className="text-[13px] font-bold text-gray-700 mb-3">Add New Column</h3>
                      <div className="flex gap-2 mb-3">
                        <input 
                          type="text" 
                          value={newStageLabel}
                          onChange={e => { setNewStageLabel(e.target.value); setValidationError(null); }}
                          placeholder="e.g. Backlog"
                          className="flex-1 px-3 py-2 bg-white rounded-xl border border-gray-200 text-[14px] text-gray-900 font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-corgi/20 focus:border-corgi/30"
                          onKeyDown={e => { if (e.key === 'Enter') handleAddStage(); }}
                        />
                        <button onClick={handleAddStage} className="bg-gray-900 hover:bg-gray-800 text-white px-4 rounded-xl text-[14px] font-bold transition-all cursor-pointer active:scale-95">
                          Add
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
              
              {!deletingStage && (
                <div className="p-4 border-t border-gray-100">
                  <button
                    onClick={() => void handleSave()}
                    disabled={isSaving}
                    className="w-full py-3 bg-corgi hover:opacity-90 disabled:opacity-60 text-white rounded-xl font-bold text-[14px] transition-all shadow-lg shadow-corgi/20 cursor-pointer active:scale-[0.98]"
                  >
                    {isSaving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

