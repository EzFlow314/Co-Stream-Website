import type { InputHTMLAttributes } from "react";

export function EzToggle({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className="ez-toggle"><input type="checkbox" {...props} /> {label}</label>;
}
