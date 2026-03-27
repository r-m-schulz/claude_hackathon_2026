import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  const classes = [
    "w-full rounded-(--radius) border px-3 py-2 text-sm",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <input {...props} className={classes} style={{ paddingLeft: "10px" }} />;
}