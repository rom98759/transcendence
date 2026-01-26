import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import intervalPlural from 'i18next-intervalplural-postprocessor';
import LanguageDetector from 'i18next-browser-languagedetector';
import commonEn from './locales/en/common.json';
import commonFr from './locales/fr/common.json';

// sources
// https://react.i18next.com/guides/multiple-translation-files
const RESOURCES = {
  en: { common: commonEn },
  fr: { common: commonFr },
};

const DETECTION_OPTIONS = {
  order: ['localStorage', 'navigator'],
  caches: ['localStorage'],
};

export const defaultNS = 'common';

i18n
  .use(LanguageDetector)
  .use(intervalPlural)
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    detection: DETECTION_OPTIONS,
    resources: RESOURCES,
    defaultNS,
    fallbackLng: 'fr',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export default i18n;
