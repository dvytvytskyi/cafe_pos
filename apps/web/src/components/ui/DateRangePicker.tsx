import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface DateRangePickerProps {
  rangeStart: Date | null;
  rangeEnd: Date | null;
  onRangeChange: (start: Date | null, end: Date | null) => void;
  isOpen: boolean;
  onClose: () => void;
  align?: 'left' | 'right';
}

export default function DateRangePicker({
  rangeStart,
  rangeEnd,
  onRangeChange,
  isOpen,
  onClose,
  align = 'left'
}: DateRangePickerProps) {
  const [baseDate, setBaseDate] = useState(rangeStart || new Date());
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
    if (!rangeStart || (rangeStart && rangeEnd)) {
      onRangeChange(date, null);
    } else if (rangeStart && !rangeEnd) {
      if (date < rangeStart) {
        onRangeChange(date, rangeStart);
      } else {
        onRangeChange(rangeStart, date);
      }
    }
  };

  const handleDayHover = (date: Date) => {
    if (rangeStart && !rangeEnd) {
      setHoverDate(date);
    }
  };

  const isSelected = (date: Date) => {
    if (rangeStart && date.getTime() === rangeStart.getTime()) return true;
    if (rangeEnd && date.getTime() === rangeEnd.getTime()) return true;
    return false;
  };

  const isBetween = (date: Date) => {
    if (rangeStart && rangeEnd) {
      return date > rangeStart && date < rangeEnd;
    }
    if (rangeStart && hoverDate && !rangeEnd) {
      const start = rangeStart < hoverDate ? rangeStart : hoverDate;
      const end = rangeStart < hoverDate ? hoverDate : rangeStart;
      return date > start && date < end;
    }
    return false;
  };

  const renderMonth = (monthOffset: number) => {
    const targetDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + monthOffset, 1);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days = Array.from({length: daysInMonth}, (_, i) => i + 1);

    return (
      <div className="flex-1 min-w-[220px]">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[13px] font-bold text-gray-900">{monthNames[month]} {year}</div>
          {monthOffset === 1 && (
            <div className="flex items-center gap-3 text-gray-500">
              <button onClick={handlePrevMonth} className="cursor-pointer hover:text-gray-900 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={handleNextMonth} className="cursor-pointer hover:text-gray-900 transition-colors"><ChevronRight className="w-4 h-4" /></button>
            </div>
          )}
          {monthOffset === 0 && (
             <div className="h-6"></div> // spacer to keep heights aligned
          )}
        </div>
        
        <div className="grid grid-cols-7 gap-y-2 text-center mb-2">
          {weekdays.map(day => (
            <div key={day} className="text-[11px] font-bold text-gray-400">{day}</div>
          ))}
          
          {Array.from({length: firstDay}).map((_, i) => <div key={`empty-${i}`}></div>)}
          
          {days.map(day => {
            const currentDate = new Date(year, month, day);
            const isStart = rangeStart?.getTime() === currentDate.getTime();
            const isEnd = rangeEnd?.getTime() === currentDate.getTime();
            const isHover = !rangeEnd && hoverDate?.getTime() === currentDate.getTime();
            const selected = isStart || isEnd;
            const between = isBetween(currentDate);
            
            const connectRight = (isStart && (rangeEnd || hoverDate) && (rangeEnd! > currentDate || hoverDate! > currentDate)) || between;
            const connectLeft = (isEnd && rangeStart && rangeStart < currentDate) || (isHover && rangeStart && rangeStart < currentDate) || between;

            return (
              <div 
                key={`${year}-${month}-${day}`} 
                className={`relative flex items-center justify-center h-8 w-full`}
                onMouseEnter={() => handleDayHover(currentDate)}
              >
                {connectLeft && <div className="absolute inset-y-0 left-0 w-1/2 bg-gray-100 z-0"></div>}
                {connectRight && <div className="absolute inset-y-0 right-0 w-1/2 bg-gray-100 z-0"></div>}
                
                <button 
                  onClick={() => handleDayClick(currentDate)}
                  className={`cursor-pointer relative z-10 w-7 h-7 flex items-center justify-center rounded-full text-[12px] font-semibold transition-colors ${
                    selected 
                      ? 'bg-[#1a2333] text-white shadow-md' 
                      : between 
                        ? 'text-gray-900 bg-gray-100'
                        : 'text-gray-700 hover:bg-gray-200 hover:rounded-full'
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
          className={`absolute top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 w-auto ${align === 'right' ? 'right-0' : 'left-0'}`} 
          onMouseLeave={() => setHoverDate(null)}
          ref={containerRef}
        >
          <div className="flex px-5 pt-5 pb-2 gap-6">
            {renderMonth(0)}
            {renderMonth(1)}
          </div>
          
          <div className="border-t border-gray-100 p-3 px-5 flex items-center justify-between bg-gray-50/50 rounded-b-xl">
            <div className="text-[11px] font-medium text-gray-400">
              Select start and end date
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => onRangeChange(null, null)}
                className="cursor-pointer px-4 py-1.5 text-[12px] font-bold text-gray-600 hover:text-gray-900 transition-colors"
              >
                Clear
              </button>
              <button 
                onClick={onClose}
                className="cursor-pointer px-4 py-1.5 text-[12px] font-bold text-white bg-[#1a2333] hover:bg-gray-800 rounded-[8px] transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
