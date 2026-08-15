'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckSquare, ListTodo } from 'lucide-react';
import DailyChecklists from './DailyChecklists';
import TaskManager from './TaskManager';

function OperationsDashboardInner() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialTab: 'checklists' | 'tasks' =
    tabParam === 'checklists' ? 'checklists' : tabParam === 'tasks' ? 'tasks' : 'tasks';

  const [activeTab, setActiveTab] = useState<'checklists' | 'tasks'>(initialTab);
  const [isSetupMode, setIsSetupMode] = useState(false);

  return (
    <div className="bg-white rounded-3xl p-5 md:px-8 md:pb-8 pt-6 md:pt-6 shadow-sm flex-1 overflow-hidden flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Operations & Quality</h2>
          <p className="text-sm font-medium text-gray-500 mt-1">Manage SOPs, checklists, and daily tasks</p>
        </div>
        <div className="flex items-center gap-0.5 h-9 bg-gray-50/80 p-1 rounded-xl border border-gray-200/60 shrink-0">
          <button
            onClick={() => setActiveTab('checklists')}
            className={`cursor-pointer whitespace-nowrap h-7 flex items-center justify-center px-4 text-[13px] font-semibold rounded-lg transition-all duration-200 gap-1.5 ${activeTab === 'checklists' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'}`}
          >
            <CheckSquare size={16} />
            Daily SOP's
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`cursor-pointer whitespace-nowrap h-7 flex items-center justify-center px-4 text-[13px] font-semibold rounded-lg transition-all duration-200 gap-1.5 ${activeTab === 'tasks' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'}`}
          >
            <ListTodo size={16} />
            Tasks
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <AnimatePresence mode="wait">
          {activeTab === 'checklists' ? (
            <motion.div
              key="checklists"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex-1 overflow-hidden flex flex-col"
            >
              <DailyChecklists
                isSetupMode={isSetupMode}
                setIsSetupMode={setIsSetupMode}
              />
            </motion.div>
          ) : (
            <motion.div
              key="tasks"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex-1 overflow-hidden flex flex-col"
            >
              <TaskManager onBack={() => setActiveTab('checklists')} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function OperationsDashboard() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center text-gray-400">Loading operations…</div>}>
      <OperationsDashboardInner />
    </Suspense>
  );
}
