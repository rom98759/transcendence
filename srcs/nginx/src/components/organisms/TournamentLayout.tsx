import { Outlet } from 'react-router-dom';
import Background from '../atoms/Background';
import { NavBar } from '../molecules/NavBar';
import { Player } from '../../types/types';
import { FriendsList } from '../molecules/FriendsList';

const colors = {
  start: '#00ff9f',
  end: '#0088ff',
};

/*This component is the architecture of all tournament pages.*/
export default function TournamentLayout() {
  const MOCK_PLAYERS: [Player, Player, Player, Player] = [
    { id: '1', name: 'johnny', avatar: null, online: true, status: 'connected' },
    { id: '2', name: 'eddy', avatar: null, online: false, status: 'connected' },
    { id: '3', name: 'khaled', avatar: null, online: true, status: 'connected' },
    { id: '4', name: 'danny', avatar: null, online: false, status: 'connected' },
  ] as const;
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
        <div className="flex min-h-screen justify-center">
          {MOCK_PLAYERS.length > 0 && <FriendsList friends={MOCK_PLAYERS} />}

          <Outlet />
        </div>
      </Background>
    </div>
  );
}
