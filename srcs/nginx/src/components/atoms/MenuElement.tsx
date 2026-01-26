import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { MenuActions } from '../../types/react-types';
import { interpolate, Shape } from 'flubber';
import { useTranslation } from 'react-i18next';

type Color = 'white' | 'cyan';
interface Item {
  label: string;
  href: string;
}

const HALO_PATH =
  'M 8, 14 C 4.68, 14, 2, 11.31, 2, 8 C 2, 4.68, 4.68, 2, 8, 2 C 11.31, 2, 14, 4.68, 14, 8 C 14, 11.31, 11.31, 14, 8, 14 Z';

const HOUSE_PATH = 'M 8,2 L 14,7 L 14,14 L 10,14 L 10,10 L 6,10 L 6,14 L 2,14 L 2,7 Z';

const PIE_PATH =
  'M4.15 3.07a6.33 6.33 0 0 1 0.93-0.52c0.92-0.41 1.38-0.62 1.98-0.22 0.61 0.39 0.61 1.04 0.61 2.33v1c0 1.26 0 1.88 0.39 2.28s1.02 0.39 2.28 0.39h1c1.29 0 1.94 0 2.33 0.61 0.39 0.61 0.19 1.07-0.22 1.98a6.33 6.33 0 0 1-7.02 3.63 6.33 6.33 0 0 1-2.28-11.48 M14.3 4.72a5.35 5.35 0 0 0-3-3c-1.03-0.41-1.97 0.52-1.97 1.62v2.67a0.67 0.67 0 0 0 0.67 0.67h2.67c1.1 0 2.03-0.92 1.63-1.95';

const RACKET_PATH =
  'M8,2.56c3.01,0 5.44,2.43 5.44,5.44c0,0.75 -0.46,1.78 -0.82,2.52l-1.06,-0.89l-0.22,0.26l1.13,0.94l1.54,1.31c0.22,0.22 1.29,1.1 1.06,1.33l-1.54,1.58c-0.28,0.29 -1.1,-0.73 -1.31,-0.97l-0.21,-0.24l-2.1,-2.5l-0.26,0.22l0.94,1.11c-0.76,0.35 -1.84,0.74 -2.58,0.74c-3.01,0 -5.44,-2.43 -5.44,-5.44c0,-3.01 2.43,-5.44 5.44,-5.44z';

// const USER_PATH =
//   'M6.667 1.511q5.278 -0.455 4.356 4.8 -0.438 1.41 -1.422 2.489 -0.456 1.592 1.156 2.044a12.16 12.16 0 0 1 2.667 1.067q1.08 0.96 0.889 2.4h-12.8q-0.191 -1.44 0.889 -2.4a12.16 12.16 0 0 1 2.667 -1.067q1.612 -0.452 1.156 -2.044 -2.247 -2.473 -1.244 -5.689 0.641 -1.042 1.689 -1.6';

// Props

interface MenuElementProps {
  action: MenuActions;
  items: Item[];
  color?: Color;
  scale?: number;
  className?: string;
}

const paths: Record<MenuActions, string> = {
  [MenuActions.PLAY]: RACKET_PATH,
  [MenuActions.HOME]: HOUSE_PATH,
  [MenuActions.STATS]: PIE_PATH,
};

const dropdownStyle = 'shadow-[0_10px_10px_1px_rgba(255,255,255,0.4)] border-white-400/70';

const fadeTransition = {
  duration: 0.3,
  ease: 'easeInOut',
} as const;

const MenuElement = ({ action, items, scale = 1, className = '', ...props }: MenuElementProps) => {
  const [isHovered, setIsHovered] = useState(false);

  const progress = useMotionValue(0);
  const { t } = useTranslation();
  const titles: Record<MenuActions, string> = {
    [MenuActions.PLAY]: t('navbar.play'),
    [MenuActions.HOME]: t('navbar.home'),
    [MenuActions.STATS]: t('navbar.stats'),
  };
  const title = titles[action];
  const targetPath = paths[action];
  const pathD = useTransform(progress, [0, 1], [HALO_PATH, targetPath], {
    mixer: (a: Shape, b: Shape) => interpolate(a, b, { maxSegmentLength: 0.1 }),
  });
  useEffect(() => {
    const controls = animate(progress, isHovered ? 1 : 0, {
      duration: 0.8,
      ease: 'easeInOut', // or [0.4, 0, 0.2, 1]
    });
    return controls.stop;
  }, [isHovered, targetPath]); //

  return (
    <motion.div
      className={`relative flex flex-col items-center justify-center mx-4 group cursor-pointer ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...props}
    >
      <div className="relative w-20 h-20 flex items-center justify-center">
        <motion.div
          animate={{
            opacity: isHovered ? 0 : 0.5,
            scale: isHovered ? 0.5 : 1.3,
            filter: isHovered ? 'blur(0px)' : 'blur(8px)',
          }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          className="absolute inset-0 rounded-full bg-white"
          style={{
            // Le dégradé radial est mathématiquement circulaire, pas de coins carrés
            background:
              'radial-gradient(circle, rgba(255,255,255,0.9) 60%, rgba(255,255,255,0.5) 20%, rgba(255,255,255,0) 70%)',
          }}
        />

        <svg viewBox="0 0 16 16" className="w-full h-full z-10" style={{ overflow: 'visible' }}>
          <motion.path
            d={pathD}
            initial={{}}
            animate={{
              fill: isHovered ? '#ffffff' : 'rgba(255,255,255,0)',
              stroke: isHovered ? 'rgba(255,255,255,0)' : '#ffffff',
              strokeWidth: isHovered ? 0 : 0.5,
              scale: isHovered ? scale : 1,
            }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
            fillRule="evenodd"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ transformOrigin: '50%' }}
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
            <div className="absolute top-0 left-0 w-full bg-linear-to-r from-transparent via-white/10 to-transparent" />
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
    </motion.div>
  );
};

export default MenuElement;
