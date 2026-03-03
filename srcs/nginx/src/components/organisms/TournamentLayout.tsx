import { Outlet } from 'react-router-dom';

/**
 * TournamentLayout — Wrapper pour les pages de tournoi.
 *
 * Le layout global (Background, NavBar, Footer) est fourni par AppLayout.
 * Ce composant ne gère que la disposition interne des pages tournoi.
 */
export default function TournamentLayout() {
  return (
    <div className="flex flex-1 w-full justify-center">
      <Outlet />
    </div>
  );
}
