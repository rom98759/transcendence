import { motion, useAnimation } from 'framer-motion';

interface CircleButtonProps {
  isGrowing?: boolean;
  isMoving: boolean;
  children?: React.ReactNode;
}

const dropdownStyle = 'shadow-[0_10px_10px_1px_rgba(205,205,205,0.4)] ';

export const CircleButton = ({
  children,
  isGrowing = true,
  isMoving = false,
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
    <motion.div
      animate={isMoving ? controls : { x: 0, y: 0 }}
      onMouseEnter={handleMouseMove}
      onMouseLeave={resetPosition}
      whileHover={isGrowing ? { scale: 1.1, color: '#029c8a' } : {}}
      whileTap={{ scale: 0.95, color: '#ff0088' }}
      transition={{ duration: 0.3 }}
      className={`
      basis-50
      h-60 w-60 m-10 p-6    
      aspect-square
      rounded-full
      bg-slate-100/80
      flex items-center justify-center
      font-quantico border border-cyan-300
      text-2xl 
      text-gray-700
      ${dropdownStyle}
                  `}
    >
      <p className="text-2xl text-center whitespace-nowrap">{children}</p>
    </motion.div>
  );
};
