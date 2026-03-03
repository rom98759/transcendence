import Circle from '../atoms/Circle';

interface PageProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

/**
 * Page — Wrapper qui affiche le contenu dans un Circle (rond sur desktop).
 *
 * Ne gère PAS le layout global (Background, NavBar, Footer).
 * Ceux-ci sont fournis par AppLayout via le routeur.
 *
 * Usage : pages avec contenu compact (profils, amis, etc.)
 * Pour du contenu long/scrollable (TOS, Privacy), NE PAS utiliser Page.
 */
export const Page = ({ children, title, className = '' }: PageProps) => {
  return (
    <div className={`flex-1 flex items-center justify-center p-2 sm:p-4 ${className}`}>
      <Circle>
        {title && (
          <h1 className="mb-4 sm:mb-6 text-gray-600 text-xl sm:text-2xl md:text-3xl font-quantico">
            {title}
          </h1>
        )}
        {children}
      </Circle>
    </div>
  );
};
