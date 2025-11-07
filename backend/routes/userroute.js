import express from 'express';
import { createuser, loginUser, googleAuth, googleAuthCallback, googleAuthToken, getUserProfile, updateUserProfile, followUser, unfollowUser, getFollowers, getAllUsers, getUserById, getUserFollowers, getUserFollowing, updateProfileImage, updateCoverImage, upload, getActivityLogs, getConnectedApps, updateConnectedApps, getLanguage, updateLanguage, getPrivacySettings, updatePrivacySettings, getNotifications, updateNotifications, updatePassword, deleteUser } from '../controllers/usercontrollers.js';
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

// Settings routes
router.get('/user/activity', protect, getActivityLogs);
router.get('/user/apps', protect, getConnectedApps);
router.put('/user/apps', protect, updateConnectedApps);
router.get('/user/language', protect, getLanguage);
router.put('/user/language', protect, updateLanguage);
router.get('/user/privacy', protect, getPrivacySettings);
router.put('/user/privacy', protect, updatePrivacySettings);
router.get('/user/notifications', protect, getNotifications);
router.put('/user/notifications', protect, updateNotifications);
router.put('/user/password', protect, updatePassword);
router.delete('/user/delete', protect, deleteUser);

export default router;
