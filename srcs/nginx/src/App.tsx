import { Navigate, Route, Routes } from 'react-router-dom';
import { ProfilePage } from './pages/ProfilePage';
import { LoginPage } from './pages/LoginRegisterPage';
import { useAuth } from './providers/AuthProvider';
import { AnimationPage } from './pages/AnimationPage';

const GuestRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoggedIn } = useAuth();
  if (user && isLoggedIn) {
    return <Navigate to={`/profile/${user.username}`} replace />;
  }
  return children;
};

const MeRedirect = () => {
  const { user } = useAuth();
  // if (isLoading) return <div>Loading ...</div>;
  if (!user) return <Navigate to="/" replace />;
  return <Navigate to={`/profile/${user.username}`}></Navigate>;
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
      </Routes>
    </main>
  );
};
