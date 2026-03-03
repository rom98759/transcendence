import { ProfileSimpleDTO } from '@transcendence/core';
import { Search, Loader } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SearchProps {
  value: string;
  onChange: (val: string) => void;
  suggestions: ProfileSimpleDTO[];
  error?: string | null;
  onSelect: (user: ProfileSimpleDTO) => void;
  isLoading: boolean;
}

const UserSearchInput = ({
  value,
  onChange,
  error,
  suggestions,
  onSelect,
  isLoading = false,
}: SearchProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-0 p-2 sm:p-3 bg-black/10 rounded-2xl">
      <div className="flex items-center justify-between gap-2 border-white/50 p-1">
        <input
          className="bg-transparent outline-none text-white w-full min-w-0 text-sm sm:text-base placeholder:text-gray-500 placeholder:text-sm sm:placeholder:text-md"
          placeholder={t('search.user')}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {isLoading ? (
          <Loader size={18} className="text-white mr-1 shrink-0 animate-spin" />
        ) : (
          <Search size={18} className="text-white mr-1 shrink-0" />
        )}
      </div>

      {suggestions.length > 0 && (
        <ul className="flex flex-col gap-1 mt-1.5 max-h-[200px] overflow-y-auto overscroll-contain border-t border-white/10 pt-1.5">
          {suggestions.map((u) => (
            <li
              role="button"
              key={u.username}
              onClick={() => onSelect(u)}
              className="cursor-pointer hover:bg-white/10 active:bg-white/20 px-3 py-2.5 rounded-lg text-sm leading-normal"
            >
              {u.username}
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-red-400 italic text-xs sm:text-sm px-2 mt-1">{error}</p>}
    </div>
  );
};

export default UserSearchInput;
