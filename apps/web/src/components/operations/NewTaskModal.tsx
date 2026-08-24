import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Edit3, Share, MoreHorizontal, Users, Clock, Filter, Paperclip, MessageSquare, Reply, Link as LinkIcon, FileText, Check, UserPlus, ThumbsUp, Maximize2, ChevronRight, ChevronDown, UserX, User, Plus, Undo2, Redo2, Bold, Italic, Underline, Highlighter, Strikethrough, List, ListOrdered, Indent, Code, Sparkles, CheckCircle2, Link2, Download, Trash2 } from 'lucide-react';
import DateTimePicker from '../ui/DateTimePicker';
import { validateTaskTitle, filterActiveEmployees, TASK_TITLE_MAX } from '@/lib/task-validation';
import { uploadPhotoAsync } from '@/lib/upload';
import { toggleTaskLikeAsync } from '@/lib/tasks';

type TaskStage = { id: string; label: string; color: string };

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: any) => void | Promise<void>;
  uniqueLocations: string[];
  uniqueAssignees: string[];
  uniqueTags: { label: string; bg: string; text: string; count: number }[];
  employees?: { id: string; name: string; email?: string; avatarInitials?: string; status?: string }[];
  editingTask: any | null;
  onDelete?: (id: string) => void;
  stages?: TaskStage[];
  isDraftTask?: boolean;
  currentUserId?: string | null;
  onTaskUpdated?: (task: any) => void;
}

type AssigneeOption = {
  id: string;
  initials: string;
  name: string;
  email: string;
  bg: string;
  tag?: string;
};

