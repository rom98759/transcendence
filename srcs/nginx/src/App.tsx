import { Navigate, Route, Routes } from 'react-router-dom';
import { ProfilePage } from './pages/ProfilePage';
import { LoginPage } from './pages/LoginRegisterPage';
import { useAuth } from './providers/AuthProvider';
import { AnimationPage } from './pages/AnimationPage';
import TournamentRoutes from './router/TournamentRoutes';
import { OAuthCallback } from './pages/OAuthCallback';

const GuestRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoggedIn, isAuthChecked } = useAuth();

  if (!isAuthChecked) {
    return null; // ou loader
  }

  if (isLoggedIn && user?.username) {
    return <Navigate to={`/profile/${user.username}`} replace />;
  }

  return children;
};
const MeRedirect = () => {
  const { user, isAuthChecked } = useAuth();

  if (!isAuthChecked) {
    return null; // ou loader
  }

  if (!user || !user.username) {
    return <Navigate to="/" replace />;
  }

  return <Navigate to={`/profile/${user.username}`} replace />;
};

export const App = () => {
  return (
    <main className="h-screen bd-slate-950 text-slate-100">
      <Routes>
        <Route path="/" element={<AnimationPage />}></Route>
        <Route
          path="/signup"
          element={
            <GuestRoute>
              <LoginPage isRegister={true} />
            </GuestRoute>
          }
        />
        <Route
          path="/login"
          element={
            <GuestRoute>
              <LoginPage isRegister={false} />
            </GuestRoute>
          }
        />
        <Route path="/me" element={<MeRedirect />}></Route>

        {/* Routes OAuth Callback - Publiques car appelées après authentification */}
        <Route path="/auth/oauth/google/callback" element={<OAuthCallback />} />
        <Route path="/auth/oauth/school42/callback" element={<OAuthCallback />} />

        <Route path="/profile/:username" element={<ProfilePage />}></Route>
        <Route path="/tournaments/*" element={<TournamentRoutes />} />
      </Routes>
    </main>
  );
};
