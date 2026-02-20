import { Link } from 'react-router-dom';
import { Shield, ShieldOff, Lock } from 'lucide-react';

/**
 * Composant pour gérer la 2FA depuis le profil utilisateur
 *
 * À intégrer dans ProfilePage.tsx ou une page Settings
 *
 * Props possibles :
 * - has2FA: boolean (à récupérer depuis le backend via /auth/me)
 */

interface TwoFactorSettingsProps {
  has2FA?: boolean; // Si true, 2FA est activée pour l'utilisateur
}

export const TwoFactorSettings = ({ has2FA = false }: TwoFactorSettingsProps) => {
  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl shadow-lg p-6 space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <Shield className="w-6 h-6 text-blue-400" />
        <h2 className="text-xl font-bold text-white">Authentification à deux facteurs</h2>
      </div>

      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <Lock
            className={`w-5 h-5 flex-shrink-0 mt-0.5 ${has2FA ? 'text-green-400' : 'text-gray-400'}`}
          />
          <div className="flex-1">
            <p className="text-gray-300 text-sm">
              {has2FA ? (
                <>
                  <span className="font-semibold text-green-400">✓ 2FA activée</span>
                  <br />
                  Votre compte est protégé par Google Authenticator
                </>
              ) : (
                <>
                  <span className="font-semibold text-yellow-400">⚠ 2FA désactivée</span>
                  <br />
                  Renforcez la sécurité de votre compte en activant la 2FA
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          {!has2FA ? (
            <Link to="/2fa/setup" className="flex-1">
              <button className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2">
                <Shield className="w-4 h-4" />
                Activer la 2FA
              </button>
            </Link>
          ) : (
            <Link to="/2fa/disable" className="flex-1">
              <button className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2">
                <ShieldOff className="w-4 h-4" />
                Désactiver la 2FA
              </button>
            </Link>
          )}
        </div>
      </div>

      {/* Informations additionnelles */}
      <div className="border-t border-white/10 pt-4 mt-4">
        <p className="text-xs text-gray-400">
          💡 <strong>Qu'est-ce que la 2FA ?</strong>
          <br />
          L'authentification à deux facteurs ajoute une couche de sécurité supplémentaire en
          exigeant un code temporaire depuis votre smartphone en plus de votre mot de passe.
        </p>
      </div>
    </div>
  );
};

/**
 * Exemple d'intégration dans ProfilePage.tsx :
 *
 * import { TwoFactorSettings } from '../components/molecules/TwoFactorSettings';
 *
 * // Dans le composant ProfilePage
 * const ProfilePage = () => {
 *   const { user } = useAuth();
 *   const [has2FA, setHas2FA] = useState(false);
 *
 *   useEffect(() => {
 *     // Récupérer l'état 2FA depuis le backend
 *     authApi.me().then(userData => {
 *       setHas2FA(userData.has2FA); // Nécessite d'ajouter has2FA dans UserDTO
 *     });
 *   }, []);
 *
 *   return (
 *     <div className="profile-container">
 *       <h1>Profil de {user?.username}</h1>
 *
 *       <section className="security-section">
 *         <TwoFactorSettings has2FA={has2FA} />
 *       </section>
 *     </div>
 *   );
 * };
 */
