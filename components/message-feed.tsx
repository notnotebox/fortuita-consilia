"use client";

import * as React from "react";
import { MessageCard, type Message } from "./message-card";
import { useSession } from "next-auth/react";
import { getRealtimeSocket } from "@/lib/realtime/client";
import type {
  MessageCreatedEvent,
  MessageDeletedEvent,
} from "@/lib/realtime/types";

interface MessageFeedProps {
  onLoadMore?: () => Promise<Message[]>;
}

async function fetchMessages(skip: number, take: number, signal?: AbortSignal): Promise<Message[]> {
  const queryParams = new URLSearchParams({
    skip: String(skip),
    take: String(take),
  });
  try {
    const response = await fetch(`/api/messages?${queryParams}`, { signal });

    if (!response.ok) {
      console.warn("Failed to fetch messages", { status: response.status });
      return [];
    }

    const payload = (await response.json()) as Message[];
    return payload;
  } catch (error) {
    console.warn("Failed to fetch messages", error);
    return [];
  }
}

export const MessageFeed = React.forwardRef<HTMLDivElement, MessageFeedProps>(
  ({ onLoadMore }, ref) => {
    const { data: session } = useSession();
    const currentUserId = session?.user?.id;
    const [messages, setMessages] = React.useState<Message[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [, setHasMore] = React.useState(true);
    const observerTarget = React.useRef<HTMLDivElement | null>(null);
    const skipRef = React.useRef(0);
    const loadedIdsRef = React.useRef<Set<string>>(new Set());
    const isLoadingRef = React.useRef(false);
    const hasMoreRef = React.useRef(true);
    const messagesRef = React.useRef<Message[]>([]);
    const pendingDeleteIdsRef = React.useRef<Set<string>>(new Set());

    React.useEffect(() => {
      messagesRef.current = messages;
    }, [messages]);

    const loadMessages = React.useCallback(
      async (isInitial: boolean = false) => {
        if (isLoadingRef.current || !hasMoreRef.current) return;

        isLoadingRef.current = true;
        setIsLoading(true);
        try {
          if (onLoadMore) {
            const newMessages = await onLoadMore();
            if (newMessages.length === 0) {
              hasMoreRef.current = false;
              setHasMore(false);
            } else {
              // Filter out duplicates
              const uniqueMessages = newMessages.filter((msg: Message) => {
                if (loadedIdsRef.current.has(msg.id)) {
                  return false;
                }
                loadedIdsRef.current.add(msg.id);
                return true;
              });

              setMessages((prev) =>
                isInitial ? uniqueMessages : [...prev, ...uniqueMessages]
              );
              skipRef.current += uniqueMessages.length;
            }
          } else {
            const newMessages = await fetchMessages(skipRef.current, 10);
            if (newMessages.length === 0) {
              hasMoreRef.current = false;
              setHasMore(false);
            } else {
              // Filter out duplicates
              const uniqueMessages = newMessages.filter((msg: Message) => {
                if (loadedIdsRef.current.has(msg.id)) {
                  return false;
                }
                loadedIdsRef.current.add(msg.id);
                return true;
              });

              setMessages((prev) =>
                isInitial ? uniqueMessages : [...prev, ...uniqueMessages]
              );
              skipRef.current += uniqueMessages.length;
            }
          }
        } catch (error) {
          console.error("Failed to load messages:", error);
        } finally {
          isLoadingRef.current = false;
          setIsLoading(false);
        }
      },
      [onLoadMore]
    );

    const handleDelete = React.useCallback(
      async (messageId: string) => {
        pendingDeleteIdsRef.current.add(messageId);
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
        loadedIdsRef.current.delete(messageId);
        try {
          const response = await fetch("/api/messages/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messageId }),
          });

          if (!response.ok) {
            throw new Error("Failed to delete message");
          }
        } catch (error) {
          console.error("Error deleting message:", error);
          alert("Failed to delete message");
          // Roll back by refreshing the currently visible window.
          try {
            const currentSize = Math.max(messagesRef.current.length, 10);
            const refreshed = await fetchMessages(0, currentSize);
            const filtered = refreshed.filter(
              (message) => !pendingDeleteIdsRef.current.has(message.id),
            );
            loadedIdsRef.current = new Set(filtered.map((message) => message.id));
            skipRef.current = filtered.length;
            hasMoreRef.current = true;
            setHasMore(true);
            setMessages(filtered);
          } catch (refreshError) {
            console.error("Error restoring messages after delete failure:", refreshError);
          }
        } finally {
          pendingDeleteIdsRef.current.delete(messageId);
        }
      },
      []
    );

    // Initialize with first batch of messages
    React.useEffect(() => {
      loadMessages(true);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Infinite scroll handler
    React.useEffect(() => {
      if (!observerTarget.current || !hasMoreRef.current) return;

      const observer = new IntersectionObserver(
        async (entries) => {
          if (entries[0]?.isIntersecting && !isLoadingRef.current && hasMoreRef.current) {
            loadMessages(false);
          }
        },
        { threshold: 0.1, rootMargin: "200px" },
      );

      observer.observe(observerTarget.current);

      return () => {
        observer.disconnect();
      };
    }, [loadMessages]);

    React.useEffect(() => {
      if (onLoadMore) return;

      const socket = getRealtimeSocket();

      const onCreated = (payload: MessageCreatedEvent) => {
        if (pendingDeleteIdsRef.current.has(payload.id)) return;

        setMessages((prev) => {
          if (prev.some((message) => message.id === payload.id)) {
            return prev;
          }
          loadedIdsRef.current.add(payload.id);
          skipRef.current += 1;
          hasMoreRef.current = true;
          setHasMore(true);
          return [payload, ...prev];
        });
      };

      const onDeleted = (payload: MessageDeletedEvent) => {
        setMessages((prev) => {
          if (!prev.some((message) => message.id === payload.id)) {
            return prev;
          }
          loadedIdsRef.current.delete(payload.id);
          skipRef.current = Math.max(0, skipRef.current - 1);
          pendingDeleteIdsRef.current.delete(payload.id);
          return prev.filter((message) => message.id !== payload.id);
        });
      };

      socket.on("message:created", onCreated);
      socket.on("message:deleted", onDeleted);

      return () => {
        socket.off("message:created", onCreated);
        socket.off("message:deleted", onDeleted);
      };
    }, [onLoadMore]);

    return (
      <div ref={ref} className="w-full max-w-6xl mx-auto">
        <div className="space-y-0">
          {messages.map((message) => (
            <MessageCard
              key={message.id}
              message={message}
              currentUserId={currentUserId}
              onDelete={handleDelete}
            />
          ))}
        </div>

        {/* Intersection observer target */}
        <div
          ref={observerTarget}
          className="flex justify-center py-8"
          aria-label="Load more messages"
        >
          {isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <svg
                className="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span className="text-sm">Loading...</span>
            </div>
          )}
        </div>
      </div>
    );
  },
);

MessageFeed.displayName = "MessageFeed";
