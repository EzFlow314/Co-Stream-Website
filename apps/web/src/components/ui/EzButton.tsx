import type { ButtonHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";
import styles from "./EzButton.module.css";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary";
  styleKind?: "tape" | "neonFrame" | "proFrame";
};

export function EzButton({ children, variant = "primary", styleKind = "proFrame", className, ...props }: Props) {
  return <button {...props} className={clsx(styles.base, styles[variant], styles[styleKind], className)}>{children}</button>;
}
