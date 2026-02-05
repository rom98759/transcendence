export type Tournament = {
  id: string;
  name: string;
  players: number;
  maxPlayers: number;
  status: 'WAITING' | 'IN_PROGRESS' | 'FINISHED';
  createdAt: string;
};

type Props = {
  tournaments: Tournament[];
  onJoin: (id: string) => void;
};

const statusLabel: Record<Tournament['status'], string> = {
  WAITING: 'En attente',
  IN_PROGRESS: 'En cours',
  FINISHED: 'Terminé',
};

const statusColor: Record<Tournament['status'], string> = {
  WAITING: 'text-emerald-600',
  IN_PROGRESS: 'text-amber-600',
  FINISHED: 'text-gray-500',
};

export function TournamentList({ tournaments, onJoin }: Props) {
  return (
    <div className="w-full max-w-5xl mx-auto mt-12">
      <div className="backdrop-blur-xl bg-white/70 rounded-3xl shadow-2xl p-8">
        <h2 className="text-2xl font-semibold text-center mb-6 text-gray-700">
          Tournois disponibles
        </h2>

        <div className="overflow-hidden rounded-2xl">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left text-sm text-gray-500 border-b">
                <th className="py-4 px-4">Nom</th>
                <th className="py-4 px-4">Joueurs</th>
                <th className="py-4 px-4">Statut</th>
                <th className="py-4 px-4 text-right">Action</th>
              </tr>
            </thead>

            <tbody>
              {tournaments.map((t) => (
                <tr key={t.id} className="hover:bg-white/60 transition-colors">
                  <td className="py-4 px-4 font-medium text-gray-700">{t.name}</td>

                  <td className="py-4 px-4 text-gray-600">
                    {t.players} / {t.maxPlayers}
                  </td>

                  <td className={`py-4 px-4 font-medium ${statusColor[t.status]}`}>
                    {statusLabel[t.status]}
                  </td>

                  <td className="py-4 px-4 text-right">
                    {t.status === 'WAITING' ? (
                      <button
                        onClick={() => onJoin(t.id)}
                        className="px-5 py-2 rounded-full bg-teal-500 text-white text-sm font-medium hover:bg-teal-600 transition"
                      >
                        Rejoindre
                      </button>
                    ) : (
                      <span className="text-sm text-gray-400">Indisponible</span>
                    )}
                  </td>
                </tr>
              ))}

              {tournaments.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-gray-500">
                    Aucun tournoi disponible
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
