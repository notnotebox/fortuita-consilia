"use client";

import * as React from "react";
import { MessageCard, type Message } from "./message-card";

interface MessageFeedProps {
  onLoadMore?: () => Promise<Message[]>;
}

function formatDateLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

// Mock data generator for demo purposes
function generateMockMessage(index: number): Message {
  const pseudos = [
    "Alice",
    "Bob",
    "Charlie",
    "Diana",
    "Eve",
    "Frank",
    "Grace",
    "Henry",
  ];
  const messages = [
    "Lorem ipsum dolor sit amet.",
    "Consectetur adipiscing elit.",
    "Sed do eiusmod tempor incididunt.",
    "Ut labore et dolore magna aliqua.",
    "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
    "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
    "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
    "Curabitur pretium tincidunt lacus. Nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra, est eros bibendum elit.",
    "Proin sapien ipsum, porta a, auctor quis, euismod ut, mi. Aenean viverra rhoncus pede. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas.",
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer finibus, justo non dictum feugiat, tortor nisl tincidunt est, id dignissim velit erat nec mauris. Suspendisse potenti. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Sed sed sem vitae justo volutpat maximus. Donec eget eros faucibus, hendrerit nibh nec, laoreet magna. Proin interdum, mauris in mattis placerat, metus ligula finibus velit, vitae gravida dui massa eget ipsum.",
  ];
  const randomMessage = messages[Math.floor(Math.random() * messages.length)];
  const randomPseudo = pseudos[Math.floor(Math.random() * pseudos.length)];
  const createdAt = new Date(
    Date.now() - (index * 6 + Math.floor(Math.random() * 6)) * 60 * 60 * 1000,
  );

  return {
    id: `msg-${index}`,
    pseudo: randomPseudo,
    content: randomMessage,
    ratio: `${Math.floor(Math.random() * 50) + 1}`,
    date: formatDateLabel(createdAt),
  };
}

export const MessageFeed = React.forwardRef<HTMLDivElement, MessageFeedProps>(
  ({ onLoadMore }, ref) => {
    const [messages, setMessages] = React.useState<Message[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [hasMore, setHasMore] = React.useState(true);
    const observerTarget = React.useRef<HTMLDivElement | null>(null);

    // Initialize with first batch of 10 messages
    React.useEffect(() => {
      const initialMessages = Array.from({ length: 10 }, (_, i) =>
        generateMockMessage(i),
      );
      setMessages(initialMessages);
    }, []);

    // Infinite scroll handler
    React.useEffect(() => {
      if (!observerTarget.current || !hasMore) return;

      const observer = new IntersectionObserver(
        async (entries) => {
          if (entries[0]?.isIntersecting && !isLoading && hasMore) {
            setIsLoading(true);
            try {
              if (onLoadMore) {
                const newMessages = await onLoadMore();
                if (newMessages.length === 0) {
                  setHasMore(false);
                } else {
                  setMessages((prev) => [...prev, ...newMessages]);
                }
              } else {
                // Mock loading: generate 10 more messages
                const startIndex = messages.length;
                const newMessages = Array.from({ length: 10 }, (_, i) =>
                  generateMockMessage(startIndex + i),
                );
                setMessages((prev) => [...prev, ...newMessages]);
              }
            } catch (error) {
              console.error("Failed to load more messages:", error);
            } finally {
              setIsLoading(false);
            }
          }
        },
        { threshold: 0.1, rootMargin: "200px" },
      );

      observer.observe(observerTarget.current);

      return () => {
        observer.disconnect();
      };
    }, [isLoading, hasMore, messages.length, onLoadMore]);

    return (
      <div ref={ref} className="w-full max-w-6xl mx-auto">
        <div className="space-y-0">
          {messages.map((message) => (
            <MessageCard key={message.id} message={message} />
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
              <span className="text-sm">Chargement...</span>
            </div>
          )}
        </div>
      </div>
    );
  },
);

MessageFeed.displayName = "MessageFeed";


