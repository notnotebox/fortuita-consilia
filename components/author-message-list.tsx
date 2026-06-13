"use client";

import React from "react";
import { MessageCard, type Message } from "./message-card";
import { getRealtimeSocket } from "@/lib/realtime/client";
import type {
  MessageCreatedEvent,
  MessageDeletedEvent,
} from "@/lib/realtime/types";

interface AuthorMessageListProps {
  messages: Message[];
  currentUserId?: string;
  authorId: string;
  authorTag: string;
  totalCount?: number;
}

function getRequesterId(): string {
  const key = "write-run-session-id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;

  const created = Math.random().toString(36).slice(2);
  localStorage.setItem(key, created);
  return created;
}

export function AuthorMessageList({
  messages,
  currentUserId,
  authorId,
  authorTag,
  totalCount = messages.length,
}: AuthorMessageListProps) {
  const isOwnAuthorPage = Boolean(currentUserId) && currentUserId === authorId;
  const [localMessages, setLocalMessages] = React.useState(messages);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const pendingDeleteIdsRef = React.useRef<Set<string>>(new Set());
  const observerTarget = React.useRef<HTMLDivElement | null>(null);
  const loadedIdsRef = React.useRef<Set<string>>(new Set(messages.map((m) => m.id)));
  const hasMoreRef = React.useRef(messages.length < totalCount);
  const isLoadingRef = React.useRef(false);

  const fetchAuthorMessages = React.useCallback(async (skip: number, take: number) => {
    const queryParams = new URLSearchParams({
      authorId,
      skip: String(skip),
      take: String(take),
    });

    const response = await fetch(`/api/messages?${queryParams}`, {
      headers: {
        "x-requester-id": getRequesterId(),
      },
    });
    if (!response.ok) {
      throw new Error("Failed to fetch author messages");
    }

    return (await response.json()) as Message[];
  }, [authorId]);

  const refreshAuthorMessages = React.useCallback(async () => {
    const freshMessages = await fetchAuthorMessages(0, Math.max(localMessages.length, 10));
    return freshMessages.filter((message) => !pendingDeleteIdsRef.current.has(message.id));
  }, [fetchAuthorMessages, localMessages.length]);

  const loadMoreMessages = React.useCallback(async () => {
    if (isLoadingRef.current || !hasMoreRef.current) return;
    isLoadingRef.current = true;
    setIsLoadingMore(true);
    try {
      const newMessages = await fetchAuthorMessages(localMessages.length, 10);
      if (newMessages.length === 0) {
        hasMoreRef.current = false;
        return;
      }

      const uniqueMessages = newMessages.filter((message) => {
        if (loadedIdsRef.current.has(message.id)) return false;
        loadedIdsRef.current.add(message.id);
        return true;
      });

      if (uniqueMessages.length === 0) {
        hasMoreRef.current = false;
        return;
      }

      setLocalMessages((prev) => [...prev, ...uniqueMessages]);
      hasMoreRef.current = localMessages.length + uniqueMessages.length < totalCount;
    } catch (error) {
      console.error("Failed to load more author messages:", error);
    } finally {
      isLoadingRef.current = false;
      setIsLoadingMore(false);
    }
  }, [fetchAuthorMessages, localMessages.length, totalCount]);

  // Sync when messages prop changes
  React.useEffect(() => {
    setLocalMessages(messages);
    loadedIdsRef.current = new Set(messages.map((message) => message.id));
    hasMoreRef.current = messages.length < totalCount;
  }, [messages, totalCount]);

  React.useEffect(() => {
    const socket = getRealtimeSocket();

    const onCreated = (payload: MessageCreatedEvent) => {
      if (payload.authorTag !== authorTag) return;
      if (pendingDeleteIdsRef.current.has(payload.id)) return;

      setLocalMessages((prev) => {
        if (prev.some((message) => message.id === payload.id)) {
          return prev;
        }
        const isOwnMessage = isOwnAuthorPage;
        const nextMessage: Message = isOwnMessage
          ? { ...payload, userId: currentUserId }
          : payload;
        return [nextMessage, ...prev];
      });
    };

    const onDeleted = (payload: MessageDeletedEvent) => {
      pendingDeleteIdsRef.current.delete(payload.id);
      setLocalMessages((prev) =>
        prev.filter((message) => message.id !== payload.id),
      );
    };

    socket.on("message:created", onCreated);
    socket.on("message:deleted", onDeleted);

    return () => {
      socket.off("message:created", onCreated);
      socket.off("message:deleted", onDeleted);
    };
  }, [authorTag, currentUserId, isOwnAuthorPage]);

  React.useEffect(() => {
    if (!observerTarget.current || !hasMoreRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMoreMessages();
        }
      },
      { threshold: 0.1, rootMargin: "200px" },
    );

    observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [loadMoreMessages]);

  const handleDelete = React.useCallback(async (messageId: string) => {
    pendingDeleteIdsRef.current.add(messageId);
    setLocalMessages((prev) => prev.filter((m) => m.id !== messageId));

    try {
      const response = await fetch("/api/messages/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-requester-id": getRequesterId(),
        },
        body: JSON.stringify({ messageId }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete message");
      }
    } catch (error) {
      console.error("Error deleting message:", error);
      alert("Failed to delete message");
      try {
        const freshMessages = await refreshAuthorMessages();
        setLocalMessages(freshMessages);
      } catch (refreshError) {
        console.error("Failed to restore author messages:", refreshError);
      }
    } finally {
      pendingDeleteIdsRef.current.delete(messageId);
    }
  }, [refreshAuthorMessages]);

  return (
    <>
      <div className="space-y-0">
        {localMessages.map((message) => (
          <MessageCard
            key={message.id}
            message={message}
            showAuthorMeta={false}
            align="left"
            withHorizontalInset={false}
            currentUserId={currentUserId}
            onDelete={handleDelete}
          />
        ))}
      </div>
      <div ref={observerTarget} className="flex justify-center py-8">
        {isLoadingMore ? (
          <span className="text-sm text-muted-foreground">Loading...</span>
        ) : null}
      </div>
    </>
  );
}
