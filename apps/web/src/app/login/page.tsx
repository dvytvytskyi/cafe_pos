'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Delete, LogIn, KeyRound, CheckCircle2 } from 'lucide-react';
import { loginWithPinAsync } from '@/lib/staff';

export default function LoginPage() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const appendDigit = (digit: string) => {
    if (pin.length >= 4 || loading || success) return;
    setError(null);
    setPin((p) => p + digit);
  };

  const backspace = () => {
    if (loading || success) return;
    setError(null);
    setPin((p) => p.slice(0, -1));
  };

  const handleSubmit = async (value = pin) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length !== 4) {
      setError('Please enter a 4-digit PIN');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await loginWithPinAsync(digits);
      if (!result.success) {
        setError(result.error ?? 'Invalid PIN. Try 1234 or 0000');
        setPin('');
        return;
      }
      setSuccess(true);
      setTimeout(() => {
        window.location.href = '/';
      }, 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (pin.length === 4) {
      handleSubmit(pin).catch(console.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  return (
    <div className="min-h-screen w-full bg-[#fdfbf7] flex items-center justify-center p-4 sm:p-6 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="bg-white rounded-3xl p-8 sm:p-10 shadow-2xl border border-gray-100/80 w-full max-w-sm flex flex-col items-center relative overflow-hidden"
      >
        {/* Top Decorative Header Accent */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#EE635E] via-[#FC8C86] to-[#EE635E]" />

        {/* Logo & Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-[#EE635E]/10 p-2.5 flex items-center justify-center mb-4 border border-[#EE635E]/20 shadow-sm">
            <img src="/media/image.png" alt="Corgi POS Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Corgi POS</h1>
          <p className="text-xs font-semibold text-gray-500 mt-1">Terminal Staff Access</p>
        </div>

        {/* PIN Indicators */}
        <div className="flex justify-center gap-3.5 mb-6" data-testid="pin-dots">
          {[0, 1, 2, 3].map((i) => {
            const isFilled = pin.length > i;
            return (
              <motion.div
                key={i}
                animate={{ scale: isFilled ? 1.15 : 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-200 ${
                  isFilled
                    ? 'bg-[#EE635E] border-[#EE635E] shadow-sm'
                    : 'border-gray-200 bg-gray-50'
                }`}
              />
            );
          })}
        </div>

        {/* Error / Success Alerts */}
        <div className="h-6 mb-3 flex items-center justify-center w-full">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs font-bold text-red-500 text-center bg-red-50 px-3 py-1 rounded-full border border-red-100"
                data-testid="login-error"
              >
                {error}
              </motion.div>
            )}
            {success && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-xs font-bold text-emerald-600 text-center bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 flex items-center gap-1.5"
              >
                <CheckCircle2 size={14} />
                <span>Authorized! Redirecting...</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Keypad Grid */}
        <div className="grid grid-cols-3 gap-3 w-full mb-6">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              disabled={loading || success}
              onClick={() => appendDigit(digit)}
              className="h-14 rounded-2xl bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-xl font-bold text-gray-900 transition-all shadow-2xs hover:shadow-sm cursor-pointer disabled:opacity-50 active:scale-95 flex items-center justify-center"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            disabled={loading || success || pin.length === 0}
            onClick={() => {
              setError(null);
              setPin('');
            }}
            className="h-14 rounded-2xl bg-gray-50 hover:bg-gray-100 text-xs font-bold text-gray-500 transition-all cursor-pointer disabled:opacity-40 active:scale-95 flex items-center justify-center uppercase tracking-wider"
          >
            Clear
          </button>
          <button
            type="button"
            disabled={loading || success}
            onClick={() => appendDigit('0')}
            className="h-14 rounded-2xl bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-xl font-bold text-gray-900 transition-all shadow-2xs hover:shadow-sm cursor-pointer disabled:opacity-50 active:scale-95 flex items-center justify-center"
          >
            0
          </button>
          <button
            type="button"
            disabled={loading || success || pin.length === 0}
            onClick={backspace}
            className="h-14 rounded-2xl bg-gray-50 hover:bg-gray-100 text-gray-600 transition-all cursor-pointer disabled:opacity-40 active:scale-95 flex items-center justify-center"
          >
            <Delete size={20} />
          </button>
        </div>

        {/* Demo PIN Chips */}
        <div className="w-full pt-4 border-t border-gray-100 flex flex-col items-center gap-2">
          <span className="text-[11px] font-semibold text-gray-400">Quick Demo PINs:</span>
          <div className="flex gap-2">
            {['1234', '0000', '1111'].map((demoPin) => (
              <button
                key={demoPin}
                type="button"
                onClick={() => {
                  setPin(demoPin);
                  handleSubmit(demoPin).catch(console.error);
                }}
                className="px-2.5 py-1 bg-gray-100 hover:bg-[#EE635E]/10 hover:text-[#EE635E] text-gray-600 rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                {demoPin}
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
