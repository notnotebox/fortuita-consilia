"use client";

import * as React from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggleGroup() {
  const { resolvedTheme, setTheme, theme } = useTheme();
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    setReady(true);
  }, []);

  const updateTheme = React.useCallback((nextValue: string) => {
    if (nextValue !== "light" && nextValue !== "dark") return;
    setTheme(nextValue);
  }, [setTheme]);

  const activeTheme = theme === "system" ? resolvedTheme : theme;

  if (!ready || !activeTheme) {
    return null;
  }

  return (
    <ToggleGroup value={activeTheme} onValueChange={updateTheme}>
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
