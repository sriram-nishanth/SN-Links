import jwt from "jsonwebtoken";
import User from "./models/user.js";
import Message from "./models/message.js";

// Store active socket connections by userId
const activeConnections = new Map();

/**
 * Get all online users
 */
const getOnlineUsers = () => {
  const onlineUsers = new Set();
  activeConnections.forEach((sockets, userId) => {
    if (sockets.size > 0) {
      onlineUsers.add(userId);
    }
  });
  return Array.from(onlineUsers);
};

/**
 * Initialize Socket.IO server with proper configuration
 * @param {Server} io - Socket.IO server instance
 */
export const initializeSocket = (io) => {
  // Socket.IO middleware for authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        console.error("[Socket Auth] No token provided");
        return next(new Error("Authentication error: No token"));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      socket.userEmail = decoded.email;

      console.log(`[Socket Auth] User authenticated: ${socket.userId}`);
      next();
    } catch (error) {
      console.error(`[Socket Auth Error] ${error.message}`);
      next(new Error("Authentication error: Invalid token"));
    }
  });

  // Socket.IO connection handling
  io.on("connection", async (socket) => {
    const userId = socket.userId;
    console.log(`[Socket Connect] User: ${userId}, Socket ID: ${socket.id}`);

    // Store socket connection
    if (!activeConnections.has(userId)) {
      activeConnections.set(userId, new Set());
    }
    activeConnections.get(userId).add(socket.id);
    console.log(`[Socket Connect] Active connections for ${userId}: ${activeConnections.get(userId).size}`);

    // Update user online status in database
    try {
      await User.findByIdAndUpdate(userId, { online: true }, { new: true });
      console.log(`[Online Status] User ${userId} marked as ONLINE`);
    } catch (error) {
      console.error(`[Online Status Error] ${error.message}`);
    }

    // Send current online users list to the newly connected user
    const onlineUsers = getOnlineUsers();
    console.log(`[Online Users] Sending list of ${onlineUsers.length} online users to ${userId}`);
    socket.emit("online_users_list", onlineUsers);

    // Broadcast user online to all connected clients
    io.emit("user_online", { 
      userId, 
      socketId: socket.id,
      timestamp: new Date().toISOString()
    });
    console.log(`[Broadcast] Emitted user_online for ${userId}`);

    // --- ROOM MANAGEMENT ---

    /**
     * Join a room for private messaging
     */
    socket.on("join_room", (roomId) => {
      socket.join(roomId);
      console.log(`[Join Room] User: ${userId}, Room: ${roomId}`);
    });

    /**
     * Leave a room
     */
    socket.on("leave_room", (roomId) => {
      socket.leave(roomId);
      console.log(`[Leave Room] User: ${userId}, Room: ${roomId}`);
    });

    // --- MESSAGING ---

    /**
     * Handle sending messages
     */
    socket.on("send_message", async (data) => {
      try {
        const { receiverId, content, messageType = "text", media = null } = data;

        if (!receiverId || !content) {
          socket.emit("message_error", {
            error: "Missing required fields: receiverId or content",
          });
          return;
        }

        console.log(
          `[Send Message] From: ${userId}, To: ${receiverId}, Type: ${messageType}`
        );

        // Save message to database
        const message = new Message({
          sender: userId,
          receiver: receiverId,
          content,
          messageType,
          media,
        });

        await message.save();
        await message.populate("sender", "name profileImage _id");
        await message.populate("receiver", "name profileImage _id");

        // Create room ID for private messaging (consistent with frontend)
        const roomId = [userId, receiverId].sort().join("_");

        // Prepare message payload
        const messagePayload = {
          _id: message._id,
          senderId: message.sender._id,
          receiverId: message.receiver._id,
          sender: message.sender,
          receiver: message.receiver,
          content: message.content,
          messageType: message.messageType,
          media: message.media,
          createdAt: message.createdAt,
          timestamp: message.createdAt,
          isRead: message.isRead,
          seen: message.seen,
        };

        // FIXED: Get all socket IDs for the receiver user
        const receiverSockets = activeConnections.get(receiverId) || new Set();
        console.log(`[Message Broadcast] Receiver ${receiverId} has ${receiverSockets.size} active socket(s)`);
        
        // Send to all receiver sockets (in case they have multiple browser tabs open)
        receiverSockets.forEach((socketId) => {
          io.to(socketId).emit("receive_message", messagePayload);
          console.log(`[Message Sent] To socket ${socketId} (user: ${receiverId}), Message ID: ${message._id}`);
        });
        
        if (receiverSockets.size === 0) {
          console.warn(`[Message Warning] Receiver ${receiverId} is not currently connected`);
        }

        // Send confirmation/echo to sender only - for optimistic update replacement
        socket.emit("message_sent", messagePayload);
        console.log(`[Message Sent Confirmation] To sender: ${userId}, Message ID: ${message._id}`);
      } catch (error) {
        console.error(`[Send Message Error]: ${error.message}`);
        socket.emit("message_error", {
          error: "Failed to send message",
          details: error.message,
        });
      }
    });

    /**
     * Mark message as read
     */
    socket.on("mark_message_read", async (messageId) => {
      try {
        const message = await Message.findByIdAndUpdate(
          messageId,
          { isRead: true },
          { new: true }
        );

        if (message) {
          // Notify sender that message was read
          const roomId = [userId, message.sender._id].sort().join("_");
          io.to(roomId).emit("message_read", { messageId });
          console.log(`[Message Read] Message: ${messageId}`);
        }
      } catch (error) {
        console.error(`[Mark Read Error]: ${error.message}`);
      }
    });

    /**
     * Mark messages as seen (viewed by receiver)
     */
    socket.on("message_seen", async (data) => {
      try {
        const { senderId, receiverId } = data;
        
        if (!senderId || !receiverId) {
          socket.emit("message_error", {
            error: "Missing senderId or receiverId",
          });
          return;
        }

        // Update all messages from sender to receiver as seen
        await Message.updateMany(
          { sender: senderId, receiver: receiverId, seen: false },
          { $set: { seen: true } }
        );

        console.log(`[Message Seen] Marked messages from ${senderId} to ${receiverId} as seen`);

        // Notify sender about the seen status
        const senderSockets = activeConnections.get(senderId) || new Set();
        senderSockets.forEach((socketId) => {
          io.to(socketId).emit("messages_seen", { receiverId });
        });

        console.log(`[Message Seen Notification] Sent to sender ${senderId}`);
      } catch (error) {
        console.error(`[Message Seen Error]: ${error.message}`);
        socket.emit("message_error", {
          error: "Failed to mark messages as seen",
          details: error.message,
        });
      }
    });

    // --- TYPING INDICATORS ---

    /**
     * Handle typing start
     */
    socket.on("typing_start", (receiverId) => {
      const roomId = [userId, receiverId].sort().join("_");
      socket.to(roomId).emit("user_typing", {
        userId,
        receiverId,
        isTyping: true,
        conversationId: receiverId,
      });
      console.log(`[Typing Start] From: ${userId}, To: ${receiverId}`);
    });

    /**
     * Handle typing stop
     */
    socket.on("typing_stop", (receiverId) => {
      const roomId = [userId, receiverId].sort().join("_");
      socket.to(roomId).emit("user_typing", {
        userId,
        receiverId,
        isTyping: false,
        conversationId: receiverId,
      });
      console.log(`[Typing Stop] From: ${userId}, To: ${receiverId}`);
    });

    // --- FOLLOW/UNFOLLOW ---

    /**
     * Handle follow event
     */
    socket.on("follow_user", async (data) => {
      try {
        const { targetUserId } = data;

        if (!targetUserId) {
          socket.emit("follow_error", { error: "Missing targetUserId" });
          return;
        }

        console.log(`[Follow] User: ${userId}, Target: ${targetUserId}`);

        // Update database
        await User.findByIdAndUpdate(userId, {
          $addToSet: { following: targetUserId },
        });
        await User.findByIdAndUpdate(targetUserId, {
          $addToSet: { followers: userId },
        });

        // Broadcast follow event
        const roomId = [userId, targetUserId].sort().join("_");
        io.to(roomId).emit("follow_status_changed", {
          followerId: userId,
          followedId: targetUserId,
          action: "follow",
        });

        // Also emit to target user's sockets directly
        const targetSockets = activeConnections.get(targetUserId) || new Set();
        targetSockets.forEach((socketId) => {
          io.to(socketId).emit("follow_status_changed", {
            followerId: userId,
            followedId: targetUserId,
            action: "follow",
          });
        });

        console.log(`[Follow Success] ${userId} followed ${targetUserId}`);
      } catch (error) {
        console.error(`[Follow Error]: ${error.message}`);
        socket.emit("follow_error", {
          error: "Failed to follow user",
          details: error.message,
        });
      }
    });

    /**
     * Handle unfollow event
     */
    socket.on("unfollow_user", async (data) => {
      try {
        const { targetUserId } = data;

        if (!targetUserId) {
          socket.emit("follow_error", { error: "Missing targetUserId" });
          return;
        }

        console.log(`[Unfollow] User: ${userId}, Target: ${targetUserId}`);

        // Update database
        await User.findByIdAndUpdate(userId, {
          $pull: { following: targetUserId },
        });
        await User.findByIdAndUpdate(targetUserId, {
          $pull: { followers: userId },
        });

        // Broadcast unfollow event
        const roomId = [userId, targetUserId].sort().join("_");
        io.to(roomId).emit("follow_status_changed", {
          followerId: userId,
          followedId: targetUserId,
          action: "unfollow",
        });

        // Also emit to target user's sockets directly
        const targetSockets = activeConnections.get(targetUserId) || new Set();
        targetSockets.forEach((socketId) => {
          io.to(socketId).emit("follow_status_changed", {
            followerId: userId,
            followedId: targetUserId,
            action: "unfollow",
          });
        });

        console.log(`[Unfollow Success] ${userId} unfollowed ${targetUserId}`);
      } catch (error) {
        console.error(`[Unfollow Error]: ${error.message}`);
        socket.emit("follow_error", {
          error: "Failed to unfollow user",
          details: error.message,
        });
      }
    });

    // --- DISCONNECT ---

    /**
     * Handle socket disconnect
     */
    socket.on("disconnect", async () => {
      console.log(
        `[Socket Disconnect] User: ${userId}, Socket ID: ${socket.id}`
      );

      // Remove socket from active connections
      const userSockets = activeConnections.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        console.log(`[Socket Disconnect] Remaining connections for ${userId}: ${userSockets.size}`);

        if (userSockets.size === 0) {
          activeConnections.delete(userId);
          console.log(
            `[User Offline] User: ${userId} - All connections closed`
          );

          // Mark user as offline if no other connections
          try {
            await User.findByIdAndUpdate(userId, { online: false }, { new: true });
            console.log(
              `[Online Status] User ${userId} marked as OFFLINE`
            );

            // Broadcast user offline to all connected clients
            io.emit("user_offline", { 
              userId, 
              socketId: socket.id,
              timestamp: new Date().toISOString()
            });
            console.log(`[Broadcast] Emitted user_offline for ${userId}`);
          } catch (error) {
            console.error(`[Offline Update Error] ${error.message}`);
          }
        } else {
          console.log(
            `[User Still Online] User: ${userId} has ${userSockets.size} active connection(s) remaining`
          );
        }
      }
    });

    /**
     * Handle connection errors
     */
    socket.on("error", (error) => {
      console.error(`[Socket Error] User: ${userId}, Error:`, error);
    });
  });

  console.log("[Socket] Socket.IO initialized successfully");
};

/**
 * Get active connections status
 */
export const getActiveConnections = () => {
  return Object.fromEntries(
    Array.from(activeConnections.entries()).map(([userId, sockets]) => [
      userId,
      sockets.size,
    ])
  );
};

export default initializeSocket;
