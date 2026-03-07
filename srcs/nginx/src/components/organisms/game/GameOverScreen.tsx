// ============================================================================
// GameOverScreen — Écran de fin de partie :
//   ScoreNavbar → bouton Quitter → GameOverCard (winner / score / action)
//
// Le bouton d'action varie selon le mode :
//   - tournament  → "Match suivant" ou "Voir résultats"
//   - local / ai / remote → "Rejouer"
// ============================================================================

import { useTranslation } from 'react-i18next';
import GameStatusBar from '../GameStatusBar';
import Button from '../../atoms/Button';
import type { GameMode, PlayerRole, Scores } from '../../../types/game.types';

// ── Types ────────────────────────────────────────────────────────────────────

interface GameOverScreenProps {
  /** Côté gagnant (gauche ou droite) */
  winner: 'left' | 'right';
  scores: Scores;
  gameMode: GameMode;
  labelLeft: string;
  labelRight: string;
  /** Rôle local — utile en mode AI pour différencier humain / IA */
  localRole?: PlayerRole | null;
  isForfeit?: boolean;

  // Callbacks
  onPlayAgain: () => void;
  /** Si fourni (tournament uniquement), affiche "Match suivant" */
  onNextMatch?: () => void;
  /** Action explicite "Voir les résultats" en mode tournoi */
  onViewResults?: () => void;
  /** Affiche un état intermédiaire pendant la résolution du prochain match */
  isTournamentProgressLoading?: boolean;
  onExit: () => void;
}

// ── Composant ────────────────────────────────────────────────────────────────

const GameOverScreen = ({
  winner,
  scores,
  gameMode,
  labelLeft,
  labelRight,
  localRole = null,
  isForfeit = false,
  onPlayAgain,
  onNextMatch,
  onViewResults,
  isTournamentProgressLoading = false,
  onExit,
}: GameOverScreenProps) => {
  const { t } = useTranslation('common');

  const winnerName = winner === 'left' ? labelLeft : labelRight;
  const loserName = winner === 'left' ? labelRight : labelLeft;

  // ── Libellé gagnant ────────────────────────────────────────────────────────
  const resolveWinnerLabel = (): string => {
    if (isForfeit) return t('game.winner.forfeit');
    if (gameMode === 'ai') {
      const humanSide = localRole === 'A' ? 'left' : 'right';
      return winner === humanSide ? t('game.winner.you_win') : t('game.winner.ai_wins');
    }
    return t('game.gameover.wins', {
      winner: winnerName,
      defaultValue: `Victoire de ${winnerName}`,
    });
  };

  const winnerColor = '#34d399';
  const loserColor = '#fb7185';

  // ── Bouton d'action selon le mode ──────────────────────────────────────────
  const renderActionButton = () => {
    if (gameMode === 'tournament') {
      if (isTournamentProgressLoading) {
        return (
          <p className="text-gray-300 font-mono text-sm animate-pulse text-center">
            {t('game.gameover.resolving_next_match', 'Analyse du prochain match...')}
          </p>
        );
      }

      if (onNextMatch) {
        return (
          <Button id="next-match-btn" variant="primary" type="button" onClick={onNextMatch}>
            {t('game.gameover.next_match', 'Match suivant')}
          </Button>
        );
      }

      if (onViewResults) {
        return (
          <Button id="results-btn" variant="secondary" type="button" onClick={onViewResults}>
            {t('game.gameover.view_results', 'Voir les résultats')}
          </Button>
        );
      }

      return (
        <Button id="results-btn" variant="secondary" type="button" onClick={onExit}>
          {t('game.gameover.view_results', 'Voir les résultats')}
        </Button>
      );
    }

    return (
      <Button id="play-again-btn" variant="secondary" type="button" onClick={onPlayAgain}>
        {t('game.play_again')}
      </Button>
    );
  };

  return (
    <div className="w-full h-full flex flex-col flex-1 overflow-hidden md:max-w-8xl md:mx-auto">
      {/* ── Barre de scores (scores finaux) ── */}
      <GameStatusBar
        status="finished"
        sessionsData={null}
        scoreLeft={scores.left}
        scoreRight={scores.right}
        labelLeft={labelLeft}
        labelRight={labelRight}
      />

      {/* ── Bouton quitter (sous la navbar) ── */}
      <div className="flex justify-center pt-4">
        <Button id="exit-gameover-btn" variant="alert" type="button" onClick={onExit}>
          {t('game.exit')}
        </Button>
      </div>

      {/* ── Zone principale : carte Game Over ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-8">
        <div
          className="flex flex-col items-center gap-6 rounded-2xl px-16 py-12 border border-white/10"
          style={{ background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(8px)' }}
        >
          {/* Titre */}
          <p className="text-white/40 font-mono text-xs uppercase tracking-[0.3em]">
            {t('game.gameover.title', 'Résultat final')}
          </p>

          {/* Résultat (propre + explicite gagnant/perdant) */}
          <p className="text-4xl font-bold font-mono text-center" style={{ color: winnerColor }}>
            {resolveWinnerLabel()}
          </p>

          {!isForfeit && (
            <div className="flex flex-col items-center gap-1">
              <p className="font-mono text-base text-center" style={{ color: winnerColor }}>
                {t('game.gameover.winner_line', {
                  winner: winnerName,
                  defaultValue: `Gagnant : ${winnerName}`,
                })}
              </p>
              <p className="font-mono text-base text-center" style={{ color: loserColor }}>
                {t('game.gameover.loser_line', {
                  loser: loserName,
                  defaultValue: `Perdant : ${loserName}`,
                })}
              </p>
            </div>
          )}

          {/* Score */}
          <p className="text-slate-300 font-mono text-2xl tracking-widest">
            {scores.left}
            <span className="text-white/30 mx-3">—</span>
            {scores.right}
          </p>

          {/* Séparateur */}
          <div className="w-24 h-px bg-white/10" />

          {/* Bouton d'action */}
          {renderActionButton()}
        </div>
      </div>
    </div>
  );
};

export default GameOverScreen;
