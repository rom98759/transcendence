import { NavBar } from '../components/molecules/NavBar';
import WelcomeHalo from '../components/atoms/welcome/WelcomeHalo';
import Background from '../components/atoms/Background';
import { useState } from 'react';

const colors = {
  start: '#00ff9f',
  end: '#0088ff',
};

interface WelcomePageProps {
  defaultMode?: 'login' | 'register';
}

/**
 * WelcomePage — Page d'authentification (login / register).
 *
 * Protégée par PublicRoute : seuls les utilisateurs NON connectés y accèdent.
 * Le contenu "game menu" (anciennement affiché ici quand auth) a été extrait
 * vers HomePage pour respecter le Single Responsibility Principle.
 */
export const WelcomePage = ({ defaultMode = 'login' }: WelcomePageProps) => {
  const [isRegister, setIsRegister] = useState(defaultMode === 'register');

  return (
    <div className="w-full h-full">
      <Background
        grainIntensity={4}
        baseFrequency={0.28}
        colorStart={colors.start}
        colorEnd={colors.end}
      >
        <div className="flex flex-col h-full w-full">
          <NavBar />
          <div className="flex-1 flex items-center justify-center px-4 py-8">
            <WelcomeHalo
              size={80}
              isRegister={isRegister}
              onToggleForm={() => setIsRegister(!isRegister)}
            />
          </div>
        </div>
      </Background>
    </div>
  );
};
