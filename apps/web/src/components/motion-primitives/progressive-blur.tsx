import type { HTMLAttributes } from "react";

type ProgressiveBlurProps = HTMLAttributes<HTMLDivElement> & {
  direction: "left" | "right";
  blurIntensity?: number;
};

export function ProgressiveBlur({ direction, blurIntensity = 1, className, ...props }: ProgressiveBlurProps) {
  const gradient =
    direction === "left"
      ? "linear-gradient(90deg, rgba(255,255,255,1), rgba(255,255,255,0))"
      : "linear-gradient(270deg, rgba(255,255,255,1), rgba(255,255,255,0))";

  return (
    <div
      {...props}
      className={className}
      style={{
        pointerEvents: "none",
        position: "absolute",
        top: 0,
        bottom: 0,
        width: 80,
        filter: `blur(${blurIntensity}px)`,
        background: gradient,
      }}
    />
  );
}
