import { useState, useEffect } from 'react';

const FOOTER_STATE_KEY = 'footer-collapsed';

/**
 * Hook pour gérer l'état du footer (collapsed/expanded) de manière persistante
 * L'état est sauvegardé dans localStorage et partagé entre toutes les pages
 */
export const useFooterState = () => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    // Initialiser depuis localStorage
    const stored = localStorage.getItem(FOOTER_STATE_KEY);
    return stored === 'true';
  });

  useEffect(() => {
    // Sauvegarder dans localStorage à chaque changement
    localStorage.setItem(FOOTER_STATE_KEY, String(isCollapsed));
  }, [isCollapsed]);

  const toggleCollapsed = () => setIsCollapsed((prev) => !prev);

  return { isCollapsed, toggleCollapsed };
};
