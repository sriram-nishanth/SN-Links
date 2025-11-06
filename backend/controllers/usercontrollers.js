import User from '../models/user.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { v2 as cloudinary } from 'cloudinary';
import path from 'path';
import fs from 'fs';

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Helper function to generate JWT token
const generateToken = (userId) => {
    return jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};

// Configure Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/user/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
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
            user.provider = 'google';
            await user.save();
            return done(null, user);
        }

        // Create new user
        user = new User({
            name: profile.displayName,
            email: profile.emails[0].value,
            googleId: profile.id,
            provider: 'google',
            profileImage: profile.photos[0].value
        });

        await user.save();
        return done(null, user);
    } catch (error) {
        return done(error, null);
    }
}));

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
                message: 'Please provide all required fields'
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
            bio: bio || '',
            profileImage: profileImage || ''
        });

        // Save user
        await user.save();

        // Generate token
        const token = generateToken(user._id);

        // Send response with token (frontend will manually store in cookies)
        res.status(201).json({
            success: true,
            message: 'User created successfully',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                bio: user.bio,
                profileImage: user.profileImage
            }
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating user'
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
                message: 'Please provide email and password'
            });
        }

        // Find user
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Generate token
        const token = generateToken(user._id);

        // Remove password from response
        const { password: _, ...userWithoutPassword } = user.toObject();

        res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            data: userWithoutPassword
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Error logging in',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Google OAuth controllers
export const googleAuth = passport.authenticate('google', {
    scope: ['profile', 'email']
});

export const googleAuthCallback = (req, res, next) => {
    passport.authenticate('google', { session: false }, (err, user) => {
        if (err) {
            console.error('Google auth error:', err);
            return res.redirect('http://localhost:5173/?error=auth_failed');
        }

        if (!user) {
            return res.redirect('http://localhost:5173/?error=user_not_found');
        }

        // Generate JWT token
        const token = generateToken(user._id);

        // Remove password from response
        const { password, ...userWithoutPassword } = user.toObject();

        // Redirect to frontend with token
        res.redirect(`http://localhost:5173/home?token=${token}&user=${encodeURIComponent(JSON.stringify(userWithoutPassword))}`);
    })(req, res, next);
};

// Handle Google OAuth token from frontend
export const googleAuthToken = async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'No token provided'
            });
        }

        // For @react-oauth/google, we need to verify the JWT token
        // This is a simplified implementation - in production, verify with Google's servers
        const { OAuth2Client } = await import('google-auth-library');
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
                message: 'Google authentication successful',
                token: jwtToken,
                data: userWithoutPassword
            });
        }

        // Check if user exists with same email
        user = await User.findOne({ email });

        if (user) {
            // Link Google account to existing user
            user.googleId = googleId;
            user.provider = 'google';
            user.profileImage = picture;
            await user.save();

            const jwtToken = generateToken(user._id);
            const { password, ...userWithoutPassword } = user.toObject();

            return res.status(200).json({
                success: true,
                message: 'Google account linked successfully',
                token: jwtToken,
                data: userWithoutPassword
            });
        }

        // Create new user
        user = new User({
            name,
            email,
            googleId,
            provider: 'google',
            profileImage: picture,
            bio: '' // Default bio for Google users
        });

        await user.save();

        const jwtToken = generateToken(user._id);
        const { password, ...userWithoutPassword } = user.toObject();

        res.status(201).json({
            success: true,
            message: 'User created with Google successfully',
            token: jwtToken,
            data: userWithoutPassword
        });

    } catch (error) {
        console.error('Google token auth error:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing Google authentication'
        });
    }
};

// Get user profile data
export const getUserProfile = async (req, res) => {
    try {
        const userId = req.user._id; // From auth middleware

        const user = await User.findById(userId).select('-password');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            data: user
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user profile'
        });
    }
};

