import type { ReactNode } from "react";
import clsx from "clsx";

export function EzBadge({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "success" | "danger" | "warn" }) {
  return <span className={clsx("ez-badge", `ez-badge-${tone}`)}>{children}</span>;
}
