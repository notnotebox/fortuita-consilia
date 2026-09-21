"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { CustomScrollArea } from "@/components/custom-scroll-area";
import { MessageCard, type Message } from "@/components/message-card";
import { toPublicMessageId } from "@/lib/message-metrics";
import { getRealtimeClient } from "@/lib/realtime/client";
import { getUserTag } from "@/lib/user-tag";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

export type MessageListSource =
  | { kind: "all" }
  | { kind: "author"; authorId: string }
  | { kind: "single"; messageId: string };

type MessageListProps = {
  source: MessageListSource;
  initialMessages?: Message[];
  totalCount?: number;
  layout?: "feed" | "author" | "single";
  maxLines?: number | null;
  contentMaxHeight?: number;
  scroll?: "fill" | "available" | "none";
  className?: string;
  viewportClassName?: string;
  scrollContentClassName?: string;
};

function getRequesterId(): string {
  const key = "write-run-session-id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;

  const created = crypto.randomUUID();
  localStorage.setItem(key, created);
  return created;
}

async function fetchMessages(
  source: MessageListSource,
  skip: number,
  take: number,
): Promise<Message[]> {
  if (source.kind === "single") {
    try {
      const response = await fetch(`/api/messages/${source.messageId}`);
      return response.ok ? [(await response.json()) as Message] : [];
    } catch (error) {
      console.warn("Failed to fetch message", error);
      return [];
    }
  }

  const params = new URLSearchParams({ skip: String(skip), take: String(take) });
  if (source.kind === "author") params.set("authorId", source.authorId);

  try {
    const response = await fetch(`/api/messages?${params}`, {
      headers: { "x-requester-id": getRequesterId() },
    });

    if (!response.ok) {
      if (response.status !== 503) {
        console.warn("Failed to fetch messages", { status: response.status });
      }
      return [];
    }

    return (await response.json()) as Message[];
  } catch (error) {
    console.warn("Failed to fetch messages", error);
    return [];
  }
}

function getSourceKey(source: MessageListSource) {
  if (source.kind === "author") return `author:${source.authorId}`;
  if (source.kind === "single") return `single:${source.messageId}`;
  return source.kind;
}

