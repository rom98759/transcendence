import { ReactNode, Children } from 'react';
import { motion } from 'framer-motion';
interface ScrollableProps {
  children: ReactNode;
  divClassName?: string;
  className?: string;
  isAnimated?: boolean;
}

export default function Scrollable({
  children,
  className = '',
  divClassName = '',
  isAnimated = false,
}: ScrollableProps) {
  const layoutClass = !isAnimated ? 'max-w-4xl' : '';
  return (
    <div className={`mt-0 mb-4 h-[90vh] flex justify-center items-center ${divClassName}`}>
      <div
        className={`${layoutClass} h-[75vh] w-full overflow-y-auto
          flex flex-col items-center 
          gap-12 py-2
          scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
      >
        {Children.map(children, (child, i) => {
          if (!isAnimated || i == 3) return child;
          return (
            <motion.div
              key={i}
              initial={{ x: 0, y: 0 }}
              animate={{
                x: [i % 2 === 0 ? -50 : 180, i % 2 === 0 ? 20 : 120, 0],
                y: [i % 2 === 0 ? -30 : 50, i % 2 === 0 ? -100 : 20, 8, 0],
              }}
              transition={{
                duration: 25 + i,
                repeat: Infinity,
                repeatType: 'mirror',
                ease: 'easeInOut',
                delay: i * 0.3,
              }}
              style={{ display: 'block' }}
            >
              {child}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
