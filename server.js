/**
 * Custom Node.js server — runs Next.js + Socket.io on the same port.
 * Entry point for Railway deployment.
 *
 * Usage: node server.js (replaces `next start`)
 */

const { createServer } = require("http");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  // ── Socket.io server ──────────────────────────────────────────────
  const io = new Server(httpServer, {
    path: "/ws",
    cors: {
      origin: dev
        ? ["http://localhost:3000", "http://localhost:3001"]
        : ["https://propertyrush.net", "https://www.propertyrush.net"],
      methods: ["GET", "POST"],
    },
    // Performance tuning
    pingTimeout: 30000,
    pingInterval: 15000,
    transports: ["websocket", "polling"], // prefer WS, fall back to polling
  });

  // Register io instance for API routes to use
  // We use globalThis because Next.js API routes run in the same process
  globalThis.__socketIO = io;

  // ── Connection handling ────────────────────────────────────────────
  io.on("connection", (socket) => {
    // Validate: must provide a playerId to join a room.
    // Players get their ID from the game creation/join API (server-issued).
    // WebSocket only receives sanitized state — no game logic is executed here.

    // Client joins a game room
    socket.on("join-room", ({ roomId, playerId }) => {
      if (!roomId || !playerId) return;
      // Limit rooms per socket to prevent abuse
      if (socket.rooms.size > 3) return; // 1 default + max 2 game rooms
      const channel = `room:${roomId}`;
      socket.join(channel);
      socket.data.roomId = roomId;
      socket.data.playerId = playerId;
    });

    // Client leaves a room
    socket.on("leave-room", ({ roomId }) => {
      if (roomId) {
        socket.leave(`room:${roomId}`);
        console.log(`[WS] ${socket.data.playerId} left room:${roomId}`);
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(`[WS] Disconnected: ${socket.id} (${reason})`);
    });
  });

  // ── Start server ───────────────────────────────────────────────────
  httpServer.listen(port, () => {
    console.log(`\n  ▲ PropertyRush server ready on http://localhost:${port}`);
    console.log(`  ├ Next.js: ${dev ? "development" : "production"}`);
    console.log(`  └ Socket.io: /ws path\n`);
  });
});
