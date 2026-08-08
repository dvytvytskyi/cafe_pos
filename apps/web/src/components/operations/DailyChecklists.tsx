'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { Camera, Check, ShieldAlert, Image as ImageIcon, Settings, MapPin, Sun, Moon, Plus, ChevronLeft, ChevronRight, Calendar, GripVertical } from 'lucide-react';
import PhotoProofUpload from './PhotoProofUpload';
import DatePicker from '../ui/DatePicker';
import {
  getChecklistsAsync,
  saveChecklistCompletionAsync,
  completionsToStateMap,
  type ChecklistTemplate,
} from '@/lib/checklists';
import {
  CHECKLIST_LOCATION_KEYS,
  CHECKLIST_LOCATION_NAMES,
  type LocationKey,
  type ChecklistShiftType,
} from '@/lib/checklist-locations';
import { formatDateParam } from '@/lib/task-dates';
import { getEmployeesAsync } from '@/lib/staff';

type SOPMasterTask = {
  id: string;
  title: string;
  requiresPhoto: boolean;
  category: ChecklistShiftType;
};

type SOPLocalePermissions = Record<string, Record<LocationKey, boolean>>;

type CompletionEntry = { completed: boolean; photoUrl?: string; completionId?: string };
type SOPCompletionState = Record<string, CompletionEntry>;

type DailyChecklistsProps = {
  isSetupMode: boolean;
  setIsSetupMode: (val: boolean) => void;
  onCompletionChanged?: () => void;
};

function templatesToMasterTasks(templates: ChecklistTemplate[]): SOPMasterTask[] {
  return templates.map((t) => ({
    id: t.taskKey,
    title: t.title,
    requiresPhoto: t.requiresPhoto,
    category: t.category,
  }));
}

function templatesToPermissions(templates: ChecklistTemplate[]): SOPLocalePermissions {
  const perms: SOPLocalePermissions = {};
  for (const t of templates) {
    perms[t.taskKey] = CHECKLIST_LOCATION_KEYS.reduce((acc, key) => {
      acc[key] = t.permissions[key] ?? false;
      return acc;
    }, {} as Record<LocationKey, boolean>);
  }
  return perms;
}

