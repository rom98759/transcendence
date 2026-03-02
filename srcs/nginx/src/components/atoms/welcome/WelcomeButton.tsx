import React from 'react';

type WelcomeButtonVariant = 'primary' | 'secondary' | 'alert';

const baseStyle = `px-6
  py-2
  font-semibold
  text-sm
  rounded-xl
  shadow-lg
  transition-all duration-300
  active:scale-95 active:shadow-md translate-y-0
  focus:outline-none focus:ring-2 focus:ring-offset-2
  disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
  transform hover:scale-[1.02]
  `;

const variants = {
  primary:
    'bg-gradient-to-r from-[#00ff9f] to-[#0088ff] text-white hover:shadow-[0_4px_20px_rgba(0,255,159,0.3)] focus:ring-[#00ff9f]',
  secondary:
    'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-400 hover:to-blue-400 focus:ring-cyan-400',
  alert:
    'bg-gradient-to-r from-red-500 to-rose-500 text-white hover:from-red-400 hover:to-rose-400 focus:ring-red-400',
};

interface WelcomeButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: WelcomeButtonVariant;
  className?: string;
}

/**
 * WelcomeButton - Bouton avec gradient cyan/bleu pour WelcomePage
 */
const WelcomeButton = ({
  children,
  variant = 'primary',
  className: className = '',
  disabled,
  type = 'submit',
  ...props
}: WelcomeButtonProps) => {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default WelcomeButton;
