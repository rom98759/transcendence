import { Gamepad2, UserRoundMinus, UserRoundPlus, LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { UserActions } from '../../types/react-types';

/** Visual configuration for each user action */
export const ACTION_CONFIG: Record<
  UserActions,
  { icon: LucideIcon; color: string; ghostHoverBg: string; labelKey: string }
> = {
  [UserActions.ADD]: {
    icon: UserRoundPlus,
    color: 'text-gray-300',
    ghostHoverBg: 'hover:bg-white/10',
    labelKey: 'friends.add',
  },
  [UserActions.PLAY]: {
    icon: Gamepad2,
    color: 'text-gray-300',
    ghostHoverBg: 'hover:bg-white/10',
    labelKey: 'friends.play',
  },
  [UserActions.REMOVE]: {
    icon: UserRoundMinus,
    color: 'text-red-400',
    ghostHoverBg: 'hover:bg-red-500/20',
    labelKey: 'friends.remove',
  },
  [UserActions.CHANGE]: {
    icon: UserRoundMinus,
    color: 'text-red-400',
    ghostHoverBg: 'hover:bg-red-500/20',
    labelKey: 'friends.remove',
  },
};

interface ActionButtonProps {
  /** Which action this button represents */
  action: UserActions;
  /** Click handler */
  onClick: (e: React.MouseEvent) => void;
  /** Show text label next to icon */
  showLabel?: boolean;
  /** Button size */
  size?: 'sm' | 'md';
  /** Visual style — solid for primary actions, ghost for subtle/list actions */
  variant?: 'solid' | 'ghost';
  /** Additional CSS classes */
  className?: string;
}

/**
 * ActionButton — Reusable action button for user interactions.
 * Centralizes icon, color, and label configuration for all UserActions.
 *
 * Variants:
 * - `solid` (default): filled background, for prominent actions (Add friend)
 * - `ghost`: transparent, for subtle list actions (Remove friend on hover)
 */
const ActionButton = ({
  action,
  onClick,
  showLabel = false,
  size = 'md',
  variant = 'solid',
  className = '',
}: ActionButtonProps) => {
  const { t } = useTranslation();
  const config = ACTION_CONFIG[action];
  const Icon = config.icon;
  const iconSize = size === 'sm' ? 14 : 16;

  const variantClasses =
    variant === 'solid'
      ? 'bg-slate-600 hover:bg-slate-500'
      : `bg-transparent ${config.ghostHoverBg}`;

  const sizeClasses = size === 'sm' ? 'p-1.5' : showLabel ? 'px-2.5 py-1.5' : 'p-2';

  return (
    <button
      onClick={onClick}
      className={`shrink-0 flex items-center gap-1.5 ${sizeClasses} rounded-full ${variantClasses} active:scale-95 transition-all ${className}`}
      title={t(config.labelKey)}
    >
      <Icon className={config.color} size={iconSize} />
      {showLabel && (
        <span className="text-gray-300 font-quantico text-xs whitespace-nowrap">
          {t(config.labelKey)}
        </span>
      )}
    </button>
  );
};

export default ActionButton;
