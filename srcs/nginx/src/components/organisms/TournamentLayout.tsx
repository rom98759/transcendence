import { Outlet } from 'react-router-dom';
import Background from '../atoms/Background';
import { NavBar } from '../molecules/NavBar';
import { Footer } from '../molecules/Footer';

const colors = {
  start: '#00ff9f',
  end: '#0088ff',
};

/*This component is the architecture of all tournament pages.*/
export default function TournamentLayout() {
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
          <Outlet />
        </div>
        <Footer className="absolute bottom-0 w-full" />
      </Background>
    </div>
  );
}
