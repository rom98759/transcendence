import { CircleButton } from '../components/atoms/CircleButton';
import { Page } from '../components/organisms/PageContainer';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import {
  TournamentTableDesktop,
  TournamentListMobile,
  Tournament,
} from '../components/atoms/TournamentList';
import { TournamentBracket } from '../components/molecules/TournamentBracket';
import { Player } from '../types/types';
import Background from '../components/atoms/Background';
import Circle from '../components/atoms/Circle';
import { NavBar } from '../components/molecules/NavBar';

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
  { id: '1', name: 'johnny', avatar: null, online: true },
  { id: '2', name: 'eddy', avatar: null, online: false },
  { id: '3', name: 'khaled', avatar: null, online: true },
  { id: '4', name: 'danny', avatar: null, online: false },
] as const;

// const login = async () => {};
const colors = {
  start: '#00ff9f',
  end: '#0088ff',
};

export const TournamentPage = () => {
  // const [currentUser, formAction, isPending] = useActionState(login, {});
  const { t } = useTranslation();
  const title = t('game.tournament').toUpperCase();
  const participate = t('game.participate');
  const create = t('game.create');
  return (
    <div className={`w-full relative flex flex-col flex min-h-screen`}>
      <Background
        grainIntensity={4}
        baseFrequency={0.28}
        colorStart={colors.start}
        colorEnd={colors.end}
      >
        {
          <div className="sticky top-0 z-20">
            <NavBar></NavBar>
          </div>
        }
        <div className=" flex flex-1 items-center justify-center">
          <div className="flex flex-col sm:flex-row gap-4">
            <CircleButton>{participate}</CircleButton>
            <CircleButton>{create}</CircleButton>
          </div>
        </div>
        <TournamentBracket players={MOCK_PLAYERS} />
        {/* Desktop */}
        <div className="hidden md:block">
          <TournamentTableDesktop
            tournaments={MOCK_TOURNAMENTS}
            onJoin={(id) => console.log('Join tournament', id)}
          />
        </div>

        {/* Mobile */}
        <div className="md:hidden space-y-4">
          <TournamentListMobile
            tournaments={MOCK_TOURNAMENTS}
            onJoin={(id) => console.log('Join tournament', id)}
          />
        </div>
      </Background>
    </div>
  );
};
