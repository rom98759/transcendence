import { Check, X } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

interface ValidationRule {
  label: string;
  test: (value: string) => boolean;
  isPassed: boolean;
}

interface ValidationChecklistProps {
  value: string;
  type: 'password' | 'username';
}

/**
 * ValidationChecklist - Affiche les critères de validation en temps réel
 * avec des icônes check/cross selon le statut
 */
export const ValidationChecklist = ({ value, type }: ValidationChecklistProps) => {
  const { t } = useTranslation();

  const passwordRules = useMemo<ValidationRule[]>(() => {
    if (type !== 'password') return [];

    return [
      {
        label: t('validation.password.minLength', 'Au moins 8 caractères'),
        test: (val: string) => val.length >= 8,
        isPassed: value.length >= 8,
      },
      {
        label: t('validation.password.lowercase', 'Une minuscule (a-z)'),
        test: (val: string) => /[a-z]/.test(val),
        isPassed: /[a-z]/.test(value),
      },
      {
        label: t('validation.password.uppercase', 'Une majuscule (A-Z)'),
        test: (val: string) => /[A-Z]/.test(val),
        isPassed: /[A-Z]/.test(value),
      },
      {
        label: t('validation.password.number', 'Un chiffre (0-9)'),
        test: (val: string) => /\d/.test(val),
        isPassed: /\d/.test(value),
      },
      {
        label: t('validation.password.special', 'Un caractère spécial (!@#$%^&*)'),
        test: (val: string) => /[!@#$%^&*]/.test(val),
        isPassed: /[!@#$%^&*]/.test(value),
      },
    ];
  }, [value, type, t]);

  const usernameRules = useMemo<ValidationRule[]>(() => {
    if (type !== 'username') return [];

    return [
      {
        label: t('validation.username.minLength', '4 à 20 caractères'),
        test: (val: string) => val.length >= 4 && val.length <= 20,
        isPassed: value.length >= 4 && value.length <= 20,
      },
      {
        label: t('validation.username.alphanumeric', 'Lettres, chiffres et _ uniquement'),
        test: (val: string) => /^[a-zA-Z0-9_]*$/.test(val),
        isPassed: /^[a-zA-Z0-9_]*$/.test(value),
      },
    ];
  }, [value, type, t]);

  const rules = type === 'password' ? passwordRules : usernameRules;

  // Ne pas afficher si le champ est vide
  if (!value) return null;

  return (
    <div className="bg-gradient-to-br from-gray-50 to-blue-50 border border-blue-200 rounded-md p-2 shadow-sm">
      <div className="flex flex-col gap-0.5">
        {rules.map((rule, index) => (
          <div
            key={index}
            className="flex items-center gap-1.5 text-[10px] transition-all duration-200"
          >
            <div
              className={`flex-shrink-0 rounded-full p-0.5 transition-all duration-200 ${
                rule.isPassed ? 'bg-green-500 text-white shadow-sm' : 'bg-gray-300 text-gray-600'
              }`}
            >
              {rule.isPassed ? <Check size={10} /> : <X size={10} />}
            </div>
            <span
              className={`font-medium transition-colors leading-tight ${
                rule.isPassed ? 'text-green-700' : 'text-gray-600'
              }`}
            >
              {rule.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
