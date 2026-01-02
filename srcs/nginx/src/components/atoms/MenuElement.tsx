import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Action = 'play' | 'profile';
type Color = 'white' | 'cyan';
interface Item {
  label: string;
  href: string;
}

const HALO_PATH =
  'M 8, 14 C 4.68, 14, 2, 11.31, 2, 8 C 2, 4.68, 4.68, 2, 8, 2 C 11.31, 2, 14, 4.68, 14, 8 C 14, 11.31, 11.31, 14, 8, 14 Z';

const HOUSE_PATH = 'M 8,2 L 14,7 L 14,14 L 10,14 L 10,10 L 6,10 L 6,14 L 2,14 L 2,7 Z';

const RACKET_PATH =
  'M12.318,6.166 C12.308,4.881 11.825,3.433 10.224,1.83 C7.905,-0.488 4.146,-0.488 1.828,1.83 C-0.49,4.148 -0.49,7.907 1.828,10.226 C3.312,11.709 4.66,12.219 5.875,12.288 L12.318,6.166 L12.318,6.166 Z M5.471,9.066 C4.628,9.066 3.945,8.374 3.945,7.517 C3.945,6.663 4.629,5.97 5.471,5.97 C6.315,5.97 6.999,6.663 6.999,7.517 C6.999,8.374 6.314,9.066 5.471,9.066 L5.471,9.066 Z M12.297,10.802 C11.846,10.35 11.85,9.903 11.925,9.658 C12.125,8.988 12.399,8.243 12.557,7.424 L7.53,12.451 C8.323,12.289 9.047,12.023 9.698,11.83 C9.948,11.756 10.421,11.777 10.895,12.251 C11.368,12.726 13.801,15.893 13.801,15.893 L15.965,13.73 C15.965,13.729 12.749,11.254 12.297,10.802 L12.297,10.802 Z';

// Props
interface MenuElementProps {
  action: Action;
  items: Item[];
  color: Color;
  scale: number;
  className?: string;
}

const titles: Record<Action, string> = {
  play: 'Play',
  profile: 'My account',
};

const paths: Record<Action, string> = {
  play: RACKET_PATH,
  profile: HOUSE_PATH,
};

const dropdownStyle = 'shadow-[0_10px_10px_1px_rgba(255,255,255,0.4)] border-white-400/70';

const morphTransition = {
  type: 'spring',
  stiffness: 42,
  damping: 12,
  mass: 1,
} as const;

const fadeTransition = {
  duration: 0.3,
  ease: 'easeInOut',
} as const;

const MenuElement = ({ action, items, scale = 1, className = '' }: MenuElementProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const title = titles[action];
  const iconPath = paths[action];

  return (
    <div
      className={`relative flex flex-col items-center justify-center mx-4 group cursor-pointer ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative w-20 h-20 flex items-center justify-center">
        <motion.div
          animate={{
            strokeWidth: isHovered ? 0 : 1,
            opacity: isHovered ? 0 : 0.5,
            scale: isHovered ? 0.5 : 1.3,
            filter: isHovered ? 'blur(0px)' : 'blur(8px)',
          }}
          transition={fadeTransition}
          className="absolute inset-0 rounded full bg-white"
          style={{
            // Le dégradé radial est mathématiquement circulaire, pas de coins carrés
            background:
              'radial-gradient(circle, rgba(255,255,255,0.9) 60%, rgba(255,255,255,0.5) 20%, rgba(255,255,255,0) 70%)',
          }}
        />

        <svg viewBox="0 0 16 16" className="w-full h-full z-10" style={{ overflow: 'visible' }}>
          <motion.path
            initial={{}}
            animate={{
              d: isHovered ? iconPath : HALO_PATH,
              fill: isHovered ? '#ffffff' : 'rgba(255,255,255,0)',
              stroke: isHovered ? 'rgba(255,255,255,0)' : '#ffffff',
              strokeWidth: isHovered ? 0 : 0.5,
              scale: isHovered ? scale : 1,
            }}
            transition={morphTransition}
            fillRule="evenodd"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ originX: '50%', originY: '50%' }}
          />
        </svg>
      </div>

      <motion.span
        animate={{}}
        transition={fadeTransition}
        className="text-white text-xs font-semibold mt-1 uppercase tracking-widest"
      >
        {title}
      </motion.span>

      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className={`
            absolute top-full left-1/2 -translate-x-1/2 
            mt-5 
            w-64 pt-6 pb-10 px-4
            bg-slate-100/80 backdrop-blur-xl 
            border-t-0 border-b-0 border-x-0 rounded-t-none rounded-b-[8rem]
            flex flex-col items-center justify-start
            z-50 ${dropdownStyle}
            `}
          >
            <div className="absolute top-0 left-0 w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <ul className="flex flex-col items center space-y-2 w-full">
              {items.map((item, index) => (
                <li key={index} className="w-full text-center">
                  <a
                    href={item.href}
                    className="block py-1 px-x text-slate-900 hover:text-white hover:scale-110 transition-all text-sm font-medium tracking-wide"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MenuElement;
