import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import passport from "passport";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./mongodb/mongodb.js";
import "./config/cloudinary.js"; // Initialize Cloudinary
import userroute from "./routes/userroute.js";
import postroute from "./routes/postroute.js";
import messageroute from "./routes/messageroute.js";
import jwt from "jsonwebtoken";
import User from "./models/user.js";
import Message from "./models/message.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const app = express();

// Middleware
app.use(
  cors({
    origin: [
      process.env.CLIENT_URL || "http://localhost:5173",
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
      "http://localhost:5176",
    ],
    credentials: true,
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use(passport.initialize());

// Serve static files from uploads directory (keeping for backward compatibility)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Connect to MongoDB
connectDB();

// Routes
app.use("/api", userroute);
app.use("/api", postroute);
app.use("/api/messages", messageroute);

// Create HTTP server and Socket.IO
const server = createServer(app);
const io = new Server(server, {
  cors: {
    // origin: [
    //   process.env.CLIENT_URL || "http://localhost:5173",
    //   "http://localhost:5173",
    //   "http://localhost:5174",
    //   "http://localhost:5175",
    //   "http://localhost:5176",
    // ],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Store online users
const onlineUsers = new Map();

// Socket.IO middleware for authentication
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication error"));
    }

    // Verify JWT token (you'll need to implement this)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (error) {
    next(new Error("Authentication error"));
  }
});

// Socket.IO connection handling
io.on("connection", async (socket) => {
  console.log("User connected:", socket.userId);

  // Mark user as online
  onlineUsers.set(socket.userId, socket.id);

  // Update user online status to true
  try {
    await User.findByIdAndUpdate(socket.userId, { online: true });
  } catch (error) {
    console.error("Error updating online status:", error);
  }

  io.emit("user_online", socket.userId);

  // Handle joining a room for private messaging
  socket.on("join_room", (roomId) => {
    socket.join(roomId);
  });

  // Handle sending messages
  socket.on("send_message", async (data) => {
    try {
      const { receiverId, content, messageType = "text", media = null } = data;

      // Save message to database
      const message = new Message({
        sender: socket.userId,
        receiver: receiverId,
        content,
        messageType,
        media,
      });

      await message.save();
      await message.populate("sender", "name profileImage");
      await message.populate("receiver", "name profileImage");

      // Create room ID for private messaging
      const roomId = [socket.userId, receiverId].sort().join("_");

      // Emit to both sender and receiver
      io.to(roomId).emit("receive_message", message);

      // Also emit to sender's socket in case they're in multiple tabs
      socket.emit("message_sent", message);
    } catch (error) {
      console.error("Error sending message:", error);
      socket.emit("message_error", { error: "Failed to send message" });
    }
  });

  // Handle typing indicators
  socket.on("typing_start", (receiverId) => {
    const roomId = [socket.userId, receiverId].sort().join("_");
    socket
      .to(roomId)
      .emit("user_typing", { userId: socket.userId, isTyping: true });
  });

  socket.on("typing_stop", (receiverId) => {
    const roomId = [socket.userId, receiverId].sort().join("_");
    socket
      .to(roomId)
      .emit("user_typing", { userId: socket.userId, isTyping: false });
  });

  // Handle follow/unfollow events
  socket.on("follow_user", async (data) => {
    try {
      const { targetUserId } = data;

      // Update database
      await User.findByIdAndUpdate(socket.userId, {
        $push: { following: targetUserId },
      });
      await User.findByIdAndUpdate(targetUserId, {
        $push: { followers: socket.userId },
      });

      // Notify both users about the follow event
      const roomId = [socket.userId, targetUserId].sort().join("_");
      io.to(roomId).emit("follow_status_changed", {
        followerId: socket.userId,
        followedId: targetUserId,
        action: "follow",
      });
    } catch (error) {
      console.error("Error following user:", error);
      socket.emit("follow_error", { error: "Failed to follow user" });
    }
  });

  socket.on("unfollow_user", async (data) => {
    try {
      const { targetUserId } = data;

      // Update database
      await User.findByIdAndUpdate(socket.userId, {
        $pull: { following: targetUserId },
      });
      await User.findByIdAndUpdate(targetUserId, {
        $pull: { followers: socket.userId },
      });

      // Notify both users about the unfollow event
      const roomId = [socket.userId, targetUserId].sort().join("_");
      io.to(roomId).emit("follow_status_changed", {
        followerId: socket.userId,
        followedId: targetUserId,
        action: "unfollow",
      });
    } catch (error) {
      console.error("Error unfollowing user:", error);
      socket.emit("follow_error", { error: "Failed to unfollow user" });
    }
  });

  // Handle disconnect
  socket.on("disconnect", async () => {
    console.log("User disconnected:", socket.userId);
    onlineUsers.delete(socket.userId);

    // Update user online status to false
    try {
      await User.findByIdAndUpdate(socket.userId, { online: false });
    } catch (error) {
      console.error("Error updating online status:", error);
    }

    io.emit("user_offline", socket.userId);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
