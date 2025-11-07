import express from 'express';
import multer from 'multer';
import {
    getPosts,
    createPost,
    toggleLike,
    addComment,
    deletePost,
    deleteComment,
    editPost
} from '../controllers/postcontrollers.js';
import protect from '../middleware/auth.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Allow images and videos
        if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image and video files are allowed'), false);
        }
    }
});

// All post routes require authentication
router.use(protect);

// Get posts for feed
router.get('/posts', getPosts);

// Alias route for compatibility with frontend calling /api/post/all
router.get('/post/all', getPosts);

// Alias for like route
router.post('/post/:postId/like', toggleLike);

// Alias for comment route
router.post('/post/:id/comment', addComment);

// Create new post with file upload
router.post('/posts', upload.any(), createPost);

// Like/Unlike post
router.post('/posts/:postId/like', toggleLike);

// Add comment to post
router.post('/posts/:postId/comments', addComment);

// Edit post
router.put('/posts/:postId', editPost);

// Delete post
router.delete('/posts/:postId', deletePost);

// Delete comment
router.delete('/posts/:postId/comments/:commentId', deleteComment);

export default router;
