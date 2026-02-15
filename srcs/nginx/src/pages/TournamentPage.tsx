import { useTranslation } from 'react-i18next';
import { TournamentBracket } from '../components/molecules/TournamentBracket';
import { Player } from '../types/types';

/* The principle of the tournament page:
 * The creator is displayed first, then the players join sequentially.
 * The three other slots are tournament participation slots;
 * they are initially initialized by this function,
 * and the "waiting" status corresponds to that slot.
 */
export function createWaitingPlayer(label: string): Player {
  return {
    id: 'waiting',
    name: label,
    avatar: null,
    online: false,
    status: 'waiting',
  };
}

export default function TournamentPage() {
  const { t } = useTranslation();
  const MOCK_PLAYERS: [Player, Player, Player, Player] = [
    { id: '1', name: 'johnny', avatar: null, online: true, status: 'connected' },
    { id: '2', name: 'eddy', avatar: null, online: false, status: 'connected' },
    { id: '3', name: 'khaled', avatar: null, online: true, status: 'connected' },
    createWaitingPlayer(t('game.waitiing')),
  ] as const;
  return <TournamentBracket players={MOCK_PLAYERS} />;
}
