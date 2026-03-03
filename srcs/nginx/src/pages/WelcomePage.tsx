import WelcomeHalo from '../components/atoms/welcome/WelcomeHalo';
import { useState } from 'react';

interface WelcomePageProps {
  defaultMode?: 'login' | 'register';
}

/**
 * WelcomePage — Page d'authentification (login / register).
 *
 * Protégée par PublicRoute : seuls les utilisateurs NON connectés y accèdent.
 * Layout (Background + NavBar) fourni par AuthLayout.
 */
export const WelcomePage = ({ defaultMode = 'login' }: WelcomePageProps) => {
  const [isRegister, setIsRegister] = useState(defaultMode === 'register');

  return (
    <WelcomeHalo
      size={80}
      isRegister={isRegister}
      onToggleForm={() => setIsRegister(!isRegister)}
    />
  );
};
