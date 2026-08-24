'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Delete, LogIn } from 'lucide-react';
import { loginWithPinAsync } from '@/lib/staff';

type PinLoginScreenProps = {
  onSuccess: () => void;
};

export default function PinLoginScreen({ onSuccess }: PinLoginScreenProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const appendDigit = (digit: string) => {
    if (pin.length >= 4) return;
    setError(null);
    setPin((p) => p + digit);
  };

  const backspace = () => {
    setError(null);
    setPin((p) => p.slice(0, -1));
  };

  const handleSubmit = async (value = pin) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length !== 4) {
      setError('Enter 4 digits');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await loginWithPinAsync(digits);
      if (!result.success) {
        setError(result.error ?? 'Invalid PIN');
        setPin('');
        return;
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (pin.length === 4) {
      handleSubmit(pin).catch(console.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  return (
    <div
      className="fixed inset-0 z-[100] bg-ui-beige flex items-center justify-center p-4"
      data-testid="pin-login-screen"
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-xl w-full max-w-sm p-8"
      >
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-corgi/10 text-corgi flex items-center justify-center mx-auto mb-4">
            <LogIn size={28} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Login</h1>
          <p className="text-sm text-gray-500 mt-1">Enter your 4-digit PIN</p>
        </div>

        <div className="flex justify-center gap-3 mb-6" data-testid="pin-dots">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full border-2 transition-colors ${
                pin.length > i ? 'bg-corgi border-corgi' : 'border-gray-200 bg-white'
              }`}
            />
          ))}
        </div>

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center text-sm font-semibold text-red-500 mb-4"
              data-testid="pin-login-error"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button
              key={d}
              type="button"
              data-testid={`pin-key-${d}`}
              disabled={loading}
              onClick={() => appendDigit(d)}
              className="h-14 rounded-2xl bg-gray-50 hover:bg-gray-100 text-xl font-bold text-gray-900 transition-colors disabled:opacity-50"
            >
              {d}
            </button>
          ))}
          <button
            type="button"
            data-testid="pin-key-clear"
            disabled={loading}
            onClick={backspace}
            className="h-14 rounded-2xl bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-500 disabled:opacity-50"
          >
            <Delete size={20} />
          </button>
          <button
            type="button"
            data-testid="pin-key-0"
            disabled={loading}
            onClick={() => appendDigit('0')}
            className="h-14 rounded-2xl bg-gray-50 hover:bg-gray-100 text-xl font-bold text-gray-900 disabled:opacity-50"
          >
            0
          </button>
          <button
            type="button"
            data-testid="pin-key-submit"
            disabled={loading || pin.length !== 4}
            onClick={() => handleSubmit()}
            className="h-14 rounded-2xl bg-[#EE635E] hover:bg-[#d94f4a] text-white font-bold disabled:opacity-50"
          >
            OK
          </button>
        </div>
      </motion.div>
    </div>
  );
}