export default function DailyChecklists({ isSetupMode, setIsSetupMode, onCompletionChanged }: DailyChecklistsProps) {
  const [masterTasks, setMasterTasks] = useState<SOPMasterTask[]>([]);
  const [permissions, setPermissions] = useState<SOPLocalePermissions>({});
  const [completionState, setCompletionState] = useState<SOPCompletionState>({});
  const [actorUserId, setActorUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [selectedShift, setSelectedShift] = useState<ChecklistShiftType>('opening');
  const [uploadModalItem, setUploadModalItem] = useState<{ id: string, loc: LocationKey, title: string, photoUrl?: string } | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const isMissed = (day: number, month: number) => month === 4 && (day === 1 || day === 2);

  const loadChecklists = useCallback(async () => {
    try {
      setIsLoading(true);
      setSaveError(null);
      const data = await getChecklistsAsync(
        selectedDate,
        isSetupMode ? undefined : selectedShift
      );
      setMasterTasks(templatesToMasterTasks(data.templates));
      setPermissions(templatesToPermissions(data.templates));
      setCompletionState(completionsToStateMap(data.completions));
    } catch (err) {
      console.error('Failed to load checklists:', err);
      setSaveError(err instanceof Error ? err.message : 'Failed to load checklists');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, selectedShift, isSetupMode]);

  useEffect(() => {
    void loadChecklists();
  }, [loadChecklists]);

  useEffect(() => {
    getEmployeesAsync()
      .then((staff) => {
        const active = staff.find((e) => e.status === 'active') ?? staff[0];
        if (active) setActorUserId(active.id);
      })
      .catch((err) => console.error('Failed to load staff for checklist actor:', err));
  }, []);

  const handlePrevDay = () => {
    const newDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const persistCompletion = async (
    loc: LocationKey,
    taskId: string,
    completed: boolean,
    photoUrl?: string
  ) => {
    if (!actorUserId) {
      setSaveError('No active staff user available');
      return;
    }
    const stateKey = `${loc}_${taskId}`;
    try {
      setSaveError(null);
      const saved = await saveChecklistCompletionAsync({
        shiftType: selectedShift,
        date: formatDateParam(selectedDate),
        locationKey: loc,
        taskKey: taskId,
        completed,
        photoUrl: photoUrl ?? null,
        userId: actorUserId,
      });
      setCompletionState((prev) => ({
        ...prev,
        [stateKey]: {
          completed: saved.completed,
          photoUrl: saved.photoUrl ?? undefined,
          completionId: saved.id,
        },
      }));
      onCompletionChanged?.();
    } catch (err) {
      console.error('Failed to save checklist item:', err);
      setSaveError(err instanceof Error ? err.message : 'Failed to save checklist item');
    }
  };

  const toggleItem = (loc: LocationKey, taskId: string, requiresPhoto: boolean, title: string) => {
    const stateKey = `${loc}_${taskId}`;
    const isCompleted = completionState[stateKey]?.completed || false;

    if (isCompleted) {
      void persistCompletion(loc, taskId, false);
    } else if (requiresPhoto) {
      setUploadModalItem({ id: taskId, loc, title, photoUrl: completionState[stateKey]?.photoUrl });
    } else {
      void persistCompletion(loc, taskId, true);
    }
  };

  const handlePhotoUpload = (id: string, loc: LocationKey, photoUrl: string) => {
    void persistCompletion(loc, id, true, photoUrl);
    setUploadModalItem(null);
  };

  const togglePermission = (taskId: string, loc: LocationKey) => {
    setPermissions(prev => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        [loc]: !prev[taskId]?.[loc]
      }
    }));
  };

  const handleReorder = (category: ChecklistShiftType, newOrder: SOPMasterTask[]) => {
    const other = masterTasks.filter((t) => t.category !== category);
    setMasterTasks([...other, ...newOrder]);
  };

  const [isAddingNew, setIsAddingNew] = useState<ChecklistShiftType | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskRequiresPhoto, setNewTaskRequiresPhoto] = useState(false);

  const saveNewTask = (category: ChecklistShiftType) => {
    if (!newTaskTitle.trim()) return;
    const newId = `new_${Date.now()}`;
    const newTask: SOPMasterTask = {
      id: newId,
      title: newTaskTitle,
      requiresPhoto: newTaskRequiresPhoto,
      category
    };

    setMasterTasks([...masterTasks, newTask]);
    setPermissions(prev => ({
      ...prev,
      [newId]: CHECKLIST_LOCATION_KEYS.reduce((acc, key) => {
        acc[key] = true;
        return acc;
      }, {} as Record<LocationKey, boolean>),
    }));

    setIsAddingNew(null);
    setNewTaskTitle('');
    setNewTaskRequiresPhoto(false);
  };

  // ----------------------------------------------------
  // GRID VIEW (Admin Normal View)
  // ----------------------------------------------------
  const renderLocationColumn = (loc: LocationKey) => {
    const tasksForLoc = masterTasks.filter(t => t.category === selectedShift && permissions[t.id]?.[loc]);
    const completedCount = tasksForLoc.filter(t => completionState[`${loc}_${t.id}`]?.completed).length;
    const progress = Math.round((completedCount / tasksForLoc.length) * 100) || 0;

    return (
      <div className="flex flex-col bg-white border border-gray-200 rounded-2xl overflow-hidden h-[320px]">
        {/* Column Header */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col gap-3 shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <MapPin size={16} className="text-corgi" />
              {CHECKLIST_LOCATION_NAMES[loc]}
            </h3>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              {selectedShift === 'opening' ? 'Morning Opening' : 'Evening Closing'}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-500 bg-gray-800"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[12px] font-bold text-gray-700 min-w-[36px] text-right">
              {completedCount}/{tasksForLoc.length}
            </span>
          </div>
        </div>

        {/* Column List with Animation */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-white relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedShift}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 p-3 space-y-1"
            >
              {tasksForLoc.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm font-medium">No SOPs configured</div>
              ) : tasksForLoc.map((item) => {
                const stateKey = `${loc}_${item.id}`;
                const isCompleted = completionState[stateKey]?.completed || false;
                const photoUrl = completionState[stateKey]?.photoUrl;

                return (
                  <div 
                    key={item.id}
                    data-testid={`checklist-task-${loc}-${item.id}`}
                    data-completed={isCompleted ? 'true' : 'false'}
                    className="group flex items-start gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer border border-transparent hover:border-gray-100"
                    onClick={() => toggleItem(loc, item.id, item.requiresPhoto, item.title)}
                  >
                    <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${isCompleted ? 'bg-gray-800 border-gray-800 text-white' : 'bg-white border-gray-300 text-transparent'}`}>
                      <Check size={12} strokeWidth={3} />
                    </div>
                    
                    <div className="flex-1 flex flex-col min-w-0">
                      <span className={`text-[13px] font-medium transition-colors leading-tight ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                        {item.title}
                      </span>
                      
                      {/* Meta Tags */}
                      <div className="flex items-center gap-2 mt-1.5" onClick={e => e.stopPropagation()}>
                        {item.requiresPhoto && !isCompleted && (
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                            <Camera size={11} /> Photo required
                          </span>
                        )}
                        {isCompleted && photoUrl && (
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                            <img
                              src={photoUrl}
                              alt=""
                              data-testid={`checklist-thumb-${loc}-${item.id}`}
                              className="w-6 h-6 rounded-md object-cover border border-gray-200 shrink-0"
                            />
                            <ShieldAlert size={11} /> Verified
                            <button 
                              onClick={() => setUploadModalItem({ id: item.id, loc, title: item.title, photoUrl })}
                              className="ml-1 text-gray-800 hover:underline cursor-pointer"
                            >
                              View
                            </button>
                          </span>
                        )}
                      </div>
                    </div>

                    {item.requiresPhoto && !isCompleted && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploadModalItem({ id: item.id, loc, title: item.title });
                        }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-800 hover:bg-gray-200 transition-colors shrink-0"
                      >
                        <ImageIcon size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    );
  };

  // ----------------------------------------------------
  // MATRIX VIEW (Setup Mode)
  // ----------------------------------------------------
  const renderPermissionsTable = (category: ChecklistShiftType) => {
    const tasks = masterTasks.filter(t => t.category === category);
    
    return (
      <div className="border border-gray-100 rounded-2xl bg-white overflow-hidden shadow-sm mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="px-6 py-4 text-[13px] font-bold text-gray-500 w-1/3">
                {category === 'opening' ? 'Morning Opening SOPs' : 'Evening Closing SOPs'}
              </th>
              {CHECKLIST_LOCATION_KEYS.map(loc => (
                <th key={loc} className="px-2 py-4 text-center bg-purple-50/50">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-4 h-4 rounded-full border border-purple-600 bg-purple-600 flex items-center justify-center scale-125 transition-transform">
                      <div className="w-1.5 h-1.5 bg-white rounded-full" />
                    </div>
                    <span className="text-[12px] font-bold text-purple-600">{CHECKLIST_LOCATION_NAMES[loc]}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <Reorder.Group 
            as="tbody" 
            axis="y" 
            values={tasks} 
            onReorder={(newOrder) => handleReorder(category, newOrder)}
            className="divide-y divide-gray-50 text-[14px]"
          >
            {tasks.map((task) => (
              <Reorder.Item 
                key={task.id} 
                value={task} 
                as="tr"
                className="hover:bg-purple-50/10 transition-colors group bg-white cursor-grab active:cursor-grabbing"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3 relative">
                    <div className="text-gray-300 group-hover:text-gray-500 transition-colors shrink-0">
                      <GripVertical size={16} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-gray-700">{task.title}</span>
                      {task.requiresPhoto && (
                        <span className="text-[10px] font-bold text-orange-500 uppercase tracking-wider flex items-center gap-1 w-fit bg-orange-50 px-2 py-0.5 rounded">
                          <Camera size={11} /> Photo proof required
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                {CHECKLIST_LOCATION_KEYS.map(loc => {
                  const isChecked = permissions[task.id]?.[loc] || false;
                  return (
                    <td key={loc} className="px-2 py-3 text-center group-hover:bg-purple-50/20 transition-colors">
                      <button 
                        onClick={() => togglePermission(task.id, loc)}
                        className={`mx-auto w-5 h-5 rounded flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] cursor-pointer hover:scale-110 active:scale-95 ${isChecked ? 'bg-purple-600 text-white shadow-sm scale-110' : 'border border-gray-200 bg-gray-50 hover:border-gray-300'}`}
                      >
                        {isChecked && <Check size={12} strokeWidth={3} className="transition-all duration-300" />}
                      </button>
                    </td>
                  );
                })}
              </Reorder.Item>
            ))}
            
            {/* ADD NEW ROW inline */}
            {isAddingNew === category ? (
              <tr className="bg-purple-50/20">
                <td colSpan={7} className="px-6 py-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <input 
                        type="text" 
                        placeholder="e.g. Wipe down coffee machine"
                        value={newTaskTitle}
                        onChange={e => setNewTaskTitle(e.target.value)}
                        className="bg-white border border-purple-200 rounded-lg px-4 py-2.5 text-[13px] font-medium w-[440px] outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all text-gray-900 shadow-sm"
                        autoFocus
                      />
                      <button onClick={() => setIsAddingNew(null)} className="bg-white border border-gray-200 text-gray-600 px-5 py-2.5 rounded-xl text-[13px] font-bold hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap">Cancel</button>
                      <button onClick={() => saveNewTask(category)} className="bg-purple-600 text-white px-5 py-2.5 rounded-xl text-[13px] font-bold hover:bg-purple-700 transition-colors shadow-sm cursor-pointer whitespace-nowrap">Save Task</button>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer group w-fit">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${newTaskRequiresPhoto ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-300 group-hover:border-orange-400'}`}>
                        {newTaskRequiresPhoto && <Check size={10} strokeWidth={3} />}
                      </div>
                      <input 
                        type="checkbox" 
                        checked={newTaskRequiresPhoto}
                        onChange={e => setNewTaskRequiresPhoto(e.target.checked)}
                        className="hidden"
                      />
                      <span className="text-[12px] font-bold text-gray-500 group-hover:text-gray-800 transition-colors">Requires Photo Proof</span>
                    </label>
                  </div>
                </td>
              </tr>
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-4">
                  <button 
                    onClick={() => { setIsAddingNew(category); setNewTaskTitle(''); setNewTaskRequiresPhoto(false); }}
                    className="flex items-center gap-2 text-[13px] font-bold text-purple-600 hover:text-purple-800 transition-colors cursor-pointer w-fit"
                  >
                    <Plus size={16} /> Add New SOP Task
                  </button>
                </td>
              </tr>
            )}
          </Reorder.Group>
        </table>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Top Controls */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        
        {isSetupMode ? (
          <div>
            <h2 className="text-lg font-bold text-gray-900 tracking-tight">Default SOP Settings</h2>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-0.5 h-9 bg-gray-50/80 p-1 rounded-xl border border-gray-200/60 shrink-0">
              <button 
                onClick={() => setSelectedShift('opening')} 
                className={`cursor-pointer whitespace-nowrap h-7 flex items-center justify-center px-4 text-[13px] font-semibold rounded-lg transition-all duration-200 gap-1.5 ${selectedShift === 'opening' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'}`}
              >
                <Sun size={14} />
                Morning Opening
              </button>
              <button 
                onClick={() => setSelectedShift('closing')} 
                className={`cursor-pointer whitespace-nowrap h-7 flex items-center justify-center px-4 text-[13px] font-semibold rounded-lg transition-all duration-200 gap-1.5 ${selectedShift === 'closing' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'}`}
              >
                <Moon size={14} />
                Evening Closing
              </button>
            </div>

            <div className="flex items-center gap-2" data-testid="checklist-date-nav">
              <button
                type="button"
                data-testid="checklist-prev-day"
                onClick={handlePrevDay}
                className="text-gray-500 hover:text-gray-900 transition-colors cursor-pointer px-1"
              >
                <ChevronLeft size={18} strokeWidth={2.5} />
              </button>
              
              <DatePicker 
                selectedDate={selectedDate} 
                onChange={setSelectedDate} 
                isMissed={isMissed}
                testId="checklist-date-picker"
              />

              <button
                type="button"
                data-testid="checklist-next-day"
                onClick={handleNextDay}
                className="text-gray-500 hover:text-gray-900 transition-colors cursor-pointer px-1"
              >
                <ChevronRight size={18} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        )}

        <button 
          onClick={() => setIsSetupMode(!isSetupMode)}
          className={`flex items-center justify-center gap-2 w-9 xl:w-auto xl:px-4 h-9 rounded-xl text-[13px] font-bold transition-all cursor-pointer shrink-0 ${
            isSetupMode 
              ? 'bg-purple-100 text-purple-700 hover:bg-purple-200 shadow-sm' 
              : 'bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Settings size={16} />
          <span className="hidden xl:inline">{isSetupMode ? 'Exit Setup Mode' : 'Edit SOPs'}</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0">
        {saveError && (
          <div role="alert" className="mb-4 bg-red-50 border border-red-100 text-red-700 text-[13px] font-medium rounded-xl px-3 py-2">
            {saveError}
          </div>
        )}
        {isLoading && !isSetupMode ? (
          <div className="text-center py-16 text-gray-400 font-medium">Loading checklists…</div>
        ) : isSetupMode ? (
          <div className="pb-10 w-full">
            {renderPermissionsTable('opening')}
            {renderPermissionsTable('closing')}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
            {renderLocationColumn('gotico')}
            {renderLocationColumn('sagrada')}
            {renderLocationColumn('eixample')}
            {renderLocationColumn('gracia')}
            {renderLocationColumn('arc')}
            {renderLocationColumn('main')}
          </div>
        )}
      </div>

      <PhotoProofUpload 
        item={uploadModalItem ? { id: uploadModalItem.id, title: uploadModalItem.title, photoUrl: uploadModalItem.photoUrl } : null} 
        isOpen={!!uploadModalItem} 
        onClose={() => setUploadModalItem(null)} 
        onUpload={(url) => {
          if (uploadModalItem) handlePhotoUpload(uploadModalItem.id, uploadModalItem.loc, url);
        }}
      />
    </div>
  );
}
