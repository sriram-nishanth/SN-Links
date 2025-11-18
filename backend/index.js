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
import { initializeSocket } from "./socketServer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const app = express();

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or Postman)
      if (!origin) return callback(null, true);

      // Allow all localhost ports
      if (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) {
        return callback(null, true);
      }

      // Allow all Vercel deployments and production URLs
      if (origin && (origin.includes("vercel.app") || origin.includes("localhost"))) {
        return callback(null, true);
      }

      // Allow specific production URL from env
      if (process.env.CLIENT_URL && origin === process.env.CLIENT_URL) {
        return callback(null, true);
      }

      // Reject all other origins
      callback(new Error("Not allowed by CORS"));
    },
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
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps)
      if (!origin) return callback(null, true);

      // Allow all localhost ports
      if (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) {
        return callback(null, true);
      }

      // Allow all Vercel deployments and production URLs
      if (origin && (origin.includes("vercel.app") || origin.includes("localhost"))) {
        return callback(null, true);
      }

      // Allow specific production URL from env
      if (process.env.CLIENT_URL && origin === process.env.CLIENT_URL) {
        return callback(null, true);
      }

      // Reject all other origins
      callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST"],
    credentials: true,
    allowEIO3: true,
  },
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
  pingInterval: 25000,
  pingTimeout: 60000,
});

// Initialize Socket.IO with proper event handlers
initializeSocket(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
