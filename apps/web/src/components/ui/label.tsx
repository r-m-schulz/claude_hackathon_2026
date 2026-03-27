import type { LabelHTMLAttributes } from "react";

type LabelProps = LabelHTMLAttributes<HTMLLabelElement>;

export function Label({ className, ...props }: LabelProps) {
  const classes = ["text-sm font-medium", className].filter(Boolean).join(" ");

  return <label {...props} className={classes} />;
}