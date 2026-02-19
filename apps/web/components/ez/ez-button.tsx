import type { ButtonHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; variant?: "primary" | "muted" | "danger" };

export function EzButton({ children, className, variant = "primary", ...props }: Props) {
  return <button className={clsx("ez-btn", `ez-btn-${variant}`, className)} {...props}>{children}</button>;
}
