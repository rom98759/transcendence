/**
 * TwoFactorSetup - Composant de gestion 2FA dans le profil utilisateur
 *
 * Permet à l'utilisateur de :
 * - Activer le 2FA (affiche QR code + secret)
 * - Désactiver le 2FA (avec confirmation)
 * - Voir le statut actuel (activé/désactivé)
 *
 * À intégrer dans MyProfilePage ou une section Settings
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { authApi } from '../../api/auth-api';
import { FrontendError, ERROR_CODES } from '@transcendence/core';
import Button from '../atoms/Button';
import { Input } from '../atoms/Input';
import { AlertMessage } from '../atoms/AlertMessage';

interface TwoFactorSetupState {
  status: 'loading' | 'enabled' | 'disabled';
  setupStep: 'idle' | 'showing-qr' | 'verifying';
  disableStep: 'idle' | 'confirming';
  qrCodeUrl: string | null;
  secret: string | null;
  verifyCode: string;
  error: string | null;
  success: string | null;
  isSubmitting: boolean;
}

export const TwoFactorSetup = () => {
  const { t } = useTranslation();

  const [state, setState] = useState<TwoFactorSetupState>({
    status: 'loading',
    setupStep: 'idle',
    disableStep: 'idle',
    qrCodeUrl: null,
    secret: null,
    verifyCode: '',
    error: null,
    success: null,
    isSubmitting: false,
  });

  // Charger le statut 2FA au mount
  useEffect(() => {
    const loadStatus = async () => {
      try {
        const statusData = await authApi.get2FAStatus();
        setState((prev) => ({
          ...prev,
          status: statusData.enabled ? 'enabled' : 'disabled',
        }));
      } catch {
        setState((prev) => ({
          ...prev,
          status: 'disabled',
          error: t('2fa.status_load_error'),
        }));
      }
    };
    loadStatus();
  }, [t]);

  const handleStartSetup = async () => {
    setState((prev) => ({ ...prev, error: null, success: null, isSubmitting: true }));

    try {
      const setupData = await authApi.setup2FA();
      setState((prev) => ({
        ...prev,
        setupStep: 'showing-qr',
        qrCodeUrl: setupData.qrCodeUrl,
        secret: setupData.secret,
        isSubmitting: false,
      }));
    } catch (err: unknown) {
      let errorMessage = t(`errors.${ERROR_CODES.INTERNAL_ERROR}`);
      if (err instanceof FrontendError) {
        errorMessage = err.message;
      }
      setState((prev) => ({
        ...prev,
        error: errorMessage,
        isSubmitting: false,
      }));
    }
  };

  const handleVerifySetup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (state.verifyCode.length !== 6 || !/^\d{6}$/.test(state.verifyCode)) {
      setState((prev) => ({
        ...prev,
        error: t('errors.invalid_code_format'),
      }));
      return;
    }

    setState((prev) => ({ ...prev, error: null, isSubmitting: true }));

    try {
      await authApi.verify2FASetup(state.verifyCode);
      setState((prev) => ({
        ...prev,
        status: 'enabled',
        setupStep: 'idle',
        qrCodeUrl: null,
        secret: null,
        verifyCode: '',
        success: t('2fa.setup.setup_success'),
        isSubmitting: false,
      }));
    } catch (err: unknown) {
      let errorMessage = t(`errors.${ERROR_CODES.INTERNAL_ERROR}`);
      if (err instanceof FrontendError) {
        errorMessage = err.message;
      }
      setState((prev) => ({
        ...prev,
        error: errorMessage,
        isSubmitting: false,
        verifyCode: '',
      }));
    }
  };

  const handleDisable = async () => {
    setState((prev) => ({ ...prev, error: null, isSubmitting: true }));

    try {
      await authApi.disable2FA();
      setState((prev) => ({
        ...prev,
        status: 'disabled',
        disableStep: 'idle',
        success: t('2fa.setup.disable_success'),
        isSubmitting: false,
      }));
    } catch (err: unknown) {
      let errorMessage = t(`errors.${ERROR_CODES.INTERNAL_ERROR}`);
      if (err instanceof FrontendError) {
        errorMessage = err.message;
      }
      setState((prev) => ({
        ...prev,
        error: errorMessage,
        isSubmitting: false,
      }));
    }
  };

  const handleCancelSetup = () => {
    setState((prev) => ({
      ...prev,
      setupStep: 'idle',
      qrCodeUrl: null,
      secret: null,
      verifyCode: '',
      error: null,
    }));
  };

  const handleCancelDisable = () => {
    setState((prev) => ({
      ...prev,
      disableStep: 'idle',
      error: null,
    }));
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <svg
          className="w-7 h-7 text-cyan-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        {t('2fa.setup.title')}
      </h2>

      {/* Messages de succès/erreur */}
      <AlertMessage type="success" message={state.success} className="mb-4" />
      <AlertMessage type="error" message={state.error} className="mb-4" />

      {/* Statut actuel */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">{t('2fa.setup.status')}:</span>
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              state.status === 'enabled'
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {state.status === 'enabled' ? t('2fa.setup.enabled') : t('2fa.setup.disabled')}
          </span>
        </div>
      </div>

      {/* Section Activation */}
      {state.status === 'disabled' && state.setupStep === 'idle' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">{t('2fa.setup.description')}</p>
          <Button
            type="button"
            variant="primary"
            onClick={handleStartSetup}
            disabled={state.isSubmitting}
            className="w-full"
          >
            {t('2fa.setup.enable_button')}
          </Button>
        </div>
      )}

      {/* Affichage QR Code */}
      {state.setupStep === 'showing-qr' && (
        <div className="space-y-4">
          <div className="bg-gray-50 p-6 rounded-xl border-2 border-gray-200">
            <p className="text-sm text-gray-700 mb-4 font-medium">
              {t('2fa.setup.scan_instructions')}
            </p>

            {/* QR Code */}
            {state.qrCodeUrl && (
              <div className="flex justify-center mb-4">
                <img
                  src={state.qrCodeUrl}
                  alt="QR Code 2FA"
                  className="w-64 h-64 border-4 border-white rounded-xl shadow-lg"
                />
              </div>
            )}

            {/* Secret manuel */}
            {state.secret && (
              <div className="mt-4">
                <p className="text-xs text-gray-600 mb-2">{t('2fa.setup.manual_entry')}:</p>
                <div className="bg-white px-4 py-3 rounded-lg border border-gray-300 font-mono text-sm text-gray-800 break-all">
                  {state.secret}
                </div>
              </div>
            )}
          </div>

          {/* Formulaire de vérification */}
          <form onSubmit={handleVerifySetup} className="space-y-4">
            <div>
              <label htmlFor="verify-code" className="block text-sm font-medium text-gray-700 mb-2">
                {t('2fa.setup.verify_code')}
              </label>
              <Input
                id="verify-code"
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                value={state.verifyCode}
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    verifyCode: e.target.value.replace(/\D/g, ''),
                  }))
                }
                disabled={state.isSubmitting}
                autoFocus
                placeholder="000000"
              />
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={handleCancelSetup}
                disabled={state.isSubmitting}
                className="flex-1"
              >
                {t('2fa.setup.cancel')}
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={state.isSubmitting || state.verifyCode.length !== 6}
                className="flex-1"
              >
                {state.isSubmitting ? t('2fa.verifying') : t('2fa.setup.verify_button')}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Section Désactivation */}
      {state.status === 'enabled' && state.disableStep === 'idle' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">{t('2fa.setup.disable_description')}</p>
          <Button
            type="button"
            variant="alert"
            onClick={() => setState((prev) => ({ ...prev, disableStep: 'confirming' }))}
            className="w-full"
          >
            {t('2fa.setup.disable_button')}
          </Button>
        </div>
      )}

      {/* Confirmation de désactivation */}
      {state.disableStep === 'confirming' && (
        <div className="space-y-4">
          <AlertMessage type="warning" message={t('2fa.setup.disable_warning')} />

          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={handleCancelDisable}
              disabled={state.isSubmitting}
              className="flex-1"
            >
              {t('2fa.setup.cancel')}
            </Button>
            <Button
              type="button"
              variant="alert"
              onClick={handleDisable}
              disabled={state.isSubmitting}
              className="flex-1"
            >
              {state.isSubmitting ? t('2fa.setup.disabling') : t('2fa.setup.confirm_disable')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
