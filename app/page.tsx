"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { H1 } from "@/components/typography";

export default function HomePage() {
  const [value, setValue] = React.useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  const autoResize = React.useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    const minHeight = 28;
    const style = window.getComputedStyle(el);
    const lineHeight = Number.parseFloat(style.lineHeight) || 16;
    const padding =
      Number.parseFloat(style.paddingTop) +
      Number.parseFloat(style.paddingBottom);
    const border =
      Number.parseFloat(style.borderTopWidth) +
      Number.parseFloat(style.borderBottomWidth);
    const maxHeight = Math.max(minHeight, lineHeight * 10 + padding + border);

    el.style.height = "0px";
    const nextHeight = Math.min(el.scrollHeight, maxHeight);
    el.style.height = `${Math.max(nextHeight, minHeight)}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  }, []);

  React.useEffect(() => {
    autoResize();
  }, [autoResize]);

  return (
    <div className="flex min-h-[calc(100dvh-5rem)] flex-col gap-10 py-6">
      <header className="flex items-center justify-between gap-4">
        <H1 className="text-2xl lg:text-3xl">Fortuita Consilia</H1>
        <div className="flex items-center gap-2">
          <Button variant="ghost">About</Button>
          <Button variant="outline">Login</Button>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center">
        <div className="mx-auto w-full max-w-3xl">
          <div className="relative mx-auto w-full max-w-2xl sm:w-[36rem]">
            <div className="relative h-7 w-full overflow-visible">
              <Textarea
                placeholder="If you must, begin..."
                className="absolute bottom-0 left-0 w-full min-h-7 resize-none rounded-none border-0 border-b border-input bg-transparent dark:bg-transparent pl-0 py-1.5 text-sm leading-6 focus-visible:border-ring focus-visible:ring-0"
                ref={textareaRef}
                rows={1}
                value={value}
                onChange={(event) => setValue(event.target.value)}
                onInput={autoResize}
              />
            </div>

            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {value.length} characters
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="h-7 shrink-0 gap-2"
                  data-icon="inline-start"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="size-4"
                  >
                    <path
                      d="M12 16V4m0 0l-4 4m4-4l4 4M4 20h16"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Upload
                </Button>
                <Button size="sm" className="h-7 w-7 shrink-0 px-0">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="size-4"
                  >
                    <path
                      d="M6 10l6 6 6-6"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Button>
              </div>
            </div>
            <div className="mt-3 h-px w-full bg-border" />
          </div>
        </div>
      </main>
    </div>
  );
}
