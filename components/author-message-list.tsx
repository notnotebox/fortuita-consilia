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
}

export function AuthorMessageList({
  messages,
  currentUserId,
  authorId,
  authorTag,
}: AuthorMessageListProps) {
  const [localMessages, setLocalMessages] = React.useState(messages);
  const pendingDeleteIdsRef = React.useRef<Set<string>>(new Set());

  const refreshAuthorMessages = React.useCallback(async () => {
    const queryParams = new URLSearchParams({
      authorId,
      skip: "0",
      take: "100",
    });

    const response = await fetch(`/api/messages?${queryParams}`);
    if (!response.ok) {
      throw new Error("Failed to fetch author messages");
    }

    const freshMessages = (await response.json()) as Message[];
    return freshMessages.filter(
      (message) => !pendingDeleteIdsRef.current.has(message.id),
    );
  }, [authorId]);

  // Sync when messages prop changes
  React.useEffect(() => {
    setLocalMessages(messages);
  }, [messages]);

  React.useEffect(() => {
    const socket = getRealtimeSocket();

    const onCreated = (payload: MessageCreatedEvent) => {
      if (payload.authorTag !== authorTag) return;
      if (pendingDeleteIdsRef.current.has(payload.id)) return;

      setLocalMessages((prev) => {
        if (prev.some((message) => message.id === payload.id)) {
          return prev;
        }
        return [payload, ...prev];
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
  }, [authorTag]);

  const handleDelete = React.useCallback(async (messageId: string) => {
    pendingDeleteIdsRef.current.add(messageId);
    setLocalMessages((prev) => prev.filter((m) => m.id !== messageId));

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
  );
}
