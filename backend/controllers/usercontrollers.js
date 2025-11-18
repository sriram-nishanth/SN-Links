import User from "../models/user.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";
import path from "path";

// Helper function to generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// Configure Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ||
        "http://localhost:3000/api/user/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists with this Google ID
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          return done(null, user);
        }

        // Check if user exists with same email
        user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
          // Link Google account to existing user
          user.googleId = profile.id;
          user.provider = "google";
          await user.save();
          return done(null, user);
        }

        // Create new user
        user = new User({
          name: profile.displayName,
          email: profile.emails[0].value,
          googleId: profile.id,
          provider: "google",
          profileImage: profile.photos[0].value,
        });

        await user.save();
        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    },
  ),
);

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export const createuser = async (req, res) => {
  try {
    const { fullName, email, password, bio, profileImage } = req.body;

    // Validation checks
    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const user = new User({
      name: fullName,
      email: email.toLowerCase(),
      password: hashedPassword,
      bio: bio || "",
      profileImage: profileImage || "",
      signupMethod: 'manual',
      provider: 'local'
    });

    // Save user
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Send response with token (frontend will manually store in cookies)
    res.status(201).json({
      success: true,
      message: "User created successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        bio: user.bio,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating user",
    });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Generate token
    const token = generateToken(user._id);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user.toObject();

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      data: userWithoutPassword,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Error logging in",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Google OAuth controllers
export const googleAuth = passport.authenticate("google", {
  scope: ["profile", "email"],
});

export const googleAuthCallback = (req, res, next) => {
  passport.authenticate("google", { session: false }, (err, user) => {
    if (err) {
      console.error("Google auth error:", err);
      return res.redirect("http://localhost:5173/?error=auth_failed");
    }

    if (!user) {
      return res.redirect("http://localhost:5173/?error=user_not_found");
    }

    // Generate JWT token
    const token = generateToken(user._id);

    // Remove password from response
    const { password, ...userWithoutPassword } = user.toObject();

    // Redirect to frontend with token
    res.redirect(
      `http://localhost:5173/home?token=${token}&user=${encodeURIComponent(JSON.stringify(userWithoutPassword))}`,
    );
  })(req, res, next);
};

// Handle Google OAuth token from frontend
export const googleAuthToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "No token provided",
      });
    }

    // For @react-oauth/google, we need to verify the JWT token
    // This is a simplified implementation - in production, verify with Google's servers
    const { OAuth2Client } = await import("google-auth-library");
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, name, email, picture } = payload;

    // Check if user already exists with this Google ID
    let user = await User.findOne({ googleId });

    if (user) {
      // User exists, generate token
      const jwtToken = generateToken(user._id);
      const { password, ...userWithoutPassword } = user.toObject();

      return res.status(200).json({
        success: true,
        message: "Google authentication successful",
        token: jwtToken,
        data: userWithoutPassword,
      });
    }

    // Check if user exists with same email
    user = await User.findOne({ email });

    if (user) {
      // Link Google account to existing user
      user.googleId = googleId;
      user.provider = "google";
      user.profileImage = picture;
      await user.save();

      const jwtToken = generateToken(user._id);
      const { password, ...userWithoutPassword } = user.toObject();

      return res.status(200).json({
        success: true,
        message: "Google account linked successfully",
        token: jwtToken,
        data: userWithoutPassword,
      });
    }

    // Create new user
    user = new User({
      name,
      email,
      googleId,
      provider: "google",
      profileImage: picture,
      bio: "",
      signupMethod: 'google',
      isGoogleConnected: true
    });

    await user.save();

    const jwtToken = generateToken(user._id);
    const { password, ...userWithoutPassword } = user.toObject();

    res.status(201).json({
      success: true,
      message: "User created with Google successfully",
      token: jwtToken,
      data: userWithoutPassword,
    });
  } catch (error) {
    console.error("Google token auth error:", error);
    res.status(500).json({
      success: false,
      message: "Error processing Google authentication",
    });
  }
};

