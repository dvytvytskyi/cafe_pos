import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface DateTimePickerProps {
  selectedDate: Date | null;
  onDateChange: (date: Date | null) => void;
  isOpen: boolean;
  onClose: () => void;
  align?: 'left' | 'right';
}

export default function DateTimePicker({
  selectedDate,
  onDateChange,
  isOpen,
  onClose,
  align = 'left'
}: DateTimePickerProps) {
  const [baseDate, setBaseDate] = useState(selectedDate || new Date());
  
  // Initialize time from selectedDate or default to 12:00
  const [time, setTime] = useState(() => {
    if (selectedDate) {
      return `${selectedDate.getHours().toString().padStart(2, '0')}:${selectedDate.getMinutes().toString().padStart(2, '0')}`;
    }
    return '12:00';
  });

  // Local state for the date being picked before applying
  const [tempDate, setTempDate] = useState<Date | null>(selectedDate);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTempDate(selectedDate);
      if (selectedDate) {
        setBaseDate(new Date(selectedDate));
        setTime(`${selectedDate.getHours().toString().padStart(2, '0')}:${selectedDate.getMinutes().toString().padStart(2, '0')}`);
      }
    }
  }, [isOpen, selectedDate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => setBaseDate(new Date(baseDate.getFullYear(), baseDate.getMonth() - 1, 1));
  const handleNextMonth = () => setBaseDate(new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1));

  const handleDayClick = (date: Date) => {
    setTempDate(date);
  };

  const handleApply = () => {
    if (tempDate) {
      const [hours, minutes] = time.split(':').map(Number);
      const finalDate = new Date(tempDate);
      if (!isNaN(hours) && !isNaN(minutes)) {
        finalDate.setHours(hours, minutes);
      }
      onDateChange(finalDate);
    } else {
      onDateChange(null);
    }
    onClose();
  };

  const handleClear = () => {
    setTempDate(null);
    onDateChange(null);
    onClose();
  };

  const isSelected = (date: Date) => {
    if (!tempDate) return false;
    return date.getFullYear() === tempDate.getFullYear() && 
           date.getMonth() === tempDate.getMonth() && 
           date.getDate() === tempDate.getDate();
  };

  const renderMonth = () => {
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days = Array.from({length: daysInMonth}, (_, i) => i + 1);

    return (
      <div className="flex-1 min-w-[240px]">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[14px] font-bold text-gray-900">{monthNames[month]} {year}</div>
          <div className="flex items-center gap-2 text-gray-500">
            <button onClick={handlePrevMonth} className="cursor-pointer p-1 hover:bg-gray-100 rounded hover:text-gray-900 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={handleNextMonth} className="cursor-pointer p-1 hover:bg-gray-100 rounded hover:text-gray-900 transition-colors"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
        
        <div className="grid grid-cols-7 gap-y-2 text-center mb-2">
          {weekdays.map(day => (
            <div key={day} className="text-[12px] font-bold text-gray-400">{day}</div>
          ))}
          
          {Array.from({length: firstDay}).map((_, i) => <div key={`empty-${i}`}></div>)}
          
          {days.map(day => {
            const currentDate = new Date(year, month, day);
            const selected = isSelected(currentDate);
            const today = new Date();
            const isToday = currentDate.getFullYear() === today.getFullYear() && currentDate.getMonth() === today.getMonth() && currentDate.getDate() === today.getDate();
            
            return (
              <div key={day} className="flex items-center justify-center h-8 w-full">
                <button 
                  onClick={() => handleDayClick(currentDate)}
                  className={`cursor-pointer w-7 h-7 flex items-center justify-center rounded-full text-[13px] font-semibold transition-colors ${
                    selected 
                      ? 'bg-[#1a2333] text-white shadow-md' 
                      : isToday
                        ? 'border border-[#1a2333] text-[#1a2333] hover:bg-gray-100'
                        : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {day}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.15 }}
          className={`absolute top-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 w-auto overflow-hidden ${align === 'right' ? 'right-0' : 'left-0'}`} 
          ref={containerRef}
        >
          <div className="p-5">
            {renderMonth()}
            
            <div className="mt-4 pt-4 border-t border-gray-100">
              <label className="flex items-center justify-between text-[13px] font-bold text-gray-700">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-gray-400" />
                  Time
                </div>
                <input 
                  type="time" 
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-[13px] font-semibold text-gray-900 focus:outline-none focus:border-[#1a2333] focus:ring-1 focus:ring-[#1a2333] transition-all"
                />
              </label>
            </div>
          </div>
          
          <div className="border-t border-gray-100 p-3 px-5 flex items-center justify-end gap-3 bg-gray-50/50">
            <button 
              onClick={handleClear}
              className="cursor-pointer px-4 py-1.5 text-[12px] font-bold text-gray-500 hover:text-gray-900 transition-colors"
            >
              Clear
            </button>
            <button 
              onClick={handleApply}
              disabled={!tempDate}
              className="cursor-pointer px-4 py-1.5 text-[12px] font-bold text-white bg-[#1a2333] hover:bg-gray-800 rounded-[8px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
