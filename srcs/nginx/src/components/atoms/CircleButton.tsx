import { motion } from 'framer-motion';
import React from 'react';

interface CircleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
}

const dropdownStyle = 'shadow-[0_10px_10px_1px_rgba(205,205,205,0.4)] ';

export const CircleButton = ({ children, className = '', ...props }: CircleButtonProps) => (
  <button
    className={`
      transition-all
      hover:scale-110 hover:text-green-900
      active:scale-95 active:text-red-800
      h-56 p-6  
      scale-75
      md:scale-100 md:m-10
      aspect-square
      rounded-full
      bg-slate-100/80
      flex items-center justify-center
      font-quantico border border-cyan-300 
      text-gray-700
      ${dropdownStyle}
                  `}
    {...props}
  >
    <p className="text-2xl text-center whitespace-nowrap">{children}</p>
  </button>
);
