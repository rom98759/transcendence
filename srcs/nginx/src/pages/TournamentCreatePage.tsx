import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/api-client';

/* This component displays a loader until the tournament is created by the backend.
 * Use `useEffect` is used to redirect the user.
 */
export default function TournamentCreatePage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    async function createTournament() {
      try {
        const res = await creatingTournament();
        console.log(res.id);
        navigate(`/tournaments/${res.id}`);
      } catch (err) {
        setError(t('game.error.failed_create_tournament'));
      }
    }
    createTournament();
  }, [navigate]);

  return (
    <div className="flex flex-col items-center  mt-8 -gap-8">
      {!error ? (
        <>
          <SpinLoader />
          <p className="font-quantico text-lg text-white">{t('game.creating')}</p>
        </>
      ) : (
        <div className="text-red-500 font-quantico bg-white/70 rounded-full p-6">{error}</div>
      )}
    </div>
  );
}

/*
 *  fake loading creating time Tournament
 *  this function could be replaced or remove to call to the backend.
 */
async function creatingTournament() {
  const { data } = await api.post<number>(`/game/create-tournament`, {});

  return new Promise<{ id: number }>((resolve) => {
    setTimeout(() => {
      resolve({ id: data });
    }, 1500);
  });
}

/* Tailwindcss allows you to create animations very quickly and easily
 */
function SpinLoader() {
  return (
    <div className="relative w-24 h-24 ">
      {/* Outer animated ring */}
      <div className="absolute inset-0 rounded-full border-4 border-cyan-200 border-t-transparent animate-spin" />

      {/* Inner pulse */}
      <div className="absolute inset-6 rounded-full bg-cyan-400 animate-pulse" />

      {/* Glow effect */}
      <div className="absolute inset-0 rounded-full blur-xl bg-cyan-200 opacity-60" />
    </div>
  );
}
