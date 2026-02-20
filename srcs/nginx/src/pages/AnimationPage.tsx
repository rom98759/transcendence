import { useAuth } from '../providers/AuthProvider';
import AnimatedLogo from '../components/atoms/AnimatedLogo';
import Background from '../components/atoms/Background';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface AnimationPageProps {
  className?: string;
}

const colors = {
  start: '#00ff9f',
  end: '#0088ff',
};

export const AnimationPage = ({ className = '' }: AnimationPageProps) => {
  const { hasSeenAnim, markAnimAsSeen } = useAuth();
  const [animDone, setAnimDone] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (hasSeenAnim) {
      navigate(`/welcome`);
    }
  }, [hasSeenAnim, navigate]);

  useEffect(() => {
    if (animDone) {
      markAnimAsSeen();
      navigate(`/welcome`);
    }
  }, [animDone, navigate, markAnimAsSeen]);

  const handleComplete = () => {
    setAnimDone(true);
  };

  return (
    <div className={`w-full h-full relative ${className}`}>
      <Background
        grainIntensity={4}
        baseFrequency={0.28}
        colorStart={colors.start}
        colorEnd={colors.end}
      >
        <AnimatedLogo className="w-[100]" duration={5000} onComplete={handleComplete} />
      </Background>
    </div>
  );
};