// Update user profile data
export const updateUserProfile = async (req, res) => {
    try {
        const userId = req.user._id; // From auth middleware
        const { name, bio } = req.body;

        // Validate input
        if (!name || name.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Name is required'
            });
        }

        // Update user profile
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                name: name.trim(),
                bio: bio ? bio.trim() : ''
            },
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: updatedUser
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating user profile'
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
                message: 'Cannot follow yourself'
            });
        }

        // Check if target user exists
        const targetUser = await User.findById(targetUserId);
        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if already following
        const currentUser = await User.findById(userId);
        if (currentUser.following.includes(targetUserId)) {
            return res.status(200).json({
                success: true,
                message: 'Already following this user',
                data: {
                    currentUser: {
                        followingCount: currentUser.following.length,
                        followersCount: currentUser.followers.length
                    },
                    targetUser: {
                        followingCount: targetUser.following.length,
                        followersCount: targetUser.followers.length
                    }
                }
            });
        }

        // Add to following list of current user
        await User.findByIdAndUpdate(userId, {
            $push: { following: targetUserId }
        });

        // Add to followers list of target user
        await User.findByIdAndUpdate(targetUserId, {
            $push: { followers: userId }
        });

        // Get updated counts
        const updatedCurrentUser = await User.findById(userId);
        const updatedTargetUser = await User.findById(targetUserId);

        // Emit socket event to update chat lists in real-time
        if (req.io) {
            req.io.to(targetUserId.toString()).emit('followUpdate', { userId: userId });
            req.io.to(userId.toString()).emit('followUpdate', { userId: targetUserId });
        }

        res.status(200).json({
            success: true,
            message: 'User followed successfully',
            data: {
                currentUser: {
                    followingCount: updatedCurrentUser.following.length,
                    followersCount: updatedCurrentUser.followers.length
                },
                targetUser: {
                    followingCount: updatedTargetUser.following.length,
                    followersCount: updatedTargetUser.followers.length
                }
            }
        });

    } catch (error) {
        console.error('Follow user error:', error);
        res.status(500).json({
            success: false,
            message: 'Error following user'
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
            $pull: { following: targetUserId }
        });

        // Remove from followers list of target user
        await User.findByIdAndUpdate(targetUserId, {
            $pull: { followers: userId }
        });

        // Get updated counts
        const updatedCurrentUser = await User.findById(userId);
        const updatedTargetUser = await User.findById(targetUserId);

        // Emit socket event to update chat lists in real-time
        if (req.io) {
            req.io.to(targetUserId.toString()).emit('followUpdate', { userId: userId, action: 'unfollow' });
            req.io.to(userId.toString()).emit('followUpdate', { userId: targetUserId, action: 'unfollow' });
        }

        res.status(200).json({
            success: true,
            message: 'User unfollowed successfully',
            data: {
                currentUser: {
                    followingCount: updatedCurrentUser.following.length,
                    followersCount: updatedCurrentUser.followers.length
                },
                targetUser: {
                    followingCount: updatedTargetUser.following.length,
                    followersCount: updatedTargetUser.followers.length
                }
            }
        });

    } catch (error) {
        console.error('Unfollow user error:', error);
        res.status(500).json({
            success: false,
            message: 'Error unfollowing user'
        });
    }
};

// Get followers of current user
export const getFollowers = async (req, res) => {
    try {
        const userId = req.user._id; // Current user

        const user = await User.findById(userId).populate('followers', 'name profileImage');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Format followers data for frontend
        const followers = user.followers.map(follower => ({
            id: follower._id,
            name: follower.name,
            profileImage: follower.profileImage || '',
            action: 'Followed on you',
            time: 'recently', // You can calculate actual time difference
            isVerified: false // Add verification logic if needed
        }));

        res.status(200).json({
            success: true,
            data: followers
        });

    } catch (error) {
        console.error('Get followers error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching followers'
        });
    }
};

