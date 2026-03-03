import { Outlet } from 'react-router-dom';
import Background from '../atoms/Background';
import { NavBar } from '../molecules/NavBar';
import { Footer } from '../molecules/Footer';

const colors = {
  start: '#00ff9f',
  end: '#0088ff',
};

/**
 * AppLayout — Layout principal partagé par toutes les pages authentifiées.
 *
 * Structure :
 *   ┌──────────────────────────────┐  ← h-full (= h-screen via <main> parent)
 *   │  NavBar          (shrink-0)  │
 *   ├──────────────────────────────┤
 *   │                              │
 *   │  <Outlet />      (flex-1)    │  ← SEUL point de scroll
 *   │  (overflow-y-auto)           │
 *   │                              │
 *   ├──────────────────────────────┤
 *   │  Footer          (shrink-0)  │
 *   └──────────────────────────────┘
 *
 * Garanties :
 * - Pas de scroll horizontal global
 * - NavBar et Footer toujours visibles
 * - Un seul scroll contrôlé dans la zone main
 */
export default function AppLayout() {
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
          <main className="flex-1 min-h-0 flex flex-col overflow-y-auto">
            <Outlet />
          </main>
          <div className="shrink-0">
            <Footer />
          </div>
        </div>
      </Background>
    </div>
  );
}
