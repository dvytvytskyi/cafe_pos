'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Clock, CheckSquare, Paperclip, Plus, MoreVertical, Search, ChevronLeft, ChevronRight, Calendar, Users, MapPin, Filter, ChevronDown, ArrowLeft, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import DatePicker from '../ui/DatePicker';
import NewTaskModal from './NewTaskModal';
import BoardSettingsModal, { Stage } from './BoardSettingsModal';
import {
  Task,
  getTasksAsync,
  createTaskAsync,
  updateTaskAsync,
  deleteTaskAsync,
  migrateTaskStatusAsync,
  formatDateParam,
  syncTasksFromOffline,
} from '@/lib/tasks';
import { getEmployeesAsync, Employee } from '@/lib/staff';
import { CapacitorBridge } from '@/lib/capacitor-bridge';
import { DEFAULT_LOCATION_ID } from '@/lib/constants';
import {
  getBoardSettingsAsync,
  saveBoardSettingsAsync,
  DEFAULT_TASK_STAGES,
} from '@/lib/board-settings';
import { getLocationsCachedAsync } from '@/lib/locations';

const INITIAL_STAGES = DEFAULT_TASK_STAGES;

export type { Task };

export default function TaskManager({
  onBack,
  onTasksChanged,
}: {
  onBack?: () => void;
  onTasksChanged?: () => void;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stages, setStages] = useState<Stage[]>(INITIAL_STAGES);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [assigneeFilter, setAssigneeFilter] = useState('All');
  const [isAssigneeFilterOpen, setIsAssigneeFilterOpen] = useState(false);
  const [locationFilter, setLocationFilter] = useState('All');
  const [isLocationFilterOpen, setIsLocationFilterOpen] = useState(false);
  const [tagFilter, setTagFilter] = useState('All');
  const [isTagFilterOpen, setIsTagFilterOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isDraftTask, setIsDraftTask] = useState(false);
  const [isClientMounted, setIsClientMounted] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [apiLocationNames, setApiLocationNames] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedDate(new Date());
    setIsClientMounted(true);
  }, []);

  const fetchTasks = useCallback(async () => {
    if (!selectedDate) return;
    try {
      setIsLoading(true);
      const filters: { date?: string; assigneeId?: string } = {
        date: formatDateParam(selectedDate),
      };
      if (assigneeFilter !== 'All') {
        filters.assigneeId = assigneeFilter;
      }
      const data = await getTasksAsync(filters);
      setTasks(data);
      setActionError(null);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
      setActionError(err instanceof Error ? err.message : 'Failed to fetch tasks');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, assigneeFilter]);

  const fetchTasksRef = useRef(fetchTasks);
  fetchTasksRef.current = fetchTasks;

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    getEmployeesAsync()
      .then((staff) => {
        setEmployees(staff);
        const active = staff.find((e) => e.status === 'active') ?? staff[0];
        if (active) setCurrentUserId(active.id);
      })
      .catch((err) => console.error('Failed to load staff for task filters:', err));
  }, []);

  useEffect(() => {
    getBoardSettingsAsync('tasks', DEFAULT_LOCATION_ID)
      .then(setStages)
      .catch((err) => console.error('Failed to load task board settings:', err));
  }, []);

  useEffect(() => {
    getLocationsCachedAsync()
      .then((locations) => setApiLocationNames(locations.map((l) => l.name)))
      .catch((err) => console.error('Failed to load locations for task filters:', err));
  }, []);

  useEffect(() => {
    if (!isClientMounted) return;

    let removeNetworkListener = () => {};

    const syncAndRefresh = async () => {
      try {
        const synced = await syncTasksFromOffline(DEFAULT_LOCATION_ID);
        if (synced > 0) {
          await fetchTasksRef.current();
        }
      } catch (err) {
        console.error('Failed to sync offline tasks:', err);
      }
    };

    void syncAndRefresh();

    CapacitorBridge.startNetworkListener((connected) => {
      if (connected) void syncAndRefresh();
    }).then(({ remove }) => {
      removeNetworkListener = remove;
    });

    return () => removeNetworkListener();
  }, [isClientMounted]);

  const resolveAssigneeName = (id: string) => {
    return employees.find((e) => e.id === id)?.name || 'Unknown';
  };

  const openNewTaskModal = (status = 'todo') => {
    const draftTask: Task = {
      id: `T-DRAFT-${Date.now()}`,
      title: 'Untitled Task',
      branch: 'All Branches',
      tags: [{ label: 'Management', bg: 'bg-purple-50', text: 'text-purple-600' }],
      comments: 0,
      attachments: 0,
      progress: 0,
      priority: 'Lowest',
      deadline: 'No deadline',
      assignees: employees[0]?.id ? [employees[0].id] : [],
      likedBy: [],
      status,
      scheduledDate: selectedDate ? formatDateParam(selectedDate) : formatDateParam(new Date()),
    };

    setEditingTask(draftTask);
    setIsDraftTask(true);
    setIsNewTaskModalOpen(true);
  };

  const editTask = (task: Task) => {
    setEditingTask(task);
    setIsDraftTask(false);
    setIsNewTaskModalOpen(true);
  };

  const handleUpdateTask = async (updatedTask: Task) => {
    try {
      const payload = {
        ...updatedTask,
        scheduledDate: updatedTask.scheduledDate || formatDateParam(selectedDate!),
      };

      if (isDraftTask || !tasks.some((t) => t.id === updatedTask.id)) {
        const { id: _draftId, ...createPayload } = payload;
        const created = await createTaskAsync(createPayload);
        setTasks((prev) => [created, ...prev]);
      } else {
        const saved = await updateTaskAsync(updatedTask.id, payload);
        setTasks((prev) => prev.map((t) => (t.id === saved.id ? saved : t)));
      }
      setIsNewTaskModalOpen(false);
      setEditingTask(null);
      setIsDraftTask(false);
      onTasksChanged?.();
      setActionError(null);
    } catch (err) {
      console.error('Failed to save task:', err);
      const message = err instanceof Error ? err.message : 'Failed to save task';
      setActionError(message);
      throw err instanceof Error ? err : new Error(message);
    }
  };

  const handleMoveTask = async (taskId: string, newStatus: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    try {
      const saved = await updateTaskAsync(taskId, { ...task, status: newStatus });
      setTasks((prev) => prev.map((t) => (t.id === saved.id ? saved : t)));
      onTasksChanged?.();
      setActionError(null);
    } catch (err) {
      console.error('Failed to move task:', err);
      setActionError(err instanceof Error ? err.message : 'Failed to move task');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      if (!isDraftTask) {
        await deleteTaskAsync(taskId);
      }
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setIsNewTaskModalOpen(false);
      setEditingTask(null);
      setIsDraftTask(false);
      onTasksChanged?.();
      setActionError(null);
    } catch (err) {
      console.error('Failed to delete task:', err);
      setActionError(err instanceof Error ? err.message : 'Failed to delete task');
    }
  };

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLocation = locationFilter === 'All'
      || t.branch === locationFilter
      || t.branch.split(', ').includes(locationFilter);
    const matchesTag = tagFilter === 'All' || (t.tags && t.tags.some(tag => tag.label === tagFilter));
    return matchesSearch && matchesLocation && matchesTag;
  });

  const uniqueAssignees = Array.from(new Set([
    ...tasks.flatMap(t => t.assignees || []),
    ...employees.map(e => e.id),
  ]));
  const uniqueLocations = Array.from(new Set([
    ...apiLocationNames,
    ...tasks.map(t => t.branch).filter(Boolean),
  ])).filter((name) => name !== 'All Branches');
  
  const tagCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach(t => {
      t.tags?.forEach(tag => {
        counts[tag.label] = (counts[tag.label] || 0) + 1;
      });
    });
    
    return Array.from(new Set(tasks.flatMap(t => t.tags?.map(tag => tag.label) || []))).map(label => {
      const taskTag = tasks.find(t => t.tags?.find(x => x.label === label))?.tags?.find(x => x.label === label);
      return {
        label,
        bg: taskTag?.bg || 'bg-gray-100',
        text: taskTag?.text || 'text-gray-700',
        count: counts[label]
      };
    }).sort((a, b) => b.count - a.count);
  }, [tasks]);

  const tasksWithStatus = React.useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach(t => {
      counts[t.status] = (counts[t.status] || 0) + 1;
    });
    return counts;
  }, [tasks]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white rounded-2xl border border-gray-100">

      {/* Filter Bar */}
      <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center gap-y-4 gap-x-3 shrink-0 w-full">
          
          {/* Back Button */}
          {onBack && (
            <button
              onClick={onBack}
              className="w-[30px] h-[30px] flex items-center justify-center bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-900 rounded-xl border border-gray-200 transition-colors cursor-pointer shrink-0"
              title="Back"
            >
              <ArrowLeft size={16} />
            </button>
          )}

          {/* Search */}
          <div className="relative flex-grow min-w-[140px] max-w-[280px] xl:max-w-[225px] xl:flex-none">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search tasks..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-corgi/20 focus:border-corgi/30 w-full transition-all placeholder:text-gray-400"
            />
          </div>

          <div className="hidden lg:block w-px h-6 bg-gray-200 mx-1" />

          {/* Date Selector */}
          {selectedDate && (
            <DatePicker 
              selectedDate={selectedDate}
              onChange={setSelectedDate}
            />
          )}

          <div className="hidden lg:block w-px h-6 bg-gray-200 mx-1" />

          {/* User Filter */}
          <div className="relative">
            <button 
              onClick={() => setIsAssigneeFilterOpen(!isAssigneeFilterOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[13px] font-bold transition-colors cursor-pointer ${
                assigneeFilter !== 'All' ? 'bg-[#EE635E] border-[#EE635E] text-white' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Users size={14} />
              {assigneeFilter === 'All'
                ? 'All Assignees'
                : (isClientMounted ? resolveAssigneeName(assigneeFilter) : '…')}
              {assigneeFilter !== 'All' ? (
                 <div onClick={(e) => { e.stopPropagation(); setAssigneeFilter('All'); }} className="ml-1 hover:text-red-400 p-0.5 rounded-full"><Plus size={14} className="rotate-45" /></div>
              ) : (
                 <ChevronDown size={14} className="text-gray-400" />
              )}
            </button>
            <AnimatePresence>
              {isAssigneeFilterOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsAssigneeFilterOpen(false)} />
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 w-[240px] py-1 max-h-[300px] overflow-y-auto custom-scrollbar"
                  >
                    <button 
                      onClick={() => { setAssigneeFilter('All'); setIsAssigneeFilterOpen(false); }}
                      className="w-full text-left px-4 py-2 text-[13px] font-bold text-gray-700 hover:bg-gray-50 flex items-center justify-between cursor-pointer"
                    >
                      All Assignees
                      {assigneeFilter === 'All' && <CheckSquare size={14} className="text-corgi" />}
                    </button>
                    {uniqueAssignees.map(a => {
                      const name = resolveAssigneeName(a);
                      const employee = employees.find((e) => e.id === a);
                      const initials = employee?.avatarInitials || name.slice(0, 2).toUpperCase();
                      const bg = 'bg-corgi';
                      return (
                        <button 
                          key={a}
                          onClick={() => { setAssigneeFilter(a); setIsAssigneeFilterOpen(false); }}
                          className="w-full text-left px-4 py-2 text-[13px] font-bold text-gray-700 hover:bg-gray-50 flex items-center justify-between group cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-5 h-5 rounded-full text-white text-[9px] font-bold flex items-center justify-center shrink-0 ${bg}`}>
                              {initials}
                            </div>
                            <span className="truncate max-w-[130px]">{name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {assigneeFilter === a && <CheckSquare size={14} className="text-corgi" />}
                          </div>
                        </button>
                      );
                    })}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Branch Filter */}
          <div className="relative">
            <button 
              onClick={() => setIsLocationFilterOpen(!isLocationFilterOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[13px] font-bold transition-colors cursor-pointer ${
                locationFilter !== 'All' ? 'bg-[#EE635E] border-[#EE635E] text-white' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <MapPin size={14} />
              {locationFilter === 'All' ? 'All Locations' : locationFilter}
              {locationFilter !== 'All' ? (
                 <div onClick={(e) => { e.stopPropagation(); setLocationFilter('All'); }} className="ml-1 hover:text-red-400 p-0.5 rounded-full"><Plus size={14} className="rotate-45" /></div>
              ) : (
                 <ChevronDown size={14} className="text-gray-400" />
              )}
            </button>
            <AnimatePresence>
              {isLocationFilterOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsLocationFilterOpen(false)} />
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 w-[200px] py-1"
                  >
                    <button 
                      onClick={() => { setLocationFilter('All'); setIsLocationFilterOpen(false); }}
                      className="w-full text-left px-4 py-2 text-[13px] font-bold text-gray-700 hover:bg-gray-50 flex items-center justify-between cursor-pointer"
                    >
                      All Locations
                      {locationFilter === 'All' && <CheckSquare size={14} className="text-corgi" />}
                    </button>
                    {uniqueLocations.map(l => (
                      <button 
                        key={l}
                        onClick={() => { setLocationFilter(l); setIsLocationFilterOpen(false); }}
                        className="w-full text-left px-4 py-2 text-[13px] font-bold text-gray-700 hover:bg-gray-50 flex items-center justify-between group cursor-pointer"
                      >
                        {l}
                        {locationFilter === l && <CheckSquare size={14} className="text-corgi" />}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <div className="hidden xl:block w-px h-6 bg-gray-200 mx-1" />
          <div className="relative">
            <button 
              onClick={() => setIsTagFilterOpen(!isTagFilterOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[13px] font-bold transition-colors cursor-pointer ${
                tagFilter !== 'All' ? 'bg-[#EE635E] border-[#EE635E] text-white' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter size={14} />
              {tagFilter === 'All' ? 'Tags' : tagFilter}
              {tagFilter !== 'All' ? (
                 <div onClick={(e) => { e.stopPropagation(); setTagFilter('All'); }} className="ml-1 hover:text-red-400 p-0.5 rounded-full"><Plus size={14} className="rotate-45" /></div>
              ) : (
                 <ChevronDown size={14} className="text-gray-400" />
              )}
            </button>
          </div>

          <button
            onClick={() => openNewTaskModal('todo')}
            className="ml-auto flex items-center gap-2 px-4 py-1.5 bg-[#EE635E] hover:bg-[#d94f4a] text-white rounded-xl transition-colors cursor-pointer shrink-0"
          >
            <Plus size={16} />
            <span className="text-[13px] font-bold">New Task</span>
          </button>
        </div>

      {actionError && (
        <div role="alert" className="mx-4 mt-3 bg-red-50 border border-red-100 text-red-700 text-[13px] font-medium rounded-xl px-3 py-2 shrink-0">
          {actionError}
        </div>
      )}

      <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar relative bg-[#f9fafc]">
        <div className="flex gap-0.5 h-full p-4 pt-3 items-start w-max">
        {stages.map(stage => (
          <div
            key={stage.id}
            className="flex-shrink-0 w-[264px] flex flex-col h-full bg-[#f9fafc] rounded-[16px] p-1.5 border border-gray-100/50"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const taskId = e.dataTransfer.getData('text/plain');
              if (!taskId) return;
              void handleMoveTask(taskId, stage.id);
              setDraggingTaskId(null);
            }}
          >
            {/* Column Header (Sticky) */}
            <div className="flex items-center justify-between mb-4 shrink-0 px-1">
              <div className="flex items-center gap-2">
                <div className={`w-1 h-4 rounded-full ${stage.color}`} />
                <h3 className="text-[14px] font-bold text-gray-900">{stage.label}</h3>
                <span className="bg-gray-200 text-gray-600 font-bold text-[11px] px-2 py-0.5 rounded-full">
                  {filteredTasks.filter(t => t.status === stage.id).length}
                </span>
              </div>
              <div className="flex gap-1 text-gray-400">
                <button 
                  onClick={() => openNewTaskModal(stage.id)}
                  className="p-1 hover:bg-gray-200 hover:text-gray-700 rounded transition-colors cursor-pointer"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
            
            {/* Column Tasks (Scrollable) */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pb-1 px-0.5">
              <AnimatePresence>
                {filteredTasks.filter(t => t.status === stage.id).map(task => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: -15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    <TaskCard task={task} />
                  </motion.div>
                ))}
              </AnimatePresence>
              <button 
                onClick={() => openNewTaskModal(stage.id)}
                className="flex items-center gap-2 w-full p-3 rounded-xl border border-dashed border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-700 hover:bg-white transition-all text-[13px] font-semibold justify-center cursor-pointer"
              >
                <Plus size={16} /> Add new
              </button>
            </div>
          </div>
        ))}
      </div>
      </div>
      
      <NewTaskModal 
        isOpen={isNewTaskModalOpen} 
        onClose={() => {
          setIsNewTaskModalOpen(false);
          setEditingTask(null);
          setIsDraftTask(false);
        }} 
        onSave={async (task) => { await handleUpdateTask(task); }} 
        uniqueLocations={uniqueLocations} 
        uniqueAssignees={uniqueAssignees} 
        uniqueTags={tagCounts}
        employees={employees}
        editingTask={editingTask}
        onDelete={(taskId) => { void handleDeleteTask(taskId); }}
        stages={stages}
        isDraftTask={isDraftTask}
        currentUserId={currentUserId}
        onTaskUpdated={(updated) => {
          setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
          setEditingTask(updated);
        }}
      />

      <BoardSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        stages={stages}
        boardType="tasks"
        tasksWithStatus={tasksWithStatus}
        onSave={async (newStages, taskMigrations) => {
          try {
            const saved = await saveBoardSettingsAsync('tasks', newStages, DEFAULT_LOCATION_ID);
            setStages(saved);

            if (taskMigrations.length > 0) {
              const dateParam = selectedDate ? formatDateParam(selectedDate) : undefined;
              for (const migration of taskMigrations) {
                await migrateTaskStatusAsync(migration.from, migration.to, dateParam);
              }
              await fetchTasks();
              onTasksChanged?.();
            }
            setIsSettingsModalOpen(false);
          } catch (err) {
            console.error('Failed to save task board settings:', err);
            throw err;
          }
        }}
      />
    </div>
  );

  function TaskCard({ task }: { task: Task }) {
    const getDeadlineColor = () => {
      if (task.deadline === 'Overdue') return 'text-red-500';
      if (task.deadline === 'No deadline') return 'text-gray-400';
      
      const deadlineDate = new Date(task.deadline.replace(' at ', ' '));
      if (isNaN(deadlineDate.getTime())) return 'text-gray-400';
      
      const timeDiff = deadlineDate.getTime() - new Date().getTime();
      
      if (timeDiff < 0) return 'text-red-500';
      if (timeDiff < 2 * 60 * 60 * 1000) return 'text-corgi';
      
      return 'text-gray-400';
    };

    return (
      <div 
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          setDraggingTaskId(task.id);
          e.dataTransfer.setData('text/plain', task.id);
          e.dataTransfer.effectAllowed = 'move';
        }}
        onDragEnd={() => setDraggingTaskId(null)}
        onClick={() => {
          if (draggingTaskId) return;
          editTask(task);
        }}
        className={`bg-white rounded-[12px] p-2 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] border border-gray-100 hover:border-purple-200 hover:shadow-md transition-all cursor-grab active:cursor-grabbing group ${
          draggingTaskId === task.id ? 'opacity-50' : ''
        }`}
      >
        <h4 className="text-[14px] font-bold text-gray-900 leading-snug mb-4 mt-1">{task.title}</h4>
        
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center -space-x-2">
            {task.assignees?.map((userId, i) => {
              const employee = employees.find((e) => e.id === userId);
              const initials = employee?.avatarInitials || resolveAssigneeName(userId).slice(0, 2).toUpperCase();
              const bg = 'bg-corgi';
              return (
                <div key={i} className={`w-6 h-6 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0 border-2 border-white ${bg}`}>
                  {initials}
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {task.tags?.map((tag, i) => (
              <span key={i} className={`${tag.bg} ${tag.text} px-2 py-0.5 rounded-full text-[10px] font-bold`}>
                {tag.label}
              </span>
            ))}
          </div>
        </div>
        
        <div className="flex items-center justify-between text-[11px] font-semibold text-gray-400 pt-1">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 hover:text-gray-600 transition-colors cursor-pointer group/loc relative">
              <MapPin size={14} /> 
              <span className="truncate max-w-[80px]">
                 {(() => {
                   if (!task.branch || task.branch === 'All Branches') return 'All Branches';
                   const locs = task.branch.split(', ');
                   return locs.length > 1 ? `${locs[0]} +${locs.length - 1}` : task.branch;
                 })()}
              </span>
              {task.branch && task.branch.split(', ').length > 1 && task.branch !== 'All Branches' && (
                <div className="absolute bottom-full left-0 mb-1 hidden group-hover/loc:block bg-gray-900 text-white text-[10px] py-1 px-2 rounded-lg whitespace-nowrap z-10 shadow-lg font-medium">
                  {task.branch}
                </div>
              )}
            </div>
            {task.attachments > 0 && (
              <div className="flex items-center gap-1 hover:text-gray-600 transition-colors cursor-pointer">
                <Paperclip size={14} /> {task.attachments}
              </div>
            )}
          </div>
          <div className={`flex items-center gap-1 ${getDeadlineColor()}`}>
            <Clock size={14} /> {task.deadline}
          </div>
        </div>
      </div>
    );
  }
}
