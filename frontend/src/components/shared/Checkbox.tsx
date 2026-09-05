import { useId, type InputHTMLAttributes } from "react";

export interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function Checkbox({ label, id, className, ...rest }: CheckboxProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <label htmlFor={inputId} className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-900">
      <input
        id={inputId}
        type="checkbox"
        className="h-[18px] w-[18px] rounded-[5px] border-2 border-sage-500 accent-sage-500"
        {...rest}
      />
      {label}
    </label>
  );
}
