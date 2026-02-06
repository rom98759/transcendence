import { interpolate } from 'flubber';
import { useEffect, useRef, useMemo, useState } from 'react';

// Constantes de chemins SVG
const PATH_FULL_SILHOUETTE =
  'M50,10 C25,10 5,30 5,55 C5,80 25,105 44,105 L44,145 L56,145 L56,105 C75,105 95,80 95,55 C95,30 75,10 50,10 Z';
const PATH_OVAL_ONLY =
  'M50,10 C25,10 5,30 5,55 C5,80 25,105 44,105 L50,105 L50,105 L56,105 C75,105 95,80 95,55 C95,30 75,10 50,10 Z';
const PATH_EXCLAMATION_TRAPEZE = 'M46,35 L54,35 L52.5,85 L47.5,85 Z';

interface AnimatedLogoProps {
  duration?: number;
  color?: string;
  trajectory?: { x1: number; y1: number; x2: number; y2: number };
  className?: string;
  onComplete?: () => void;
}

const AnimatedLogo = ({
  duration = 8000,
  color = 'white',
  trajectory = { x1: -140, y1: -20, x2: 70, y2: 320 },
  className = '',
  onComplete = () => {},
}: AnimatedLogoProps) => {
  const [isFinished, setIsFinished] = useState(false);

  const morphPathRef = useRef<SVGPathElement>(null);
  const ballRef = useRef<SVGCircleElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);
  const textSPRef = useRef<SVGTextElement>(null);
  const textNRef = useRef<SVGTextElement>(null);
  const textPongRef = useRef<SVGTextElement>(null);
  const turbulenceRef = useRef<SVGFETurbulenceElement>(null);
  const displacementRef = useRef<SVGFEDisplacementMapElement>(null);

  const interpolators = useMemo(() => {
    return {
      toOval: interpolate(PATH_FULL_SILHOUETTE, PATH_OVAL_ONLY),
      toBar: interpolate(PATH_OVAL_ONLY, PATH_EXCLAMATION_TRAPEZE),
    };
  }, []);

  useEffect(() => {
    if (!interpolators) return;

    let frameId: number;
    let startTime: number = 0;
    let hasCalledComplete = false;
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const p = Math.min(elapsed / duration, 1);

      updateStyles(p);

      if (p < 1) {
        frameId = requestAnimationFrame(animate);
      } else if (!hasCalledComplete) {
        hasCalledComplete = true;
        updateStyles(1);
        requestAnimationFrame(() => {
          setIsFinished(true);
          onComplete();
        });
      }
    };

    const updateStyles = (p: number) => {
      // Paddle Morphing & Rotation
      let currentD = PATH_FULL_SILHOUETTE;
      let rotY = 90;
      let rotZ = -15;
      // const morphOpacity = 1;

      if (p >= 0.1 && p < 0.25) {
        rotY = 90 * (1 - (p - 0.4) / 0.05);
      } else if (p >= 0.25 && p < 0.27) {
        rotY = 0;
        const subP = (p - 0.25) / 0.02;
        currentD = interpolators.toOval(subP);
        rotZ = -15 - subP * 2;
      } else if (p >= 0.27 && p < 0.4) {
        rotY = 0;
        const subP = (p - 0.27) / 0.13;
        currentD = interpolators.toBar(subP);
        rotZ = -17 - subP * 8;
      } else if (p >= 0.4) {
        rotY = 0;
        currentD = PATH_EXCLAMATION_TRAPEZE;
        rotZ = -25;
      }

      const transformStr = `translate(50px, 0px) rotateY(${rotY}deg) rotateZ(${rotZ}deg)`;

      if (morphPathRef.current) {
        morphPathRef.current.setAttribute('d', currentD);
        morphPathRef.current.style.transform = transformStr;
        morphPathRef.current.style.opacity = '1';
      }
      if (dotRef.current) {
        dotRef.current.style.opacity = p >= 0.6 ? '1' : '0';
        dotRef.current.style.transform = transformStr;
      }

      // Ball
      if (ballRef.current) {
        if (p >= 0.1 && p < 0.6) {
          const bP = (p - 0.1) / 0.35;
          const x =
            Math.pow(1 - bP, 2) * 50 +
            2 * (1 - bP) * bP * trajectory.x1 +
            Math.pow(bP, 2) * trajectory.x2;
          const y =
            Math.pow(1 - bP, 2) * 60 +
            2 * (1 - bP) * bP * trajectory.y1 +
            Math.pow(bP, 2) * trajectory.y2;
          const r = 4 + Math.pow(bP, 2) * 220;
          ballRef.current.setAttribute('cx', x.toString());
          ballRef.current.setAttribute('cy', y.toString());
          ballRef.current.setAttribute('r', r.toString());
          ballRef.current.style.opacity = Math.min(bP * 2, 1).toString();
          ballRef.current.style.filter = `blur(${Math.pow(bP, 3) * 20}px)`;
        } else {
          ballRef.current.style.opacity = '0';
        }
      }

      // Typography & Particle effect
      const tStart = 0.62;
      const tEnd = 0.9;
      if (p >= tStart) {
        const tP = Math.min((p - tStart) / (tEnd - tStart), 1);
        const eP = easeOutCubic(tP);

        if (textSPRef.current) {
          textSPRef.current.style.opacity = eP.toString();
          textSPRef.current.style.transform = `translateX(${-25 * (1 - eP)}px)`;
        }
        if (textNRef.current) {
          textNRef.current.style.opacity = eP.toString();
          textNRef.current.style.transform = `translateX(${25 * (1 - eP)}px)`;
        }

        if (textPongRef.current) {
          const pongStart = 0.2;
          const pongP = Math.max(0, (tP - pongStart) / (1 - pongStart));
          const pongEP = easeOutCubic(pongP);
          textPongRef.current.style.opacity = Math.min(pongP * 2, 1).toString();
          if (turbulenceRef.current && displacementRef.current) {
            const freq = 0.7 * (1 - pongEP);
            const scale = 50 * (1 - pongEP);
            turbulenceRef.current.setAttribute('baseFrequency', `0 ${freq}`);
            displacementRef.current.setAttribute('scale', scale.toString());
          }
        }
      }
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [interpolators, duration, trajectory, onComplete]);

  // const finalTransform = 'rotateY(0deg) rotateZ(-25deg)';

  return (
    <div
      className={`mx-auto ${className}`}
      style={{
        perspective: '1200px',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg
        viewBox="0 0 200 160"
        style={{ width: '100%', height: 'auto', maxHeight: '100vh', overflow: 'visible' }}
      >
        <defs>
          <filter id="waveParticle" x="-50%" y="-50%" width="200%" height="200%">
            <feTurbulence
              ref={turbulenceRef}
              type="fractalNoise"
              baseFrequency="0 0.5"
              numOctaves="2"
              result="noise"
            />
            <feDisplacementMap
              ref={displacementRef}
              in="SourceGraphic"
              in2="noise"
              scale="50"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>

        <g style={{ transformOrigin: '100px 70px' }}>
          <path
            ref={morphPathRef}
            fill={color}
            d={PATH_FULL_SILHOUETTE}
            style={{
              transformOrigin: '50px 70px',
              // transform: isFinished ? finalTransform : undefined,
              // opacity: isFinished ? 1 : undefined,
            }}
          />
          <circle
            ref={dotRef}
            cx="50"
            cy="101"
            r="4.8"
            fill={color}
            style={{
              transformOrigin: '50px 70px',
              // opacity: isFinished ? 1 : undefined,
              // transform: isFinished ? finalTransform : undefined,
            }}
          />
        </g>
        <circle ref={ballRef} fill={color} style={{ opacity: 0 }} />
        <g
          style={{ fontFamily: "'Quantico', sans-serif", fontWeight: '700', pointerEvents: 'none' }}
        >
          <text
            ref={textSPRef}
            x="75"
            y="93"
            fill={color}
            fontSize="46"
            textAnchor="end"
            style={{ opacity: isFinished ? 1 : 0 }}
          >
            SP
          </text>
          <text
            ref={textNRef}
            x="131"
            y="93"
            fill={color}
            fontSize="46"
            textAnchor="start"
            style={{ opacity: isFinished ? 1 : 0 }}
          >
            N
          </text>
          <text
            ref={textPongRef}
            x="100"
            y="120"
            fill={color}
            fontSize="14"
            textAnchor="middle"
            style={{
              letterSpacing: '6px',
              opacity: isFinished ? 1 : 0,
              filter: 'url(#waveParticle)',
            }}
          >
            PONG
          </text>
        </g>
      </svg>
    </div>
  );
};

export default AnimatedLogo;
