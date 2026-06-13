"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type CustomScrollAreaProps = {
  children: React.ReactNode;
  className?: string;
  viewportClassName?: string;
};

const MIN_THUMB_PX = 32;
const TRACK_INSET_PX = 8;

export function CustomScrollArea({
  children,
  className,
  viewportClassName,
}: CustomScrollAreaProps) {
  const viewportRef = React.useRef<HTMLDivElement | null>(null);
  const [thumbTop, setThumbTop] = React.useState(0);
  const [thumbHeight, setThumbHeight] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);
  const dragOffsetRef = React.useRef(0);

  const recalc = React.useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;

    const { scrollTop, scrollHeight, clientHeight } = el;
    if (scrollHeight <= clientHeight) {
      setThumbHeight(0);
      setThumbTop(0);
      return;
    }

    const trackHeight = Math.max(0, clientHeight - TRACK_INSET_PX * 2);
    const ratio = clientHeight / scrollHeight;
    const nextThumbHeight = Math.max(MIN_THUMB_PX, ratio * trackHeight);
    const maxThumbTop = Math.max(0, trackHeight - nextThumbHeight);
    const maxScrollTop = scrollHeight - clientHeight;
    const nextThumbTop =
      maxScrollTop > 0
        ? TRACK_INSET_PX + (scrollTop / maxScrollTop) * maxThumbTop
        : TRACK_INSET_PX;

    setThumbHeight(nextThumbHeight);
    setThumbTop(nextThumbTop);
  }, []);

  React.useLayoutEffect(() => {
    recalc();
    const raf = window.requestAnimationFrame(recalc);
    const el = viewportRef.current;
    if (!el) {
      return () => window.cancelAnimationFrame(raf);
    }

    const onScroll = () => recalc();
    const onResize = () => recalc();
    const observer = new ResizeObserver(onResize);

    observer.observe(el);
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      window.cancelAnimationFrame(raf);
      observer.disconnect();
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [recalc]);

  React.useEffect(() => {
    if (!dragging) return;

      const onMove = (event: PointerEvent) => {
      const el = viewportRef.current;
      if (!el || thumbHeight <= 0) return;

      const rect = el.getBoundingClientRect();
      const pointerY = event.clientY - rect.top - dragOffsetRef.current;
      const trackHeight = Math.max(0, el.clientHeight - TRACK_INSET_PX * 2);
      const maxThumbTop = Math.max(0, trackHeight - thumbHeight);
      const clampedThumbTop = Math.max(
        TRACK_INSET_PX,
        Math.min(pointerY, TRACK_INSET_PX + maxThumbTop),
      );
      const scrollRatio =
        maxThumbTop > 0 ? (clampedThumbTop - TRACK_INSET_PX) / maxThumbTop : 0;
      const maxScrollTop = el.scrollHeight - el.clientHeight;

      el.scrollTop = scrollRatio * maxScrollTop;
    };

    const onUp = () => setDragging(false);

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragging, thumbHeight]);

  return (
    <div className={cn("relative h-full", className)}>
      <div
        ref={viewportRef}
        className={cn("h-full overflow-y-auto pr-4", viewportClassName)}
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {children}
      </div>

      {thumbHeight > 0 ? (
        <div className="pointer-events-none absolute right-1 top-0 h-full w-2">
          <div className="absolute inset-y-2 left-1/2 w-1 -translate-x-1/2 rounded-none bg-muted/40" />
          <button
            type="button"
            className={cn(
              "pointer-events-auto absolute left-1/2 w-1 -translate-x-1/2 rounded-none bg-foreground/45 transition-colors hover:bg-foreground/60",
              dragging ? "bg-foreground/65" : "",
            )}
            style={{ top: thumbTop, height: thumbHeight }}
            onPointerDown={(event) => {
              const targetRect = event.currentTarget.getBoundingClientRect();
              dragOffsetRef.current = event.clientY - targetRect.top;
              setDragging(true);
              event.preventDefault();
            }}
            aria-label="Scroll content"
          />
        </div>
      ) : null}
    </div>
  );
}
