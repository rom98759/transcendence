// Props
interface ToggleProps {
  isEnabled?: boolean;
  onToggle: () => void;
  className?: string;
}

const Toggle = ({ isEnabled = false, onToggle, className = '' }: ToggleProps) => {
  return (
    <div
      onClick={onToggle}
      className={`w-12 h-6 flex items-center bg-gray-300 rounded-full cursor-pointer ${
        isEnabled ? 'bg-green-400' : 'bg-gray-300'
      }
      ${className}`}
    >
      <div
        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ml-1 ${
          isEnabled ? 'translate-x-6' : ''
        }`}
      />
    </div>
  );
};

export default Toggle;
