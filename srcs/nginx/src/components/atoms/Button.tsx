import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'alert';

const baseStyle = `px-6 
  py-2 
  font-mono
  text-sm
  border-b-2 rounded-lg
  shadow-md
  transition-all duration-200 
  active:scale-95 active:border-b-0 translate-y-0
  focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
  disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 disabled:active:border-b-2
  `;

const variants = {
  primary: 'bg-zinc-700 text-white hover:bg-zinc-600',
  secondary: 'bg-cyan-200 text-cyan-900 border-cyan-400 hover:bg-cyan-100',
  alert: 'bg-red-300 text-red-900 border-red-600 hover:bg-red-300',
};

// Props
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: ButtonVariant;
  className?: string;
}

const Button = ({
  children,
  variant = 'primary',
  className = '',
  disabled,
  ...props
}: ButtonProps) => {
  return (
    <button
      disabled={disabled}
      type="button"
      className={`${baseStyle} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
