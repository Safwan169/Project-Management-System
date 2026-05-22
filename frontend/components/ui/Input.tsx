import { InputHTMLAttributes, ReactNode, forwardRef, useId } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, leftIcon, rightIcon, className, id, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hasError = Boolean(error);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-foreground">
          {label}
        </label>
      )}

      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
            {leftIcon}
          </span>
        )}

        <input
          ref={ref}
          id={inputId}
          aria-invalid={hasError}
          className={cn(
            'h-10 w-full rounded-lg border bg-white text-sm text-foreground transition-colors',
            'placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            leftIcon ? 'pl-10' : 'pl-3',
            rightIcon ? 'pr-10' : 'pr-3',
            hasError
              ? 'border-red-400 focus:border-red-400 focus:ring-red-200'
              : 'border-surface-border focus:border-primary-400 focus:ring-primary-100',
            className,
          )}
          {...props}
        />

        {rightIcon && (
          <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground">
            {rightIcon}
          </span>
        )}
      </div>

      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
});
