import { Routes, Route } from 'react-router-dom';
import TournamentLayout from '../components/organisms/TournamentLayout';
import TournamentHubPage from '../pages/TournamentHubPage';
import TournamentBracketPage from '../pages/TournamentBracketPage';
import TournamentResultsPage from '../pages/TournamentResultsPage';
import { TournamentGuard } from './TournamentGuard';

/*
 * Route structure :
 *   /tournaments            → Hub  (créer / rejoindre / liste)
 *   /tournaments/:id        → Bracket live (polling adaptatif)
 *   /tournaments/:id/results→ Résultats (podium + détails)
 *
 * TournamentGuard vérifie l'existence du tournoi pour :id et :id/results.
 */
export default function TournamentRoutes() {
  return (
    <Routes>
      <Route element={<TournamentLayout />}>
        <Route index element={<TournamentHubPage />} />
        <Route element={<TournamentGuard />}>
          <Route path=":id" element={<TournamentBracketPage />} />
          <Route path=":id/results" element={<TournamentResultsPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
