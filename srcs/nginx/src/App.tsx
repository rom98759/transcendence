import { Navigate, Route, Routes } from 'react-router-dom';
import { ProfilePage } from './pages/ProfilePage';
import { LoginPage } from './pages/LoginRegisterPage';
import { useAuth } from './providers/AuthProvider';

const MeRedirect = () => {
  const { user } = useAuth();
  // if (isLoading) return <div>Loading ...</div>;
  if (!user) return <Navigate to="/" replace />;
  return <Navigate to={`/profile/${user.username}`}></Navigate>;
};

export const App = () => {
  return (
    <main className="min-h-screen bd-slate-950 text-slate-100">
      <Routes>
        <Route path="/" element={<LoginPage isRegister={false} />}></Route>
        <Route path="/signup" element={<LoginPage isRegister={true} />}></Route>
        <Route path="/login" element={<LoginPage isRegister={false} />}></Route>
        <Route path="/me" element={<MeRedirect />}></Route>
        <Route path="/profile/:username" element={<ProfilePage />}></Route>
      </Routes>
    </main>
  );
};
