import Background from '../atoms/Background';
import Circle from '../atoms/Circle';
import { NavBar } from '../molecules/NavBar';

interface PageProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

const colors = {
  start: '#00ff9f',
  end: '#0088ff',
};

export const Page = ({ children, title, className }: PageProps) => {
  return (
    <div className={`w-full h-full relative ${className}`}>
      <Background
        grainIntensity={4}
        baseFrequency={0.28}
        colorStart={colors.start}
        colorEnd={colors.end}
      >
        {
          <div className="z-15 lg:absolute top-0 left-0 w-full lg-h-full">
            <NavBar></NavBar>
          </div>
        }
        <Circle>
          {title && <h1 className="mb-6 text-gray-600 font-quantico text-6xl">{title}</h1>}
          {children}
        </Circle>
      </Background>
    </div>
  );
};
