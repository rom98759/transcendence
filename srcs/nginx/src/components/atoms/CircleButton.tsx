import { HTMLMotionProps, motion, useAnimation } from 'framer-motion';
import React from 'react';

interface CircleButtonProps extends HTMLMotionProps<'button'> {
  className?: string;
  isGrowing?: boolean;
  isMoving: boolean;
  children?: React.ReactNode;
  size?: number;
}

const dropdownStyle = 'shadow-[0_10px_10px_1px_rgba(205,205,205,0.4)] ';

export const CircleButton = ({
  children,
  className = '',
  isGrowing = true,
  isMoving = false,
  size = 70,
  ...props
}: CircleButtonProps) => {
  const controls = useAnimation();
  const handleMouseMove = () => {
    if (!isMoving) return;
    const randomX = (Math.random() - 0.5) * 80;
    const randomY = (Math.random() - 0.5) * 90;
    controls.start({
      x: randomX,
      y: randomY,
      transition: { type: 'spring', stiffness: 300, damping: 10 },
    });
  };
  const resetPosition = () => {
    if (isMoving) controls.start({ x: 0, y: 0 });
  };

  return (
    <motion.button
      {...props}
      animate={isMoving ? controls : { x: 0, y: 0 }}
      onMouseEnter={handleMouseMove}
      onMouseLeave={resetPosition}
      whileHover={isGrowing ? { scale: 1.1, color: '#029c8a' } : {}}
      whileTap={{ scale: 0.95, color: '#11ccbb' }}
      transition={{ duration: 0.3 }}
      style={{ width: size, height: size }}
      className={`
      basis-50
      m-10 p-6    
      aspect-square
      rounded-full
      bg-slate-100/80
      flex items-center justify-center
      font-quantico border border-cyan-300
      text-xl 
      text-gray-700
      cursor-pointer
      disabled:opacity-50 disabled:cursor-not-allowed
      ${dropdownStyle}
      ${className}
`}
    >
      <span className="text-xl text-center whitespace-wrap">{children}</span>
    </motion.button>
  );
};
