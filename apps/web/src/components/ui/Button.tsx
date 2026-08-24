import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export function Button({ 
  children, 
  variant = 'primary', 
  icon, 
  fullWidth, 
  className = '', 
  ...props 
}: ButtonProps) {
  
  const baseClasses = 'inline-flex items-center justify-center gap-2 rounded-xl text-[13px] font-bold transition-all cursor-pointer shadow-sm active:scale-95';
  
  const variants = {
    primary: 'bg-[#EE635E] text-white hover:bg-[#d94f4a]',
    secondary: 'text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 hover:text-gray-900',
    ghost: 'text-gray-600 bg-transparent shadow-none hover:bg-gray-100 hover:text-gray-900',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100',
  };

  // Some variants have specific padding or dimensions in Corgi UI
  // Primary and secondary generally use px-6 py-2.5
  const sizeClasses = 'px-6 py-2.5';
  
  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button 
      className={`${baseClasses} ${variants[variant]} ${sizeClasses} ${widthClass} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
