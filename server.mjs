import { createServer } from "node:http";
import next from "next";
import { Server as SocketIOServer } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = Number.parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

function buildAllowedOrigins() {
  const values = [];

  if (process.env.ALLOWED_ORIGINS) {
    values.push(
      ...process.env.ALLOWED_ORIGINS.split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    );
  }

  if (process.env.NEXTAUTH_URL) {
    values.push(process.env.NEXTAUTH_URL.trim());
  }

  if (process.env.VERCEL_URL) {
    values.push(`https://${process.env.VERCEL_URL.trim()}`);
  }

  if (dev) {
    values.push("http://localhost:3000", "http://127.0.0.1:3000");
  }

  return new Set(values);
}

const allowedOrigins = buildAllowedOrigins();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io = new SocketIOServer(httpServer, {
    path: "/socket.io",
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.has(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error("Socket origin not allowed"));
      },
    },
  });

  globalThis.__io = io;

  io.on("connection", (socket) => {
    socket.emit("realtime:ready", { ok: true });
  });

  httpServer.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
