'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, UploadCloud, CheckCircle2, Loader2 } from 'lucide-react';

type PhotoProofUploadProps = {
  item: { id: string; title: string; photoUrl?: string } | null;
  isOpen: boolean;
  onClose: () => void;
  onUpload: (url: string) => void;
};

export default function PhotoProofUpload({ item, isOpen, onClose, onUpload }: PhotoProofUploadProps) {
  const [isUploading, setIsUploading] = useState(false);

  if (!isOpen || !item) return null;

  const handleSimulateUpload = () => {
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      onUpload('https://example.com/mock-photo.jpg');
    }, 1500);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0">
            <h2 className="text-xl font-bold text-gray-900">Photo Proof Required</h2>
            <button 
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-gray-50 text-gray-500 flex items-center justify-center hover:bg-gray-100 hover:text-gray-800 transition-colors cursor-pointer border border-transparent hover:border-gray-200"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-corgi/10 text-corgi flex items-center justify-center mx-auto mb-4">
                <Camera size={24} />
              </div>
              <h3 className="text-[15px] font-bold text-gray-900">Task: {item.title}</h3>
              <p className="text-[13px] font-medium text-gray-500 max-w-[280px] mx-auto">
                HQ requires a photo verification for this critical task before it can be marked as complete.
              </p>
            </div>

            {item.photoUrl ? (
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                <div className="w-full h-48 bg-gray-200 rounded-xl mb-3 flex items-center justify-center overflow-hidden relative group">
                  {/* Mock image placeholder since we don't have a real image */}
                  <img src="/corgi_cafe_logo.svg" alt="Proof" className="w-24 opacity-50 grayscale" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-sm font-bold flex items-center gap-2"><CheckCircle2 size={16} /> Verified</span>
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="w-full btn-secondary-corgi"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <button 
                  onClick={handleSimulateUpload}
                  disabled={isUploading}
                  className="w-full py-4 rounded-2xl border-2 border-dashed border-gray-300 hover:border-corgi hover:bg-corgi/5 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? (
                    <>
                      <Loader2 size={24} className="text-corgi animate-spin" />
                      <span className="text-[14px] font-bold text-gray-700">Uploading proof...</span>
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-full bg-gray-100 group-hover:bg-corgi/10 text-gray-500 group-hover:text-corgi flex items-center justify-center transition-colors">
                        <UploadCloud size={20} />
                      </div>
                      <span className="text-[14px] font-bold text-gray-700 group-hover:text-gray-900 transition-colors">Click to simulate camera upload</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
