import { AvatarSize } from '../../types/react-types';

interface AvatarProps {
  src?: string;
  alt?: string;
  size?: AvatarSize;
  avatarUrl?: string | null;
  className?: string;
}

const Avatar = ({
  src = 'default.png',
  alt = 'User avatar',
  size = 'md',
  className = '',
}: AvatarProps) => {
  const sizeClasses: Record<AvatarSize, string> = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
  };

  const getImageUrl = (name: string) => {
    return new URL(`../../assets/avatars/${name}`, import.meta.url).href;
  };

  const displaySrc = getImageUrl(src);

  return (
    <div
      className={`
        ${sizeClasses[size]} 
        rounded-full overflow-hidden border-2 border-white shadow-sm bg-cyan-200 
        flex items-center justify-center 
        ${className}
      `}
    >
      <img src={displaySrc} alt={alt} className="w-full h-full object-cover" />
    </div>
  );
};

export default Avatar;
