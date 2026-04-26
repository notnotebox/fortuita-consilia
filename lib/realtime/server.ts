import { getUserTag } from "@/lib/user-tag";
import type {
  MessageCreatedEvent,
  MessageDeletedEvent,
  RealtimeServer,
} from "@/lib/realtime/types";

function getRealtimeServer(): RealtimeServer | undefined {
  return globalThis.__io;
}

export function emitMessageCreated(payload: MessageCreatedEvent): void {
  const io = getRealtimeServer();
  if (!io) return;

  io.emit("message:created", payload);
  io.emit(`author:${payload.authorTag}:message:created`, payload);
}

export function emitMessageDeleted(payload: MessageDeletedEvent): void {
  const io = getRealtimeServer();
  if (!io) return;

  io.emit("message:deleted", payload);
}

export function buildCreatedMessagePayload(input: {
  id: string;
  content: string;
  tries: number;
  createdAt: Date;
  author?: {
    name?: string | null;
    discordTag?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
}): MessageCreatedEvent {
  const pseudo =
    input.author?.name || input.author?.email?.split("@")[0] || "Unknown";
  const authorTag = getUserTag({
    name: input.author?.name ?? null,
    discordTag: input.author?.discordTag ?? null,
    email: input.author?.email ?? null,
  });

  return {
    id: input.id,
    content: input.content,
    ratio: String(input.tries),
    pseudo,
    avatar: input.author?.image ?? undefined,
    authorTag,
    date: new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    }).format(input.createdAt),
  };
}
