import type { ReactNode } from "react";
import clsx from "clsx";

export function EzCard({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx("ez-card", className)}>{children}</div>;
}