export default function NewTaskModal({ isOpen, onClose, onSave, uniqueLocations, uniqueAssignees, uniqueTags, employees = [], editingTask, onDelete, stages = [], isDraftTask = false, currentUserId = null, onTaskUpdated }: NewTaskModalProps) {
  const [title, setTitle] = useState('');
  const [titleError, setTitleError] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [likedBy, setLikedBy] = useState<string[]>([]);
  const [isTogglingLike, setIsTogglingLike] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [assignee, setAssignee] = useState(uniqueAssignees[0] || '');
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [isLinkPromptOpen, setIsLinkPromptOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [savedSelection, setSavedSelection] = useState<Range | null>(null);
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const formatDateLabel = (date: Date | null) => {
    if (!date) return '';
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()} at ${hours}:${minutes}`;
  };

  const dateLabel = selectedDate 
    ? formatDateLabel(selectedDate)
    : 'Select Date & Time';

  const [selectedAssignees, setSelectedAssignees] = useState<AssigneeOption[]>([]);
  const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<{ label: string; bg: string; text: string }[]>([]);
  const [isTagsDropdownOpen, setIsTagsDropdownOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');

  const assigneeOptions = React.useMemo(() => {
    const activeEmployees = filterActiveEmployees(employees);
    if (activeEmployees.length > 0) {
      return activeEmployees.map((e) => ({
        id: e.id,
        name: e.name,
        email: e.email || '',
        initials: e.avatarInitials || e.name.slice(0, 2).toUpperCase(),
        bg: 'bg-[#EE635E]',
      }));
    }
    return [];
  }, [employees]);

  const toggleUser = (user: { id: string; name: string; email?: string; initials?: string; bg?: string }) => {
    if (selectedAssignees.find(u => u.id === user.id)) {
      setSelectedAssignees(selectedAssignees.filter(u => u.id !== user.id));
    } else {
      setSelectedAssignees([...selectedAssignees, user]);
    }
  };

  const toggleLocation = (loc: string) => {
    if (selectedLocations.includes(loc)) {
      setSelectedLocations(selectedLocations.filter(l => l !== loc));
    } else {
      setSelectedLocations([...selectedLocations, loc]);
    }
  };
  
  const toggleTag = (tag: { label: string; bg: string; text: string }) => {
    if (selectedTags.some(t => t.label === tag.label)) {
      setSelectedTags(selectedTags.filter(t => t.label !== tag.label));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleCreateNewTag = () => {
    if (tagSearch.trim()) {
      const newTag = {
        label: tagSearch.trim(),
        bg: 'bg-gray-50 border-gray-200',
        text: 'text-gray-700'
      };
      setSelectedTags([...selectedTags, newTag]);
      setTagSearch('');
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (editingTask) {
        setTitle(editingTask.title === 'Untitled Task' ? '' : editingTask.title);
        setSelectedLocations(editingTask.branch === 'All Branches' ? [] : editingTask.branch.split(', '));
        
        const assigneeIds = (editingTask.assignees || []).map((id: string) => id.includes('u=') ? id.split('u=')[1] : id);
        const mappedAssignees = assigneeOptions.filter(u => assigneeIds.includes(u.id));
        setSelectedAssignees(mappedAssignees.length > 0 ? mappedAssignees : []);
        
        if (editingTask.tags && editingTask.tags.length > 0) {
          setSelectedTags(editingTask.tags);
        } else {
          setSelectedTags([]);
        }
        
        if (editingTask.deadline !== 'No deadline') {
          const dateString = editingTask.deadline.replace(' at ', ' ');
          const d = new Date(dateString);
          if (!isNaN(d.getTime())) {
            setSelectedDate(d);
          }
        } else {
          setSelectedDate(null);
        }
        setStatus(editingTask.status || 'todo');
        setPriority(editingTask.priority || 'Lowest');
        setLikedBy(editingTask.likedBy ?? []);
      } else {
        setTitle('');
        setTitleError(null);
        setDescription('');
        setSelectedLocations([]);
        setSelectedAssignees([]);
        setSelectedTags([]);
        setSelectedDate(new Date());
        setStatus('todo');
        setPriority('Lowest');
        setLikedBy([]);
      }
      setShareCopied(false);
      setSaveError(null);
    }
  }, [isOpen, editingTask, assigneeOptions]);

  useEffect(() => {
    if (!isOpen || !assigneeOptions.length) return;
    setSelectedAssignees((prev) => prev.filter((u) => assigneeOptions.some((o) => o.id === u.id)));
  }, [isOpen, assigneeOptions]);

  useEffect(() => {
    if (!isOpen) return;
    requestAnimationFrame(() => {
      const editor = document.getElementById('description-editor');
      if (editor) {
        const html = editingTask?.description || '';
        editor.innerHTML = html;
        setDescription(html);
      }
    });
  }, [isOpen, editingTask?.id, editingTask?.description]);


  const priorities = [
    { label: 'Highest', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
    { label: 'High', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700' },
    { label: 'Medium', bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700' },
    { label: 'Low', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
    { label: 'Lowest', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' },
  ];
  const [priority, setPriority] = useState('Lowest');
  const [isPriorityDropdownOpen, setIsPriorityDropdownOpen] = useState(false);
  const currentPriority = priorities.find(p => p.label === priority) || priorities[4];
  const [status, setStatus] = useState('todo');

  const handleMarkComplete = () => {
    const completedStage =
      stages.find((s) => s.id === 'completed') ??
      stages.find((s) => s.label.toLowerCase().includes('done')) ??
      stages[stages.length - 1];
    if (completedStage) {
      setStatus(completedStage.id);
    }
  };

  const isLiked = currentUserId ? likedBy.includes(currentUserId) : false;

  const handleToggleLike = async () => {
    if (!editingTask?.id || isDraftTask) return;
    if (!currentUserId) {
      setSaveError('No active user available to like this task');
      return;
    }
    try {
      setIsTogglingLike(true);
      setSaveError(null);
      const updated = await toggleTaskLikeAsync(editingTask.id, currentUserId);
      setLikedBy(updated.likedBy ?? []);
      onTaskUpdated?.(updated);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to update like');
    } finally {
      setIsTogglingLike(false);
    }
  };

  const handleShare = async () => {
    if (!editingTask?.id) return;
    const taskTitle = title.trim() || editingTask.title || 'Task';
    const url = `${window.location.origin}${window.location.pathname}?task=${editingTask.id}`;
    const text = `${taskTitle}\n${url}`;
    try {
      if (navigator.share && !isDraftTask) {
        await navigator.share({ title: taskTitle, text: taskTitle, url });
        return;
      }
      await navigator.clipboard.writeText(text);
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 2000);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setSaveError(err instanceof Error ? err.message : 'Failed to share task');
    }
  };

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    const validation = validateTaskTitle(trimmedTitle);
    if (!validation.valid) {
      setTitleError(validation.error ?? 'Invalid title');
      return;
    }
    setTitleError(null);
    setSaveError(null);

    const editor = document.getElementById('description-editor');
    const descHtml = editor?.innerHTML?.trim() || description.trim() || null;

    let attachmentCount = editingTask?.attachments || 0;
    if (files.length > 0) {
      try {
        setIsSaving(true);
        for (const file of files) {
          await uploadPhotoAsync(file);
          attachmentCount += 1;
        }
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : 'Failed to upload attachments');
        setIsSaving(false);
        return;
      }
    }

    const validAssigneeIds = new Set(assigneeOptions.map((u) => u.id));
    const rawAssignees =
      selectedAssignees.length > 0
        ? selectedAssignees.map((u) => u.id)
        : (editingTask?.assignees || []);
    const assignees = rawAssignees.filter((id) => validAssigneeIds.has(id));

    const newTask = {
      id: editingTask?.id || `T-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      title: trimmedTitle,
      description: descHtml,
      branch: selectedLocations.length > 0 ? selectedLocations.join(', ') : 'All Branches',
      tags: selectedTags,
      comments: editingTask?.comments || 0,
      attachments: attachmentCount,
      progress: editingTask?.progress || 0,
      priority,
      deadline: selectedDate ? `${selectedDate.getDate()} ${monthNames[selectedDate.getMonth()]} ${selectedDate.getFullYear()} at ${selectedDate.getHours().toString().padStart(2, '0')}:${selectedDate.getMinutes().toString().padStart(2, '0')}` : 'No deadline',
      assignees,
      likedBy,
      status,
      scheduledDate: editingTask?.scheduledDate,
      dueAt: selectedDate ? selectedDate.toISOString() : editingTask?.dueAt ?? null,
    };

    try {
      setIsSaving(true);
      await onSave(newTask);
      setTitle('');
      setTitleError(null);
      setDescription('');
      setFiles([]);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save task');
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchive = () => {
    if (editingTask && onDelete) {
      onDelete(editingTask.id);
    } else {
      onClose();
    }
    setTitle('');
    setDescription('');
    setFiles([]);
  };

  const todayStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="absolute inset-0 bg-black/20 backdrop-blur-[1px]"
            onClick={onClose}
          />
          
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="relative w-full max-w-[600px] bg-white h-full shadow-2xl flex flex-col border-l border-gray-100"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
              {/* Left: Mark Complete */}
              <button
                type="button"
                onClick={handleMarkComplete}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-gray-700 hover:border-corgi hover:text-corgi bg-white transition-all active:scale-[0.98] cursor-pointer text-xs font-bold group"
              >
                <Check size={14} className="text-gray-400 group-hover:text-corgi transition-colors stroke-[2.5px]" />
                <span>Mark complete</span>
              </button>
              
              {/* Right: Actions */}
              <div className="flex items-center gap-1.5 text-gray-500">
                {/* Share Button */}
                <button
                  type="button"
                  onClick={() => void handleShare()}
                  disabled={isDraftTask}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-gray-700 hover:border-corgi hover:text-corgi bg-white transition-all active:scale-[0.98] cursor-pointer text-xs font-bold mr-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Share size={13} />
                  <span>{shareCopied ? 'Copied!' : 'Share'}</span>
                </button>
                
                {/* Divider */}
                <div className="w-px h-5 bg-gray-200 mx-1" />
                
                {/* Icons */}
                <button
                  type="button"
                  data-testid="task-like-btn"
                  onClick={() => void handleToggleLike()}
                  disabled={isDraftTask || isTogglingLike}
                  title={likedBy.length > 0 ? `${likedBy.length} like${likedBy.length === 1 ? '' : 's'}` : 'Like task'}
                  className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    isLiked
                      ? 'bg-corgi/10 text-corgi border-corgi/30 hover:bg-corgi/20'
                      : 'bg-gray-50 text-gray-500 border-transparent hover:bg-gray-100 hover:text-gray-800 hover:border-gray-200'
                  }`}
                >
                  <ThumbsUp size={15} className={isLiked ? 'fill-current' : ''} />
                </button>
                <button className="w-8 h-8 rounded-full bg-gray-50 text-gray-500 flex items-center justify-center hover:bg-gray-100 hover:text-gray-800 border border-transparent hover:border-gray-200 transition-all cursor-pointer"><LinkIcon size={15} /></button>
                <button onClick={handleArchive} className="w-8 h-8 rounded-full bg-gray-50 text-gray-500 hover:bg-red-50 hover:text-red-500 border border-transparent hover:border-red-200 transition-all cursor-pointer"><Trash2 size={15} /></button>
                
                {/* Close Sidebar */}
                <button data-testid="task-save-btn" onClick={() => void handleSave()} disabled={isSaving} className="w-8 h-8 rounded-full bg-gray-50 text-gray-500 flex items-center justify-center hover:bg-gray-100 hover:text-gray-800 border border-transparent hover:border-gray-200 transition-all cursor-pointer ml-1 disabled:opacity-60">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Scrollable Form Content */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {saveError && (
                <div role="alert" className="mb-4 bg-red-50 border border-red-100 text-red-700 text-[13px] font-medium rounded-xl px-3 py-2">
                  {saveError}
                </div>
              )}
              
              {/* Top Tags */}
              <div className="flex items-center gap-3 mb-5 relative z-10">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50/50 border border-gray-150 text-gray-700 text-[12px] font-bold">
                  {selectedAssignees.length > 0 ? (
                    <>
                      <div className={`w-4 h-4 rounded-full ${selectedAssignees[0].bg} text-white flex items-center justify-center text-[8px] font-bold`}>{selectedAssignees[0].initials}</div>
                      {selectedAssignees[0].name}
                    </>
                  ) : (
                    <>
                      <User size={13} className="text-gray-500" />
                      Unassigned
                    </>
                  )}
                </div>
                
                <div className="relative">
                  <button 
                    onClick={() => setIsPriorityDropdownOpen(!isPriorityDropdownOpen)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${currentPriority.bg} border ${currentPriority.border} ${currentPriority.text} text-[12px] font-bold cursor-pointer hover:opacity-80 transition-all`}
                  >
                    {priority}
                  </button>
                  
                  <AnimatePresence>
                    {isPriorityDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsPriorityDropdownOpen(false)} />
                        <motion.div 
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="absolute left-0 top-full mt-2 w-32 bg-white border border-gray-100 rounded-xl shadow-xl z-50 py-1"
                        >
                          {priorities.map(p => (
                            <button
                              key={p.label}
                              onClick={() => {
                                setPriority(p.label);
                                setIsPriorityDropdownOpen(false);
                              }}
                              className={`w-full text-left px-4 py-2 text-[13px] font-bold hover:bg-gray-50 cursor-pointer ${priority === p.label ? p.text : 'text-gray-700'}`}
                            >
                              {p.label}
                            </button>
                          ))}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                {editingTask && (
                  <select
                    data-testid="task-status-select"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-gray-50/50 border border-gray-150 text-gray-700 text-[12px] font-bold cursor-pointer"
                  >
                    {stages.map((stage) => (
                      <option key={stage.id} value={stage.id}>
                        {stage.label}
                      </option>
                    ))}
                  </select>
                )}

                <div className="relative">
                  <button 
                    onClick={() => setIsTagsDropdownOpen(!isTagsDropdownOpen)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50/50 border border-gray-150 text-[12px] font-bold cursor-pointer hover:bg-gray-100 transition-colors text-gray-700"
                  >
                    <Filter size={13} /> 
                    {selectedTags.length > 0 ? `${selectedTags.length} Tags` : 'Tags'}
                  </button>
                  
                  {/* Dropdown trigger is in the header, but the dropdown itself we can keep here for the header button */}
                  <AnimatePresence>
                    {isTagsDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsTagsDropdownOpen(false)} />
                        <motion.div 
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="absolute left-0 top-full mt-2 w-64 bg-white border border-gray-100 rounded-xl shadow-xl z-50 flex flex-col overflow-hidden"
                        >
                          <div className="p-2 border-b border-gray-100">
                             <input 
                               type="text" 
                               placeholder="Search or add tag..." 
                               value={tagSearch}
                               onChange={e => setTagSearch(e.target.value)}
                               onKeyDown={e => {
                                 if (e.key === 'Enter') {
                                   e.preventDefault();
                                   if (!uniqueTags.some(t => t.label.toLowerCase() === tagSearch.toLowerCase())) {
                                     handleCreateNewTag();
                                   }
                                 }
                               }}
                               className="w-full bg-gray-50 border border-gray-150 focus:border-corgi rounded-xl px-3 py-1.5 text-[12px] font-medium text-gray-900 focus:outline-none focus:ring-0 transition-all placeholder-gray-400"
                             />
                          </div>
                          <div className="max-h-[200px] overflow-y-auto py-1 custom-scrollbar">
                            {uniqueTags.filter(t => t.label.toLowerCase().includes(tagSearch.toLowerCase())).map(tag => {
                              const isSelected = selectedTags.some(t => t.label === tag.label);
                              return (
                                <button
                                  key={tag.label}
                                  onClick={() => toggleTag(tag)}
                                  className="w-full text-left px-3 py-1.5 text-[12px] font-medium hover:bg-gray-50 flex items-center justify-between"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className={isSelected ? 'text-gray-900 font-bold' : 'text-gray-700'}>{tag.label}</span>
                                  </div>
                                  {isSelected && <Check size={14} className="text-corgi" />}
                                </button>
                              );
                            })}
                            {tagSearch && !uniqueTags.some(t => t.label.toLowerCase() === tagSearch.toLowerCase()) && (
                              <button
                                onClick={handleCreateNewTag}
                                className="w-full text-left px-3 py-2 text-[12px] font-bold text-corgi hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Plus size={14} /> Create "{tagSearch}"
                              </button>
                            )}
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Title Input */}
              <input 
                type="text" 
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value.slice(0, TASK_TITLE_MAX));
                  if (titleError) setTitleError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSave();
                  }
                }}
                className={`w-full bg-transparent border-0 px-0 py-2 text-[26px] font-bold text-gray-900 focus:outline-none focus:ring-0 placeholder:text-gray-300 mb-1 tracking-tight ${titleError ? 'text-red-600' : ''}`}
                placeholder="Task Title..."
                autoFocus
                maxLength={TASK_TITLE_MAX}
                aria-invalid={!!titleError}
              />
              {titleError && (
                <p className="text-[12px] font-semibold text-red-500 mb-4" role="alert">
                  {titleError}
                </p>
              )}
              {!titleError && <div className="mb-4" />}

              {/* Fields List */}
              <div className="space-y-3 mb-8">
                {/* People / Assignees */}
                <div className="flex items-start min-h-[32px] relative">
                  <div className="w-[140px] h-[32px] flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0">
                    <Users size={14} /> People
                  </div>
                  <div className="flex-1 flex flex-wrap gap-2 py-1">
                    {selectedAssignees.length === 0 ? (
                       <button onClick={() => setIsAssigneeDropdownOpen(true)} className="flex items-center gap-2 group cursor-pointer hover:bg-gray-50 px-2 py-0.5 -ml-2 rounded-xl transition-colors">
                         <div className="w-6 h-6 rounded-full border-[1.5px] border-dashed border-gray-300 flex items-center justify-center text-gray-400 group-hover:border-gray-400 group-hover:text-gray-500 transition-colors">
                           <User size={13} strokeWidth={2.5} />
                         </div>
                         <span className="text-[14px] font-semibold text-gray-500 group-hover:text-gray-900 transition-colors">No assignee</span>
                       </button>
                    ) : (
                       selectedAssignees.map(user => (
                          <div key={user.id} className="flex items-center gap-1.5 group cursor-pointer" onClick={() => setIsAssigneeDropdownOpen(!isAssigneeDropdownOpen)}>
                             <div className={`w-6 h-6 rounded-full ${user.bg || 'bg-corgi'} text-white flex items-center justify-center text-[10px] font-bold`}>{user.initials}</div>
                             <span className="text-[14px] font-bold text-gray-900">{user.name}</span>
                             <button className="text-gray-400 hover:text-gray-900 transition-colors cursor-pointer" onClick={(e) => { e.stopPropagation(); toggleUser(user); }}>
                               <X size={14} strokeWidth={2.5} />
                             </button>
                          </div>
                       ))
                    )}
                  </div>
                  
                  {/* Dropdown Menu Overlay */}
                  {isAssigneeDropdownOpen && (
                    <div className="fixed inset-0 z-10" onClick={() => setIsAssigneeDropdownOpen(false)} />
                  )}
                  
                  {/* Dropdown Menu */}
                  <AnimatePresence>
                    {isAssigneeDropdownOpen && (
                      <motion.div 
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="absolute z-20 top-full mt-2 left-[140px] w-[380px] bg-white rounded-2xl shadow-xl border border-gray-100 flex flex-col overflow-hidden"
                      >
                        <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                           <div className="flex items-center gap-2 px-3 py-2 border border-gray-150 rounded-xl flex-1 bg-gray-50 focus-within:bg-white focus-within:border-corgi transition-all">
                               <input type="text" className="bg-transparent border-0 p-0 text-[13px] font-semibold text-gray-900 focus:outline-none focus:ring-0 placeholder:text-gray-400 w-full" placeholder="Type a name..." value={assigneeSearch} onChange={(e) => setAssigneeSearch(e.target.value)} />
                           </div>
                        </div>
                        <div className="flex-1 overflow-y-auto max-h-[250px] py-1 custom-scrollbar">
                            {assigneeOptions
                              .filter(user => user.name.toLowerCase().includes(assigneeSearch.toLowerCase()) || user.email.toLowerCase().includes(assigneeSearch.toLowerCase()))
                              .map(user => {
                                const isSelected = selectedAssignees.some(selected => selected.id === user.id);
                                const initials = user.initials;
                                const bg = user.bg || 'bg-corgi';
                                return (
                               <div key={user.id} onClick={() => toggleUser(user)} className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer transition-colors">
                                  <div className={`w-7 h-7 rounded-full ${bg} text-white flex items-center justify-center text-[11px] font-bold mr-3 shrink-0`}>{initials}</div>
                                  <div className="flex-1 min-w-0 flex items-center">
                                      <span className="text-gray-900 text-[13px] font-bold truncate mr-2">{user.name}</span>
                                      <span className="text-gray-400 text-[12px] font-medium truncate">{user.email}</span>
                                  </div>
                                  {isSelected && (
                                      <Check size={16} className="text-corgi ml-3 shrink-0" strokeWidth={3} />
                                  )}
                               </div>
                               );
                            })}
                            {assigneeOptions.filter(user => user.name.toLowerCase().includes(assigneeSearch.toLowerCase()) || user.email.toLowerCase().includes(assigneeSearch.toLowerCase())).length === 0 && (
                                <div className="px-4 py-3 text-center text-[13px] text-gray-500 font-medium">No people found</div>
                            )}
                        </div>
                        <div className="h-2"></div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Location (Custom Field) */}
                <div className="flex items-start min-h-[32px] relative">
                  <div className="w-[140px] h-[32px] flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0">
                    <FileText size={14} /> Location
                  </div>
                  <div className="flex-1 flex flex-wrap gap-2 py-1">
                    {selectedLocations.length === 0 ? (
                       <button onClick={() => setIsLocationDropdownOpen(true)} className="flex items-center gap-2 group cursor-pointer hover:bg-gray-50 px-2 py-0.5 -ml-2 rounded-xl transition-colors">
                        <div className="w-6 h-6 rounded-full border-[1.5px] border-dashed border-gray-300 flex items-center justify-center text-gray-400 group-hover:border-gray-400 group-hover:text-gray-500 transition-colors">
                          <FileText size={13} strokeWidth={2.5} />
                        </div>
                        <span className="text-[14px] font-semibold text-gray-500 group-hover:text-gray-900 transition-colors">No location</span>
                      </button>
                    ) : (
                      selectedLocations.map(loc => (
                        <div key={loc} className="flex items-center gap-1.5 group cursor-pointer inline-flex min-h-[24px]" onClick={() => setIsLocationDropdownOpen(!isLocationDropdownOpen)}>
                          <span className="text-[14px] font-bold text-gray-900">{loc}</span>
                          <button className="text-gray-400 hover:text-gray-900 transition-colors cursor-pointer" onClick={(e) => { e.stopPropagation(); toggleLocation(loc); }}>
                            <X size={14} strokeWidth={2.5} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                  
                  {/* Location Dropdown Overlay */}
                  {isLocationDropdownOpen && (
                    <div className="fixed inset-0 z-10" onClick={() => setIsLocationDropdownOpen(false)} />
                  )}
                  
                  {/* Location Dropdown Menu */}
                  <AnimatePresence>
                    {isLocationDropdownOpen && (
                      <motion.div 
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="absolute z-20 top-full mt-2 left-[140px] w-[380px] bg-white rounded-2xl shadow-xl border border-gray-100 flex flex-col overflow-hidden"
                      >
                        <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                           <div className="flex items-center gap-2 px-3 py-2 border border-gray-150 rounded-xl flex-1 bg-gray-50 focus-within:bg-white focus-within:border-corgi transition-all">
                               <FileText size={13} className="text-gray-400 shrink-0" />
                               <input 
                                 type="text" 
                                 className="bg-transparent border-0 p-0 text-[13px] font-semibold text-gray-900 focus:outline-none focus:ring-0 placeholder:text-gray-400 w-full" 
                                 placeholder="Search location..." 
                                 value={locationSearch} 
                                 onChange={(e) => setLocationSearch(e.target.value)} 
                               />
                           </div>
                        </div>
                        <div className="flex-1 overflow-y-auto max-h-[250px] py-1 custom-scrollbar">
                            {uniqueLocations
                              .filter(loc => loc.toLowerCase().includes(locationSearch.toLowerCase()))
                              .map(loc => (
                                <div 
                                 key={loc} 
                                 onClick={() => toggleLocation(loc)} 
                                 className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer transition-colors"
                               >
                                  <div className="flex-1 min-w-0 flex items-center">
                                      <span className="text-gray-900 text-[13px] font-bold truncate">{loc}</span>
                                  </div>
                                  {selectedLocations.includes(loc) && (
                                      <Check size={16} className="text-corgi ml-3 shrink-0" strokeWidth={3} />
                                  )}
                               </div>
                            ))}
                            {uniqueLocations.filter(loc => loc.toLowerCase().includes(locationSearch.toLowerCase())).length === 0 && (
                                <div className="px-4 py-3 text-center text-[13px] text-gray-500 font-medium">No locations found</div>
                            )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Timeline Date */}
                <div className="flex items-start min-h-[32px]">
                  <div className="w-[140px] h-[32px] flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0">
                    <Clock size={14} /> Timeline Date
                  </div>
                  <div className="flex-1 py-1 relative">
                    <button 
                      onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                      className="text-[14px] font-bold text-gray-900 focus:outline-none hover:text-gray-700 transition-colors cursor-pointer text-left w-full h-[24px] flex items-center"
                    >
                      {dateLabel}
                    </button>
                    
                    <DateTimePicker 
                      isOpen={isDatePickerOpen}
                      onClose={() => setIsDatePickerOpen(false)}
                      selectedDate={selectedDate}
                      align="right"
                      onDateChange={(date) => {
                        setSelectedDate(date);
                      }}
                    />
                  </div>
                </div>
                
                {/* Tags */}
                <div className="flex items-start min-h-[32px] relative">
                  <div className="w-[140px] h-[32px] flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0">
                    <Filter size={14} /> Tags
                  </div>
                  <div className="flex-1 flex flex-wrap gap-2 py-1">
                    {selectedTags.length === 0 ? (
                       <button onClick={() => setIsTagsDropdownOpen(true)} className="flex items-center gap-2 group cursor-pointer hover:bg-gray-50 px-2 py-0.5 -ml-2 rounded-xl transition-colors">
                         <div className="w-6 h-6 rounded-full border-[1.5px] border-dashed border-gray-300 flex items-center justify-center text-gray-400 group-hover:border-gray-400 group-hover:text-gray-500 transition-colors">
                           <Filter size={13} strokeWidth={2.5} />
                         </div>
                         <span className="text-[14px] font-semibold text-gray-500 group-hover:text-gray-900 transition-colors">No tags</span>
                       </button>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {selectedTags.map((tag, i) => (
                          <div key={i} className={`flex items-center gap-1.5 group cursor-pointer inline-flex min-h-[24px] px-2 py-0.5 rounded-md ${tag.bg} ${tag.text}`} onClick={() => setIsTagsDropdownOpen(!isTagsDropdownOpen)}>
                            <span className="text-[12px] font-bold">{tag.label}</span>
                            <button className="hover:opacity-70 transition-opacity cursor-pointer" onClick={(e) => { e.stopPropagation(); toggleTag(tag); }}>
                              <X size={12} strokeWidth={2.5} />
                            </button>
                          </div>
                        ))}
                        <button onClick={() => setIsTagsDropdownOpen(true)} className="text-gray-400 hover:text-gray-900 transition-colors ml-1 cursor-pointer">
                          <Plus size={14} strokeWidth={2.5} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Description Box with Rich Text Toolbar */}
              <div className="flex flex-col flex-1 min-h-[250px] mb-4">
                 <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">Description</div>
                 <div className="flex flex-col flex-1 border border-gray-150 rounded-2xl bg-white focus-within:border-corgi transition-all">
                   <div
                     id="description-editor"
                     contentEditable
                     onInput={(e) => setDescription(e.currentTarget.innerHTML)}
                     className="w-full flex-1 min-h-[150px] p-4 bg-transparent border-0 text-[14px] font-medium text-gray-900 focus:outline-none focus:ring-0 custom-scrollbar empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 focus:empty:before:content-['']"
                     data-placeholder="What is this task about?"
                   />
                   <div className="px-3 py-1.5 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between rounded-b-2xl overflow-hidden">
                     <div className="flex items-center gap-0.5 text-gray-400 overflow-x-auto custom-scrollbar">

                        <button type="button" onMouseDown={(e) => { e.preventDefault(); document.execCommand('bold', false, undefined); }} className="p-1.5 hover:bg-gray-200 hover:text-gray-700 rounded transition-colors cursor-pointer"><Bold size={16} strokeWidth={2.5} /></button>
                        <button type="button" onMouseDown={(e) => { e.preventDefault(); document.execCommand('italic', false, undefined); }} className="p-1.5 hover:bg-gray-200 hover:text-gray-700 rounded transition-colors cursor-pointer"><Italic size={16} strokeWidth={2.5} /></button>
                        <button type="button" onMouseDown={(e) => { e.preventDefault(); document.execCommand('underline', false, undefined); }} className="p-1.5 hover:bg-gray-200 hover:text-gray-700 rounded transition-colors cursor-pointer"><Underline size={16} strokeWidth={2.5} /></button>
                        <button type="button" onMouseDown={(e) => { e.preventDefault(); document.execCommand('backColor', false, 'yellow'); }} className="p-1.5 hover:bg-gray-200 hover:text-gray-700 rounded transition-colors cursor-pointer"><Highlighter size={16} strokeWidth={2.5} /></button>
                        <button type="button" onMouseDown={(e) => { e.preventDefault(); document.execCommand('strikeThrough', false, undefined); }} className="p-1.5 hover:bg-gray-200 hover:text-gray-700 rounded transition-colors cursor-pointer"><Strikethrough size={16} strokeWidth={2.5} /></button>
                        <div className="w-px h-4 bg-gray-300 mx-1.5"></div>
                        <button type="button" onMouseDown={(e) => { e.preventDefault(); document.execCommand('insertUnorderedList', false, undefined); }} className="p-1.5 hover:bg-gray-200 hover:text-gray-700 rounded transition-colors cursor-pointer"><List size={16} strokeWidth={2.5} /></button>
                        <button type="button" onMouseDown={(e) => { e.preventDefault(); document.execCommand('insertOrderedList', false, undefined); }} className="p-1.5 hover:bg-gray-200 hover:text-gray-700 rounded transition-colors cursor-pointer"><ListOrdered size={16} strokeWidth={2.5} /></button>
                        <button type="button" onMouseDown={(e) => { e.preventDefault(); document.execCommand('indent', false, undefined); }} className="p-1.5 hover:bg-gray-200 hover:text-gray-700 rounded transition-colors cursor-pointer"><Indent size={16} strokeWidth={2.5} /></button>
                        <div className="w-px h-4 bg-gray-300 mx-1.5"></div>
                        <div className="relative">
                          <button 
                            type="button" 
                            onMouseDown={(e) => { 
                              e.preventDefault(); 
                              const selection = window.getSelection();
                              if (selection && selection.rangeCount > 0) {
                                setSavedSelection(selection.getRangeAt(0));
                              }
                              setIsLinkPromptOpen(true);
                            }} 
                            className="p-1.5 hover:bg-gray-200 hover:text-gray-700 rounded transition-colors cursor-pointer flex items-center justify-center"
                          >
                            <Link2 size={16} strokeWidth={2.5} />
                          </button>
                          
                          {isLinkPromptOpen && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setIsLinkPromptOpen(false)} />
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-white border border-gray-200 shadow-xl rounded-xl p-2 z-50 flex gap-2">
                                <input 
                                  type="url" 
                                  placeholder="https://..." 
                                  value={linkUrl}
                                  onChange={e => setLinkUrl(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      if (linkUrl && savedSelection) {
                                        const editor = document.getElementById('description-editor');
                                        if (editor) editor.focus();
                                        const selection = window.getSelection();
                                        if (selection) {
                                          selection.removeAllRanges();
                                          selection.addRange(savedSelection);
                                          document.execCommand('createLink', false, linkUrl);
                                          if (editor) setDescription(editor.innerHTML);
                                        }
                                      }
                                      setIsLinkPromptOpen(false);
                                      setLinkUrl('');
                                      setSavedSelection(null);
                                    }
                                  }}
                                  className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-[13px] font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-corgi/20"
                                  autoFocus
                                />
                                <button 
                                  type="button"
                                  onClick={() => {
                                    if (linkUrl && savedSelection) {
                                      const editor = document.getElementById('description-editor');
                                      if (editor) editor.focus();
                                      const selection = window.getSelection();
                                      if (selection) {
                                        selection.removeAllRanges();
                                        selection.addRange(savedSelection);
                                        document.execCommand('createLink', false, linkUrl);
                                        if (editor) setDescription(editor.innerHTML);
                                      }
                                    }
                                    setIsLinkPromptOpen(false);
                                    setLinkUrl('');
                                    setSavedSelection(null);
                                  }}
                                  className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-[13px] font-bold hover:bg-gray-800 transition-colors cursor-pointer"
                                >
                                  Add
                                </button>
                              </div>
                            </>
                          )}
                        </div>

                     </div>

                   </div>
                 </div>
              </div>
              
              {/* Attachments */}
              <div className="mb-4">
                 <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">Attachments</div>
                 <label className="border-2 border-dashed border-gray-150 rounded-2xl p-6 flex flex-col items-center justify-center text-center hover:bg-gray-50/50 hover:border-corgi/40 transition-colors cursor-pointer group block w-full bg-gray-55/20">
                   <input 
                     type="file" 
                     className="hidden" 
                     multiple 
                     onChange={(e) => {
                       if (e.target.files) {
                         setFiles([...files, ...Array.from(e.target.files)]);
                       }
                     }} 
                   />
                   <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-3 group-hover:bg-corgi/10 transition-colors">
                     <Paperclip className="text-gray-400 group-hover:text-corgi transition-colors" size={18} />
                   </div>
                   <div className="text-[13px] font-bold text-gray-900 mb-1">Click to upload or drag and drop</div>
                   <div className="text-[12px] font-medium text-gray-400">SVG, PNG, JPG, or PDF (max. 10MB)</div>
                 </label>
                 
                 {files.length > 0 && (
                   <div className="mt-4 flex flex-col gap-2">
                     {files.map((file, idx) => (
                       <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-lg">
                         <div className="flex items-center gap-3 overflow-hidden">
                           <FileText className="text-gray-400 shrink-0" size={16} />
                           <div className="text-[13px] font-medium text-gray-900 truncate">{file.name}</div>
                           <div className="text-[12px] text-gray-400 shrink-0">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                         </div>
                         <div className="flex items-center gap-1">
                           <button 
                             onClick={() => {
                               const url = URL.createObjectURL(file);
                               const a = document.createElement('a');
                               a.href = url;
                               a.download = file.name;
                               a.click();
                               URL.revokeObjectURL(url);
                             }}
                             className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                           >
                             <Download size={14} />
                           </button>
                           <button 
                             onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                             className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                           >
                             <X size={14} />
                           </button>
                         </div>
                       </div>
                     ))}
                   </div>
                 )}
              </div>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
