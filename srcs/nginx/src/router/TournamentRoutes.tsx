import { Routes, Route } from 'react-router-dom';
import TournamentLayout from '../components/organisms/TournamentLayout';
import TournamentMenuPage from '../pages/TournamentMenuPage';
import TournamentsListPage from '../pages/TournamentsListPage';
import TournamentCreatePage from '../pages/TournamentCreatePage';
import TournamentPage from '../pages/TournamentPage';

/*
 * simplified page management with React Routes
 */
export default function TournamentRoutes() {
  return (
    <Routes>
      <Route element={<TournamentLayout />}>
        <Route index element={<TournamentMenuPage />} />
        <Route path="list" element={<TournamentsListPage />} />
        <Route path="create" element={<TournamentCreatePage />} />
        <Route path=":id" element={<TournamentPage />} />
      </Route>
    </Routes>
  );
}
