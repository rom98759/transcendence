import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { NavBar } from '../../molecules/NavBar';
import Button from '../../atoms/Button';

export interface TournamentHistoryMatch {
  id: number;
  tournament_id: number | null;
  round: string;
  player1?: number | null;
  player2?: number | null;
  score_player1: number | null;
  score_player2: number | null;
  winner_id: number | null;
  created_at: number;
  username_player1: string | null;
  username_player2: string | null;
  username_winner: string | null;
}

interface TournamentResultsScreenProps {
  tournamentId: string | null;
  matches: TournamentHistoryMatch[];
  error: string | null;
  onExit: () => void;
  /** Hide the built-in NavBar (set true when rendered inside a layout that already has one). */
  hideNavBar?: boolean;
}

const ROUND_KEYS: Record<string, string> = {
  SEMI_1: 'game.rounds.semi_1',
  SEMI_2: 'game.rounds.semi_2',
  LITTLE_FINAL: 'game.rounds.little_final',
  FINAL: 'game.rounds.final',
};

function resolveLoserName(match: TournamentHistoryMatch): string {
  if (!match.username_winner) return '-';
  if (match.username_player1 === match.username_winner) return match.username_player2 ?? '-';
  if (match.username_player2 === match.username_winner) return match.username_player1 ?? '-';
  return '-';
}

const TournamentResultsScreen = ({
  tournamentId,
  matches,
  error,
  onExit,
  hideNavBar = false,
}: TournamentResultsScreenProps) => {
  const { t } = useTranslation('common');

  const podium = useMemo(() => {
    const finalMatch = matches.find((match) => match.round === 'FINAL');
    const littleFinalMatch = matches.find((match) => match.round === 'LITTLE_FINAL');

    return {
      first: finalMatch?.username_winner ?? null,
      second: finalMatch ? resolveLoserName(finalMatch) : null,
      third: littleFinalMatch?.username_winner ?? null,
      fourth: littleFinalMatch ? resolveLoserName(littleFinalMatch) : null,
    };
  }, [matches]);

  return (
    <div className="w-full h-full flex flex-col">
      {!hideNavBar && (
        <div className="sticky top-0 z-50 w-full">
          <NavBar />
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 py-8 md:px-10">
        <div className="mx-auto w-full max-w-5xl flex flex-col gap-6">
          <section className="rounded-2xl border border-white/15 bg-slate-950/75 p-6">
            <div className="flex flex-col gap-2">
              <p className="text-white/50 font-mono text-xs uppercase tracking-[0.2em]">
                {t('game.tournament_results.title')}
              </p>
              <h2 className="text-white font-mono text-xl md:text-2xl">
                {t('game.tournament_results.tournament_id')} #{tournamentId ?? '-'}
              </h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
              <div className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 p-3">
                <p className="text-emerald-300 text-xs font-mono uppercase tracking-wider">1</p>
                <p className="text-white font-mono text-sm mt-1">{podium.first ?? '-'}</p>
              </div>
              <div className="rounded-lg border border-slate-300/30 bg-slate-200/10 p-3">
                <p className="text-slate-200 text-xs font-mono uppercase tracking-wider">2</p>
                <p className="text-white font-mono text-sm mt-1">{podium.second ?? '-'}</p>
              </div>
              <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-3">
                <p className="text-amber-300 text-xs font-mono uppercase tracking-wider">3</p>
                <p className="text-white font-mono text-sm mt-1">{podium.third ?? '-'}</p>
              </div>
              <div className="rounded-lg border border-white/20 bg-white/5 p-3">
                <p className="text-gray-300 text-xs font-mono uppercase tracking-wider">4</p>
                <p className="text-white font-mono text-sm mt-1">{podium.fourth ?? '-'}</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/15 bg-slate-950/75 p-6">
            <p className="text-white/70 font-mono text-sm uppercase tracking-wider mb-4">
              {t('game.tournament_results.match_details')}
            </p>

            {error && <p className="text-red-300 font-mono text-xs mb-4">{error}</p>}

            {!error && matches.length === 0 && (
              <p className="text-gray-400 font-mono text-xs">
                {t('game.tournament_results.no_results')}
              </p>
            )}

            <div className="flex flex-col gap-3">
              {matches.map((match) => (
                <div
                  key={match.id}
                  className="rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 flex flex-col gap-2"
                >
                  <p className="text-cyan-300 font-mono text-xs uppercase tracking-wider">
                    {t(ROUND_KEYS[match.round] ?? `game.rounds.${match.round.toLowerCase()}`)}
                  </p>

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-white font-mono text-sm">
                      {match.username_player1 ?? '-'}
                    </span>
                    <span className="text-slate-200 font-mono text-sm">
                      {match.score_player1 ?? 0}
                      <span className="mx-2 text-white/40">-</span>
                      {match.score_player2 ?? 0}
                    </span>
                    <span className="text-white font-mono text-sm text-right">
                      {match.username_player2 ?? '-'}
                    </span>
                  </div>

                  <p className="text-emerald-300 font-mono text-xs">
                    {t('game.tournament_results.winner')}: {match.username_winner ?? '-'}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-center gap-3 pb-4">
            <Button id="exit-results-btn" variant="alert" type="button" onClick={onExit}>
              {t('game.exit')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TournamentResultsScreen;
