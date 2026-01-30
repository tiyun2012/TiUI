import React from 'react';

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }> = ({ variant = 'secondary', className = '', ...props }) => {
  const baseStyle = "px-3 py-1 text-xs font-medium rounded transition-colors focus:outline-none focus:ring-1 focus:ring-editor-accent";
  const variants = {
    primary: "bg-editor-accent text-white hover:bg-blue-600",
    secondary: "bg-editor-border text-editor-text hover:bg-editor-active",
    ghost: "bg-transparent text-editor-muted hover:text-editor-text hover:bg-white/5",
    danger: "bg-red-900/50 text-red-200 hover:bg-red-800"
  };

  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props} />
  );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className = '', ...props }) => {
  return (
    <input 
      className={`bg-black/20 border border-editor-border rounded px-2 py-1 text-xs text-editor-text placeholder-editor-muted focus:border-editor-accent focus:outline-none ${className}`}
      {...props}
    />
  );
};

export const PanelHeader: React.FC<{ children: React.ReactNode; actions?: React.ReactNode }> = ({ children, actions }) => {
  return (
    <div className="h-8 min-h-[32px] bg-editor-panel border-b border-editor-border flex items-center justify-between px-2 select-none">
      <div className="text-xs font-bold text-editor-muted uppercase tracking-wider truncate flex-1">
        {children}
      </div>
      <div className="flex items-center space-x-1">
        {actions}
      </div>
    </div>
  );
};
