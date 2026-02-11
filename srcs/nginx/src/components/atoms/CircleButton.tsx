import { motion } from 'framer-motion';

interface CircleButtonProps {
  children?: React.ReactNode;
}

const dropdownStyle = 'shadow-[0_10px_10px_1px_rgba(205,205,205,0.4)] ';

export const CircleButton = ({ children }: CircleButtonProps) => (
  <motion.div
    whileHover={{ scale: 1.1, color: '#029c8a' }}
    whileTap={{ scale: 0.95, color: '#ff0088' }}
    transition={{ duration: 0.3 }}
    className={`
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
  >
    <p className="text-2xl text-center whitespace-nowrap">{children}</p>
  </motion.div>
);