export const connectGoogle = async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user._id;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "No Google token provided",
      });
    }

    const { OAuth2Client } = await import("google-auth-library");
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, picture } = payload;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.googleId = googleId;
    user.isGoogleConnected = true;
    user.provider = 'google';
    if (picture) {
      user.profileImage = picture;
    }
    await user.save();

    const updatedUser = await User.findById(userId).select("-password");

    res.status(200).json({
      success: true,
      message: "Google account connected successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Connect Google error:", error);
    res.status(500).json({
      success: false,
      message: "Error connecting Google account",
    });
  }
};

export const disconnectGoogle = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.signupMethod === 'google') {
      return res.status(400).json({
        success: false,
        message: "Cannot disconnect Google account if it's your signup method",
      });
    }

    user.googleId = null;
    user.isGoogleConnected = false;
    await user.save();

    const updatedUser = await User.findById(userId).select("-password");

    res.status(200).json({
      success: true,
      message: "Google account disconnected successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Disconnect Google error:", error);
    res.status(500).json({
      success: false,
      message: "Error disconnecting Google account",
    });
  }
};

export const getConnectedApps = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select("signupMethod isGoogleConnected");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        google: {
          isConnected: user.isGoogleConnected,
          signupMethod: user.signupMethod,
          status: user.signupMethod === 'google' ? 'connected_signup' : (user.isGoogleConnected ? 'connected' : 'not_connected'),
        }
      },
    });
  } catch (error) {
    console.error("Get connected apps error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching connected apps",
    });
  }
};

// Get user profile data
export const getUserProfile = async (req, res) => {
  try {
    const userId = req.user._id; // From auth middleware

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user profile",
    });
  }
};

// Update user profile data
export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user._id; // From auth middleware
    const { name, bio } = req.body;

    // Validate input
    if (!name || name.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    // Update user profile
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        name: name.trim(),
        bio: bio ? bio.trim() : "",
      },
      { new: true, runValidators: true },
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating user profile",
    });
  }
};

// Follow a user
export const followUser = async (req, res) => {
  try {
    const userId = req.user._id; // Current user
    const targetUserId = req.params.userId; // User to follow

    if (userId.toString() === targetUserId) {
      return res.status(400).json({
        success: false,
        message: "Cannot follow yourself",
      });
    }

    // Check if target user exists
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if already following
    const currentUser = await User.findById(userId);
    if (currentUser.following.includes(targetUserId)) {
      return res.status(200).json({
        success: true,
        message: "Already following this user",
        data: {
          currentUser: {
            followingCount: currentUser.following.length,
            followersCount: currentUser.followers.length,
          },
          targetUser: {
            followingCount: targetUser.following.length,
            followersCount: targetUser.followers.length,
          },
        },
      });
    }

    // Check if follow request already pending for private account
    if (targetUser.isPrivate) {
      const hasRequest = targetUser.followRequests.some(
        req => req.fromUserId.toString() === userId.toString()
      );
      if (hasRequest) {
        return res.status(400).json({
          success: false,
          message: "Follow request already sent",
        });
      }

      // Add to follow requests instead of directly following
      await User.findByIdAndUpdate(targetUserId, {
        $push: { followRequests: { fromUserId: userId } },
      });

      // Emit socket event for new follow request
      if (req.io) {
        req.io
          .to(targetUserId.toString())
          .emit("followRequest", { fromUserId: userId });
      }

      return res.status(200).json({
        success: true,
        message: "Follow request sent",
        data: { status: "requested" },
      });
    }

    // Public account - add to following/followers
    await User.findByIdAndUpdate(userId, {
      $push: { following: targetUserId },
    });

    await User.findByIdAndUpdate(targetUserId, {
      $push: { followers: userId },
    });

    const updatedCurrentUser = await User.findById(userId);
    const updatedTargetUser = await User.findById(targetUserId);

    if (req.io) {
      req.io
        .to(targetUserId.toString())
        .emit("followUpdate", { userId: userId });
      req.io
        .to(userId.toString())
        .emit("followUpdate", { userId: targetUserId });
    }

    res.status(200).json({
      success: true,
      message: "User followed successfully",
      data: {
        currentUser: {
          followingCount: updatedCurrentUser.following.length,
          followersCount: updatedCurrentUser.followers.length,
        },
        targetUser: {
          followingCount: updatedTargetUser.following.length,
          followersCount: updatedTargetUser.followers.length,
        },
      },
    });
  } catch (error) {
    console.error("Follow user error:", error);
    res.status(500).json({
      success: false,
      message: "Error following user",
    });
  }
};

