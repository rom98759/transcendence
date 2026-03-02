import { useState } from 'react';
import { WelcomeRegisterForm } from '../../organisms/welcome/WelcomeRegisterForm';
import { WelcomeLoginForm } from '../../organisms/welcome/WelcomeLoginForm';
import WelcomeCircle from './WelcomeCircle';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../providers/AuthProvider';

interface WelcomeHaloProps {
  isRegister: boolean;
  size?: number;
  onToggleForm: () => void;
}

/**
 * WelcomeHalo - Halo lumineux spécifique à WelcomePage
 * Design: Atome avec orbites électroniques, gradient cyan/bleu
 */
const WelcomeHalo = ({ size = 92, isRegister, onToggleForm }: WelcomeHaloProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const { isLoggedIn } = useAuth();
  const { t } = useTranslation();
  const title = isRegister ? t('auth.signup') : t('auth.login');

  const handleLock = () => {
    if (!isLocked) {
      setIsLocked(true);
      setIsHovered(true);
    }
  };

  return (
    <div
      className={`w-[95vw] max-w-2xl lg:w-auto transition-all duration-500 ${isHovered ? 'mt-20' : 'mt-0'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        if (!isLocked) setIsHovered(false);
      }}
      onClick={handleLock}
      onKeyDown={handleLock}
    >
      <WelcomeCircle
        size={isHovered ? (isLoggedIn ? 40 : isRegister ? size + 6 : size) : 32}
        className="cursor-pointer group hover:shadow-[0_8px_40px_rgba(0,255,159,0.25),0_0_120px_rgba(0,136,255,0.15)]"
      >
        {/* PLAY text initial - Style atome */}
        <div
          className={`transition-all duration-500 ${isHovered ? 'opacity-0 scale-90 absolute invisible' : 'opacity-100 scale-100 block visible'}`}
        >
          <span className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#00ff9f] to-[#0088ff] bg-clip-text text-transparent drop-shadow-lg">
            PLAY
          </span>
        </div>

        {/* Forms */}
        <div
          className={`transition-all duration-500 w-full ${isHovered ? 'opacity-100 scale-100 block visible' : 'opacity-0 scale-90 absolute invisible'}`}
        >
          <h1 className="-mt-3 sm:-mt-4 text-xl sm:text-2xl font-bold mb-4 sm:mb-5 text-gray-900">
            {title}
          </h1>
          <div className="w-full space-y-1">
            {isRegister ? (
              <WelcomeRegisterForm onToggleForm={onToggleForm} />
            ) : (
              <WelcomeLoginForm onToggleForm={onToggleForm} />
            )}
          </div>
        </div>
      </WelcomeCircle>
    </div>
  );
};

export default WelcomeHalo;
