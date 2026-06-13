"use client";

import * as React from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Moon, Sun } from "lucide-react";

type ThemeMode = "light" | "dark";

const THEME_KEY = "fc-theme";

function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
}

export function ThemeToggleGroup() {
  const [theme, setTheme] = React.useState<ThemeMode>("light");
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY);
    const nextTheme: ThemeMode =
      stored === "dark" || stored === "light"
        ? stored
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    setTheme(nextTheme);
    applyTheme(nextTheme);
    setReady(true);
  }, []);

  const updateTheme = React.useCallback((nextValue: string) => {
    if (nextValue !== "light" && nextValue !== "dark") return;
    const nextTheme = nextValue as ThemeMode;
    setTheme(nextTheme);
    localStorage.setItem(THEME_KEY, nextTheme);
    applyTheme(nextTheme);
  }, []);

  if (!ready) {
    return null;
  }

  return (
    <ToggleGroup value={theme} onValueChange={updateTheme}>
      <ToggleGroupItem
        value="light"
        title="Switch to light theme"
        ariaLabel="Switch to light theme"
      >
        <Sun className="size-3.5" aria-hidden="true" />
        <span className="sr-only">Light</span>
      </ToggleGroupItem>
      <ToggleGroupItem
        value="dark"
        title="Switch to dark theme"
        ariaLabel="Switch to dark theme"
      >
        <Moon className="size-3.5" aria-hidden="true" />
        <span className="sr-only">Dark</span>
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
