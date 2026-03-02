/**
 * AlertMessage — Composant d'affichage de messages de succès / erreur / avertissement.
 *
 * Usage :
 *   <AlertMessage type="success" message="Opération réussie" />
 *   <AlertMessage type="error" message={errorText} />
 *   <AlertMessage type="warning" message="Attention !" />
 *
 * Si `message` est null/undefined/vide, le composant ne rend rien.
 */

interface AlertMessageProps {
  type: 'success' | 'error' | 'warning';
  message: string | null | undefined;
  className?: string;
}

const styles: Record<AlertMessageProps['type'], string> = {
  success: 'bg-green-50 border-2 border-green-300 text-green-700',
  error: 'bg-red-50 border-2 border-red-300 text-red-700',
  warning: 'bg-yellow-50 border-2 border-yellow-300 text-yellow-800',
};

export const AlertMessage = ({ type, message, className = '' }: AlertMessageProps) => {
  if (!message) return null;

  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      className={`px-4 py-3 rounded-lg text-sm font-medium ${styles[type]} ${className}`}
    >
      {message}
    </div>
  );
};
