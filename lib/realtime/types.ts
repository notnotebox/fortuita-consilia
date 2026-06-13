import type { Server as SocketIOServer } from "socket.io";

export type RealtimeServer = SocketIOServer;

declare global {
  var __io: RealtimeServer | undefined;
}

export type MessageCreatedEvent = {
  id: string;
  publicId: string;
  content: string;
  ratio: string;
  ratioDetails: string;
  pseudo: string;
  avatar?: string;
  authorTag: string;
  date: string;
};

export type MessageDeletedEvent = {
  id: string;
};
