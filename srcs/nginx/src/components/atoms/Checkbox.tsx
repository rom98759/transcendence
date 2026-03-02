import { useTranslation } from 'react-i18next';

interface CheckboxProps {
  name: string;
  accepted: boolean;
  onCheck: (value: boolean) => void;
  errorMessage?: string;
}

const Checkbox = ({ name, accepted, onCheck, errorMessage }: CheckboxProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col justify-center gap-1 mt-2 mb-2">
      <label className="flex items-center gap-2 cursor-pointer group">
        <input
          type="checkbox"
          name={name}
          required
          checked={accepted}
          onChange={(e) => onCheck(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#0088ff] focus:ring-[#0088ff] focus:ring-offset-0 
                       transition-all cursor-pointer bg-white"
        />
        <span className="text-[11px] text-gray-600 leading-none select-none">
          {t('auth.i_have_read')}{' '}
          <a href="/tos" target="_blank" className="text-[#2a2d30] hover:underline font-medium">
            {t('auth.tos')}
          </a>{' '}
          {t('auth.and')}{' '}
          <a
            href="/privacy"
            target="_blank"
            className="text-[#2a2d30] hover:underline  font-medium"
          >
            {t('auth.privacy_policy')}
          </a>
        </span>
      </label>

      {errorMessage && (
        <span className="text-[9px] text-red-500 font-medium ml-5">{errorMessage}</span>
      )}
    </div>
  );
};

export default Checkbox;
