import type { PropsWithChildren } from "react";

type InfiniteSliderProps = {
  speed?: number;
  gap?: number;
};

export function InfiniteSlider({ children, speed = 40, gap = 80 }: PropsWithChildren<InfiniteSliderProps>) {
  const duration = Math.max(10, 160 / speed);

  return (
    <div className="slider-shell" aria-hidden>
      <div
        className="slider-track"
        style={{ animationDuration: `${duration}s`, columnGap: `${gap}px` }}
      >
        {children}
        {children}
      </div>
    </div>
  );
}
