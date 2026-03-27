import type { AnchorHTMLAttributes, ButtonHTMLAttributes, CSSProperties, ReactElement, ReactNode } from "react";
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
    return {
      border: "1px solid #cbd5e1",
      background: "#ffffff",
      color: "#172033",
    } satisfies CSSProperties;
  }

  if (variant === "link") {
    return {
      border: "none",
      background: "transparent",
      color: "#1d4ed8",
      paddingLeft: 0,
      paddingRight: 0,
    } satisfies CSSProperties;
  }

  return {
    border: "1px solid transparent",
    background: "#0f172a",
    color: "#ffffff",
  } satisfies CSSProperties;
}

function sizeClasses(size: ButtonProps["size"]) {
  if (size === "sm") {
    return {
      fontSize: 14,
      padding: "6px 10px",
    } satisfies CSSProperties;
  }

  return {
    fontSize: 14,
    padding: "10px 14px",
  } satisfies CSSProperties;
}

const baseStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  borderRadius: "var(--radius)",
  fontWeight: 600,
  textDecoration: "none",
  cursor: "pointer",
};

export function Button({
  asChild,
  variant = "default",
  size = "default",
  className,
  children,
  style,
  ...props
}: ButtonProps) {
  const composedClassName = joinClasses(className);
  const composedStyle = {
    ...baseStyle,
    ...variantClasses(variant),
    ...sizeClasses(size),
    ...(style ?? {}),
  } satisfies CSSProperties;

  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<AnchorHTMLAttributes<HTMLAnchorElement>>;

    return cloneElement(child, {
      className: joinClasses(child.props.className, composedClassName),
      style: {
        ...composedStyle,
        ...(child.props.style ?? {}),
      },
    });
  }

  return (
    <button {...props} className={composedClassName} style={composedStyle}>
      {children}
    </button>
  );
}
