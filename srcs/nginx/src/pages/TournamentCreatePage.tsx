import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

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
        // A remplacer par le vrai appel API
        const res = await fakeCreateTournament();

        navigate(`/tournaments/${res.id}`);
      } catch (err) {
        setError('Failed to create tournament');
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
        <div className="text-red-500 font-quantico">{error}</div>
      )}
    </div>
  );
}

/*
 *  Fake API simulation
 *  This function should be replaced by a proper call to the backend.
 */

async function fakeCreateTournament() {
  return new Promise<{ id: string }>((resolve) => {
    setTimeout(() => {
      resolve({ id: '42' });
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
