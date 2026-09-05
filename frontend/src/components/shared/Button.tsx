import clsx from "clsx";
import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
export type ButtonSize = "default" | "lg";

export function buttonStyles(variant: ButtonVariant = "primary", size: ButtonSize = "default") {
  return clsx(
    "inline-flex items-center justify-center gap-2 font-semibold transition-colors",
    "disabled:cursor-not-allowed disabled:opacity-60",
    size === "default" && "rounded-xl px-5 py-3 text-sm",
    size === "lg" && "rounded-2xl px-6 py-4 text-base",
    variant === "primary" && "bg-sage-500 text-white hover:bg-sage-700",
    variant === "secondary" && "border-1.5 border-sage-500 bg-transparent text-sage-700 hover:bg-sage-50",
    variant === "ghost" && "bg-transparent text-ink-900 hover:bg-sand-200",
    variant === "destructive" && "bg-danger-600 text-white hover:bg-danger-700"
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  variant = "primary",
  size = "default",
  isLoading,
  fullWidth,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={clsx(buttonStyles(variant, size), fullWidth && "w-full", className)}
      disabled={disabled || isLoading}
      {...rest}
    >
      {isLoading ? "Please wait…" : children}
    </button>
  );
}
