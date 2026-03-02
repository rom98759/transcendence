import { useEffect, useRef } from 'react';
import { authApi } from '../api/auth-api';

/**
 * Intervalle entre deux pings (ms).
 * 30 s
 */
const HEARTBEAT_INTERVAL_MS = 30_000;

/**
 * Envoie des pings périodiques au serveur tant que l'utilisateur est connecté.
 *
 * Comportements :
 *  - Démarre immédiatement un premier ping quand `isActive` passe à `true`
 *  - S'arrête proprement (clearInterval + removeEventListener) dès que
 *    `isActive` passe à `false` (logout, expiration de session).
 *  - Skip le ping si l'onglet est masqué (Page Visibility API) pour éviter
 *    des requêtes inutiles en arrière-plan.
 *  - Rattrape un ping immédiatement quand l'onglet redevient visible.
 */
export function useHeartbeat(isActive: boolean): void {
  // useRef évite que le timer ne provoque de re-render
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isActive) {
      // Nettoyage si l'utilisateur vient de se déconnecter
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const beat = async (): Promise<void> => {
      // Ne pas pinger si l'onglet est en arrière-plan
      if (document.hidden) return;
      try {
        await authApi.heartbeat();
      } catch {
        // 401 → intercepteur AuthProvider → user=null → isActive=false → cleanup
        // Autres erreurs réseau → ignorées (le timer réessaiera au prochain cycle)
      }
    };

    // Premier ping immédiat pour ne pas attendre le premier intervalle
    beat();

    timerRef.current = setInterval(beat, HEARTBEAT_INTERVAL_MS);

    // Rattraper le ping dès que l'onglet redevient visible
    const onVisibilityChange = (): void => {
      if (!document.hidden) beat();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [isActive]);
}
