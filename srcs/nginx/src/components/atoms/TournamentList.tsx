import { useTranslation } from 'react-i18next';

export type Tournament = {
  id: string;
  name: string;
  players: number;
  maxPlayers: number;
  status: 'WAITING' | 'IN_PROGRESS' | 'FINISHED';
  createdAt: string;
};

type tournamentsProps = {
  tournaments: Tournament[];
  onJoin: (id: string) => void;
};

const statusLabel: Record<Tournament['status'], string> = {
  WAITING: 'game.waiting',
  IN_PROGRESS: 'game.in_progress',
  FINISHED: 'finished',
};

const statusColor: Record<Tournament['status'], string> = {
  WAITING: 'text-emerald-600',
  IN_PROGRESS: 'text-amber-600',
  FINISHED: 'text-gray-500',
};

/* Version for computer screen
 * with a html table
 */
export function TournamentTableDesktop({ tournaments, onJoin }: tournamentsProps) {
  const { t } = useTranslation();
  return (
    <div className="w-[70%] max-w-5xl mx-auto my-12">
      <div className="bg-white/70 rounded-3xl shadow-2xl p-8 border border-cyan-300">
        <h2 className="text-2xl font-semibold text-center mb-6 text-gray-700 font-quantico">
          {t('game.tournament_available')}
        </h2>

        <div className="overflow-hidden rounded-2xl">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left text-sm text-gray-500 border-b">
                <th className="py-4 px-4">{t('game.name')}</th>
                <th className="py-4 px-4">{t('game.players')}</th>
                <th className="py-4 px-4">{t('game.status')}</th>
                <th className="py-4 px-4 text-right">{t('game.action')}</th>
              </tr>
            </thead>

            <tbody>
              {tournaments.map((tour) => (
                <tr key={tour.id} className="hover:bg-white/20 transition-colors">
                  <td className="py-4 px-4 font-medium text-gray-700">{tour.name}</td>

                  <td className="py-4 px-4 text-gray-600">
                    {tour.players} / {tour.maxPlayers}
                  </td>

                  <td className={`py-4 px-4 font-medium ${statusColor[tour.status]}`}>
                    {t(statusLabel[tour.status])}
                  </td>

                  <td className="py-4 px-4 text-right">
                    {tour.status === 'WAITING' ? (
                      <button
                        onClick={() => onJoin(tour.id)}
                        className="px-5 py-2 rounded-full bg-teal-500 text-white text-sm font-medium hover:bg-teal-600 hover:scale-105 active:scale-100 transition"
                      >
                        {t('game.join')}
                      </button>
                    ) : (
                      <span className="text-sm text-gray-400">{t('game.unavailable')}</span>
                    )}
                  </td>
                </tr>
              ))}

              {tournaments.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-gray-500">
                    {t('game.no_tournament')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
/* Version for mobile because table can't have a good small Version
 * here i use card
 * */
export function TournamentListMobile({ tournaments, onJoin }: tournamentsProps) {
  const { t } = useTranslation();
  return (
    <>
      {tournaments.map((tour) => (
        <div
          key={tour.id}
          className="bg-white/80 backdrop-blur rounded-2xl p-4 m-4 shadow flex flex-col gap-3"
        >
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-700">{tour.name}</span>
            <span className="text-sm text-gray-500">
              {tour.players} / {tour.maxPlayers}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span
              className={`font-medium ${
                tour.status === 'WAITING' ? 'text-emerald-600' : 'text-orange-500'
              }`}
            >
              {tour.status === 'WAITING' ? t('game.waiting') : t('game.in_progress')}
            </span>

            {tour.status === 'WAITING' ? (
              <button
                onClick={() => onJoin(tour.id)}
                className="px-4 py-2 rounded-full bg-teal-500 text-white text-sm"
              >
                {t('game.join')}
              </button>
            ) : (
              <span className="text-sm text-gray-400">{t('game.unavailable')}</span>
            )}
          </div>
        </div>
      ))}
    </>
  );
}
