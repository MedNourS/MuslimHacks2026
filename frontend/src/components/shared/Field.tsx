import clsx from "clsx";
import { useId, type InputHTMLAttributes } from "react";

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
}

export function Field({ label, error, helperText, id, className, ...rest }: FieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className="mb-3.5">
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-semibold text-ink-900">
        {label}
      </label>
      <input
        id={inputId}
        className={clsx(
          "w-full rounded-lg border-1.5 px-3.5 py-3 text-base text-ink-900 outline-none transition-colors",
          "placeholder:text-ink-400",
          "focus:border-sage-500 focus:ring-3 focus:ring-sage-100",
          error ? "border-danger-500" : "border-ink-200",
          className
        )}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
        {...rest}
      />
      {error && (
        <p id={`${inputId}-error`} className="mt-1.5 text-xs font-medium text-danger-600">
          {error}
        </p>
      )}
      {!error && helperText && (
        <p id={`${inputId}-helper`} className="mt-1.5 text-xs text-ink-500">
          {helperText}
        </p>
      )}
    </div>
  );
}
