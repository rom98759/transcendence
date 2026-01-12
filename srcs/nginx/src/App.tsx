import { Navigate, Route, Routes } from 'react-router-dom';
import { ProfilePage } from './pages/ProfilePage';

export const App = () => {
  return (
    <main className="min-h-screen bd-slate-950 text-slate-100">
      <Routes>
        <Route path="/me" element={<ProfilePage />}></Route>
        <Route path="/" element={<Navigate to="/" replace />}></Route>
      </Routes>
      <ProfilePage></ProfilePage>
    </main>
  );
};
