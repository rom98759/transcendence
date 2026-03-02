import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';

/**
 * TwoFactorRoute — Guard dédié à la route /2fa.
 *
 * Autorise l'accès uniquement si un contexte 2FA pending valide (non expiré) existe.
 * Cela empêche l'accès direct à /2fa sans avoir transité par le login.
 *
 * Comportement :
 * - isAuthChecked === false : loader (pas encore de réponse du /auth/me)
 * - hasPending2FA === false : pas de flux 2FA en cours → redirect /welcome
 * - hasPending2FA === true  : accès autorisé → <Outlet />
 *
 * Note : isLoggedIn n'est PAS vérifié ici intentionnellement.
 * La navigation post-2FA est gérée explicitement dans TwoFactorPage
 * (navigate vers pending2FA.from ?? '/home') pour éviter une double
 * navigation si on ajoutait un <Navigate to="/home"> ici.
 *
 * Usage dans App.tsx :
 *   <Route element={<TwoFactorRoute />}>
 *     <Route path="/2fa" element={<TwoFactorPage />} />
 *   </Route>
 */
export const TwoFactorRoute = () => {
  const { isAuthChecked, hasPending2FA } = useAuth();

  if (!isAuthChecked) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-teal-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!hasPending2FA) {
    // Accès direct sans contexte 2FA valide → retour au login
    return <Navigate to="/welcome" replace />;
  }

  return <Outlet />;
};
