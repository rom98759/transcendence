import { motion } from 'framer-motion';

interface CircleButtonProps {
  children?: React.ReactNode;
}

const dropdownStyle = 'shadow-[0_10px_10px_1px_rgba(205,205,205,0.4)] ';

export const CircleButton = ({ children }: CircleButtonProps) => (
  <motion.div
    whileHover={{ scale: 1.1, color: '#029c8a' }}
    whileTap={{ scale: 0.95, color: '#ff0088' }}
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 + 1 }}
    exit={{ opacity: 0, y: 0 }}
    transition={{ duration: 0.2 }}
    className={`
      basis-50
      h-56 m-10 p-6    
      aspect-square
      rounded-full
      bg-slate-100/80
      flex items-center justify-center
      font-quantico
      z-50 ${dropdownStyle}
                  `}
  >
    <p className="text-2xl text-center whitespace-nowrap">{children}</p>
  </motion.div>
);
