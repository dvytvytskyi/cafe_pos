'use client';

import React, { useState, useRef } from 'react';
import { Calendar, ChevronDown, CreditCard, Smartphone, Banknote, ChevronLeft, ChevronRight } from 'lucide-react';
import { monthsToDateRange, presetToDateRange, toLocalIsoDate } from '@/lib/reports';
import AnchoredDropdown from '@/components/dashboard/AnchoredDropdown';
import {
  type DashboardPaymentFilter,
  type PaymentFilterLabel,
  uiPaymentLabelToFilter,
} from '@/lib/dashboard';

export type DateRangeValue = { startDate: string; endDate: string };

interface GlobalFiltersProps {
  compare?: boolean;
  onCompareChange?: (val: boolean) => void;
  variant?: 'default' | 'reports';
  children?: React.ReactNode;
  /** @deprecated use onDateRangeChange */
  onPresetChange?: (preset: string) => void;
  onDateRangeChange?: (range: DateRangeValue) => void;
  onPaymentMethodChange?: (method: DashboardPaymentFilter) => void;
  initialPreset?: string;
}

export default function GlobalFilters({
  compare: externalCompare,
  onCompareChange,
  variant = 'default',
  children,
  onPresetChange,
  onDateRangeChange,
  onPaymentMethodChange,
  initialPreset = 'Last 7 days',
}: GlobalFiltersProps) {
  const [activePreset, setActivePreset] = useState(initialPreset);
  const [internalCompare, setInternalCompare] = useState(false);
  const compare = externalCompare !== undefined ? externalCompare : internalCompare;
  const setCompare = onCompareChange || setInternalCompare;

  const [payment, setPayment] = useState<PaymentFilterLabel>('All Methods');

  const [dateOpen, setDateOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [monthOpen, setMonthOpen] = useState(false);

  const now = new Date();
  const [selectedMonths, setSelectedMonths] = useState<number[]>([now.getMonth()]);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());

  const [baseDate, setBaseDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  const emitRange = (range: DateRangeValue) => {
    onDateRangeChange?.(range);
  };

  const applyPreset = (preset: string) => {
    setActivePreset(preset);
    setDateOpen(preset === 'Custom');
    setMonthOpen(false);
    if (preset !== 'Custom') {
      setRangeStart(null);
      setRangeEnd(null);
    }
    onPresetChange?.(preset);
    if (preset !== 'Custom' && preset !== 'Month') {
      emitRange(presetToDateRange(preset));
    }
  };

  const applyMonthSelection = (months: number[], year: number, closePicker = true) => {
    setActivePreset('Month');
    setRangeStart(null);
    setRangeEnd(null);
    setHoverDate(null);
    emitRange(monthsToDateRange(year, months));
    if (closePicker) setMonthOpen(false);
  };

  const applyCustomRange = () => {
    if (!rangeStart || !rangeEnd) return;
    setActivePreset('Custom');
    setMonthOpen(false);
    emitRange({ startDate: toLocalIsoDate(rangeStart), endDate: toLocalIsoDate(rangeEnd) });
    setDateOpen(false);
    onPresetChange?.('Custom');
  };

  const dateRef = useRef<HTMLDivElement>(null);
  const paymentRef = useRef<HTMLDivElement>(null);
  const monthRef = useRef<HTMLDivElement>(null);

  const presets = ['All time', '2026', 'Today', 'Last 7 days', 'Last 30 days', 'Custom'];
  
  const paymentOptions = [
    { id: 'All Methods', icon: null },
    { id: 'Card', icon: <CreditCard className="w-4 h-4 text-gray-500 group-hover:text-gray-900 transition-colors" /> },
    { id: 'App', icon: <Smartphone className="w-4 h-4 text-gray-500 group-hover:text-gray-900 transition-colors" /> },
    { id: 'Cash', icon: <Banknote className="w-4 h-4 text-gray-500 group-hover:text-gray-900 transition-colors" /> },
  ];

  // --- Calendar Helpers ---
  const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => setBaseDate(new Date(baseDate.getFullYear(), baseDate.getMonth() - 1, 1));
  const handleNextMonth = () => setBaseDate(new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1));

  const handleDayClick = (date: Date) => {
    setActivePreset('Custom');
    if (!rangeStart || (rangeStart && rangeEnd)) {
      // Start new range
      setRangeStart(date);
      setRangeEnd(null);
    } else if (rangeStart && !rangeEnd) {
      // Complete range
      if (date < rangeStart) {
        setRangeEnd(rangeStart);
        setRangeStart(date);
      } else {
        setRangeEnd(date);
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

  const formatDateLabel = (date: Date | null) => {
    if (!date) return '';
    return `${monthNames[date.getMonth()].slice(0, 3)} ${date.getDate().toString().padStart(2, '0')}, ${date.getFullYear()}`;
  };

  const renderMonth = (monthOffset: number) => {
    const targetDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + monthOffset, 1);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days = Array.from({length: daysInMonth}, (_, i) => i + 1);

    return (
      <div className="flex-1">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[13px] font-bold text-gray-900">{monthNames[month]} {year}</div>
          {monthOffset === 1 && (
            <div className="flex items-center gap-3 text-gray-500">
              <button onClick={handlePrevMonth} className="cursor-pointer hover:text-gray-900"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={handleNextMonth} className="cursor-pointer hover:text-gray-900"><ChevronRight className="w-4 h-4" /></button>
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
            
            // To properly render the connected background, we need to know if this day connects to the left/right
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

  const monthButtonSummary =
    selectedMonths.length === 0
      ? 'Select Month'
      : selectedMonths.length === 1
        ? `${monthNames[selectedMonths[0]].slice(0, 3)} ${selectedYear}`
        : selectedMonths.length === 12
          ? `All of ${selectedYear}`
          : `${selectedMonths.length} Months (${selectedYear})`;

  const buttonLabel =
    activePreset === 'Month'
      ? monthButtonSummary
      : activePreset === 'Custom' && rangeStart
        ? `${formatDateLabel(rangeStart)}${rangeEnd ? ` - ${formatDateLabel(rangeEnd)}` : ' - ...'}`
        : 'Select Date Range';

  return (
    <div className={variant === 'reports' ? "flex flex-wrap xl:flex-nowrap items-center justify-between gap-y-4 gap-x-4 z-20 relative flex-1 min-w-0 max-w-full w-full" : "flex flex-wrap xl:flex-nowrap items-center justify-between gap-y-4 gap-x-4 z-20 relative w-full min-w-0 max-w-full"}>
      
      {/* Presets Segmented Control (Row 1 on tablet) */}
      <div className="flex items-center gap-0.5 h-[40px] bg-gray-50/80 p-1 rounded-[12px] border border-gray-200/60 w-full xl:w-auto overflow-x-auto custom-scrollbar shrink-0">
          {presets.map(preset => (
            <button
              key={preset}
              data-testid={`filter-preset-${preset.replace(/\s+/g, '-')}`}
              onClick={() => applyPreset(preset)}
              className={`cursor-pointer whitespace-nowrap h-full flex flex-1 xl:flex-none items-center justify-center px-3.5 text-[13px] font-semibold rounded-[8px] transition-all duration-200 ${
                activePreset === preset 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>

      {/* Secondary Filters (Left aligned right next to Presets) */}
      <div className="flex flex-wrap items-center gap-4 w-full min-w-0 max-w-full xl:w-auto pb-1 sm:pb-0 justify-start">
        
        {/* Month Picker Button & Modal */}
        <div className="relative w-full sm:w-auto sm:min-w-[140px] sm:max-w-[180px]" ref={monthRef}>
          <button 
            onClick={() => {
              const opening = !monthOpen;
              setMonthOpen(opening);
              setDateOpen(false);
              setPaymentOpen(false);
              if (opening) {
                applyMonthSelection(selectedMonths, selectedYear, false);
              }
            }}
            className={`cursor-pointer flex items-center justify-center h-[40px] gap-2.5 px-4 rounded-[10px] border transition-colors w-full ${
              variant === 'reports' 
                ? (activePreset === 'Month' || monthOpen 
                  ? 'bg-gray-50 border-gray-100 text-gray-900' 
                  : 'bg-white border-gray-100 hover:border-gray-200 text-gray-700 hover:bg-gray-50')
                : (activePreset === 'Month' || monthOpen 
                  ? 'bg-white border-gray-900 text-gray-900 shadow-sm' 
                  : 'bg-white border-gray-200 text-gray-900 hover:bg-gray-50')
            }`}
          >
            <Calendar className={`w-3.5 h-3.5 ${activePreset === 'Month' || monthOpen ? 'text-gray-900' : 'text-gray-500'}`} />
            <span className="text-[13px] font-semibold tracking-tight whitespace-nowrap">
              {monthButtonSummary}
            </span>
          </button>

          <AnchoredDropdown
            open={monthOpen}
            onClose={() => setMonthOpen(false)}
            anchorRef={monthRef}
            align="left"
            width={280}
            className="bg-white border border-gray-200 rounded-xl shadow-2xl p-4"
          >
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => {
                  setSelectedYear((y) => {
                    const next = y - 1;
                    if (selectedMonths.length > 0) applyMonthSelection(selectedMonths, next, false);
                    return next;
                  });
                }}
                className="cursor-pointer p-1 hover:bg-gray-100 rounded-md text-gray-500 hover:text-gray-900"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="text-[14px] font-bold text-gray-900">{selectedYear}</div>
              <button
                type="button"
                onClick={() => {
                  setSelectedYear((y) => {
                    const next = y + 1;
                    if (selectedMonths.length > 0) applyMonthSelection(selectedMonths, next, false);
                    return next;
                  });
                }}
                className="cursor-pointer p-1 hover:bg-gray-100 rounded-md text-gray-500 hover:text-gray-900"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {monthNames.map((m, i) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    const next = selectedMonths.includes(i)
                      ? selectedMonths.length > 1
                        ? selectedMonths.filter((mo) => mo !== i)
                        : selectedMonths
                      : [...selectedMonths, i].sort((a, b) => a - b);
                    setSelectedMonths(next);
                    applyMonthSelection(next, selectedYear);
                  }}
                  className={`cursor-pointer py-2 text-[12px] font-bold rounded-lg transition-colors ${
                    selectedMonths.includes(i)
                      ? 'bg-[#EE635E] text-white shadow-md'
                      : 'text-gray-700 bg-gray-50 hover:bg-gray-200'
                  }`}
                >
                  {m.slice(0, 3)}
                </button>
              ))}
            </div>
          </AnchoredDropdown>
        </div>

        {/* Custom Date Range Button & Modal - ONLY APPEARS WHEN Custom PRESET IS ACTIVE */}
        {activePreset === 'Custom' && (
          <div className="relative flex-shrink-0 animate-fadeIn" ref={dateRef}>
            <button 
              onClick={() => { setDateOpen(!dateOpen); setMonthOpen(false); setPaymentOpen(false); }}
              className={`cursor-pointer flex items-center justify-center h-[40px] px-4 gap-2.5 rounded-[10px] border transition-colors shrink-0 ${
                variant === 'reports' 
                  ? (dateOpen 
                    ? 'bg-gray-50 border-gray-100 text-gray-900' 
                    : 'bg-white border-gray-100 hover:border-gray-200 text-gray-700 hover:bg-gray-50')
                  : (dateOpen 
                    ? 'bg-white border-gray-900 text-gray-900 shadow-sm' 
                    : 'bg-white border-gray-200 text-gray-900 hover:bg-gray-50')
              }`}
            >
              <Calendar className="w-3.5 h-3.5 shrink-0 text-gray-900" />
              <span className="text-[13px] font-semibold tracking-tight whitespace-nowrap">{buttonLabel}</span>
            </button>

            <AnchoredDropdown
              open={dateOpen}
              onClose={() => setDateOpen(false)}
              anchorRef={dateRef}
              align="left"
              width={540}
              className="bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden max-w-[calc(100vw-16px)]"
            >
              <div className="flex px-5 pt-5 pb-2 gap-6 overflow-x-auto" onMouseLeave={() => setHoverDate(null)}>
                {renderMonth(0)}
                {renderMonth(1)}
              </div>
              <div className="border-t border-gray-100 p-3 px-5 flex items-center justify-between bg-gray-50/50">
                <div className="text-[11px] font-medium text-gray-400">Select start and end date</div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRangeStart(null);
                      setRangeEnd(null);
                    }}
                    className="cursor-pointer px-4 py-1.5 text-[12px] font-bold text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={applyCustomRange}
                    disabled={!rangeStart || !rangeEnd}
                    className="cursor-pointer px-4 py-1.5 text-[12px] font-bold text-white bg-[#EE635E] hover:bg-[#d94f4a] rounded-[8px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </AnchoredDropdown>
          </div>
        )}
      </div>

      {/* Right Aligned Controls: Compare Toggle & Payment Method Selector */}
      <div className="flex items-center gap-4 ml-auto">
        {/* Compare Toggle */}
          {variant === 'reports' ? (
            <button 
              onClick={() => setCompare(!compare)}
              className={`cursor-pointer flex items-center justify-center h-[40px] gap-2.5 px-4 rounded-[10px] border transition-colors flex-1 sm:flex-none ${
                compare 
                  ? 'bg-gray-50 border-gray-100 text-gray-900' 
                  : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50 hover:border-gray-200'
              }`}
            >
              <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${compare ? 'bg-[#EE635E]' : 'bg-gray-200'}`}>
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${compare ? 'translate-x-5' : 'translate-x-1'}`} />
              </div>
              <span className="text-[13px] font-semibold tracking-tight">Compare</span>
            </button>
          ) : (
            <div className="flex items-center justify-center gap-2.5 bg-white px-4 h-[40px] rounded-[10px] border border-gray-200 flex-1 xl:flex-none min-w-[120px]">
              <button 
                onClick={() => setCompare(!compare)}
                className={`cursor-pointer relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${compare ? 'bg-[#EE635E]' : 'bg-gray-200'}`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm ${compare ? 'translate-x-5' : 'translate-x-1'}`} />
              </button>
              <span className={`text-[13px] font-semibold tracking-tight transition-colors ${compare ? 'text-gray-900' : 'text-gray-500'}`}>Compare</span>
            </div>
          )}

          {/* Payment Method Selector Dropdown */}
          <div className="relative w-full sm:w-auto sm:min-w-[140px] sm:max-w-[180px]" ref={paymentRef}>
            <button 
              type="button"
              onClick={() => { setPaymentOpen(!paymentOpen); setDateOpen(false); setMonthOpen(false); }}
              className={variant === 'reports' 
                ? `cursor-pointer flex items-center justify-between h-[40px] px-4 rounded-[10px] border transition-colors w-full focus:outline-none ${paymentOpen ? 'border-[#EE635E]' : 'border-gray-100 hover:border-gray-200'} bg-white hover:bg-gray-50` 
                : `cursor-pointer flex items-center justify-between gap-3 bg-white hover:bg-gray-50 px-4 h-[40px] rounded-[10px] border transition-colors w-full focus:outline-none ${paymentOpen ? 'border-[#EE635E] shadow-[0_0_0_1px_rgba(238,99,94,1)]' : 'border-gray-200'}`
              }
            >
            <div className="flex items-center gap-2">
              {paymentOptions.find(p => p.id === payment)?.icon}
              <span className="text-[13px] font-semibold text-gray-900 tracking-tight whitespace-nowrap">{payment}</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${paymentOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnchoredDropdown
            open={paymentOpen}
            onClose={() => setPaymentOpen(false)}
            anchorRef={paymentRef}
            align="left"
            className="bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden p-1.5"
          >
            <div className="flex flex-col gap-0.5">
              {paymentOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    const label = opt.id as PaymentFilterLabel;
                    setPayment(label);
                    setPaymentOpen(false);
                    onPaymentMethodChange?.(uiPaymentLabelToFilter(label));
                  }}
                  className={`cursor-pointer focus:outline-none w-full text-left px-3 py-2 rounded-lg text-sm font-bold flex items-center justify-between transition-all group ${payment === opt.id ? 'bg-gray-50 text-gray-900' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                >
                  <div className="flex items-center gap-3">
                    {opt.icon}
                    {opt.id}
                  </div>
                  {payment === opt.id && <div className="w-1.5 h-1.5 rounded-full bg-[#EE635E]"></div>}
                </button>
              ))}
            </div>
          </AnchoredDropdown>
        </div>
      </div>
        
        {children && (
          <div className="flex items-center gap-3">
            {children}
          </div>
        )}
      </div>

    </div>
  );
}
