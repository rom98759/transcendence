import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { useFriends } from '../../hooks/useFriends';
import FriendListPanel from '../molecules/FriendListPanel';

/**
 * FriendSidebar — A collapsible, slide-in sidebar displaying the friend list.
 * Can be used on any page (HomePage, game pages, etc.).
 *
 * - Collapsed: shows a small toggle button on the left edge
 * - Expanded: slides out a panel with the full friend list
 */
const FriendSidebar = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const { friends, isLoading, error, addFriend, removeFriend, clearError } = useFriends();

  return (
    <>
      {/* ── Backdrop (all screen sizes when sidebar is open) ── */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setIsOpen(false)} />
      )}

      {/* ── Sidebar Panel ── */}
      <div
        className={`
          fixed top-0 left-0 z-50 h-full
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="h-full w-[85vw] max-w-72 bg-slate-900/95 backdrop-blur-xl border-r border-white/10 shadow-2xl flex flex-col">
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-cyan-400" />
              <h2 className="font-quantico text-white font-semibold text-sm tracking-wide">
                {t('friends.friends')}
              </h2>
              <span className="text-xs text-gray-500 bg-white/5 px-1.5 py-0.5 rounded-full">
                {friends.length}
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <ChevronLeft size={18} className="text-gray-400" />
            </button>
          </div>

          {/* ── Content ── */}
          <div className="flex-1 min-h-0 overflow-hidden px-3 py-3">
            <FriendListPanel
              friends={friends}
              isLoading={isLoading}
              error={error}
              onAddFriend={addFriend}
              onRemoveFriend={removeFriend}
              onClearError={clearError}
              variant="compact"
            />
          </div>
        </div>
      </div>

      {/* ── Toggle Button (visible when sidebar is closed) ── */}
      <button
        onClick={() => setIsOpen(true)}
        className={`
          fixed top-24 left-0 z-40
          flex items-center gap-1.5
          bg-slate-900/80 backdrop-blur-lg
          border border-white/10 border-l-0
          rounded-r-xl px-2.5 py-3
          shadow-lg
          transition-all duration-300 ease-in-out
          hover:bg-slate-800/90 hover:px-3.5
          group
          ${isOpen ? 'opacity-0 pointer-events-none -translate-x-2' : 'opacity-100 translate-x-0'}
        `}
      >
        <Users size={18} className="text-cyan-400" />
        <span className="text-xs text-gray-300 font-quantico hidden group-hover:inline transition-all">
          {t('friends.friends')}
        </span>
        <ChevronRight size={14} className="text-gray-500" />
      </button>
    </>
  );
};

export default FriendSidebar;
