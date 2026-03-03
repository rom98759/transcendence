interface CircleProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Circle — Conteneur visuel : rectangle arrondi sur mobile, cercle sur desktop.
 *
 * Dimensionnement :
 * - Mobile : pleine largeur, hauteur flexible limitée à 80vh
 * - Desktop (md+) : cercle parfait, taille basée sur min(hauteur, largeur) dispo
 *
 * Le contenu interne scrolle si nécessaire (overflow-y-auto).
 */
const Circle = ({ children, className = '' }: CircleProps) => {
  return (
    <div
      className={`
      bg-white/80
      shadow-2xl
      z-0
      flex
      items-center
      justify-center
      transition-all duration-500 ease-in-out
      relative
      mx-auto
      my-auto
      text-gray-700

      w-[95vw]
      max-w-[95vw]
      max-h-[80vh]
      rounded-2xl

      sm:w-[90vw]
      sm:max-w-[90vw]
      sm:rounded-3xl

      md:w-[min(75vh,80vw)]
      md:h-[min(75vh,80vw)]
      md:max-w-[min(75vh,80vw)]
      md:max-h-[min(75vh,80vw)]
      md:aspect-square
      md:rounded-full
      ${className}`}
    >
      <div className="relative z-10 text-center w-full max-w-4xl px-3 sm:px-4 md:px-6 py-4 overflow-y-auto max-h-full">
        {children}
      </div>
    </div>
  );
};

export default Circle;
