import express from 'express';
import { createuser, loginUser, googleAuth, googleAuthCallback, googleAuthToken, getUserProfile, updateUserProfile, followUser, unfollowUser, getFollowers, getAllUsers, getUserById, getUserFollowers, getUserFollowing, updateProfileImage, updateCoverImage, upload } from '../controllers/usercontrollers.js';
import protect from '../middleware/auth.js';

const router = express.Router();

// Auth routes
router.post('/user/createuser', createuser);
router.post('/user/login', loginUser);

// Google OAuth routes
router.post('/user/auth/google', googleAuthToken);
router.get('/user/auth/google', googleAuth);
router.get('/user/auth/google/callback', googleAuthCallback);

// Protected routes
router.get('/user/profile', protect, getUserProfile);
router.put('/user/profile', protect, updateUserProfile);
router.get('/user/all', protect, getAllUsers);
router.get('/user/:userId', protect, getUserById);

// Follow/Unfollow routes
router.post('/user/follow/:userId', protect, followUser);
router.delete('/user/unfollow/:userId', protect, unfollowUser);
router.get('/user/followers', protect, getFollowers);

// Followers/Following lists for any user
router.get('/user/:userId/followers', protect, getUserFollowers);
router.get('/user/:userId/following', protect, getUserFollowing);

// Profile image upload route
router.put('/user/profile/image', protect, upload.single('profileImage'), updateProfileImage);

// Cover image upload route
router.put('/user/profile/cover', protect, upload.single('coverImage'), updateCoverImage);

export default router;
