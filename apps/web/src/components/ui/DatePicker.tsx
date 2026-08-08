import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDateParam } from '@/lib/task-dates';

const fullWeekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const shortWeekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

interface DatePickerProps {
  selectedDate: Date;
  onChange: (date: Date) => void;
  isMissed?: (day: number, month: number) => boolean;
  testId?: string;
}

export default function DatePicker({ selectedDate, onChange, isMissed, testId }: DatePickerProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [baseDate, setBaseDate] = useState(() => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setBaseDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  }, [selectedDate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false);
      }
    };
    if (isCalendarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCalendarOpen]);

  return (
    <div className="relative" ref={containerRef}>
      <button 
        type="button"
        data-testid={testId ?? 'date-picker-toggle'}
        data-date-iso={formatDateParam(selectedDate)}
        onClick={() => setIsCalendarOpen(!isCalendarOpen)}
        className={`w-[145px] py-1.5 rounded-xl border transition-all flex items-center justify-center gap-2 cursor-pointer ${isCalendarOpen ? 'border-gray-900 bg-white text-gray-900 shadow-sm' : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'}`}
      >
        <Calendar size={16} className="text-gray-500 shrink-0" />
        <div className="relative w-[85px] h-[18px] flex items-center justify-center overflow-hidden">
          {!isMounted ? (
            <span
              suppressHydrationWarning
              className="text-[13px] font-semibold whitespace-nowrap"
            >
              {selectedDate.getDate()}
            </span>
          ) : (
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={selectedDate.getTime()}
                initial={{ opacity: 0, y: -15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="text-[13px] font-semibold whitespace-nowrap absolute w-full text-center left-0"
              >
                {selectedDate.getDate()} {fullWeekdays[selectedDate.getDay()]}
              </motion.span>
            </AnimatePresence>
          )}
        </div>
      </button>
      
      <AnimatePresence>
        {isCalendarOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-1/2 -translate-x-1/2 mt-3 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 w-[260px] p-4"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-[13px] font-bold text-gray-900">{monthNames[baseDate.getMonth()]} {baseDate.getFullYear()}</div>
              <div className="flex items-center gap-1 text-gray-500">
                <button onClick={() => setBaseDate(new Date(baseDate.getFullYear(), baseDate.getMonth() - 1, 1))} className="p-1 rounded hover:bg-gray-100 cursor-pointer hover:text-gray-900"><ChevronLeft size={14} /></button>
                <button onClick={() => setBaseDate(new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1))} className="p-1 rounded hover:bg-gray-100 cursor-pointer hover:text-gray-900"><ChevronRight size={14} /></button>
              </div>
            </div>
            
            <div className="grid grid-cols-7 gap-y-2 text-center mb-2">
              {shortWeekdays.map(day => (
                <div key={day} className="text-[11px] font-bold text-gray-400">{day}</div>
              ))}
              {Array.from({length: getFirstDayOfMonth(baseDate.getFullYear(), baseDate.getMonth())}).map((_, i) => <div key={`empty-${i}`}></div>)}
              {Array.from({length: getDaysInMonth(baseDate.getFullYear(), baseDate.getMonth())}).map((_, i) => {
                const day = i + 1;
                const date = new Date(baseDate.getFullYear(), baseDate.getMonth(), day);
                const isSelected = selectedDate.getTime() === date.getTime();
                const missed = isMissed ? isMissed(day, baseDate.getMonth()) : false;
                const today = new Date();
                const isToday = date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
                
                return (
                  <div key={day} className="flex items-center justify-center h-8">
                    <button 
                      onClick={() => { onChange(date); setIsCalendarOpen(false); }}
                      className={`w-7 h-7 flex items-center justify-center rounded-full text-[12px] font-semibold transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-[#1a2333] text-white shadow-md' 
                          : missed
                            ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                            : isToday
                              ? 'border border-[#1a2333] text-[#1a2333] hover:bg-gray-100'
                              : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      {day}
                    </button>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
