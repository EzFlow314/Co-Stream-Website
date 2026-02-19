import type { InputHTMLAttributes } from "react";
import clsx from "clsx";

export function EzInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={clsx("ez-input", props.className)} />;
}
