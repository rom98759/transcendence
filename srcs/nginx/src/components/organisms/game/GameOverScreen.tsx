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
  onExit,
}: GameOverScreenProps) => {
  const { t } = useTranslation('common');

  // ── Libellé gagnant ────────────────────────────────────────────────────────
  const resolveWinnerLabel = (): string => {
    if (isForfeit) return t('game.winner.forfeit');
    const winnerName = winner === 'left' ? labelLeft : labelRight;
    if (gameMode === 'ai') {
      const humanSide = localRole === 'A' ? 'left' : 'right';
      return winner === humanSide ? t('game.winner.you_win') : t('game.winner.ai_wins');
    }
    return `${winnerName} wins!`;
  };

  const winnerColor = winner === 'left' ? '#34d399' : '#fb7185';

  // ── Bouton d'action selon le mode ──────────────────────────────────────────
  const renderActionButton = () => {
    if (gameMode === 'tournament') {
      if (onNextMatch) {
        return (
          <Button id="next-match-btn" variant="primary" type="button" onClick={onNextMatch}>
            {t('game.gameover.next_match', 'Match suivant')}
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
            {t('game.gameover.title', 'Game Over')}
          </p>

          {/* Gagnant */}
          <p className="text-4xl font-bold font-mono text-center" style={{ color: winnerColor }}>
            {resolveWinnerLabel()}
          </p>

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