// Get all users (for Friends component)
export const getAllUsers = async (req, res) => {
    try {
        const currentUserId = req.user._id; // Current user

        // Get all users except the current user
        const users = await User.find({ _id: { $ne: currentUserId } }).select('name profileImage bio');

        // Format users data for frontend
        const formattedUsers = users.map(user => ({
            id: user._id,
            name: user.name,
            profileImage: user.profileImage || '',
            action: 'Available to follow',
            time: 'now',
            isVerified: false // Add verification logic if needed
        }));

        res.status(200).json({
            success: true,
            data: formattedUsers
        });

    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching users'
        });
    }
};

// Get user by ID (for Profile page)
export const getUserById = async (req, res) => {
    try {
        const userId = req.params.userId;

        // Validate if userId is a valid MongoDB ObjectId
        if (!userId || !userId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID format'
            });
        }

        const user = await User.findById(userId).select('-password');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            data: user
        });

    } catch (error) {
        console.error('Get user by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user'
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
                message: 'Invalid user ID format'
            });
        }

        const user = await User.findById(userId).populate('followers', 'name profileImage');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get current user's following list to determine follow status
        const currentUser = await User.findById(currentUserId).select('following');

        // Format followers data for frontend with follow status
        const followers = user.followers.map(follower => ({
            _id: follower._id,
            id: follower._id,
            name: follower.name,
            profileImage: follower.profileImage || '',
            isVerified: false, // Add verification logic if needed
            isFollowing: currentUser.following.includes(follower._id) // Check if current user follows this follower
        }));

        res.status(200).json({
            success: true,
            data: followers
        });

    } catch (error) {
        console.error('Get user followers error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching followers'
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
                message: 'Invalid user ID format'
            });
        }

        const user = await User.findById(userId).populate('following', 'name profileImage');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get current user's following list to determine follow status
        const currentUser = await User.findById(currentUserId).select('following');

        // Format following data for frontend with follow status
        const following = user.following.map(followedUser => ({
            _id: followedUser._id,
            id: followedUser._id,
            name: followedUser.name,
            profileImage: followedUser.profileImage || '',
            isVerified: false, // Add verification logic if needed
            isFollowing: currentUser.following.includes(followedUser._id) // Check if current user follows this followed user
        }));

        res.status(200).json({
            success: true,
            data: following
        });

    } catch (error) {
        console.error('Get user following error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching following'
        });
    }
};

// Configure Cloudinary storage for multer
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'social-media-profiles', // Cloudinary folder name
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        transformation: [{ width: 500, height: 500, crop: 'limit' }], // Resize images
        public_id: (req, file) => `profile-${Date.now()}-${Math.round(Math.random() * 1E9)}`
    }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Update profile image
export const updateProfileImage = async (req, res) => {
    try {
        const userId = req.user._id; // From auth middleware

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No image file provided'
            });
        }

        // Cloudinary provides the full URL in req.file.path
        const imageUrl = req.file.path;

        // Update user profile image in database
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { profileImage: imageUrl },
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Profile image updated successfully',
            data: updatedUser
        });

    } catch (error) {
        console.error('Update profile image error:', error);

        // Handle multer errors
        if (error instanceof multer.MulterError) {
            if (error.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    message: 'File too large. Maximum size is 5MB.'
                });
            }
        }

        // Handle file filter errors
        if (error.message === 'Only image files are allowed!') {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error updating profile image'
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
                message: 'No image file provided'
            });
        }

        // Cloudinary provides the full URL in req.file.path
        const imageUrl = req.file.path;

        // Update user cover image in database
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { coverImage: imageUrl },
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Cover image updated successfully',
            data: updatedUser
        });

    } catch (error) {
        console.error('Update cover image error:', error);

        // Handle multer errors
        if (error instanceof multer.MulterError) {
            if (error.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    message: 'File too large. Maximum size is 5MB.'
                });
            }
        }

        // Handle file filter errors
        if (error.message === 'Only image files are allowed!') {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error updating cover image'
        });
    }
};

// Export multer upload middleware for use in routes
export { upload };
