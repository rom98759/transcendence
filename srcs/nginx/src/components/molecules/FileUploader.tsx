import { useRef, useState } from 'react';
import Button from '../atoms/Button';
import { useTranslation } from 'react-i18next';

// Props
interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  className?: string;
}

const FileUploader = ({ onFileSelect, className = '' }: FileUploaderProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOver, setIsOver] = useState(false);
  const { t } = useTranslation();
  const handleFile = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      alert('unsupported format'); // TODO modal
      return;
    }

    onFileSelect(file);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsOver(false);
        handleFile(e.dataTransfer.files);
      }}
      className={`border-2 border-dashed p-6 w-full max-w-sm flex flex-col items-center justify-center text-center
        transition-colors ${isOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'} 
        ${className}`}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleFile(e.target.files)}
        accept="image/jpeg,image/png"
        className="hidden"
      />

      <Button onClick={() => fileInputRef.current?.click()} variant="secondary" className="mb-2">
        {t('file_uploader.file_choose')}
      </Button>
      <p className="text-xs font-bold text-slate-700 mt-2">
        {isOver ? t('file_uploader.drop') : t('file_uploader.drag')}
      </p>
      <p className="text-xs text-gray-400 mt-1">jpg, png (min 64 x 64)</p>
    </div>
  );
};

export default FileUploader;
