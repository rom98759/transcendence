import defaultAvatar from '../../assets/avatars/default.png';
import { AvatarSize } from '../../core/react-types';

interface AvatarProps {
  src?: string;
  alt?: string;
  size?: AvatarSize;
  avatarUrl?: string;
  className?: string;
}

const Avatar = ({
  src = defaultAvatar,
  alt = 'User avatar',
  size = 'md',
  className = '',
}: AvatarProps) => {
  const sizeClasses: Record<AvatarSize, string> = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
  };

  return (
    <div
      className={`
        ${sizeClasses[size]} 
        rounded-full overflow-hidden border-2 border-white shadow-sm bg-cyan-200 
        flex items-center justify-center 
        ${className}
      `}
    >
      <img src={src} alt={alt} className="w-full h-full object-cover" />
    </div>
  );
};

export default Avatar;
