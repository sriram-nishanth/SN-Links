import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../Context/UserContext";
import { useSocket } from "../Context/SocketContext";
import Avatar from "./Avatar";
import FollowButton from "./FollowButton";
import Toast from "./Toast";
import SharePostModal from "./SharePostModal";
import {
  FaRegHeart,
  FaHeart,
  FaRegComment,
  FaTelegramPlane,
  FaEllipsisV,
  FaEdit,
  FaTrash,
} from "react-icons/fa";
import { CiFileOn } from "react-icons/ci";
import axios from "axios";

const EnhancedPostSlide = ({ searchQuery }) => {
  const { user } = useUser();
  const { socket } = useSocket();
  const navigate = useNavigate();

  // State management
  const [newPost, setNewPost] = useState("");
  const [comments, setComments] = useState({});
  const [showComments, setShowComments] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isVideo, setIsVideo] = useState(false);
  const [posts, setPosts] = useState([]);
  const [likedPosts, setLikedPosts] = useState(new Set());
  const [followedUsers, setFollowedUsers] = useState(new Set());
  const [editingPostId, setEditingPostId] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [deletePostId, setDeletePostId] = useState(null);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentContent, setEditCommentContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [showProfileImage, setShowProfileImage] = useState(null);
  const [toast, setToast] = useState({ message: "", type: "" });
  const [showDropdown, setShowDropdown] = useState(null);
  const [showAllPosts, setShowAllPosts] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedPostForShare, setSelectedPostForShare] = useState(null);

  const API_BASE_URL = `${import.meta.env.VITE_API_CALL}`;

  // Get token
  const getToken = () => {
    const token = document.cookie
      .split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1];
    return token || user?.token;
  };

  // Fetch user profile and following list
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = getToken();
        if (!token) return;

        const response = await axios.get(`${API_BASE_URL}/user/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.data.success) {
          const followingIds = new Set(
            response.data.data.following.map((id) => id.toString()),
          );
          setFollowedUsers(followingIds);
        }
      } catch (error) {
      }
    };

    fetchUserProfile();
  }, []);

  // Fetch posts from backend
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const token = getToken();
        if (!token) {
          setLoading(false);
          return;
        }

        const response = await axios.get(`${API_BASE_URL}/post/all`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.data.success) {
          const postsData = response.data.data.map((post) => ({
            ...post,
            id: post._id,
            author: {
              id: post.author._id,
              name: post.author.name,
              username: `@${post.author.name.toLowerCase().replace(/\s+/g, "")}`,
              profileImage: post.author.profileImage || "",
            },
            content: post.content,
            media: post.media || null,
            isVideo: post.isVideo || false,
            likes: post.likes || [],
            comments: post.comments || [],
            timestamp: new Date(post.createdAt).toLocaleString(),
          }));

          setPosts(postsData);

          // Set liked posts
          const likedPostIds = new Set(
            postsData
              .filter((post) => Array.isArray(post.likes) && post.likes.includes(user?._id))
              .map((post) => post.id),
          );
          setLikedPosts(likedPostIds);
        }
      } catch (error) {
        setToast({ message: "Error loading posts", type: "error" });
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [user, followedUsers]);

  // Socket listeners for real-time updates
  useEffect(() => {
    if (socket && socket.on) {
      socket.on("new_post", (newPost) => {
        const formattedPost = {
          ...newPost,
          id: newPost._id,
          author: {
            id: newPost.author._id,
            name: newPost.author.name,
            username: `@${newPost.author.name.toLowerCase().replace(/\s+/g, "")}`,
            profileImage: newPost.author.profileImage || "",
          },
        };
        setPosts((prevPosts) => [formattedPost, ...prevPosts]);
      });

      socket.on("like_post", ({ postId, likes }) => {
        setPosts((prevPosts) =>
          prevPosts.map((post) =>
            post.id === postId ? { ...post, likes } : post,
          ),
        );
      });

      return () => {
        if (socket && socket.off) {
          socket.off("new_post");
          socket.off("like_post");
        }
      };
    }
  }, [socket]);

  // Listen for follow state changes
  useEffect(() => {
    const handleFollowChange = (event) => {
      const { targetUserId, isFollowing } = event.detail;
      setFollowedUsers((prev) => {
        const newSet = new Set(prev);
        if (isFollowing) {
          newSet.add(targetUserId);
        } else {
          newSet.delete(targetUserId);
        }
        return newSet;
      });

      // Optionally refresh posts to show/hide based on follow status
      // Uncomment if you want to filter posts by followed users only
      // fetchPosts();
    };

    window.addEventListener("followStateChanged", handleFollowChange);
    return () => {
      window.removeEventListener("followStateChanged", handleFollowChange);
    };
  }, []);

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const fileURL = URL.createObjectURL(file);
      setPreviewUrl(fileURL);
      setIsVideo(file.type.startsWith("video/"));
    }
  };

  // Create new post
  const handleCreatePost = async () => {
    if (!newPost.trim() && !selectedFile) {
      setToast({ message: "Please add content or media", type: "error" });
      return;
    }

    try {
      const token = getToken();
      const formData = new FormData();
      formData.append("content", newPost);

      if (selectedFile) {
        if (isVideo) {
          formData.append("video", selectedFile);
        } else {
          formData.append("image", selectedFile);
        }
      }

      const response = await axios.post(
        `${API_BASE_URL}/post/create`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        },
      );

      if (response.data.success) {
        setNewPost("");
        setSelectedFile(null);
        setPreviewUrl(null);
        setIsVideo(false);
        setToast({ message: "Post created successfully!", type: "success" });

        // Add new post to the list
        const newPostData = {
          ...response.data.data,
          id: response.data.data._id,
          author: {
            id: user._id,
            name: user.name,
            username: `@${user.name.toLowerCase().replace(/\s+/g, "")}`,
            profileImage: user.profileImage || "",
          },
        };
        setPosts((prev) => [newPostData, ...prev]);
      }
    } catch (error) {
      setToast({ message: "Error creating post", type: "error" });
    }
  };

  // Handle like/unlike
  const handleLike = async (postId) => {
    try {
      const token = getToken();
      const isLiked = likedPosts.has(postId);

      const response = await axios.post(
        `${API_BASE_URL}/post/${postId}/like`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.data.success) {
        setLikedPosts((prev) => {
          const newSet = new Set(prev);
          if (isLiked) {
            newSet.delete(postId);
          } else {
            newSet.add(postId);
          }
          return newSet;
        });

        setPosts((prev) =>
          prev.map((post) =>
            post.id === postId
              ? { ...post, likes: response.data.data.likes }
              : post,
          ),
        );
      }
    } catch (error) {
    }
  };

  // Handle comment
  const handleComment = async (postId) => {
    const commentText = comments[postId];
    if (!commentText || !commentText.trim()) return;

    try {
      const token = getToken();
      const response = await axios.post(
        `${API_BASE_URL}/post/${postId}/comment`,
        { content: commentText },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.data.success) {
        setPosts((prev) =>
          prev.map((post) =>
            post.id === postId
              ? { ...post, comments: response.data.data.comments }
              : post,
          ),
        );
        setComments((prev) => ({ ...prev, [postId]: "" }));
        setToast({ message: "Comment added!", type: "success" });
      }
    } catch (error) {
      setToast({ message: "Error adding comment", type: "error" });
    }
  };

  // Handle edit comment
  const handleEditComment = async (postId, commentId) => {
    if (!editCommentContent.trim()) return;

    try {
      const token = getToken();
      const response = await axios.put(
        `${API_BASE_URL}/posts/${postId}/comments/${commentId}`,
        { text: editCommentContent },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.data.success) {
        setPosts((prev) =>
          prev.map((post) =>
            post.id === postId
              ? { ...post, comments: response.data.data.comments }
              : post,
          ),
        );
        setEditingCommentId(null);
        setEditCommentContent("");
        setToast({ message: "Comment updated!", type: "success" });
      }
    } catch (error) {
      setToast({ message: "Error editing comment", type: "error" });
    }
  };

  // Handle delete comment
  const handleDeleteComment = async (postId, commentId) => {
    try {
      const token = getToken();
      const response = await axios.delete(
        `${API_BASE_URL}/posts/${postId}/comments/${commentId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.data.success) {
        setPosts((prev) =>
          prev.map((post) =>
            post.id === postId
              ? {
                  ...post,
                  comments: post.comments.filter(
                    (comment) => comment._id !== commentId,
                  ),
                }
              : post,
          ),
        );
        setToast({ message: "Comment deleted!", type: "success" });
      }
    } catch (error) {
      setToast({ message: "Error deleting comment", type: "error" });
    }
  };

  // Delete post
  const handleDeletePost = async (postId) => {
    try {
      const token = getToken();
      const response = await axios.delete(`${API_BASE_URL}/post/${postId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        setPosts((prev) => prev.filter((post) => post.id !== postId));
        setDeletePostId(null);
        setToast({ message: "Post deleted successfully", type: "success" });
      }
    } catch (error) {
      setToast({ message: "Error deleting post", type: "error" });
    }
  };

  // Update post
  const handleUpdatePost = async (postId) => {
    if (!editContent.trim()) return;

    try {
      const token = getToken();
      const response = await axios.put(
        `${API_BASE_URL}/post/${postId}`,
        { content: editContent },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.data.success) {
        setPosts((prev) =>
          prev.map((post) =>
            post.id === postId ? { ...post, content: editContent } : post,
          ),
        );
        setEditingPostId(null);
        setEditContent("");
        setToast({ message: "Post updated successfully", type: "success" });
      }
    } catch (error) {
      setToast({ message: "Error updating post", type: "error" });
    }
  };

  // Handle follow change callback
  const handleFollowChange = (userId, isFollowing, counts) => {
    setFollowedUsers((prev) => {
      const newSet = new Set(prev);
      if (isFollowing) {
        newSet.add(userId);
      } else {
        newSet.delete(userId);
      }
      return newSet;
    });

    setToast({
      message: isFollowing ? "User followed successfully!" : "User unfollowed",
      type: "success",
    });
  };

  // Filter posts based on search query and follow status
  const filteredPosts = posts.filter((post) => {
    // First filter by search query
    const matchesSearch =
      post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.author.name.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // If showing all posts, return all that match search
    if (showAllPosts) return true;

    // Otherwise, show only posts from followed users + own posts
    return (
      post.author.id === user?._id || // Own posts
      followedUsers.has(post.author.id) // Posts from followed users
    );
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-white text-xl">Loading posts...</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 sm:space-y-6">
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: "" })}
      />

      {/* Filter Toggle */}
      <div className="bg-[#1A1A1A]/40 backdrop-blur-2xl rounded-xl p-3 sm:p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-white font-medium text-sm sm:text-base">
            Show posts from:
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAllPosts(false)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                !showAllPosts
                  ? "bg-yellow-400 text-black"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              Following
            </button>
            <button
              onClick={() => setShowAllPosts(true)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                showAllPosts
                  ? "bg-yellow-400 text-black"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              Everyone
            </button>
          </div>
        </div>
      </div>

      {/* Create Post Section */}
      <div className="bg-[#1A1A1A]/40 backdrop-blur-2xl rounded-xl p-4 sm:p-6">
        <div className="flex gap-3 sm:gap-4">
          <Avatar
            src={user?.profileImage}
            name={user?.name || "User"}
            size="medium"
          />
          <div className="flex-1">
            <textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="What's on your mind?"
              className="w-full bg-gray-800 text-white rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-yellow-400"
              rows="3"
            />
            {previewUrl && (
              <div className="mt-3 relative">
                {isVideo ? (
                  <video
                    src={previewUrl}
                    controls
                    className="w-full rounded-lg"
                  />
                ) : (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full rounded-lg"
                  />
                )}
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                  }}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1"
                >
                  <FaTrash />
                </button>
              </div>
            )}
            <div className="flex justify-between items-center mt-3">
              <label className="cursor-pointer text-yellow-400 hover:text-yellow-500">
                <CiFileOn className="text-2xl" />
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              <button
                onClick={handleCreatePost}
                className="bg-yellow-400 text-black px-4 py-2 rounded-lg font-semibold hover:bg-yellow-500 transition"
              >
                Post
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Posts Feed */}
      {filteredPosts.length === 0 ? (
        <div className="text-center text-gray-400 py-8">
          {showAllPosts
            ? "No posts yet. Be the first to post!"
            : followedUsers.size === 0
              ? "Follow users to see their posts here! Switch to 'Everyone' to see all posts."
              : "No posts from followed users yet."}
        </div>
      ) : (
        filteredPosts.map((post) => (
          <div
            key={post.id}
            className="bg-[#1A1A1A]/40 backdrop-blur-2xl rounded-xl p-4 sm:p-6"
          >
            {/* Post Header */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex gap-3 items-center flex-1">
                <Avatar
                  src={post.author.profileImage}
                  name={post.author.name}
                  size="medium"
                  className="cursor-pointer hover:ring-2 hover:ring-yellow-400"
                  onClick={() => navigate(`/profile/${post.author.id}`)}
                />
                <div className="flex-1">
                  <h3
                    className="text-white font-semibold cursor-pointer hover:text-yellow-400 transition"
                    onClick={() => navigate(`/profile/${post.author.id}`)}
                  >
                    {post.author.name}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {post.author.username}
                  </p>
                  <p className="text-gray-500 text-xs">{post.timestamp}</p>
                </div>

                {/* Follow Button */}
                {post.author.id !== user?._id && (
                  <FollowButton
                    targetUserId={post.author.id}
                    targetUserName={post.author.name}
                    initialFollowState={followedUsers.has(post.author.id)}
                    onFollowChange={handleFollowChange}
                    size="small"
                  />
                )}
              </div>

              {/* Options Menu (for own posts) */}
              {post.author.id === user?._id && (
                <div className="relative">
                  <button
                    onClick={() =>
                      setShowDropdown(showDropdown === post.id ? null : post.id)
                    }
                    className="text-gray-400 hover:text-white"
                  >
                    <FaEllipsisV />
                  </button>
                  {showDropdown === post.id && (
                    <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg z-10">
                      <button
                        onClick={() => {
                          setEditingPostId(post.id);
                          setEditContent(post.content);
                          setShowDropdown(null);
                        }}
                        className="w-full text-left px-4 py-2 text-white hover:bg-gray-700 rounded-t-lg flex items-center gap-2"
                      >
                        <FaEdit /> Edit
                      </button>
                      <button
                        onClick={() => {
                          setDeletePostId(post.id);
                          setShowDropdown(null);
                        }}
                        className="w-full text-left px-4 py-2 text-red-400 hover:bg-gray-700 rounded-b-lg flex items-center gap-2"
                      >
                        <FaTrash /> Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Post Content */}
            {editingPostId === post.id ? (
              <div className="mb-4">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full bg-gray-800 text-white rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  rows="3"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleUpdatePost(post.id)}
                    className="bg-yellow-400 text-black px-4 py-1 rounded-lg hover:bg-yellow-500"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingPostId(null);
                      setEditContent("");
                    }}
                    className="bg-gray-600 text-white px-4 py-1 rounded-lg hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-white mb-4">{post.content}</p>
            )}

            {/* Post Media */}
            {post.media && (
              <div className="mb-4 rounded-lg overflow-hidden">
                {post.isVideo ? (
                  <video src={post.media} controls className="w-full" />
                ) : (
                  <img
                    src={post.media}
                    alt="Post content"
                    className="w-full object-cover cursor-pointer"
                    onClick={() => setShowProfileImage(post.media)}
                  />
                )}
              </div>
            )}

            {/* Post Actions */}
            <div className="flex items-center gap-4 sm:gap-6 mb-4 border-t border-gray-700 pt-4">
              <button
                onClick={() => handleLike(post.id)}
                className="flex items-center gap-2 text-gray-400 hover:text-red-500 transition"
              >
                {likedPosts.has(post.id) ? (
                  <FaHeart className="text-red-500" />
                ) : (
                  <FaRegHeart />
                )}
                <span>{post.likes.length}</span>
              </button>
              <button
                onClick={() =>
                  setShowComments((prev) => ({
                    ...prev,
                    [post.id]: !prev[post.id],
                  }))
                }
                className="flex items-center gap-2 text-gray-400 hover:text-blue-500 transition"
              >
                <FaRegComment />
                <span>{post.comments?.length || 0}</span>
              </button>
              <button
                onClick={() => {
                  setSelectedPostForShare(post);
                  setShareModalOpen(true);
                }}
                className="flex items-center gap-2 text-gray-400 hover:text-green-500 transition"
              >
                <FaTelegramPlane />
              </button>
            </div>

            {/* Comments Section */}
            {showComments[post.id] && (
              <div className="border-t border-gray-700 pt-4">
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={comments[post.id] || ""}
                    onChange={(e) =>
                      setComments((prev) => ({
                        ...prev,
                        [post.id]: e.target.value,
                      }))
                    }
                    placeholder="Write a comment..."
                    className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        handleComment(post.id);
                      }
                    }}
                  />
                  <button
                    onClick={() => handleComment(post.id)}
                    className="bg-yellow-400 text-black px-4 py-2 rounded-lg hover:bg-yellow-500"
                  >
                    Post
                  </button>
                </div>
                <div className="space-y-3">
                  {post.comments?.map((comment, index) => (
                    <div key={comment._id || index} className="flex gap-3">
                      <Avatar
                        src={comment.user?.profileImage}
                        name={comment.user?.name || "User"}
                        size="small"
                      />
                      <div className="flex-1">
                        {editingCommentId === comment._id ? (
                          <div className="bg-gray-800 rounded-lg p-3">
                            <p className="text-white font-semibold text-sm mb-2">
                              {comment.user?.name || "User"}
                            </p>
                            <textarea
                              value={editCommentContent}
                              onChange={(e) => setEditCommentContent(e.target.value)}
                              className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-yellow-400"
                              rows="2"
                            />
                            <div className="flex gap-2 mt-2">
                              <button
                                onClick={() => handleEditComment(post.id, comment._id)}
                                className="bg-yellow-400 text-black px-3 py-1 rounded text-sm hover:bg-yellow-500"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setEditingCommentId(null);
                                  setEditCommentContent("");
                                }}
                                className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gray-800 rounded-lg p-3 relative group">
                            <p className="text-white font-semibold text-sm">
                              {comment.user?.name || "User"}
                            </p>
                            <p className="text-gray-300 text-sm">
                              {comment.text}
                            </p>
                            {comment.user?._id === user?._id && (
                              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                <button
                                  onClick={() => {
                                    setEditingCommentId(comment._id);
                                    setEditCommentContent(comment.text);
                                  }}
                                  className="text-gray-400 hover:text-yellow-400 text-sm"
                                  title="Edit comment"
                                >
                                  <FaEdit />
                                </button>
                                <button
                                  onClick={() => handleDeleteComment(post.id, comment._id)}
                                  className="text-gray-400 hover:text-red-400 text-sm"
                                  title="Delete comment"
                                >
                                  <FaTrash />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))
      )}

      {/* Delete Confirmation Modal */}
      {deletePostId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-white text-xl font-semibold mb-4">
              Delete Post
            </h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete this post? This action cannot be
              undone.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => handleDeletePost(deletePostId)}
                className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600"
              >
                Delete
              </button>
              <button
                onClick={() => setDeletePostId(null)}
                className="flex-1 bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {showProfileImage && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowProfileImage(null)}
        >
          <img
            src={showProfileImage}
            alt="Full size"
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}

      <SharePostModal
        isOpen={shareModalOpen}
        onClose={() => {
          setShareModalOpen(false);
          setSelectedPostForShare(null);
        }}
        post={selectedPostForShare}
        onSendSuccess={() => {
          setShareModalOpen(false);
          setSelectedPostForShare(null);
        }}
      />
    </div>
  );
};

export default EnhancedPostSlide;
