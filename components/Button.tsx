import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  icon,
  className = '', 
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-dark-900 rounded-lg";
  
  const variants = {
    primary: "bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-900/20",
    secondary: "bg-dark-800 hover:bg-dark-700 text-gray-200 border border-dark-700",
    outline: "bg-transparent border border-dark-600 text-gray-300 hover:border-gray-400 hover:text-white",
    ghost: "bg-transparent text-gray-400 hover:text-white hover:bg-dark-800"
  };

  const sizes = {
    sm: "text-xs px-3 py-1.5 space-x-1.5",
    md: "text-sm px-4 py-2 space-x-2",
    lg: "text-base px-6 py-3 space-x-2"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className} disabled:opacity-50 disabled:cursor-not-allowed`}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
    </button>
  );
};