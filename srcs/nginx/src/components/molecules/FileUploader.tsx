import Button from '../atoms/Button';

// Props
interface ButtonProps {
  onClick: () => void;
  className?: string;
}

const FileUploader = ({ onClick, className = '' }: ButtonProps) => {
  return (
    <div
      className={`border border-gray-300 p-6 w-full max-w-sm flex flex-col items-center justify-center text-center bg-white shadow-sm ${className}`}
    >
      <Button onClick={onClick} variant="secondary" className="mb-2">
        Choose a file
      </Button>
      <p className="text-xs font-bold text-slate-700 mt-2">or drag and drop it here</p>
      <p className="text-xs text-gray-400 mt-1">jpg, png (min 64 x 64)</p>
    </div>
  );
};

export default FileUploader;
