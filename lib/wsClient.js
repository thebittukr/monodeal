"use client";
/**
 * Client-side Socket.io hook for real-time game updates.
 * Falls back to polling if WebSocket connection fails.
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { io as socketIO } from "socket.io-client";

/**
 * Connect to the game's WebSocket server and receive real-time state updates.
 *
 * @param {string} roomId - Game room ID
 * @param {string} playerId - This player's in-game ID
 * @param {function} onStateUpdate - Called with sanitized game state
 * @returns {{ connected: boolean, wsActive: boolean }}
 */
export function useGameSocket(roomId, playerId, onStateUpdate) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const onStateRef = useRef(onStateUpdate);
  onStateRef.current = onStateUpdate;

  useEffect(() => {
    if (!roomId || !playerId) return;

    // Connect to Socket.io server
    const socket = socketIO({
      path: "/ws",
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[WS] Connected:", socket.id);
      setConnected(true);
      // Join the game room
      socket.emit("join-room", { roomId, playerId });
    });

    socket.on("state-update", (state) => {
      onStateRef.current?.(state);
    });

    socket.on("disconnect", (reason) => {
      console.log("[WS] Disconnected:", reason);
      setConnected(false);
    });

    socket.on("connect_error", (err) => {
      console.log("[WS] Connection error:", err.message);
      setConnected(false);
    });

    return () => {
      socket.emit("leave-room", { roomId });
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [roomId, playerId]);

  return { connected, wsActive: connected };
}
