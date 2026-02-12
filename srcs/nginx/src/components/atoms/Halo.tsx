import { useState } from 'react';
import { RegisterForm } from '../organisms/RegisterForm';
import { LoginForm } from '../organisms/LoginForm';
import Circle from './Circle';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../providers/AuthProvider';

interface HaloProps {
  isRegister: boolean;
  className?: string;
  size?: number;
  onToggleForm: () => void; // Add this line
}
const Halo = ({ className = '', size = 80, isRegister, onToggleForm }: HaloProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const { isLoggedIn } = useAuth();
  const { t } = useTranslation();
  const title = isRegister ? t('auth.signup') : t('auth.login');

  return (
    <div
      className={`absolute ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Circle size={isHovered ? (isLoggedIn ? 40 : size) : 30} className="cursor-pointer p-8">
        {/* PLAY text */}
        <span className={`text-5xl font-bold ${isHovered ? 'hidden' : 'block'}`}>PLAY</span>

        {/* Forms */}
        <div className={`min-h-[100px] ${isHovered ? 'block' : 'hidden'}`}>
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
export default Halo;
