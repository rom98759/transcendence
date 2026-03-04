import { useState, useRef, useEffect } from 'react';
import { Pencil } from 'lucide-react';
import Button from '../atoms/Button';
import { Input } from '../atoms/Input';

interface EditableFieldProps {
  label: string;
  value: string;
  onSave: (newValue: string) => void;
  onCancel?: () => void;
  error?: string | null;
  isPending?: boolean;
}

export const EditableField = ({
  label,
  value,
  onSave,
  onCancel,
  error,
  isPending = false,
}: EditableFieldProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  useEffect(() => {
    setIsEditing(false);
    setLocalValue(value);
  }, [value]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCancel = () => {
    setIsEditing(false);
    setLocalValue(value);
    if (onCancel) onCancel();
  };

  const handleSave = () => {
    const trimmedValue = localValue.trim();
    if (trimmedValue === '') {
      return;
    }
    onSave(trimmedValue);
  };

  return isEditing ? (
    <div className="mt-4">
      <h1 className="mb-2 text-gray-600 font-bold text-xl font-quantico">{label}</h1>
      <div className="flex flex-row justify-between items-center gap-2">
        <Input
          ref={inputRef}
          value={localValue}
          errorMessage={error}
          onChange={(e) => setLocalValue(e.target.value)}
          className="h-20 border p-1"
          disabled={isPending}
        />

        <Button onClick={handleSave} variant="primary" className="px-2 py-2" disabled={isPending}>
          Save
        </Button>

        <Button onClick={handleCancel} variant="secondary" className="px-2 py-2">
          Cancel
        </Button>
      </div>
    </div>
  ) : (
    <div className="flex flex-row justify-between items-center mt-4">
      <p className="mr-3 ts-form-title">{value}</p>
      <Pencil className="cursor-pointer" color="white" onClick={() => setIsEditing(true)} />
    </div>
  );
};
