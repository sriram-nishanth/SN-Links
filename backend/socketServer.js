import jwt from "jsonwebtoken";
import User from "./models/user.js";
import Message from "./models/message.js";
import mongoose from "mongoose";

// Store active socket connections by userId
const activeConnections = new Map();
let globalIO = null;

export const setIO = (io) => {
  globalIO = io;
};

export const getIO = () => {
  return globalIO;
};

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
        const { receiverId, content, messageType = "text", media = null, postId = null } = data;

        if (!receiverId || !content) {
          socket.emit("message_error", {
            error: "Missing required fields: receiverId or content",
          });
          return;
        }

        console.log(
          `[Send Message] From: ${userId}, To: ${receiverId}, Type: ${messageType}`
        );

        const messageData = {
          sender: userId,
          receiver: receiverId,
          content,
          messageType,
          media,
        };

        if (postId) {
          messageData.postId = postId;
        }

        const message = new Message(messageData);

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
          image: message.media,
          postId: message.postId,
          createdAt: message.createdAt,
          timestamp: message.createdAt,
          isRead: message.isRead,
          seen: message.seen,
        };

        // Validate that receiver exists and is not the sender
        if (receiverId.toString() === userId.toString()) {
          socket.emit("message_error", {
            error: "Cannot send message to yourself",
          });
          console.warn(`[Send Message Error] User ${userId} attempted to send message to themselves`);
          return;
        }

        // Validate receiver exists in database
        const receiver = await User.findById(receiverId);
        if (!receiver) {
          socket.emit("message_error", {
            error: "Receiver not found",
          });
          console.warn(`[Send Message Error] Receiver ${receiverId} not found in database`);
          return;
        }

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

    // --- MESSAGE DELETION ---

    /**
     * Handle delete message for me
     */
    socket.on("delete_message_for_me", async (data) => {
      try {
        const { messageId } = data;

        if (!messageId) {
          socket.emit("message_error", {
            error: "Missing messageId",
          });
          return;
        }

        const message = await Message.findById(messageId);
        if (!message) {
          socket.emit("message_error", {
            error: "Message not found",
          });
          return;
        }

        if (!message.deletedBy) {
          message.deletedBy = [];
        }

        if (!message.deletedBy.includes(userId.toString())) {
          message.deletedBy.push(userId.toString());
          await message.save();
        }

        socket.emit("message_deleted_for_me", {
          messageId,
          success: true,
        });

        console.log(`[Delete Message For Me] User: ${userId}, Message: ${messageId}`);
      } catch (error) {
        console.error(`[Delete Message For Me Error]: ${error.message}`);
        socket.emit("message_error", {
          error: "Failed to delete message",
          details: error.message,
        });
      }
    });

    /**
     * Handle delete message for everyone
     */
    socket.on("delete_message_for_everyone", async (data) => {
      try {
        const { messageId, receiverId } = data;

        if (!messageId) {
          socket.emit("message_error", {
            error: "Missing messageId",
          });
          return;
        }

        if (!mongoose.Types.ObjectId.isValid(messageId)) {
          socket.emit("message_error", {
            error: "Invalid message ID format",
          });
          return;
        }

        const message = await Message.findById(messageId);
        if (!message) {
          socket.emit("message_error", {
            error: "Message not found",
          });
          return;
        }

        const senderIdStr = message.sender ? message.sender.toString() : null;
        const userIdStr = userId.toString();

        if (!senderIdStr || senderIdStr !== userIdStr) {
          socket.emit("message_error", {
            error: "You can only delete messages you sent",
          });
          return;
        }

        message.messageType = "deleted";
        message.isDeleted = true;
        message.content = "";
        message.media = null;
        message.postId = null;

        await message.save();

        const messagePayload = {
          messageId,
          isDeleted: true,
          messageType: "deleted",
        };

        socket.emit("message_deleted_for_everyone", {
          messageId,
          success: true,
        });

        if (receiverId) {
          const receiverSockets = activeConnections.get(receiverId) || new Set();
          receiverSockets.forEach((socketId) => {
            io.to(socketId).emit("message_deleted", messagePayload);
          });
        }

        const roomId = [userId, receiverId].sort().join("_");
        io.to(roomId).emit("message_deleted", messagePayload);

        console.log(`[Delete Message For Everyone] User: ${userId}, Message: ${messageId}`);
      } catch (error) {
        console.error(`[Delete Message For Everyone Error]: ${error.message}`);
        socket.emit("message_error", {
          error: "Failed to delete message",
          details: error.message,
        });
      }
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