// Unfollow a user
export const unfollowUser = async (req, res) => {
  try {
    const userId = req.user._id; // Current user
    const targetUserId = req.params.userId; // User to unfollow

    // Remove from following list of current user
    await User.findByIdAndUpdate(userId, {
      $pull: { following: targetUserId },
    });

    // Remove from followers list of target user
    await User.findByIdAndUpdate(targetUserId, {
      $pull: { followers: userId },
    });

    // Get updated counts
    const updatedCurrentUser = await User.findById(userId);
    const updatedTargetUser = await User.findById(targetUserId);

    // Emit socket event to update chat lists in real-time
    if (req.io) {
      req.io
        .to(targetUserId.toString())
        .emit("followUpdate", { userId: userId, action: "unfollow" });
      req.io
        .to(userId.toString())
        .emit("followUpdate", { userId: targetUserId, action: "unfollow" });
    }

    res.status(200).json({
      success: true,
      message: "User unfollowed successfully",
      data: {
        currentUser: {
          followingCount: updatedCurrentUser.following.length,
          followersCount: updatedCurrentUser.followers.length,
        },
        targetUser: {
          followingCount: updatedTargetUser.following.length,
          followersCount: updatedTargetUser.followers.length,
        },
      },
    });
  } catch (error) {
    console.error("Unfollow user error:", error);
    res.status(500).json({
      success: false,
      message: "Error unfollowing user",
    });
  }
};

// Get followers of current user
export const getFollowers = async (req, res) => {
  try {
    const userId = req.user._id; // Current user

    const user = await User.findById(userId).populate(
      "followers",
      "name profileImage",
    );
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Format followers data for frontend
    const followers = user.followers.map((follower) => ({
      id: follower._id,
      name: follower.name,
      profileImage: follower.profileImage || "",
      action: "Followed on you",
      time: "recently", // You can calculate actual time difference
      isVerified: false, // Add verification logic if needed
    }));

    res.status(200).json({
      success: true,
      data: followers,
    });
  } catch (error) {
    console.error("Get followers error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching followers",
    });
  }
};

// Get all users (for Friends component)
export const getAllUsers = async (req, res) => {
  try {
    const currentUserId = req.user._id; // Current user

    // Get all users except the current user, including followers count
    const users = await User.find({ _id: { $ne: currentUserId } }).select(
      "name profileImage bio followers",
    );

    // Format users data for frontend
    const formattedUsers = users.map((user) => ({
      id: user._id,
      name: user.name,
      profileImage: user.profileImage || "",
      followers: user.followers,
      action: "Available to follow",
      time: "now",
      isVerified: false, // Add verification logic if needed
    }));

    res.status(200).json({
      success: true,
      data: formattedUsers,
    });
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching users",
    });
  }
};

