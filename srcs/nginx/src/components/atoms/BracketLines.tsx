import { RefObject, useEffect, useState } from 'react';

export interface BracketConnection {
  from: RefObject<HTMLElement | null>;
  to: RefObject<HTMLElement | null>;
}

interface Point {
  x: number;
  y: number;
}

interface ComputedLine {
  from: Point;
  to: Point;
}

interface BracketLinesProps {
  // coordinate reference
  containerRef: RefObject<HTMLElement | null>;
  connections: BracketConnection[];
}

/* renvoi les coordonnées du centre de l'objet / div
 * car getBoundingClientRect renvoie les coordonnées viewport du rectangle
 * cette fontion utilitaire permet aux lignes de partir du centre des capsules
 */
function centerOf(rect: DOMRect): Point {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

/* BracketLines est un composant de rendu SVG qui dessine dynamiquement des lignes
 * entre des éléments du DOM, en restant synchronisé avec le layout réel
 * (responsive, scroll, resize).
 */
export function BracketLines({ containerRef, connections }: BracketLinesProps) {
  const [lines, setLines] = useState<ComputedLine[]>([]);

  useEffect(() => {
    const compute = () => {
      const container = containerRef.current;
      if (!container) return;
      // on récupère les coordonnées du container
      const cRect = container.getBoundingClientRect();

      const computed: ComputedLine[] = [];

      for (const { from, to } of connections) {
        const aEl = from.current;
        const bEl = to.current;
        if (!aEl || !bEl) continue;

        const a = centerOf(aEl.getBoundingClientRect());
        const b = centerOf(bEl.getBoundingClientRect());

        //convert viewport -> container local coords
        computed.push({
          from: { x: a.x - cRect.left, y: a.y - cRect.top },
          to: { x: b.x - cRect.left, y: b.y - cRect.top },
        });
      }

      setLines(computed);
    };

    /*recalcul : au montage, au resize, au scroll (y compris scrolls internes)*/
    compute();

    window.addEventListener('resize', compute);
    window.addEventListener('scroll', compute, true); // capte scroll de conteneurs
    // évite les fuite de mémoire
    return () => {
      window.removeEventListener('resize', compute);
      window.removeEventListener('scroll', compute, true);
    };
  }, [containerRef, connections]);

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none">
      {lines.map((line, i) => {
        // courbe de bézier cubique
        const cx = (line.from.x + line.to.x) / 2;

        return (
          <path
            key={i}
            d={`M ${line.from.x} ${line.from.y}
                C ${cx} ${line.from.y},
                  ${cx} ${line.to.y},
                  ${line.to.x} ${line.to.y}`}
            stroke="rgba(125, 211, 252, 0.9)"
            strokeWidth="2"
            fill="none"
          />
        );
      })}
    </svg>
  );
}
