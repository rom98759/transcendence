import { Navigate, Route, Routes } from 'react-router-dom';
import { NavBar } from './components/molecules/NavBar';
import { MePage } from './pages/MePage';

export const App = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <NavBar />
      <main className="min-h-screen bd-slate-950 text-slate-100">
        <Routes>
          <Route path="/me" element={<MePage />}></Route>
          <Route path="/" element={<Navigate to="/me" replace />}></Route>
        </Routes>
      </main>
    </div>
  );
};
