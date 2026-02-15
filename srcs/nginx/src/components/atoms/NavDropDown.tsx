import { motion, AnimatePresence } from 'framer-motion';

interface NavDropdownProps {
  children?: React.ReactNode;
  isOpen: boolean;
  yTranslate?: number;
}

const dropdownStyle = 'shadow-[0_10px_10px_1px_rgba(255,255,255,0.4)] border-white-400/70';

export const NavDropdown = ({ isOpen, children, yTranslate = 0 }: NavDropdownProps) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 + yTranslate }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        style={{ x: '-50%' }}
        className={`
                  absolute top-full left-1/2  
                  mt-5 w-64 pt-6 pb-10 px-4
                  bg-slate-100/80 backdrop-blur-xl 
                  rounded-t-none 
                  rounded-b-[8rem]
                  flex flex-col items-center justify-start
                  z-15 ${dropdownStyle}
                  `}
      >
        <div className="absolute top-0 left-0 w-full bg-linear-to-r from-transparent via-white/10 to-transparent" />
        {children}
      </motion.div>
    )}
  </AnimatePresence>
);
