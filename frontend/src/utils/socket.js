import { io } from "socket.io-client";

let socket = null;
let isInitializing = false;

/**
 * Get or create socket connection
 * @param {string} token - JWT authentication token
 * @returns {Promise<Socket>} Socket.IO instance
 */
export const getSocket = async (token) => {
  // Return existing socket if already connected
  if (socket && socket.connected) {
    return socket;
  }

  // Prevent multiple initialization attempts
  if (isInitializing) {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (socket && socket.connected) {
          clearInterval(checkInterval);
          resolve(socket);
        }
      }, 100);
    });
  }

  return initializeSocket(token);
};

/**
 * Initialize Socket.IO connection
 * @param {string} token - JWT authentication token
 * @returns {Promise<Socket>} Socket.IO instance
 */
export const initializeSocket = async (token) => {
  return new Promise((resolve, reject) => {
    try {
      isInitializing = true;

      if (!token) {
        reject(new Error("Authentication token required"));
        return;
      }

      // Get server URL from environment or use default
      const serverUrl =
        import.meta.env.VITE_SOCKET_URL ||
        "https://sn-links.onrender.com";

      socket = io(serverUrl, {
        auth: {
          token: token,
        },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        transports: ["websocket", "polling"],
        pingInterval: 25000,
        pingTimeout: 60000,
        forceNew: false,
        autoConnect: true,
        secure: serverUrl.startsWith("https"),
      });

      // Connection event
      socket.on("connect", () => {
        isInitializing = false;
        resolve(socket);
      });

      // Connection error event
      socket.on("connect_error", (error) => {
        isInitializing = false;
        reject(error);
      });

      // Reconnection attempt
      socket.on("reconnect_attempt", (attempt) => {
        // Reconnection attempt
      });

      // Reconnected event
      socket.on("reconnect", () => {
        // Reconnected successfully
      });

      // Disconnect event
      socket.on("disconnect", (reason) => {
        // Socket disconnected
      });

      // Set timeout for connection attempt
      const connectionTimeout = setTimeout(() => {
        if (!socket.connected) {
          isInitializing = false;
          reject(new Error("Socket connection timeout"));
        }
      }, 10000);

      // Clear timeout on successful connection
      socket.once("connect", () => clearTimeout(connectionTimeout));
    } catch (error) {
      isInitializing = false;
      reject(error);
    }
  });
};

/**
 * Disconnect socket
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    isInitializing = false;
  }
};

/**
 * Check if socket is connected
 * @returns {boolean} Connection status
 */
export const isSocketConnected = () => {
  return socket && socket.connected;
};

/**
 * Get current socket instance
 * @returns {Socket|null} Socket instance or null
 */
export const getCurrentSocket = () => {
  return socket;
};

export default {
  getSocket,
  initializeSocket,
  disconnectSocket,
  isSocketConnected,
  getCurrentSocket,
};
