import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', error, icon, ...props }, ref) => {
    
    // Base classes mimicking input-corgi
    const baseClasses = 'w-full bg-white border rounded-xl px-4 py-3 text-[14px] font-medium text-gray-800 outline-none transition-all placeholder:text-gray-400';
    
    const stateClasses = error 
      ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/20' 
      : 'border-gray-200 hover:border-gray-300 focus:border-corgi focus:ring-4 focus:ring-corgi/20';

    const paddingClasses = icon ? 'pl-10' : '';

    return (
      <div className="relative w-full">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            {icon}
          </div>
        )}
        <input 
          ref={ref}
          className={`${baseClasses} ${stateClasses} ${paddingClasses} ${className}`}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-500">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