// Get user by ID (for Profile page)
export const getUserById = async (req, res) => {
  try {
    const userId = req.params.userId;
    const currentUserId = req.user._id;

    if (!userId || !userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (currentUserId.toString() === userId) {
      return res.status(200).json({
        success: true,
        data: user,
      });
    }

    if (user.isPrivate && !user.followers.includes(currentUserId)) {
      return res.status(200).json({
        success: true,
        data: {
          _id: user._id,
          name: user.name,
          profileImage: user.profileImage,
          isPrivate: true,
          isFollowing: user.followers.includes(currentUserId),
          followers: [],
          following: [],
        },
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Get user by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user",
    });
  }
};

// Get followers of a specific user by ID
export const getUserFollowers = async (req, res) => {
  try {
    const userId = req.params.userId;
    const currentUserId = req.user._id; // Logged-in user

    // Validate if userId is a valid MongoDB ObjectId
    if (!userId || !userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    const user = await User.findById(userId).populate(
      "followers",
      "name profileImage",
    );
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get current user's following list to determine follow status
    const currentUser = await User.findById(currentUserId).select("following");

    // Format followers data for frontend with follow status
    const followers = user.followers.map((follower) => ({
      _id: follower._id,
      id: follower._id,
      name: follower.name,
      profileImage: follower.profileImage || "",
      isVerified: false, // Add verification logic if needed
      isFollowing: currentUser.following.includes(follower._id), // Check if current user follows this follower
    }));

    res.status(200).json({
      success: true,
      data: followers,
    });
  } catch (error) {
    console.error("Get user followers error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching followers",
    });
  }
};

// Get following list of a specific user by ID
export const getUserFollowing = async (req, res) => {
  try {
    const userId = req.params.userId;
    const currentUserId = req.user._id; // Logged-in user

    // Validate if userId is a valid MongoDB ObjectId
    if (!userId || !userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    const user = await User.findById(userId).populate(
      "following",
      "name profileImage",
    );
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get current user's following list to determine follow status
    const currentUser = await User.findById(currentUserId).select("following");

    // Format following data for frontend with follow status
    const following = user.following.map((followedUser) => ({
      _id: followedUser._id,
      id: followedUser._id,
      name: followedUser.name,
      profileImage: followedUser.profileImage || "",
      isVerified: false, // Add verification logic if needed
      isFollowing: currentUser.following.includes(followedUser._id), // Check if current user follows this followed user
    }));

    res.status(200).json({
      success: true,
      data: following,
    });
  } catch (error) {
    console.error("Get user following error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching following",
    });
  }
};

// Configure Cloudinary storage for multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "social-media-profiles", // Cloudinary folder name
    allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
    transformation: [{ width: 500, height: 500, crop: "limit" }], // Resize images
    public_id: (req, file) =>
      `profile-${Date.now()}-${Math.round(Math.random() * 1e9)}`,
  },
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Update profile image
export const updateProfileImage = async (req, res) => {
  try {
    const userId = req.user._id; // From auth middleware

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided",
      });
    }

    // Cloudinary provides the full URL in req.file.path
    const imageUrl = req.file.path;

    // Update user profile image in database
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profileImage: imageUrl },
      { new: true, runValidators: true },
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Profile image updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Update profile image error:", error);

    // Handle multer errors
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "File too large. Maximum size is 5MB.",
        });
      }
    }

    // Handle file filter errors
    if (error.message === "Only image files are allowed!") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Error updating profile image",
    });
  }
};

// Update cover image
export const updateCoverImage = async (req, res) => {
  try {
    const userId = req.user._id; // From auth middleware

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided",
      });
    }

    // Cloudinary provides the full URL in req.file.path
    const imageUrl = req.file.path;

    // Update user cover image in database
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { coverImage: imageUrl },
      { new: true, runValidators: true },
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Cover image updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Update cover image error:", error);

    // Handle multer errors
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "File too large. Maximum size is 5MB.",
        });
      }
    }

    // Handle file filter errors
    if (error.message === "Only image files are allowed!") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Error updating cover image",
    });
  }
};

// Get user activity logs
export const getActivityLogs = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select('activityLogs');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: user.activityLogs || [],
    });
  } catch (error) {
    console.error('Get activity logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching activity logs',
    });
  }
};



