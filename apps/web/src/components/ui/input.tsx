import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, style, ...props }: InputProps) {
  const classes = [
    "w-full rounded-(--radius) border px-3 py-2 text-sm",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <input
      {...props}
      className={classes}
      style={{
        width: "100%",
        borderRadius: "var(--radius)",
        border: "1px solid #d6dde8",
        padding: "12px 14px",
        fontSize: 14,
        color: "#172033",
        background: "#ffffff",
        ...(style ?? {}),
      }}
    />
  );
}
