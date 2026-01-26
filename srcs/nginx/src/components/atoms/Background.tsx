interface BackgroundProps {
  children: React.ReactNode;
  colorStart: string;
  colorEnd: string;
  grainIntensity?: number;
  baseFrequency?: number;
  animated?: boolean;
  direction?: number;
}

const getGradientCoordinates = (hour: number) => {
  const angleDeg = hour * 30 - 90;
  const angleRad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  return {
    x1: `${(50 - cos * 50).toFixed(1)}%`,
    y1: `${(50 - sin * 50).toFixed(1)}%`,
    x2: `${(50 + cos * 50).toFixed(1)}%`,
    y2: `${(50 + sin * 50).toFixed(1)}%`,
  };
};

const Background = ({
  children,
  colorStart,
  colorEnd,
  grainIntensity = 4,
  baseFrequency = 0.02201,
  animated = true,
  direction = 9,
}: BackgroundProps) => {
  const coords = getGradientCoordinates(direction);
  return (
    <div className="relative w-full h-full overflow-hidden flex items-center justify-center">
      <svg
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient
            id="baseGradient"
            x1={coords.x1}
            y1={coords.x2}
            x2={coords.y1}
            y2={coords.y2}
          >
            <stop offset="0%" stopColor={colorStart} stopOpacity={0.74} />
            <stop offset="100%" stopColor={colorEnd} stopOpacity={0.75} />
          </linearGradient>
          <filter id="filter">
            <feTurbulence
              type="turbulence"
              baseFrequency={baseFrequency}
              numOctaves="1"
              result="rawNoise"
            >
              {animated && (
                <animate
                  attributeName="seed"
                  values="0;10;20;30;40;50;60;70;80;90"
                  dur="20s"
                  repeatCount="indefinite"
                />
              )}
            </feTurbulence>
            <feColorMatrix
              in="rawNoise"
              type="matrix"
              values={`1 0 0 0 0
                       0 1 0 0 0
                       0 0 1 0 0
                       0 0 0 ${grainIntensity} 0`}
              result="grain"
            />
            <feBlend mode="overlay" in="textured" in2="SourceGraphic" result="blended" />
          </filter>
        </defs>
        <rect width="100%" height="100%" fill="url(#baseGradient)" />
        <rect width="100%" height="100%" fill="url(#baseGradient)" filter="url(#filter)" />
      </svg>
      <div className="w-full h-full relative z-10">{children}</div>
    </div>
  );
};

export default Background;
