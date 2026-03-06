import { Route, Routes } from 'react-router-dom';
import { MyProfilePage } from './pages/MyProfilePage';
import { ProfilePage } from './pages/ProfilePage';
import { GamePage } from './pages/GamePage';
import { AnimationPage } from './pages/AnimationPage';
import { FriendsPage } from './pages/FriendsPage';
import { WelcomePage } from './pages/WelcomePage';
import { HomePage } from './pages/HomePage';
import { OAuthCallback } from './pages/OAuthCallback';
import { NotFoundPage } from './pages/NotFoundPage';
import { TwoFactorPage } from './pages/TwoFactorPage';
import TournamentRoutes from './router/TournamentRoutes';
import { PrivateRoute } from './router/PrivateRoute';
import { PublicRoute } from './router/PublicRoute';
import { TwoFactorRoute } from './router/TwoFactorRoute';
import { StatsPage } from './pages/StatsPage';
import { HistoryPage } from './pages/HistoryPage';
import TournamentLayout from './components/organisms/TournamentLayout';
import TosPage from './pages/TosPage';
import PrivacyPage from './pages/PrivacyPage';
import { FAQPage } from './pages/FAQPage';

export const App = () => {
  return (
    <main className="h-screen bg-slate-950 text-slate-100">
      <Routes>
        {/* Route publique sans guard — animation d'intro */}
        <Route path="/" element={<AnimationPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/tos" element={<TosPage />} />

        {/* Routes réservées aux non-authentifiés */}
        <Route element={<PublicRoute />}>
          <Route path="/welcome" element={<WelcomePage />} />
          <Route path="/login" element={<WelcomePage />} />
          <Route path="/register" element={<WelcomePage defaultMode="register" />} />
          <Route path="/auth/oauth/:provider/callback" element={<OAuthCallback />} />
        </Route>

        {/* Route 2FA */}
        <Route element={<TwoFactorRoute />}>
          <Route path="/2fa" element={<TwoFactorPage />} />
        </Route>

        {/* Routes protégées */}
        <Route element={<PrivateRoute />}>
          <Route path="/home" element={<HomePage />} />

          <Route path="/game/remote" element={<GamePage sessionId={null} gameMode="remote" />} />
          <Route path="/game/local" element={<GamePage sessionId={null} gameMode="local" />} />
          <Route path="/game/pong-ai" element={<GamePage sessionId={null} gameMode="ai" />} />
          <Route
            path="/game/tournament/:tournamentId"
            element={<GamePage sessionId={null} gameMode="tournament" />}
          />
          <Route path="/game" element={<GamePage sessionId={null} gameMode="remote" />} />

          <Route path="/me" element={<MyProfilePage />} />
          <Route path="/friends" element={<FriendsPage />} />
          <Route path="/profile/:username" element={<ProfilePage />} />
          <Route path="/tournaments/*" element={<TournamentRoutes />} />
          <Route element={<TournamentLayout />}>
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/history" element={<HistoryPage />} />
          </Route>
        </Route>

        {/* FAQ — accessible à tous, connecté ou non */}
        <Route path="/faq" element={<FAQPage />} />

        {/* Catch-all — toute URL non reconnue */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </main>
  );
};
