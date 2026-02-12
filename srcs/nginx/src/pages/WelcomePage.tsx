import { NavBar } from '../components/molecules/NavBar'; // Adjust path based on your folder structure
import Halo from '../components/atoms/Halo';
import { Link } from 'react-router-dom';
import Background from '../components/atoms/Background';
import { useTranslation } from 'react-i18next';
import { RegisterForm } from '../components/organisms/RegisterForm';
import { LoginForm } from '../components/organisms/LoginForm';
import { useState } from 'react';
import Circle from '../components/atoms/Circle';
import { CircleButton } from '../components/atoms/CircleButton';
import { useAuth } from '../providers/AuthProvider';
import Scrollable from '../components/atoms/Scrollable';

const colors = {
  start: '#00ff9f',
  end: '#0088ff',
};

interface LoginRegisterPageProps {
  isRegister: boolean;
}
export const WelcomePage = () => {
  const { t } = useTranslation();
  const [isRegister, setIsRegister] = useState(false);
  const { user, isLoggedIn } = useAuth();

  const ai = t('game.playWithAI');
  const tournament = t('game.tournament');
  const friends = t('game.playWithFriends');
  return (
    <div className={`w-full h-full relative`}>
      <Background
        grainIntensity={4}
        baseFrequency={0.28}
        colorStart={colors.start}
        colorEnd={colors.end}
      >
        <NavBar />
        {/* Not logged in - show login/register */}
        {!isLoggedIn && (
          <Halo
            size={80}
            isRegister={isRegister}
            onToggleForm={() => setIsRegister(!isRegister)}
            className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          />
        )}
        {/* Logged in - show 3 game options */}
        {isLoggedIn && (
          <Scrollable>
            <Link to="/game/pong-ai">
              <CircleButton isMoving={true}>{ai}</CircleButton>
            </Link>

            <Link to="/game/simple-game">
              <CircleButton isMoving={true}>{friends}</CircleButton>
            </Link>

            <Link to="/game/tournament">
              <CircleButton isMoving={true}>{tournament}</CircleButton>
            </Link>
          </Scrollable>
        )}
      </Background>
    </div>
  );
};
