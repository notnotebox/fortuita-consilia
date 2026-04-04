"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { appendRandomChar, deleteLastChar } from "@/app/actions/random-char";

export default function HomePage() {
  const MAX_VISIBLE_LINES = 7;
  const [value, setValue] = React.useState("");
  const [isFocused, setIsFocused] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const valueRef = React.useRef(value);
  const opQueueRef = React.useRef(Promise.resolve());
  React.useEffect(() => {
    valueRef.current = value;
  }, [value]);
  const appendRandom = React.useCallback(async () => {
    opQueueRef.current = opQueueRef.current.then(async () => {
      const next = await appendRandomChar(valueRef.current);
      valueRef.current = next;
      setValue(next);
    });
  }, []);
  const deleteOne = React.useCallback(async () => {
    opQueueRef.current = opQueueRef.current.then(async () => {
      const next = await deleteLastChar(valueRef.current);
      valueRef.current = next;
      setValue(next);
    });
  }, []);
  const insertLineBreak = React.useCallback(async () => {
    opQueueRef.current = opQueueRef.current.then(async () => {
      const next = `${valueRef.current}\n`;
      valueRef.current = next;
      setValue(next);
    });
  }, []);
  const moveCaretToEnd = React.useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    const end = el.value.length;
    if (el.selectionStart !== end || el.selectionEnd !== end) {
      el.setSelectionRange(end, end);
    }
    el.scrollTop = el.scrollHeight;
  }, []);

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
    const maxHeight = Math.max(
      minHeight,
      lineHeight * MAX_VISIBLE_LINES + padding + border,
    );
    if (containerRef.current) {
      containerRef.current.style.height = `${maxHeight}px`;
    }
    el.style.height = "0px";
    const nextHeight = Math.min(el.scrollHeight, maxHeight);
    const finalHeight = Math.max(nextHeight, minHeight);
    el.style.height = `${finalHeight}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [MAX_VISIBLE_LINES]);

  React.useEffect(() => {
    autoResize();
  }, [value, autoResize]);

  React.useEffect(() => {
    moveCaretToEnd();
  }, [value, moveCaretToEnd]);

  return (
    <div className="flex flex-1 flex-col gap-10 py-6">
      <main className="flex flex-1 items-center justify-center">
        <div className="mx-auto w-full max-w-3xl">
          <div className="relative mx-auto w-full max-w-2xl sm:w-xl">
            <div ref={containerRef} className="relative w-full">
              <Textarea
                placeholder="If you must, begin..."
                className="absolute bottom-0 left-0 w-full min-h-7 resize-none rounded-none border-0 border-b border-input bg-transparent dark:bg-transparent pl-0 py-1.5 text-sm leading-6 caret-transparent break-all overflow-x-hidden focus-visible:border-ring focus-visible:ring-0"
                ref={textareaRef}
                rows={1}
                value={
                  isFocused ? (value.length === 0 ? "_" : `${value}_`) : value
                }
                readOnly
                onInput={autoResize}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onClick={moveCaretToEnd}
                onSelect={moveCaretToEnd}
                onKeyDown={(event) => {
                  if (event.key === "Backspace" || event.key === "Delete") {
                    event.preventDefault();
                    void deleteOne();
                    return;
                  }
                  if (
                    event.key === "ArrowLeft" ||
                    event.key === "ArrowUp" ||
                    event.key === "Home" ||
                    event.key === "PageUp"
                  ) {
                    event.preventDefault();
                  }
                  const isTypingKey =
                    event.key.length === 1 &&
                    !event.ctrlKey &&
                    !event.metaKey &&
                    !event.altKey;
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void insertLineBreak();
                    return;
                  }
                  if (isTypingKey) {
                    event.preventDefault();
                    void appendRandom();
                  }
                  requestAnimationFrame(moveCaretToEnd);
                }}
                onBeforeInput={(event) => {
                  const nativeEvent = event.nativeEvent as InputEvent;
                  if (nativeEvent.inputType?.startsWith("delete")) return;
                  event.preventDefault();
                }}
                onPaste={(event) => {
                  event.preventDefault();
                  void appendRandom();
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  void appendRandom();
                }}
              />
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {value.length} characters
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="h-5 w-5 text-muted-foreground/70 hover:text-muted-foreground"
                  aria-label="Reset input"
                  onClick={() => setValue("")}
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="size-3"
                  >
                    <path
                      d="M6 6l12 12M18 6l-12 12"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Button>
              </div>
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
