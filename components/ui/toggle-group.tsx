"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type ToggleGroupContextValue = {
  value: string;
  onValueChange: (value: string) => void;
};

const ToggleGroupContext = React.createContext<ToggleGroupContextValue | null>(
  null,
);

type ToggleGroupProps = {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  children: React.ReactNode;
};

export function ToggleGroup({
  value,
  onValueChange,
  className,
  children,
}: ToggleGroupProps) {
  return (
    <ToggleGroupContext.Provider value={{ value, onValueChange }}>
      <div
        role="group"
        aria-label="Theme selection"
        className={cn(
          "inline-flex items-center gap-1",
          className,
        )}
      >
        {children}
      </div>
    </ToggleGroupContext.Provider>
  );
}

type ToggleGroupItemProps = {
  value: string;
  children: React.ReactNode;
  className?: string;
  title?: string;
  ariaLabel?: string;
};

export function ToggleGroupItem({
  value,
  children,
  className,
  title,
  ariaLabel,
}: ToggleGroupItemProps) {
  const context = React.useContext(ToggleGroupContext);
  if (!context) {
    throw new Error("ToggleGroupItem must be used within ToggleGroup");
  }

  const active = context.value === value;

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={ariaLabel}
      title={title}
      onClick={() => context.onValueChange(value)}
      className={cn(
        "inline-flex h-7 min-w-7 items-center justify-center rounded-[min(var(--radius-md),8px)] px-1.5 transition-colors hover:cursor-pointer",
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}
