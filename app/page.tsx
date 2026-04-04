"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { generateNextChar } from "@/lib/write-run/shared";
import type {
  CommitPayload,
  RunOp,
  RunOpType,
  RunStartResponse,
} from "@/lib/write-run/types";

export default function HomePage() {
  const MAX_VISIBLE_LINES = 7;
  const REFRESH_INPUT_LOCK_MS = 1000;
  const [value, setValue] = React.useState("");
  const [isFocused, setIsFocused] = React.useState(false);
  const [run, setRun] = React.useState<RunStartResponse | null>(null);
  const [status, setStatus] = React.useState<string>("Preparing run...");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isLoadingNewSeed, setIsLoadingNewSeed] = React.useState(false);
  const [isInputLocked, setIsInputLocked] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const valueRef = React.useRef(value);
  const consumedRef = React.useRef(0);
  const opsRef = React.useRef<RunOp[]>([]);
  const sessionIdRef = React.useRef<string>("");

  const pushOp = React.useCallback((type: RunOpType) => {
    const operations = opsRef.current;
    const last = operations[operations.length - 1];
    if (last && last.t === type) {
      last.n += 1;
      return;
    }
    operations.push({ t: type, n: 1 });
  }, []);

  const createRun = React.useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsLoadingNewSeed(true);
    }
    console.log("[write-run] start: requesting new run");
    try {
      const response = await fetch("/api/write-run/start", {
        method: "POST",
        headers: {
          "x-requester-id": sessionIdRef.current,
        },
      });

      if (response.status === 429) {
        const cooldown = (await response.json()) as {
          ok: false;
          reason: string;
          retryAfterMs: number;
        };
        console.warn("[write-run] start: cooldown enforced", cooldown);
        // Lock input during cooldown period
        setIsInputLocked(true);
        await new Promise((resolve) =>
          setTimeout(resolve, cooldown.retryAfterMs),
        );
        setIsInputLocked(false);
        return createRun(isRefresh);
      }

      if (!response.ok) {
        console.error("[write-run] start: request failed", {
          status: response.status,
          statusText: response.statusText,
        });
        throw new Error("Failed to start run");
      }

      const nextRun = (await response.json()) as RunStartResponse;
      console.log("[write-run] start: run ready", {
        runId: nextRun.runId,
        seedPreview: `${nextRun.seed.slice(0, 8)}...`,
        expiresAt: nextRun.expiresAt,
        maxOps: nextRun.maxOps,
        maxConsumed: nextRun.maxConsumed,
      });
      setRun(nextRun);
      setStatus("Run ready");
      consumedRef.current = 0;
      opsRef.current = [];
      valueRef.current = "";
      setValue("");
      return nextRun;
    } catch (error) {
      console.error("[write-run] start: error", error);
      const message = error instanceof Error ? error.message : "unknown error";
      setStatus(`Error: ${message}`);
    } finally {
      if (isRefresh) {
        setIsLoadingNewSeed(false);
      }
    }
  }, []);

  React.useEffect(() => {
    valueRef.current = value;
  }, [value]);

  React.useEffect(() => {
    // Initialize session id then always request the first run once on mount.
    if (!sessionIdRef.current) {
      sessionIdRef.current =
        localStorage.getItem("write-run-session-id") ||
        Math.random().toString(36).slice(2);
      localStorage.setItem("write-run-session-id", sessionIdRef.current);
    }

    createRun().catch((e) => {
      console.error("[write-run] init error:", e);
      setStatus(`Init failed: ${e instanceof Error ? e.message : "unknown"}`);
    });
  }, [createRun]);

  const appendRandom = React.useCallback(() => {
    if (!run) return;
    const nextChar = generateNextChar(run.seed, consumedRef.current);
    consumedRef.current += 1;
    const next = `${valueRef.current}${nextChar}`;
    valueRef.current = next;
    setValue(next);
    pushOp("A");
  }, [pushOp, run]);

  const deleteOne = React.useCallback(() => {
    const next = valueRef.current.slice(0, -1);
    if (next === valueRef.current) return;
    valueRef.current = next;
    setValue(next);
    if (next === "") {
      void createRun(true);
    } else {
      pushOp("D");
    }
  }, [pushOp, createRun]);

  const commitRun = React.useCallback(async () => {
    if (!run || isSubmitting) return;
    setIsSubmitting(true);
    setStatus("Validating run...");

    const payload: CommitPayload = {
      runId: run.runId,
      token: run.token,
      finalText: valueRef.current,
      consumedCount: consumedRef.current,
      ops: opsRef.current,
    };

    console.log("[write-run] commit: sending payload", {
      runId: payload.runId,
      consumedCount: payload.consumedCount,
      finalTextLength: payload.finalText.length,
      ops: payload.ops,
    });

    try {
      const response = await fetch("/api/write-run/commit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as {
        ok: boolean;
        reason?: string;
      };

      console.log("[write-run] commit: server response", {
        httpStatus: response.status,
        result,
      });

      if (!response.ok || !result.ok) {
        setStatus(`Rejected: ${result.reason ?? "unknown"}`);
        return;
      }

      setStatus("Run committed");
      await createRun();
    } catch (error) {
      console.error("[write-run] commit: network or runtime failure", error);
      setStatus(
        `Commit failed: ${error instanceof Error ? error.message : "unknown"}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [createRun, isSubmitting, run]);

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

  const showCooldownSpinner = isFocused && isInputLocked && value.length === 0;

  return (
    <div className="flex flex-1 flex-col gap-10 py-6">
      <main className="flex flex-1 items-center justify-center">
        <div className="mx-auto w-full max-w-3xl">
          <div className="group/confessional relative mx-auto w-full max-w-2xl sm:w-xl">
            <div ref={containerRef} className="relative w-full">
              <Textarea
                placeholder={showCooldownSpinner ? "" : "If you must, begin..."}
                className={`absolute bottom-0 left-0 w-full min-h-7 resize-none rounded-none border-0 border-b border-input bg-transparent dark:bg-transparent pl-0 py-1.5 text-sm leading-6 caret-transparent break-all overflow-x-hidden focus-visible:border-ring focus-visible:ring-0 ${
                  isLoadingNewSeed ? "opacity-50" : ""
                }`}
                ref={textareaRef}
                rows={1}
                value={
                  isFocused
                    ? isInputLocked
                      ? value
                      : value.length === 0
                        ? "_"
                        : `${value}_`
                    : value
                }
                readOnly
                onInput={autoResize}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onClick={moveCaretToEnd}
                onSelect={moveCaretToEnd}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    setIsFocused(false);
                    textareaRef.current?.blur();
                    return;
                  }
                  if (!run || isInputLocked) {
                    event.preventDefault();
                    return;
                  }
                  if (event.key === "Backspace" || event.key === "Delete") {
                    event.preventDefault();
                    deleteOne();
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
                    return;
                  }
                  if (isTypingKey) {
                    event.preventDefault();
                    appendRandom();
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
                  if (isInputLocked || !run) return;
                  appendRandom();
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  if (isInputLocked || !run) return;
                  appendRandom();
                }}
              />
              {showCooldownSpinner ? (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-[12px] left-0 text-muted-foreground/70 animate-[spin_1s_linear_infinite]"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="size-4">
                    <path
                      d="M4 12a8 8 0 0 1 13.66-5.66"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M20 12a8 8 0 0 1-13.66 5.66"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M17.66 6.34H14.5V3.18"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M6.34 17.66H9.5v3.16"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              ) : null}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {consumedRef.current} iterations
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className={`h-5 w-5 text-muted-foreground/70 hover:text-muted-foreground ${
                    isLoadingNewSeed ? "opacity-50 animate-pulse" : ""
                  }`}
                  aria-label="Reset input"
                  disabled={isLoadingNewSeed || undefined}
                  suppressHydrationWarning
                  onClick={() => {
                    void createRun(true);
                  }}
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
                  onClick={() => void commitRun()}
                  suppressHydrationWarning
                  disabled={isSubmitting || !run}
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
                  Commit
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
            <p className="mt-2 text-xs text-muted-foreground">{status}</p>
            {/* <div className="mt-3 h-px w-full bg-border" /> */}
          </div>
        </div>
      </main>
    </div>
  );
}
