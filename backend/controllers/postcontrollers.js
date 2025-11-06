import Post from '../models/post.js';

// Get all posts for the feed
export const getPosts = async (req, res) => {
    try {
        // Fetch all posts from all users
        const posts = await Post.find({})
        .populate('author', 'name profileImage')
        .populate('comments.user', 'name profileImage')
        .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: posts
        });

    } catch (error) {
        console.error('Get posts error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching posts'
        });
    }
};

// Create a new post
export const createPost = async (req, res) => {
    try {
        console.log('Full request:', {
            body: req.body,
            files: req.files,
            headers: req.headers['content-type'],
            method: req.method,
            url: req.url
        });

        // Handle form data fields - check if req.body exists
        let content = '';
        let isVideo = false;

        if (req.body) {
            content = req.body.content || '';
            isVideo = req.body.isVideo === 'true' || req.body.isVideo === true;
        }

        const userId = req.user._id;

        console.log('Parsed data:', { content, isVideo, userId, hasBody: !!req.body });

        // Handle file upload if present - files are in req.files
        let mediaUrl = '';
        if (req.files && req.files.length > 0) {
            const file = req.files[0]; // First file
            // For now, we'll store as base64. In production, you'd upload to cloud storage
            const base64 = file.buffer.toString('base64');
            const mimeType = file.mimetype;
            mediaUrl = `data:${mimeType};base64,${base64}`;
            console.log('Media uploaded, type:', mimeType);
        }

        if (!content && !mediaUrl) {
            return res.status(400).json({
                success: false,
                message: 'Post must have content or media'
            });
        }

        const post = new Post({
            author: userId,
            content: content,
            media: mediaUrl,
            isVideo: isVideo
        });

        await post.save();

        // Populate author info for response
        await post.populate('author', 'name profileImage');

        res.status(201).json({
            success: true,
            message: 'Post created successfully',
            data: post
        });

    } catch (error) {
        console.error('Create post error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating post'
        });
    }
};

// Like/Unlike a post
export const toggleLike = async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.user._id;

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }

        const likeIndex = post.likes.indexOf(userId);

        if (likeIndex > -1) {
            // Unlike
            post.likes.splice(likeIndex, 1);
        } else {
            // Like
            post.likes.push(userId);
        }

        await post.save();

        res.status(200).json({
            success: true,
            data: {
                postId,
                likes: post.likes.length,
                isLiked: likeIndex === -1
            }
        });

    } catch (error) {
        console.error('Toggle like error:', error);
        res.status(500).json({
            success: false,
            message: 'Error toggling like'
        });
    }
};

// Add comment to post
export const addComment = async (req, res) => {
    try {
        const { postId } = req.params;
        const { text } = req.body;
        const userId = req.user._id;

        if (!text || !text.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Comment text is required'
            });
        }

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }

        const comment = {
            user: userId,
            text: text.trim(),
            createdAt: new Date()
        };

        post.comments.push(comment);
        await post.save();

        // Populate the new comment's user info
        await post.populate('comments.user', 'name profileImage');

        const newComment = post.comments[post.comments.length - 1];

        res.status(201).json({
            success: true,
            data: newComment
        });

    } catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding comment'
        });
    }
};

// Delete a post (only by author)
export const deletePost = async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.user._id;

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }

        if (post.author.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this post'
            });
        }

        await Post.findByIdAndDelete(postId);

        res.status(200).json({
            success: true,
            message: 'Post deleted successfully'
        });

    } catch (error) {
        console.error('Delete post error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting post'
        });
    }
};

// Delete a comment (only by comment author)
export const deleteComment = async (req, res) => {
    try {
        const { postId, commentId } = req.params;
        const userId = req.user._id;

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }

        const commentIndex = post.comments.findIndex(comment => comment._id.toString() === commentId);
        if (commentIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Comment not found'
            });
        }

        const comment = post.comments[commentIndex];
        if (comment.user.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this comment'
            });
        }

        post.comments.splice(commentIndex, 1);
        await post.save();

        res.status(200).json({
            success: true,
            message: 'Comment deleted successfully'
        });

    } catch (error) {
        console.error('Delete comment error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting comment'
        });
    }
};

// Edit a post (only by author)
export const editPost = async (req, res) => {
    try {
        const { postId } = req.params;
        const { content } = req.body;
        const userId = req.user._id;

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }

        if (post.author.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to edit this post'
            });
        }

        post.content = content || '';
        await post.save();

        res.status(200).json({
            success: true,
            message: 'Post updated successfully',
            data: post
        });

    } catch (error) {
        console.error('Edit post error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating post'
        });
    }
};
