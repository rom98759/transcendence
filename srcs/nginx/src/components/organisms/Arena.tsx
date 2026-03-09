import React, { useRef, useEffect } from 'react';
import type { BackgroundMode, GameState } from '../../types/game.types';

interface ArenaProps {
  currentMode?: BackgroundMode;
  className?: string;
  gameStateRef: React.MutableRefObject<GameState | null>;
}

const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;

  if (h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }

  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
};

const getColorForMode = (v: number, mode: BackgroundMode): [number, number, number] => {
  switch (mode) {
    case 'ocean':
      return hslToRgb(220 - v * 50, 0.8, 0.4);
    case 'sunset':
      return hslToRgb(60 - v * 30, 0.9, 0.5);
    case 'grayscale':
      const g = Math.round(v * 255);
      return [g, g, g];
    case 'psychedelic':
    default:
      return hslToRgb(v * 360, 0.7, 0.5);
  }
};

const Arena = ({ className = '', gameStateRef, currentMode = 'ocean' }: ArenaProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const modeRef = useRef(currentMode);
  useEffect(() => {
    modeRef.current = currentMode;
  }, [currentMode]);
  const renderNoiseField = (
    cosmicBackground: number[][] | null,
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
  ) => {
    if (!cosmicBackground) return;
    const width = cosmicBackground[0]?.length || 0;
    const height = cosmicBackground.length;
    if (!width || !height) return;

    const imageData = ctx.createImageData(width, height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        const v = cosmicBackground[y][x];
        const [r, g, b] = getColorForMode(v, modeRef.current);
        imageData.data[index] = r;
        imageData.data[index + 1] = g;
        imageData.data[index + 2] = b;
        imageData.data[index + 3] = 255;
      }
    }

    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    offscreen.getContext('2d')!.putImageData(imageData, 0, 0);
    ctx.drawImage(offscreen, 0, 0, canvas.width, canvas.height); // 👈 stretch to fill
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const render = () => {
      const gameState = gameStateRef.current;
      if (!gameState || !gameState.paddles || !gameState.ball) {
        requestAnimationFrame(render);
        return;
      }
      // Clear canvas
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Cosmic background
      renderNoiseField(gameState.cosmicBackground, ctx, canvas);

      // Center line
      ctx.strokeStyle = '#444444';
      ctx.setLineDash([10, 10]);
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, 0);
      ctx.lineTo(canvas.width / 2, canvas.height);
      ctx.stroke();
      ctx.setLineDash([]);

      // Left paddle
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(20, gameState.paddles.left.y, 10, gameState.paddles.left.height);

      // Right paddle
      ctx.fillRect(
        canvas.width - 30,
        gameState.paddles.right.y,
        10,
        gameState.paddles.right.height,
      );

      // Ball
      ctx.beginPath();
      ctx.arc(gameState.ball.x, gameState.ball.y, gameState.ball.radius, 0, Math.PI * 2);
      ctx.fill();

      requestAnimationFrame(render);
    };
    render();
    return () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [gameStateRef]);
  return (
    <div className={`w-full flex justify-center items-center align-center ${className}`}>
      <div className="justify-center max-w-8xl">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="w-full h-auto max-h-[80vh] border border-white/50 rounded-xl shadow-l"
          style={{
            aspectRatio: '4/3',
            backgroundColor: '#000',
          }}
        />
      </div>
    </div>
  );
  // return (
  //   <div className="w-full h-full flex items-center justify-center p-4">
  //     <canvas ref={canvasRef} width={800} height={600} className="w-full h-full" />
  //   </div>
  // );
};

export default Arena;
