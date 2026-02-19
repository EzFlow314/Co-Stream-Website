import type { ReactNode } from "react";
import clsx from "clsx";

export function EzPanel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={clsx("ez-panel", className)}>{children}</section>;
}
