import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { getSocket, disconnectSocket, isSocketConnected } from "../utils/socket";
import { useUser } from "./UserContext";

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useUser();
  const socketRef = useRef(null);
  const connectionAttemptRef = useRef(0);
  const eventListenersRef = useRef(new Set());

  // Get token from cookie
  const getToken = useCallback(() => {
    const token = document.cookie
      .split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1];
    return token;
  }, []);

  // Register event listener to prevent duplicates
  const addEventListener = useCallback((eventName, handler) => {
    if (!socketRef.current) return;

    // Create unique key for this listener
    const listenerKey = `${eventName}_${handler.name || "anonymous"}`;

    // Remove old listener if exists
    if (eventListenersRef.current.has(listenerKey)) {
      socketRef.current.off(eventName, handler);
    }

    // Add new listener
    socketRef.current.on(eventName, handler);
    eventListenersRef.current.add(listenerKey);

    console.log(`[Socket Listener] Added: ${eventName}`);
  }, []);

  // Remove event listener
  const removeEventListener = useCallback((eventName, handler) => {
    if (!socketRef.current) return;

    socketRef.current.off(eventName, handler);
    const listenerKey = `${eventName}_${handler.name || "anonymous"}`;
    eventListenersRef.current.delete(listenerKey);

    console.log(`[Socket Listener] Removed: ${eventName}`);
  }, []);

  // Initialize socket connection
  useEffect(() => {
    if (!user) {
      console.log("[Socket] No user, skipping initialization");
      return;
    }

    const token = getToken();
    if (!token) {
      console.error("[Socket] No token available");
      return;
    }

    // Skip if socket already exists
    if (socketRef.current && isSocketConnected()) {
      console.log("[Socket] Socket already connected");
      return;
    }

    const initSocket = async () => {
      try {
        connectionAttemptRef.current += 1;
        console.log(
          `[Socket] Initialization attempt ${connectionAttemptRef.current}`
        );

        const newSocket = await getSocket(token);
        socketRef.current = newSocket;
        setSocket(newSocket);
        setIsConnected(true);
        connectionAttemptRef.current = 0;

        console.log("[Socket] Connected and provider initialized");
      } catch (error) {
        console.error(`[Socket] Initialization failed: ${error.message}`);
        setIsConnected(false);

        // Retry with exponential backoff
        if (connectionAttemptRef.current < 5) {
          const delay = Math.min(1000 * Math.pow(2, connectionAttemptRef.current), 10000);
          console.log(`[Socket] Retrying in ${delay}ms`);
          setTimeout(initSocket, delay);
        }
      }
    };

    initSocket();

    return () => {
      // Cleanup will happen on unmount
    };
  }, [user, getToken]);

  // Setup event listeners (separate from connection logic)
  useEffect(() => {
    if (!socketRef.current || !isSocketConnected()) return;

    // Handle receiving the initial list of online users
    const handleOnlineUsersList = (userIds) => {
      console.log(`[Socket Event] Received online users list: ${userIds.length} users`);
      console.log(`[Socket Event] Online users: ${userIds.join(", ")}`);
      setOnlineUsers(new Set(userIds));
    };

    // Handle user coming online
    const handleUserOnline = (data) => {
      const userId = data.userId || data;
      console.log(`[Socket Event] User online: ${userId}`);
      setOnlineUsers((prev) => {
        const newSet = new Set(prev);
        newSet.add(userId);
        return newSet;
      });
    };

    // Handle user going offline
    const handleUserOffline = (data) => {
      const userId = data.userId || data;
      console.log(`[Socket Event] User offline: ${userId}`);
      setOnlineUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    };

    // Handle typing indicators
    const handleUserTyping = ({ userId, isTyping, conversationId }) => {
      console.log(
        `[Socket Event] User ${userId} typing: ${isTyping} (${conversationId})`
      );
      setTypingUsers((prev) => {
        const newMap = new Map(prev);
        if (isTyping) {
          newMap.set(conversationId || userId, true);
        } else {
          newMap.delete(conversationId || userId);
        }
        return newMap;
      });
    };

    // Handle connection established
    const handleConnect = () => {
      console.log("[Socket Event] Connected to server");
      setIsConnected(true);
      console.log("[Socket Event] Waiting for online users list...");
    };

    // Handle disconnection
    const handleDisconnect = (reason) => {
      console.warn(`[Socket Event] Disconnected: ${reason}`);
      setIsConnected(false);
      setOnlineUsers(new Set()); // Clear online users when disconnected
    };

    // Handle connection errors
    const handleConnectError = (error) => {
      console.error(`[Socket Event] Connection error: ${error}`);
    };

    // Remove old listeners first to prevent duplicates
    socketRef.current.off("connect", handleConnect);
    socketRef.current.off("disconnect", handleDisconnect);
    socketRef.current.off("connect_error", handleConnectError);
    socketRef.current.off("online_users_list", handleOnlineUsersList);
    socketRef.current.off("user_online", handleUserOnline);
    socketRef.current.off("user_offline", handleUserOffline);
    socketRef.current.off("user_typing", handleUserTyping);

    // Register event listeners
    socketRef.current.on("connect", handleConnect);
    socketRef.current.on("disconnect", handleDisconnect);
    socketRef.current.on("connect_error", handleConnectError);
    socketRef.current.on("online_users_list", handleOnlineUsersList);
    socketRef.current.on("user_online", handleUserOnline);
    socketRef.current.on("user_offline", handleUserOffline);
    socketRef.current.on("user_typing", handleUserTyping);

    console.log("[Socket Event] Event listeners registered");

    return () => {
      // Cleanup listeners on unmount
      socketRef.current?.off("connect", handleConnect);
      socketRef.current?.off("disconnect", handleDisconnect);
      socketRef.current?.off("connect_error", handleConnectError);
      socketRef.current?.off("online_users_list", handleOnlineUsersList);
      socketRef.current?.off("user_online", handleUserOnline);
      socketRef.current?.off("user_offline", handleUserOffline);
      socketRef.current?.off("user_typing", handleUserTyping);
      console.log("[Socket Event] Event listeners removed");
    };
  }, [socketRef.current]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        console.log("[Socket] Cleaning up socket connection");
        eventListenersRef.current.clear();
        disconnectSocket();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
    };
  }, []);

  // Join room for private messaging
  const joinRoom = useCallback((roomId) => {
    if (socketRef.current && isSocketConnected()) {
      console.log(`[Socket] Joining room: ${roomId}`);
      socketRef.current.emit("join_room", roomId);
    } else {
      console.warn("[Socket] Cannot join room - socket not connected");
    }
  }, []);

  // Leave room
  const leaveRoom = useCallback((roomId) => {
    if (socketRef.current && isSocketConnected()) {
      console.log(`[Socket] Leaving room: ${roomId}`);
      socketRef.current.emit("leave_room", roomId);
    }
  }, []);

  // Send message
  const sendMessage = useCallback((data) => {
    if (socketRef.current && isSocketConnected()) {
      console.log("[Socket] Sending message");
      socketRef.current.emit("send_message", data);
    } else {
      console.warn("[Socket] Cannot send message - socket not connected");
    }
  }, []);

  // Typing indicators
  const startTyping = useCallback((receiverId) => {
    if (socketRef.current && isSocketConnected()) {
      console.log(`[Socket] Starting typing indicator for: ${receiverId}`);
      socketRef.current.emit("typing_start", receiverId);
    }
  }, []);

  const stopTyping = useCallback((receiverId) => {
    if (socketRef.current && isSocketConnected()) {
      console.log(`[Socket] Stopping typing indicator for: ${receiverId}`);
      socketRef.current.emit("typing_stop", receiverId);
    }
  }, []);

  // Check if user is online
  const isUserOnline = useCallback(
    (userId) => {
      return onlineUsers.has(userId);
    },
    [onlineUsers]
  );

  // Check if user is typing
  const isUserTyping = useCallback(
    (userId) => {
      return typingUsers.has(userId);
    },
    [typingUsers]
  );

  const value = {
    socket: socketRef.current,
    isConnected,
    onlineUsers: Array.from(onlineUsers),
    typingUsers: Object.fromEntries(typingUsers),
    isUserOnline,
    isUserTyping,
    joinRoom,
    leaveRoom,
    sendMessage,
    startTyping,
    stopTyping,
    addEventListener,
    removeEventListener,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};

export default SocketContext;
