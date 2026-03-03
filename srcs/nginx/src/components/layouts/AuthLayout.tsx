import { Outlet } from 'react-router-dom';
import Background from '../atoms/Background';
import { NavBar } from '../molecules/NavBar';

const colors = {
  start: '#00ff9f',
  end: '#0088ff',
};

/**
 * AuthLayout — Layout pour les pages d'authentification (login, register, 2FA).
 *
 * Structure : NavBar en haut, contenu centré verticalement, pas de Footer.
 * Utilisé par : WelcomePage, TwoFactorPage, OAuthCallback.
 */
export default function AuthLayout() {
  return (
    <div className="w-full h-full">
      <Background
        grainIntensity={4}
        baseFrequency={0.28}
        colorStart={colors.start}
        colorEnd={colors.end}
      >
        <div className="flex flex-col h-full overflow-hidden">
          <header className="shrink-0 z-20">
            <NavBar />
          </header>
          <main className="flex-1 min-h-0 flex items-center justify-center overflow-y-auto px-4 py-8">
            <Outlet />
          </main>
        </div>
      </Background>
    </div>
  );
}
