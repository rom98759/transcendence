import { Navigate, Route, Routes } from 'react-router-dom';
import { ProfilePage } from './pages/ProfilePage';
import { LoginPage } from './pages/LoginRegisterPage';
import { useAuth } from './providers/AuthProvider';
import { AnimationPage } from './pages/AnimationPage';
import TournamentRoutes from './router/TournamentRoutes';
import { TwoFactorVerifyPage } from './pages/TwoFactorVerifyPage';
import { TwoFactorSetupPage } from './pages/TwoFactorSetupPage';
import { TwoFactorDisablePage } from './pages/TwoFactorDisablePage';

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

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isLoggedIn, isAuthChecked } = useAuth();

  if (!isAuthChecked) {
    return null; // ou loader
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
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
        <Route path="/profile/:username" element={<ProfilePage />}></Route>

        {/* Routes 2FA */}
        <Route path="/2fa/verify" element={<TwoFactorVerifyPage />} />
        <Route
          path="/2fa/setup"
          element={
            <ProtectedRoute>
              <TwoFactorSetupPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/2fa/disable"
          element={
            <ProtectedRoute>
              <TwoFactorDisablePage />
            </ProtectedRoute>
          }
        />

        <Route path="/tournaments/*" element={<TournamentRoutes />} />
      </Routes>
    </main>
  );
};