// Update user connected apps
export const updateConnectedApps = async (req, res) => {
  try {
    const userId = req.user._id;
    const { apps } = req.body;

    if (!apps || typeof apps !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Invalid apps data',
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { connectedApps: apps },
      { new: true }
    ).select('connectedApps');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Connected apps updated successfully',
      data: updatedUser.connectedApps,
    });
  } catch (error) {
    console.error('Update connected apps error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating connected apps',
    });
  }
};

// Get user language setting
export const getLanguage = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select('language');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: { language: user.language || 'en' },
    });
  } catch (error) {
    console.error('Get language error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching language setting',
    });
  }
};

// Update user language setting
export const updateLanguage = async (req, res) => {
  try {
    const userId = req.user._id;
    const { language } = req.body;

    if (!language || typeof language !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid language',
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { language },
      { new: true }
    ).select('language');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Language updated successfully',
      data: { language: updatedUser.language },
    });
  } catch (error) {
    console.error('Update language error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating language',
    });
  }
};

// Get user privacy settings
export const getPrivacySettings = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select('privacySettings');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: user.privacySettings || {
        privateAccount: false,
        showActivityStatus: true,
        twoFactorAuth: { useAuthApp: true, useSms: true }
      },
    });
  } catch (error) {
    console.error('Get privacy settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching privacy settings',
    });
  }
};

// Update user privacy settings
export const updatePrivacySettings = async (req, res) => {
  try {
    const userId = req.user._id;
    const { setting, value } = req.body;

    if (!setting) {
      return res.status(400).json({
        success: false,
        message: 'Setting key is required',
      });
    }

    const updatePath = `privacySettings.${setting}`;
    const updateObj = { [updatePath]: value };

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateObj,
      { new: true }
    ).select('privacySettings');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Privacy settings updated successfully',
      data: updatedUser.privacySettings,
    });
  } catch (error) {
    console.error('Update privacy settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating privacy settings',
    });
  }
};

// Get user notifications setting
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select('notificationsEnabled');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: { enabled: user.notificationsEnabled ?? true },
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications setting',
    });
  }
};

// Update user notifications setting
export const updateNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Enabled must be a boolean',
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { notificationsEnabled: enabled },
      { new: true }
    ).select('notificationsEnabled');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notifications setting updated successfully',
      data: { enabled: updatedUser.notificationsEnabled },
    });
  } catch (error) {
    console.error('Update notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating notifications setting',
    });
  }
};

// Update user password
export const updatePassword = async (req, res) => {
  try {
    const userId = req.user._id;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { password: hashedPassword },
      { new: true }
    ).select('_id');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating password',
    });
  }
};

// Delete user account
export const deleteUser = async (req, res) => {
  try {
    const userId = req.user._id;
    const { password } = req.body;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Verify password for non-Google users
    if (user.provider !== "google" && user.password) {
      if (!password) {
        return res.status(400).json({
          success: false,
          message: "Password is required to delete account",
        });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "Invalid password",
        });
      }
    }

    // Import models for cleanup
    const Post = (await import("../models/post.js")).default;
    const Message = (await import("../models/message.js")).default;

    // Delete user's posts
    await Post.deleteMany({ author: userId });

    // Delete messages where user is sender or receiver
    await Message.deleteMany({
      $or: [{ sender: userId }, { receiver: userId }],
    });

    // Remove user from other users' following/followers lists
    await User.updateMany(
      { following: userId },
      { $pull: { following: userId } }
    );
    await User.updateMany(
      { followers: userId },
      { $pull: { followers: userId } }
    );

    // Delete the user
    await User.findByIdAndDelete(userId);

    res.status(200).json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting account",
    });
  }
};

