"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type CustomScrollAreaProps = {
  children: React.ReactNode;
  className?: string;
  viewportClassName?: string;
  contentClassName?: string;
  viewportRef?: React.MutableRefObject<HTMLDivElement | null>;
  autoHeight?: boolean;
  maxHeight?: number;
  onViewportScroll?: (scrollTop: number) => void;
  onViewportPointerLeave?: () => void;
};

const MIN_THUMB_PX = 32;
const TRACK_INSET_PX = 8;

type CustomScrollbarProps = {
  viewportRef: React.RefObject<HTMLElement | null>;
  enabled?: boolean;
};

/** The shared scrollbar used by both scroll areas and standalone inputs. */
export function CustomScrollbar({ viewportRef, enabled = true }: CustomScrollbarProps) {
  const [thumbTop, setThumbTop] = React.useState(0);
  const [thumbHeight, setThumbHeight] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);
  const dragOffsetRef = React.useRef(0);

  const recalc = React.useCallback(() => {
    const element = viewportRef.current;
    if (!element) return;

    const { scrollTop, scrollHeight, clientHeight } = element;
    if (scrollHeight <= clientHeight) {
      setThumbHeight(0);
      setThumbTop(0);
      return;
    }

    const trackHeight = Math.max(0, clientHeight - TRACK_INSET_PX * 2);
    const nextThumbHeight = Math.max(
      MIN_THUMB_PX,
      (clientHeight / scrollHeight) * trackHeight,
    );
    const maxThumbTop = Math.max(0, trackHeight - nextThumbHeight);
    const maxScrollTop = scrollHeight - clientHeight;
    setThumbHeight(nextThumbHeight);
    setThumbTop(
      maxScrollTop > 0
        ? TRACK_INSET_PX + (scrollTop / maxScrollTop) * maxThumbTop
        : TRACK_INSET_PX,
    );
  }, [viewportRef]);

  React.useLayoutEffect(() => {
    if (!enabled) {
      setThumbHeight(0);
      setThumbTop(0);
      return;
    }

    const element = viewportRef.current;
    if (!element) return;

    recalc();
    const observer = new ResizeObserver(recalc);
    observer.observe(element);
    element.addEventListener("scroll", recalc, { passive: true });
    window.addEventListener("resize", recalc);
    return () => {
      observer.disconnect();
      element.removeEventListener("scroll", recalc);
      window.removeEventListener("resize", recalc);
    };
  }, [enabled, recalc, viewportRef]);

  React.useEffect(() => {
    if (!dragging) return;

    const onMove = (event: PointerEvent) => {
      const element = viewportRef.current;
      if (!element || thumbHeight <= 0) return;

      const rect = element.getBoundingClientRect();
      const pointerY = event.clientY - rect.top - dragOffsetRef.current;
      const trackHeight = Math.max(0, element.clientHeight - TRACK_INSET_PX * 2);
      const maxThumbTop = Math.max(0, trackHeight - thumbHeight);
      const clampedThumbTop = Math.max(
        TRACK_INSET_PX,
        Math.min(pointerY, TRACK_INSET_PX + maxThumbTop),
      );
      const scrollRatio =
        maxThumbTop > 0
          ? (clampedThumbTop - TRACK_INSET_PX) / maxThumbTop
          : 0;
      element.scrollTop = scrollRatio * (element.scrollHeight - element.clientHeight);
    };

    const onUp = () => setDragging(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragging, thumbHeight, viewportRef]);

  if (!enabled || thumbHeight <= 0) return null;

  return (
    <div className="pointer-events-none absolute right-1 top-0 z-10 h-full w-2">
      <div className="absolute inset-y-2 left-1/2 w-1 -translate-x-1/2 rounded-none bg-muted/15" />
      <button
        type="button"
        className={`pointer-events-auto absolute left-1/2 w-1 -translate-x-1/2 rounded-none bg-foreground/18 transition-colors hover:bg-foreground/30${
          dragging ? " bg-foreground/40" : ""
        }`}
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
  );
}

export function CustomScrollArea({
  children,
  className,
  viewportClassName,
  contentClassName,
  viewportRef: externalViewportRef,
  autoHeight = false,
  maxHeight,
  onViewportScroll,
  onViewportPointerLeave,
}: CustomScrollAreaProps) {
  const viewportRef = React.useRef<HTMLDivElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const [resolvedHeight, setResolvedHeight] = React.useState<number>();
  const [thumbTop, setThumbTop] = React.useState(0);
  const [thumbHeight, setThumbHeight] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);
  const dragOffsetRef = React.useRef(0);

  const recalc = React.useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;

    const { scrollTop, scrollHeight, clientHeight } = el;
    if (autoHeight && contentRef.current) {
      const nextHeight = Math.min(contentRef.current.scrollHeight, maxHeight ?? Number.POSITIVE_INFINITY);
      setResolvedHeight((current) => (current === nextHeight ? current : nextHeight));
    }
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
  }, [autoHeight, maxHeight]);

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
    const mutationObserver = new MutationObserver(() => {
      window.requestAnimationFrame(recalc);
    });

    observer.observe(el);
    if (contentRef.current) observer.observe(contentRef.current);
    mutationObserver.observe(el, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      window.cancelAnimationFrame(raf);
      observer.disconnect();
      mutationObserver.disconnect();
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
    <div
      className={cn(
        "relative min-h-0",
        autoHeight ? "overflow-hidden" : "h-full",
        className,
      )}
      style={
        autoHeight
          ? {
          maxHeight: maxHeight !== undefined ? maxHeight : undefined,
              height: resolvedHeight,
            }
          : undefined
      }
    >
      <div
        ref={(element) => {
          viewportRef.current = element;
          if (externalViewportRef) {
            externalViewportRef.current = element;
          }
        }}
        className={cn(
          autoHeight && resolvedHeight === undefined ? "h-auto" : "h-full",
          "scrollbar-none overflow-y-auto",
          viewportClassName,
        )}
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
        onScroll={(event) => {
          recalc();
          onViewportScroll?.(event.currentTarget.scrollTop);
        }}
        onPointerLeave={onViewportPointerLeave}
      >
        <div ref={contentRef} className={cn(autoHeight ? "" : "min-h-full", "pr-12", contentClassName)}>
          {children}
        </div>
      </div>

      {thumbHeight > 0 ? (
        <div className="pointer-events-none absolute right-1 top-0 h-full w-2">
          <div className="absolute inset-y-2 left-1/2 w-1 -translate-x-1/2 rounded-none bg-muted/15" />
          <button
            type="button"
            className={cn(
              "pointer-events-auto absolute left-1/2 w-1 -translate-x-1/2 rounded-none bg-foreground/18 transition-colors hover:bg-foreground/30",
              dragging ? "bg-foreground/40" : "",
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
