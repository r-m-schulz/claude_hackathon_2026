import type { LabelHTMLAttributes } from "react";

type LabelProps = LabelHTMLAttributes<HTMLLabelElement>;

export function Label({ className, style, ...props }: LabelProps) {
  const classes = ["text-sm font-medium", className].filter(Boolean).join(" ");

  return (
    <label
      {...props}
      className={classes}
      style={{
        fontSize: 14,
        fontWeight: 600,
        color: "#172033",
        ...(style ?? {}),
      }}
    />
  );
}