// Block a user
export const blockUser = async (req, res) => {
  try {
    const userId = req.user._id; // Current user
    const targetUserId = req.params.userId; // User to block

    if (userId.toString() === targetUserId) {
      return res.status(400).json({
        success: false,
        message: "Cannot block yourself",
      });
    }

    // Check if target user exists
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if already blocked
    const currentUser = await User.findById(userId);
    if (currentUser.blockedUsers.includes(targetUserId)) {
      return res.status(200).json({
        success: true,
        message: "User already blocked",
        data: { isBlocked: true },
      });
    }

    // Add to blocked users list
    await User.findByIdAndUpdate(userId, {
      $push: { blockedUsers: targetUserId },
    });

    res.status(200).json({
      success: true,
      message: "User blocked successfully",
      data: { isBlocked: true },
    });
  } catch (error) {
    console.error("Block user error:", error);
    res.status(500).json({
      success: false,
      message: "Error blocking user",
    });
  }
};

// Unblock a user
export const unblockUser = async (req, res) => {
  try {
    const userId = req.user._id;
    const targetUserId = req.params.userId;

    // Remove from blocked users list
    await User.findByIdAndUpdate(userId, {
      $pull: { blockedUsers: targetUserId },
    });

    res.status(200).json({
      success: true,
      message: "User unblocked successfully",
      data: { isBlocked: false },
    });
  } catch (error) {
    console.error("Unblock user error:", error);
    res.status(500).json({
      success: false,
      message: "Error unblocking user",
    });
  }
};

// Mute a conversation
export const muteConversation = async (req, res) => {
  try {
    const userId = req.user._id;
    const targetUserId = req.params.userId;

    if (userId.toString() === targetUserId) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    // Check if target user exists
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const currentUser = await User.findById(userId);

    // Check if already muted
    const isMuted = currentUser.mutedConversations.some(
      (conv) => conv.userId.toString() === targetUserId
    );

    if (isMuted) {
      // Unmute if already muted
      await User.findByIdAndUpdate(
        userId,
        {
          $pull: { mutedConversations: { userId: targetUserId } },
        },
        { new: true }
      );

      return res.status(200).json({
        success: true,
        message: "Conversation unmuted successfully",
        data: { isMuted: false },
      });
    }

    // Mute if not already muted
    await User.findByIdAndUpdate(
      userId,
      {
        $push: {
          mutedConversations: {
            userId: targetUserId,
            isMuted: true,
            mutedAt: new Date(),
          },
        },
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Conversation muted successfully",
      data: { isMuted: true },
    });
  } catch (error) {
    console.error("Mute conversation error:", error);
    res.status(500).json({
      success: false,
      message: "Error muting conversation",
    });
  }
};

// Get blocked users
export const getBlockedUsers = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).populate("blockedUsers", "name profileImage");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data: user.blockedUsers || [],
    });
  } catch (error) {
    console.error("Get blocked users error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching blocked users",
    });
  }
};

// Check if user is blocked
export const isUserBlocked = async (req, res) => {
  try {
    const userId = req.user._id;
    const targetUserId = req.params.userId;

    const currentUser = await User.findById(userId);
    const isBlocked = currentUser.blockedUsers.includes(targetUserId);

    res.status(200).json({
      success: true,
      data: { isBlocked },
    });
  } catch (error) {
    console.error("Check if user blocked error:", error);
    res.status(500).json({
      success: false,
      message: "Error checking block status",
    });
  }
};

// Check if conversation is muted
export const isConversationMuted = async (req, res) => {
  try {
    const userId = req.user._id;
    const targetUserId = req.params.userId;

    const currentUser = await User.findById(userId);
    const isMuted = currentUser.mutedConversations.some(
      (conv) => conv.userId.toString() === targetUserId
    );

    res.status(200).json({
      success: true,
      data: { isMuted },
    });
  } catch (error) {
    console.error("Check if conversation muted error:", error);
    res.status(500).json({
      success: false,
      message: "Error checking mute status",
    });
  }
};

