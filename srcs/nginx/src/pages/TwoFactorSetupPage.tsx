import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../providers/AuthProvider';
import { authApi } from '../api/auth-api';
import { FrontendError, ERROR_CODES, HTTP_STATUS } from '@transcendence/core';
import Button from '../components/atoms/Button';
import { Input } from '../components/atoms/Input';
import { Page } from '../components/organisms/PageContainer';
import i18next from 'i18next';

export const TwoFactorSetupPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isLoggedIn, isAuthChecked, login } = useAuth();

  const [qrCode, setQrCode] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [setupMessage, setSetupMessage] = useState('');

  // Rediriger si non connecté
  useEffect(() => {
    if (isAuthChecked && !isLoggedIn) {
      navigate('/login', { replace: true });
    }
  }, [isAuthChecked, isLoggedIn, navigate]);

  // Charger le QR code au montage
  useEffect(() => {
    if (!isLoggedIn) return;

    const loadQRCode = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await authApi.setup2FA();
        setQrCode(result.qrCode);
        setSetupMessage(result.message);
      } catch (err: unknown) {
        if (err instanceof FrontendError) {
          if (err.statusCode === HTTP_STATUS.CONFLICT) {
            setError("2FA déjà activée. Désactivez-la d'abord pour la reconfigurer.");
          } else if (err.code) {
            setError(
              i18next.t(`errors.${err.code}`) || i18next.t(`errors.${ERROR_CODES.INTERNAL_ERROR}`),
            );
          } else {
            setError(err.message || 'Erreur lors de la génération du QR code');
          }
        } else {
          setError(i18next.t(`errors.${ERROR_CODES.INTERNAL_ERROR}`));
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadQRCode();
  }, [isLoggedIn]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldError(null);

    // Validation du code
    if (!code) {
      setFieldError('Le code est requis');
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setFieldError('Le code doit contenir 6 chiffres');
      return;
    }

    setIsVerifying(true);

    try {
      const result = await authApi.verify2FASetup(code);
      // Succès : mettre à jour l'utilisateur et rediriger
      login({ username: result.username, avatarUrl: null });
      navigate(`/profile/${result.username}`, { replace: true });
    } catch (err: unknown) {
      if (err instanceof FrontendError) {
        if (err.statusCode === HTTP_STATUS.BAD_REQUEST) {
          setFieldError(err.message || 'Code invalide');
        } else if (err.statusCode === HTTP_STATUS.UNAUTHORIZED) {
          setError('Session de configuration expirée. Veuillez recharger la page.');
        } else if (err.statusCode === HTTP_STATUS.TOO_MANY_REQUESTS) {
          setError(err.message || 'Trop de tentatives. Veuillez recommencer le processus.');
        } else if (err.code) {
          setError(
            i18next.t(`errors.${err.code}`) || i18next.t(`errors.${ERROR_CODES.INTERNAL_ERROR}`),
          );
        } else {
          setError(err.message || 'Erreur lors de la vérification');
        }
      } else {
        setError(i18next.t(`errors.${ERROR_CODES.INTERNAL_ERROR}`));
      }
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isAuthChecked) {
    return null; // Ou un loader
  }

  return (
    <Page>
      <div className="max-w-lg mx-auto bg-white/10 backdrop-blur-md rounded-xl shadow-2xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-white">Configuration 2FA</h1>
          <p className="text-gray-300">Sécurisez votre compte avec Google Authenticator</p>
        </div>

        {isLoading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            <p className="mt-4 text-gray-300">Génération du QR code...</p>
          </div>
        )}

        {error && !isLoading && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-4">
            <p className="text-red-200 text-sm text-center">{error}</p>
          </div>
        )}

        {qrCode && !error && (
          <>
            <div className="bg-white p-6 rounded-lg space-y-4">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-gray-800 mb-3">
                  Étape 1 : Scannez ce QR Code
                </h2>
                <img
                  src={qrCode}
                  alt="QR Code 2FA"
                  className="mx-auto border-4 border-gray-200 rounded-lg"
                />
              </div>

              <div className="text-sm text-gray-600 space-y-1">
                <p>📱 Ouvrez Google Authenticator</p>
                <p>➕ Appuyez sur "Ajouter un compte"</p>
                <p>📷 Scannez le QR code ci-dessus</p>
              </div>
            </div>

            <form onSubmit={handleVerify} className="flex flex-col gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white mb-3 text-center">
                  Étape 2 : Entrez le code généré
                </h2>
                <Input
                  name="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  errorMessage={fieldError || undefined}
                  autoComplete="off"
                  placeholder="000000"
                  maxLength={6}
                  className="text-center text-2xl tracking-widest"
                />
              </div>

              <Button className="mt-4" type="submit" disabled={isVerifying || !code}>
                {isVerifying ? 'Vérification...' : 'Activer la 2FA'}
              </Button>
            </form>

            {setupMessage && (
              <div className="bg-blue-500/20 border border-blue-500 rounded-lg p-4">
                <p className="text-blue-200 text-sm text-center">{setupMessage}</p>
              </div>
            )}
          </>
        )}

        <div className="text-center text-sm text-gray-400">
          <button
            onClick={() => navigate(user?.username ? `/profile/${user.username}` : '/')}
            className="hover:text-white transition-colors"
          >
            ← Retour au profil
          </button>
        </div>
      </div>
    </Page>
  );
};
