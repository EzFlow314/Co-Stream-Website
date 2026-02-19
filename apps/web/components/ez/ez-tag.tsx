import type { ReactNode } from "react";
import clsx from "clsx";

export function EzTag({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={clsx("ez-tag", className)}>{children}</span>;
}
