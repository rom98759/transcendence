import { Mail, Lock, User } from 'lucide-react';
import { InputHTMLAttributes, useId } from 'react';
import { twMerge } from 'tailwind-merge';
import { clsx, type ClassValue } from 'clsx';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ICON_MAP = {
  email: Mail,
  password: Lock,
  username: User,
} as const;

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
  customType?: 'email' | 'password' | 'username';
  errorMessage?: string;
}

export const Input = ({
  className: containerClassName = '',
  className = '',
  customType,
  errorMessage,
  id,
  ...props
}: InputProps) => {
  const generatedId = useId();
  const inputId = id || generatedId;
  const errorId = `${inputId}-error`;
  const hasError = Boolean(errorMessage);
  const Icon = customType ? ICON_MAP[customType] : null;
  const type = customType === 'password' ? 'password' : 'text';
  const borderClass = hasError
    ? 'border-red-400 focus:ring-red-400'
    : 'border-gray-300 focus:ring-blue-300';

  return (
    <div className={cn(`mt-3 flex flex-col gap-1.5 w-full`, containerClassName)}>
      <div className="relative flex items-center">
        {Icon && (
          <div
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            aria-hidden="true"
          >
            <Icon size={18} />
          </div>
        )}
        <input
          {...props}
          id={inputId}
          type={type}
          aria-invalid={hasError ? 'true' : 'false'}
          aria-describedby={hasError ? errorId : undefined}
          className={cn(
            'w-full rounded-md border py-2.5 text-sm transition-all focus:outline-none focus:ring-2',
            'ring-offset-1 ring-offset-transparent',
            Icon ? 'pl-10 pr-3' : 'px-3',
            borderClass,
            className,
          )}
        />
      </div>

      {hasError && (
        <>
          {' '}
          <span id={errorId} role="alert" className="text-sm text-red-400 font-medium">
            {errorMessage}
          </span>
        </>
      )}
    </div>
  );
};
