import clsx from "clsx";
import type { ReactNode } from "react";

export interface LoginfieldProps {
  children?: ReactNode;
  /** Merged last, so a caller can override anything set here. */
  className?: string;
}

export function LoginField({ children, className }: LoginfieldProps) {
  return <div className={clsx("", className)}>{children}</div>;
}
