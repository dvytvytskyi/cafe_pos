import React from 'react';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  hint?: string;
  required?: boolean;
}

export function Label({ children, className = '', hint, required, ...props }: LabelProps) {
  return (
    <div className="mb-2">
      <label className={`block text-[14px] font-bold text-gray-900 ${className}`} {...props}>
        {children}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {hint && <p className="text-[11px] text-gray-400 font-medium mt-1">{hint}</p>}
    </div>
  );
}