// Toggle private account
export const togglePrivateAccount = async (req, res) => {
  try {
    const userId = req.user._id;
    const { isPrivate } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (isPrivate !== undefined) {
      user.isPrivate = Boolean(isPrivate);
    } else {
      user.isPrivate = !user.isPrivate;
    }
    
    await user.save();

    const updatedUser = await User.findById(userId).select("-password");

    res.status(200).json({
      success: true,
      message: `Account is now ${updatedUser.isPrivate ? "private" : "public"}`,
      data: updatedUser,
    });
  } catch (error) {
    console.error("Toggle private account error:", error);
    res.status(500).json({
      success: false,
      message: "Error toggling private account",
    });
  }
};

// Cancel follow request (before acceptance)
export const cancelFollowRequest = async (req, res) => {
  try {
    const userId = req.user._id;
    const targetUserId = req.params.userId;

    const targetUser = await User.findByIdAndUpdate(
      targetUserId,
      { $pull: { followRequests: { fromUserId: userId } } },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Follow request cancelled",
      data: { requestCount: targetUser.followRequests.length },
    });
  } catch (error) {
    console.error("Cancel follow request error:", error);
    res.status(500).json({
      success: false,
      message: "Error cancelling follow request",
    });
  }
};

// Accept follow request
export const acceptFollowRequest = async (req, res) => {
  try {
    const userId = req.user._id;
    const fromUserId = req.params.userId;

    // Remove from follow requests
    const currentUser = await User.findByIdAndUpdate(
      userId,
      { $pull: { followRequests: { fromUserId } } },
      { new: true }
    );

    // Add to followers
    await User.findByIdAndUpdate(userId, {
      $push: { followers: fromUserId },
    });

    // Add to following
    await User.findByIdAndUpdate(fromUserId, {
      $push: { following: userId },
    });

    const updatedCurrentUser = await User.findById(userId);
    const updatedFromUser = await User.findById(fromUserId);

    if (req.io) {
      req.io
        .to(userId.toString())
        .emit("requestAccepted", { fromUserId });
      req.io
        .to(fromUserId.toString())
        .emit("requestAccepted", { toUserId: userId });
    }

    res.status(200).json({
      success: true,
      message: "Follow request accepted",
      data: {
        currentUser: {
          followersCount: updatedCurrentUser.followers.length,
          requestsCount: updatedCurrentUser.followRequests.length,
        },
        fromUser: {
          followingCount: updatedFromUser.following.length,
        },
      },
    });
  } catch (error) {
    console.error("Accept follow request error:", error);
    res.status(500).json({
      success: false,
      message: "Error accepting follow request",
    });
  }
};

// Decline follow request
export const declineFollowRequest = async (req, res) => {
  try {
    const userId = req.user._id;
    const fromUserId = req.params.userId;

    const currentUser = await User.findByIdAndUpdate(
      userId,
      { $pull: { followRequests: { fromUserId } } },
      { new: true }
    );

    if (req.io) {
      req.io
        .to(userId.toString())
        .emit("requestDeclined", { fromUserId });
      req.io
        .to(fromUserId.toString())
        .emit("requestDeclined", { toUserId: userId });
    }

    res.status(200).json({
      success: true,
      message: "Follow request declined",
      data: { requestCount: currentUser.followRequests.length },
    });
  } catch (error) {
    console.error("Decline follow request error:", error);
    res.status(500).json({
      success: false,
      message: "Error declining follow request",
    });
  }
};

// Get follow requests
export const getFollowRequests = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).populate(
      "followRequests.fromUserId",
      "name email profileImage bio"
    );

    const requests = user.followRequests.map(req => ({
      ...req.fromUserId.toObject(),
      requestId: req._id,
      requestedAt: req.createdAt,
    }));

    res.status(200).json({
      success: true,
      data: { requests },
    });
  } catch (error) {
    console.error("Get follow requests error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching follow requests",
    });
  }
};

// Export multer upload middleware for use in routes
export { upload };