export function MessageList({
  source,
  initialMessages = [],
  totalCount,
  layout = "feed",
  maxLines = layout === "single" ? null : 5,
  contentMaxHeight,
  scroll = "none",
  className,
  viewportClassName,
  scrollContentClassName,
}: MessageListProps) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const currentUserTag = React.useMemo(
    () => (session?.user ? getUserTag(session.user) : null),
    [session?.user],
  );
  const sourceKey = getSourceKey(source);
  const sourceAuthorId = source.kind === "author" ? source.authorId : undefined;
  const sourceMessageId = source.kind === "single" ? source.messageId : undefined;
  const stableSource = React.useMemo<MessageListSource>(
    () => {
      if (source.kind === "author") return { kind: "author", authorId: sourceAuthorId! };
      if (source.kind === "single") return { kind: "single", messageId: sourceMessageId! };
      return { kind: "all" };
    },
    [source.kind, sourceAuthorId, sourceMessageId],
  );
  const [messages, setMessages] = React.useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = React.useState(source.kind !== "single" && initialMessages.length === 0);
  const observerTargetRef = React.useRef<HTMLDivElement | null>(null);
  const scrollViewportRef = React.useRef<HTMLDivElement | null>(null);
  const availableViewportRef = React.useRef<HTMLDivElement | null>(null);
  const [availableTextHeight, setAvailableTextHeight] = React.useState<number>();
  const loadedIdsRef = React.useRef(new Set(initialMessages.map((message) => message.id)));
  const skipRef = React.useRef(initialMessages.length);
  const isLoadingRef = React.useRef(false);
  const hasMoreRef = React.useRef(
    source.kind !== "single" && (totalCount === undefined || initialMessages.length < totalCount),
  );
  const messagesRef = React.useRef(initialMessages);
  const pendingDeleteIdsRef = React.useRef(new Set<string>());

  React.useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  React.useLayoutEffect(() => {
    if (scroll !== "available") return;
    const element = availableViewportRef.current;
    if (!element) return;

    const recalculate = () => {
      // The card itself contributes two 1rem vertical paddings around the text area.
      setAvailableTextHeight(Math.max(0, element.clientHeight - 32));
    };
    recalculate();
    const observer = new ResizeObserver(recalculate);
    observer.observe(element);
    return () => observer.disconnect();
  }, [scroll]);

  const loadMessages = React.useCallback(async (initial = false) => {
    if (isLoadingRef.current || (!initial && (!hasMoreRef.current || stableSource.kind === "single"))) return;

    isLoadingRef.current = true;
    setIsLoading(true);
    try {
      const nextMessages = await fetchMessages(stableSource, initial ? 0 : skipRef.current, PAGE_SIZE);
      if (nextMessages.length === 0) {
        hasMoreRef.current = false;
        return;
      }

      const uniqueMessages = nextMessages.filter((message) => {
        if (loadedIdsRef.current.has(message.id)) return false;
        loadedIdsRef.current.add(message.id);
        return true;
      });

      if (uniqueMessages.length === 0) {
        hasMoreRef.current = false;
        return;
      }

      skipRef.current += uniqueMessages.length;
      if (totalCount !== undefined && skipRef.current >= totalCount) {
        hasMoreRef.current = false;
      }
      setMessages((previous) => (initial ? [...uniqueMessages, ...previous] : [...previous, ...uniqueMessages]));
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, [stableSource, totalCount]);

  React.useEffect(() => {
    const nextMessages = initialMessages;
    setMessages(nextMessages);
    messagesRef.current = nextMessages;
    loadedIdsRef.current = new Set(nextMessages.map((message) => message.id));
    skipRef.current = nextMessages.length;
    hasMoreRef.current = source.kind !== "single" && (
      totalCount === undefined || nextMessages.length < totalCount
    );
    isLoadingRef.current = false;
    setIsLoading(source.kind !== "single" && nextMessages.length === 0);

    if (nextMessages.length === 0) {
      void loadMessages(true);
    }
  // `sourceKey` deliberately controls reset; server arrays are the initial SSR snapshot.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceKey]);

  React.useEffect(() => {
    const target = observerTargetRef.current;
    if (!target || source.kind === "single") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMessages();
      },
      {
        root: scroll === "fill" ? scrollViewportRef.current : null,
        rootMargin: "200px",
        threshold: 0.1,
      },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [loadMessages, scroll, source.kind]);

  const addCreatedMessage = React.useCallback((message: Message) => {
    if (pendingDeleteIdsRef.current.has(message.id)) return;

    setMessages((previous) => {
      if (previous.some((item) => item.id === message.id)) return previous;
      const isOwnMessage = Boolean(currentUserId && currentUserTag && message.authorTag === currentUserTag);
      loadedIdsRef.current.add(message.id);
      skipRef.current += 1;
      hasMoreRef.current = true;
      return [{ ...message, ...(isOwnMessage ? { userId: currentUserId } : {}) }, ...previous];
    });
  }, [currentUserId, currentUserTag]);

  React.useEffect(() => {
    if (stableSource.kind === "single") return;
    const supabase = getRealtimeClient();

    const onCreated = async (payload: { new: Record<string, unknown> }) => {
      const id = typeof payload.new.id === "string" ? payload.new.id : null;
      const shortId = typeof payload.new.shortId === "string" ? payload.new.shortId : null;
      const authorId = typeof payload.new.authorId === "string" ? payload.new.authorId : null;
      if (!id || !shortId || pendingDeleteIdsRef.current.has(id)) return;
      if (stableSource.kind === "author" && authorId !== stableSource.authorId) return;

      const response = await fetch(`/api/messages/${toPublicMessageId(shortId)}`);
      if (response.ok) addCreatedMessage((await response.json()) as Message);
    };

    const onDeleted = (payload: { old: Record<string, unknown> }) => {
      const id = typeof payload.old.id === "string" ? payload.old.id : null;
      if (!id) return;
      pendingDeleteIdsRef.current.delete(id);
      loadedIdsRef.current.delete(id);
      setMessages((previous) => previous.filter((message) => message.id !== id));
    };

    const channel = supabase
      ?.channel(`messages-${sourceKey}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "Message" }, onCreated)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "Message" }, onDeleted)
      .subscribe();

    const pollTimer = window.setInterval(async () => {
      const latest = await fetchMessages(stableSource, 0, PAGE_SIZE);
      for (const message of [...latest].reverse()) addCreatedMessage(message);
    }, 10_000);

    return () => {
      window.clearInterval(pollTimer);
      if (channel && supabase) void supabase.removeChannel(channel);
    };
  }, [addCreatedMessage, sourceKey, stableSource]);

  const handleDelete = React.useCallback(async (messageId: string) => {
    pendingDeleteIdsRef.current.add(messageId);
    setMessages((previous) => previous.filter((message) => message.id !== messageId));
    loadedIdsRef.current.delete(messageId);

    try {
      const response = await fetch("/api/messages/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-requester-id": getRequesterId() },
        body: JSON.stringify({ messageId }),
      });
      if (!response.ok) throw new Error("Failed to delete message");
    } catch (error) {
      console.error("Failed to delete message", error);
      const restored = await fetchMessages(stableSource, 0, Math.max(messagesRef.current.length + 1, PAGE_SIZE));
      const visible = restored.filter((message) => !pendingDeleteIdsRef.current.has(message.id));
      loadedIdsRef.current = new Set(visible.map((message) => message.id));
      skipRef.current = visible.length;
      hasMoreRef.current = totalCount === undefined || visible.length < totalCount;
      setMessages(visible);
      alert("Unable to delete this message. Please try again.");
    } finally {
      pendingDeleteIdsRef.current.delete(messageId);
    }
  }, [stableSource, totalCount]);

  const cards = (
    <>
      {isLoading && messages.length === 0 ? (
        <div className="space-y-0" aria-label="Loading messages">
          {[0, 1, 2].map((index) => (
            <div key={index} className="mx-auto w-full max-w-2xl py-4 sm:w-xl">
              <div className="h-12 w-full rounded-sm bg-muted/20 animate-pulse" />
            </div>
          ))}
        </div>
      ) : null}
      {messages.map((message) => (
        <MessageCard
          key={message.id}
          message={message}
          currentUserId={currentUserId}
          onDelete={handleDelete}
          showAuthorMeta={layout !== "author"}
          showMessageLink={layout !== "single"}
          align={layout === "single" ? "left" : "center"}
          // The list viewport owns the shared horizontal gutter. Keeping the
          // card itself flush here makes feed, author and detail layouts line up.
          withHorizontalInset={false}
          // Keep the metadata in the same side rail as the message page.
          // Inline metadata is what caused the author list to look centered.
          detailsLayout="side"
          truncateContent={maxLines !== null}
          maxLines={maxLines}
          scrollContent={layout === "single" && maxLines === null}
          contentMaxHeight={
            layout === "single"
              ? (scroll === "available" ? availableTextHeight : contentMaxHeight)
              : undefined
          }
        />
      ))}
      {source.kind !== "single" ? (
        <div ref={observerTargetRef} className="flex justify-center py-8" aria-label="Load more messages">
          {isLoading && messages.length > 0 ? <span className="text-sm text-muted-foreground">Loading...</span> : null}
        </div>
      ) : null}
    </>
  );

  if (scroll === "fill") {
    return (
      <CustomScrollArea
        className={className}
        viewportClassName={cn(layout === "author" && "px-0", viewportClassName)}
        contentClassName={cn("px-4", scrollContentClassName)}
        viewportRef={scrollViewportRef}
      >
        <div className="w-full max-w-6xl mx-auto">{cards}</div>
      </CustomScrollArea>
    );
  }

  if (scroll === "available") {
    return (
      <div ref={availableViewportRef} className={cn("h-full min-h-0", className)}>
        {cards}
      </div>
    );
  }

  return <div className={className}>{cards}</div>;
}
