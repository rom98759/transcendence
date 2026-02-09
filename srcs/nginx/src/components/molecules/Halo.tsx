import { useState } from 'react';
import { RegisterForm } from '../organisms/RegisterForm';
import { LoginForm } from '../organisms/LoginForm';
import Circle from '../atoms/Circle';
import { useTranslation } from 'react-i18next';

interface HaloProps {
  isRegister: boolean;
  className?: string;
  size?: number;
  onToggleForm: () => void; // Add this line
}
const Halo = ({ className = '', size = 80, isRegister, onToggleForm }: HaloProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const { t } = useTranslation();
  const title = isRegister ? t('auth.signup') : t('auth.login');

  return (
    <div
      className={`absolute ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Circle size={size} className="cursor-pointer">
        {/* PLAY text */}
        <span className={`text-2xl font-bold ${isHovered ? 'hidden' : 'block'}`}>PLAY</span>

        {/* Forms */}
        <div className={isHovered ? 'block p-8' : 'hidden'}>
          {isRegister ? (
            <RegisterForm onToggleForm={onToggleForm} />
          ) : (
            <LoginForm onToggleForm={onToggleForm} />
          )}
        </div>
      </Circle>
    </div>
  );
};
// const Halo = ({ className = '', size = 120, isRegister, onToggleForm }: HaloProps) => {
//   const [isHovered, setIsHovered] = useState(false);
//   const { t } = useTranslation();
//   const title = isRegister ? t('auth.signup') : t('auth.login');
//
//   return (
//     <div
//       className={`absolute ${className}`}
//       onMouseEnter={() => setIsHovered(true)}
//       onMouseLeave={() => setIsHovered(false)}
//     >
//       <Circle size={50} className="cursor-pointer">
//         {/* PLAY text - hide when hovered */}
//         <span
//           className={`text-2xl font-bold transition-opacity ${
//             isHovered ? 'opacity-0 absolute invisible' : 'opacity-100'
//           }`}
//         >
//           PLAY
//         </span>
//
//         {/* Forms - always rendered, just hidden */}
//         <div className={`transition-opacity ${
//           !isHovered ? 'opacity-0 absolute invisible' : 'opacity-100'
//         }`}>
//           {isRegister ? (
//             <RegisterForm onToggleForm={onToggleForm} />
//           ) : (
//             <LoginForm onToggleForm={onToggleForm} />
//           )}
//         </div>
//       </Circle>
//     </div>
//   );
// };
export default Halo;
// const Halo = ({ className = '', size = 120, isRegister, onToggleForm }: HaloProps) => {
//   const [isHovered, setIsHovered] = useState(false);
//
//   const { t } = useTranslation();
//   const title = isRegister ? t('auth.signup') : t('auth.login');
//   return (
//     <div
//       className={`relative ${className}`}
//       onMouseEnter={() => setIsHovered(true)}
//       onMouseLeave={() => setIsHovered(false)}
//     >
//       <Circle size={50} className="cursor-pointer">
//         {!isHovered ? (
//           <span className="text-2xl font-bold">PLAY</span>
//         ) : isRegister ? (
//           <RegisterForm onToggleForm={onToggleForm} />
//         ) : (
//           <LoginForm onToggleForm={onToggleForm} />
//         )}
//       </Circle>
//     </div>
//   );
// };
//
// export default Halo;
