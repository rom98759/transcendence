import { Navigate, Route, Routes } from 'react-router-dom';
import { ProfilePage } from './pages/ProfilePage';
import { useAuth } from './components/helpers/AuthProvider';

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
        <Route path="/" element={<ProfilePage />}></Route>
        <Route path="/me" element={<MeRedirect />}></Route>
        <Route path="/profile/:username" element={<ProfilePage />}></Route>
      </Routes>
    </main>
  );
};
