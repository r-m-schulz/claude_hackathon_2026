import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactElement, ReactNode } from "react";
import { cloneElement, isValidElement } from "react";

type ButtonProps = {
  asChild?: boolean;
  variant?: "default" | "outline" | "link";
  size?: "default" | "sm";
  className?: string;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

function joinClasses(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function variantClasses(variant: ButtonProps["variant"]) {
  if (variant === "outline") {
    return "border bg-white text-black";
  }

  if (variant === "link") {
    return "border-0 bg-transparent text-blue-700";
  }

  return "border border-transparent bg-slate-900 text-white";
}

function sizeClasses(size: ButtonProps["size"]) {
  if (size === "sm") {
    return "text-sm px-2 py-1";
  }

  return "text-sm px-3 py-2";
}

const baseClass = "inline-flex items-center justify-center gap-2 rounded-(--radius)";

export function Button({
  asChild,
  variant = "default",
  size = "default",
  className,
  children,
  ...props
}: ButtonProps) {
  const composedClassName = joinClasses(baseClass, variantClasses(variant), sizeClasses(size), className);

  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<AnchorHTMLAttributes<HTMLAnchorElement>>;

    return cloneElement(child, {
      className: joinClasses(child.props.className, composedClassName),
    });
  }

  return (
    <button {...props} className={composedClassName}>
      {children}
    </button>
  );
}