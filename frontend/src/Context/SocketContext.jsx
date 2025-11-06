import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { io } from "socket.io-client";
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
  const { user } = useUser();
  const socketRef = useRef(null);

  useEffect(() => {
    if (user && !socketRef.current) {
      // Get token from cookie
      const getToken = () => {
        const token = document.cookie
          .split("; ")
          .find((row) => row.startsWith("token="))
          ?.split("=")[1];
        return token;
      };

      const token = getToken();
      if (!token) return;

      // Create socket connection
      const newSocket = io("http://localhost:3000", {
        auth: {
          token: token,
        },
        transports: ["websocket", "polling"],
      });

      socketRef.current = newSocket;
      setSocket(newSocket);

      // Handle connection
      newSocket.on("connect", () => {
        // Connected to socket server
      });

      // Handle online users
      newSocket.on("user_online", (userId) => {
        setOnlineUsers((prev) => new Set([...prev, userId]));
      });

      newSocket.on("user_offline", (userId) => {
        setOnlineUsers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      });

      // Handle typing indicators
      newSocket.on("user_typing", ({ userId, isTyping }) => {
        setTypingUsers((prev) => {
          const newMap = new Map(prev);
          if (isTyping) {
            newMap.set(userId, true);
          } else {
            newMap.delete(userId);
          }
          return newMap;
        });
      });

      // Handle connection errors
      newSocket.on("connect_error", (error) => {
        // Socket connection error
      });

      newSocket.on("disconnect", () => {
        // Disconnected from socket server
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setOnlineUsers(new Set());
        setTypingUsers(new Map());
      }
    };
  }, [user]);

  // Join room for private messaging
  const joinRoom = (roomId) => {
    if (socket) {
      socket.emit("join_room", roomId);
    }
  };

  // Send message
  const sendMessage = (data) => {
    if (socket) {
      socket.emit("send_message", data);
    }
  };

  // Typing indicators
  const startTyping = (receiverId) => {
    if (socket) {
      socket.emit("typing_start", receiverId);
    }
  };

  const stopTyping = (receiverId) => {
    if (socket) {
      socket.emit("typing_stop", receiverId);
    }
  };

  // Check if user is online
  const isUserOnline = (userId) => {
    return onlineUsers.has(userId);
  };

  // Check if user is typing
  const isUserTyping = (userId) => {
    return typingUsers.has(userId);
  };

  const value = {
    socket,
    onlineUsers: Array.from(onlineUsers),
    isUserOnline,
    isUserTyping,
    joinRoom,
    sendMessage,
    startTyping,
    stopTyping,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};

export default SocketContext;
