"use client";

import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getRealtimeSocket(): Socket {
  if (socket) return socket;

  socket = io({
    path: "/socket.io",
    transports: ["websocket"],
    autoConnect: true,
    timeout: 1500,
    reconnectionAttempts: 2,
    reconnectionDelayMax: 2000,
  });

  return socket;
}
