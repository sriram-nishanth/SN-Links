import jwt from "jsonwebtoken";
import User from "../models/user.js";

const protect = async (req, res, next) => {
  try {
    // Get token from cookie or Authorization header
    let token = req.cookies.token;

    // If no token in cookie, check Authorization header
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7); // Remove 'Bearer ' prefix
      }
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Auth middleware - Token decoded:", {
      userId: decoded.userId,
      exp: decoded.exp,
    });

    // Get user from token
    const user = await User.findById(decoded.userId).select("-password");
    console.log("Auth middleware - User found:", user ? "Yes" : "No");
    if (!user) {
      console.error(
        "Auth middleware - User not found in database:",
        decoded.userId,
      );
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};

export default protect;
