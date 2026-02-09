import { CircleButton } from '../components/atoms/CircleButton';
import { Page } from '../components/organisms/PageContainer';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { TournamentList, Tournament } from '../components/atoms/TournamentList';
import { TournamentBracket } from '../components/molecules/TournamentBracket';
import { Player } from '../types/types';

const MOCK_TOURNAMENTS: Tournament[] = [
  {
    id: '1',
    name: 'Spin Cup #42',
    players: 2,
    maxPlayers: 4,
    status: 'WAITING',
    createdAt: '2026-02-01',
  },
  {
    id: '2',
    name: 'Weekly Pong',
    players: 4,
    maxPlayers: 4,
    status: 'IN_PROGRESS',
    createdAt: '2026-02-03',
  },
];
interface LoginRegisterPageProps {
  isRegister: boolean;
}

const MOCK_PLAYERS: [Player, Player, Player, Player] = [
  { id: '1', name: 'johnny', avatar: null },
  { id: '2', name: 'eddy', avatar: null },
  { id: '3', name: 'khaled', avatar: null },
  { id: '4', name: 'danny', avatar: null },
] as const;

// const login = async () => {};

export const TournamentPage = () => {
  // const [currentUser, formAction, isPending] = useActionState(login, {});
  const { t } = useTranslation();
  const title = t('game.tournament').toUpperCase();
  const participate = t('game.participate');
  const create = t('game.create');
  return (
    <Page className="flex flex-col min-h-screen" title={title}>
      <div className=" flex flex-1 items-center justify-center">
        <div className="flex flex-col sm:flex-row gap-4">
          <CircleButton>{participate}</CircleButton>
          <CircleButton>{create}</CircleButton>
        </div>
      </div>
      <TournamentList
        tournaments={MOCK_TOURNAMENTS}
        onJoin={(id) => console.log('Join tournament', id)}
      />
      <TournamentBracket players={MOCK_PLAYERS} />
    </Page>
  );
};
