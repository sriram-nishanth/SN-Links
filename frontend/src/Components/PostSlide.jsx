import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { assert, ProfileData } from "../utils/assest";
import { useUser } from "../Context/UserContext";
import { useSocket } from "../Context/SocketContext";
import Avatar from "./Avatar";
import {
  FaRegHeart,
  FaHeart,
  FaRegComment,
  FaTelegramPlane,
  FaEllipsisV,
  FaEdit,
  FaTrash,
} from "react-icons/fa";
import Toast from "./Toast";
import { CiFileOn } from "react-icons/ci";

const PostSlide = ({ searchQuery }) => {
  const { user } = useUser();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [newPost, setNewPost] = useState("");
  const [comments, setComments] = useState({});
  const [showComments, setShowComments] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isVideo, setIsVideo] = useState(false);
  const [posts, setPosts] = useState([]);
  const [likedPosts, setLikedPosts] = useState(new Set());
  const [sharePostId, setSharePostId] = useState(null);
  const [sharedPosts, setSharedPosts] = useState({});
  const [followedUsers, setFollowedUsers] = useState(new Set());
  const [editingPostId, setEditingPostId] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [friends, setFriends] = useState([]);
  const [deletePostId, setDeletePostId] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showProfileImage, setShowProfileImage] = useState(null);
  const [toast, setToast] = useState({ message: "", type: "" });

  useEffect(() => {
    if (socket && socket.on) {
      socket.on("new_post", (newPost) => {
        setPosts((prevPosts) => [newPost, ...prevPosts]);
      });

      socket.on("like_post", ({ postId, likes }) => {
        setPosts((prevPosts) =>
          prevPosts.map((post) =>
            post.id === postId ? { ...post, likes } : post,
          ),
        );
      });

      socket.on("new_comment", ({ postId, comments }) => {
        setPosts((prevPosts) =>
          prevPosts.map((post) =>
            post.id === postId ? { ...post, comments } : post,
          ),
        );
      });

      return () => {
        if (socket && socket.off) {
          socket.off("new_post");
          socket.off("like_post");
          socket.off("new_comment");
        }
      };
    }
  }, [socket]);

  // Fetch user profile and posts from backend
  useEffect(() => {
    const fetchUserAndPosts = async () => {
      try {
        const token = user?.token;
        if (!token) {
          setLoading(false);
          return;
        }

        let currentUserData = null;

        // Fetch user profile first
        const userResponse = await fetch(
          "http://localhost:3000/api/user/profile",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          },
        );

        if (userResponse.ok) {
          const userData = await userResponse.json();
          if (userData.success) {
            setUserProfile(userData.data);
            setCurrentUserId(userData.data._id);
            currentUserData = userData.data;

            // Fetch friends
            const friendsResponse = await fetch(
              `http://localhost:3000/api/user/${userData.data._id}/following`,
              {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
              },
            );

            if (friendsResponse.ok) {
              const friendsData = await friendsResponse.json();
              if (friendsData.success) {
                setFriends(friendsData.data);
              }
            }
          }
        }

        // Fetch posts
        const response = await fetch("http://localhost:3000/api/posts", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            // Transform backend posts to match frontend format
            const transformedPosts = data.data.map((post) => ({
              id: post._id,
              author: {
                id: post.author._id,
                name: post.author.name,
                username: `@${post.author.name.toLowerCase().replace(/\s+/g, "")}`,
                profileImage:
                  post.author.profileImage || ProfileData[0].profileImage,
              },
              content: post.content,
              media: post.media,
              isVideo: post.isVideo,
              likes: post.likes.length,
              likedByUser: currentUserData
                ? post.likes.includes(currentUserData._id)
                : false,
              comments: post.comments.map((comment) => ({
                id: comment._id,
                user: comment.user.name,
                text: comment.text,
                userId: comment.user._id,
              })),
              timestamp: new Date(post.createdAt).toLocaleDateString(),
            }));
            setPosts(transformedPosts);

            // Initialize liked posts set
            const initialLiked = new Set();
            transformedPosts.forEach((post) => {
              if (post.likedByUser) {
                initialLiked.add(post.id);
              }
            });
            setLikedPosts(initialLiked);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        // Fallback to dummy posts if backend fails
        setPosts(initialPosts);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndPosts();
  }, []);

  const filteredPosts = posts.filter(
    (post) =>
      post.author?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.content?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleLike = async (postId) => {
    try {
      const token = user?.token;
      if (!token) {
        setToast({ message: "Please login to like posts", type: "error" });
        return;
      }

      // Optimistic update
      const wasLiked = likedPosts.has(postId);
      const currentPost = posts.find((p) => p.id === postId);
      const currentLikes = currentPost ? Number(currentPost.likes) || 0 : 0;

      setLikedPosts((prev) => {
        const newLiked = new Set(prev);
        if (wasLiked) {
          newLiked.delete(postId);
        } else {
          newLiked.add(postId);
        }
        return newLiked;
      });

      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId
            ? {
                ...post,
                likes: wasLiked
                  ? Math.max(0, currentLikes - 1)
                  : currentLikes + 1,
              }
            : post,
        ),
      );

      const response = await fetch(
        `http://localhost:3000/api/posts/${postId}/like`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Update to the server value
          setPosts((prevPosts) =>
            prevPosts.map((post) =>
              post.id === postId
                ? {
                    ...post,
                    likes: Number(data.data.likes) || 0,
                  }
                : post,
            ),
          );
          // LikedPosts is already updated optimistically

          if (socket && socket.emit) {
            socket.emit("like_post", { postId, likes: data.data.likes });
          }
        }
      } else {
        // Revert optimistic update
        setLikedPosts((prev) => {
          const newLiked = new Set(prev);
          if (wasLiked) {
            newLiked.add(postId);
          } else {
            newLiked.delete(postId);
          }
          return newLiked;
        });
        setPosts((prevPosts) =>
          prevPosts.map((post) =>
            post.id === postId
              ? {
                  ...post,
                  likes: currentLikes,
                }
              : post,
          ),
        );
        setToast({ message: "Failed to like post", type: "error" });
      }
    } catch (error) {
      console.error("Error liking post:", error);
      // Revert optimistic update
      const wasLiked = likedPosts.has(postId);
      const currentPost = posts.find((p) => p.id === postId);
      const currentLikes = currentPost ? Number(currentPost.likes) || 0 : 0;
      setLikedPosts((prev) => {
        const newLiked = new Set(prev);
        if (wasLiked) {
          newLiked.add(postId);
        } else {
          newLiked.delete(postId);
        }
        return newLiked;
      });
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId
            ? {
                ...post,
                likes: currentLikes,
              }
            : post,
        ),
      );
      setToast({ message: "Error liking post", type: "error" });
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setIsVideo(file.type.startsWith("video/"));
    }
  };

  const handlePostSubmit = async () => {
    if (!newPost.trim() && !selectedFile) return;

    try {
      const token = user?.token;
      if (!token) {
        setToast({ message: "Please login to post", type: "error" });
        return;
      }

      const formData = new FormData();
      formData.append("content", newPost);
      if (selectedFile) {
        formData.append("media", selectedFile);
        formData.append("isVideo", isVideo);
      }

      const response = await fetch("http://localhost:3000/api/posts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Add new post to the beginning of the posts array for seamless display
          const newPost = {
            id: data.data._id,
            author: {
              id: data.data.author._id,
              name: data.data.author.name,
              username: `@${data.data.author.name.toLowerCase().replace(/\s+/g, "")}`,
              profileImage:
                data.data.author.profileImage || ProfileData[0].profileImage,
            },
            content: data.data.content,
            media: data.data.media,
            isVideo: data.data.isVideo,
            likes: data.data.likes.length,
            comments: data.data.comments.map((comment) => ({
              id: comment._id,
              user: comment.user.name,
              text: comment.text,
            })),
            timestamp: new Date(data.data.createdAt).toLocaleDateString(),
          };

          // Add new post to the top of the list
          setPosts((prevPosts) => [newPost, ...prevPosts]);

          // Emit a socket event to notify other clients about the new post
          if (socket && socket.emit) {
            socket.emit("new_post", newPost);
          }
        }
      } else {
        setToast({ message: "Failed to create post", type: "error" });
      }
    } catch (error) {
      console.error("Error creating post:", error);
      setToast({ message: "Error creating post", type: "error" });
    }

    setNewPost("");
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsVideo(false);
  };

  const handleComment = async (postId) => {
    if (!comments[postId]?.trim()) return;

    try {
      const token = user?.token;
      if (!token) {
        setToast({ message: "Please login to comment", type: "error" });
        return;
      }

      const response = await fetch(
        `http://localhost:3000/api/posts/${postId}/comments`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: comments[postId] }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Add new comment to local state immediately (Instagram-style)
          const newComment = {
            id: data.data._id,
            user: userProfile?.name || "You",
            text: comments[postId],
            userId: currentUserId,
          };

          setPosts((prevPosts) =>
            prevPosts.map((post) =>
              post.id === postId
                ? {
                    ...post,
                    comments: [...post.comments, newComment],
                  }
                : post,
            ),
          );

          if (socket && socket.emit) {
            socket.emit("new_comment", {
              postId,
              comments: [...post.comments, newComment],
            });
          }

          // Auto-show comments when a new comment is added
          setShowComments((prev) => ({ ...prev, [postId]: true }));
        }
      } else {
        setToast({ message: "Failed to add comment", type: "error" });
      }
    } catch (error) {
      console.error("Error adding comment:", error);
      setToast({ message: "Error adding comment", type: "error" });
    }

    setComments((prev) => ({ ...prev, [postId]: "" }));
  };

  const toggleComments = (postId) => {
    setShowComments((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  const handleShare = (friend, postId) => {
    const postToShare = posts.find((post) => post.id === postId);
    if (!postToShare) {
      console.error("Post not found for sharing");
      return;
    }

    try {
      // Create a shared post message for the chat
      const sharedPostMessage = {
        id: Date.now(),
        text: `Shared a post`,
        sender: "me",
        timestamp: new Date(),
        status: "sent",
        messageType: "shared_post",
        postData: postToShare,
      };

      // Store the shared post in localStorage so Chat component can access it
      const existingSharedMessages = JSON.parse(
        localStorage.getItem("sharedMessages") || "{}",
      );
      const friendMessages = existingSharedMessages[friend.id] || [];

      existingSharedMessages[friend.id] = [
        ...friendMessages,
        sharedPostMessage,
      ];
      localStorage.setItem(
        "sharedMessages",
        JSON.stringify(existingSharedMessages),
      );

      // Update the chat's last message to show the shared post
      const existingChatData = JSON.parse(
        localStorage.getItem("chatData") || "{}",
      );
      const activeChats = existingChatData.activeChats || [];

      const friendChatIndex = activeChats.findIndex(
        (chat) => chat.id === friend.id,
      );
      if (friendChatIndex !== -1) {
        activeChats[friendChatIndex].lastMessage =
          `Shared: ${postToShare.content || "Media post"}`;
        activeChats[friendChatIndex].lastMessageTime = "now";
        localStorage.setItem("chatData", JSON.stringify(existingChatData));
      }

      // Update local state for immediate UI feedback
      setSharedPosts((prev) => {
        const friendSharedPosts = prev[friend.id] || [];
        return {
          ...prev,
          [friend.id]: [...friendSharedPosts, postToShare],
        };
      });

      // Show success feedback
      // alert(`Post shared successfully with ${friend.name}!`);

      setSharePostId(null);
    } catch (error) {
      console.error("Error sharing post:", error);
      // alert('Failed to share post. Please try again.');
    }
  };

  const handleEditPost = (postId) => {
    const post = posts.find((p) => p.id === postId);
    if (post) {
      setEditingPostId(postId);
      setEditContent(post.content || "");
    }
  };

  const handleSaveEdit = async (postId) => {
    try {
      const token = user?.token;
      if (!token) {
        setToast({ message: "Please login to edit posts", type: "error" });
        return;
      }

      const response = await fetch(
        `http://localhost:3000/api/posts/${postId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ content: editContent }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Update local state
          setPosts((prevPosts) =>
            prevPosts.map((post) =>
              post.id === postId ? { ...post, content: editContent } : post,
            ),
          );
          setEditingPostId(null);
          setEditContent("");
        }
      } else {
        setToast({ message: "Failed to edit post", type: "error" });
      }
    } catch (error) {
      console.error("Error editing post:", error);
      setToast({ message: "Error editing post", type: "error" });
    }
  };

  const handleDeletePost = (postId) => {
    setDeletePostId(postId);
  };

  const confirmDeletePost = async () => {
    if (!deletePostId) return;

    try {
      const token = user?.token;
      if (!token) {
        setToast({ message: "Please login to delete posts", type: "error" });
        return;
      }

      const response = await fetch(
        `http://localhost:3000/api/posts/${deletePostId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Remove post from local state
          setPosts((prevPosts) =>
            prevPosts.filter((post) => post.id !== deletePostId),
          );
          setDeletePostId(null);
        }
      } else {
        setToast({ message: "Failed to delete post", type: "error" });
      }
    } catch (error) {
      console.error("Error deleting post:", error);
      setToast({ message: "Error deleting post", type: "error" });
    }
  };

  const handleDeleteComment = async (postId, commentId) => {
    try {
      const token = user?.token;
      if (!token) {
        setToast({ message: "Please login to delete comments", type: "error" });
        return;
      }

      const response = await fetch(
        `http://localhost:3000/api/posts/${postId}/comments/${commentId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Remove comment from local state
          setPosts((prevPosts) =>
            prevPosts.map((post) =>
              post.id === postId
                ? {
                    ...post,
                    comments: post.comments.filter(
                      (comment) => comment.id !== commentId,
                    ),
                  }
                : post,
            ),
          );
        }
      } else {
        setToast({ message: "Failed to delete comment", type: "error" });
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
      setToast({ message: "Error deleting comment", type: "error" });
    }
  };

  return (
    <div
      className="w-full max-w-4xl mx-auto h-[calc(100vh-7rem)] overflow-y-auto space-y-3 sm:space-y-4 lg:space-y-6 px-2 sm:px-0
      [&::-webkit-scrollbar]:w-2
      [&::-webkit-scrollbar-track]:bg-gray-800
      [&::-webkit-scrollbar-thumb]:bg-yellow-400/50
      [&::-webkit-scrollbar-thumb]:rounded-full
      [&::-webkit-scrollbar-thumb]:hover:bg-yellow-400/80"
    >
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: "" })}
      />
      {/*Upload Post Box */}
      <div className="bg-[#1A1A1A]/40 backdrop-blur-3xl p-3 sm:p-4 rounded-2xl space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <Avatar
            src={userProfile?.profileImage}
            name={userProfile?.name}
            size="medium"
            className="border-2 border-yellow-400/30"
          />
          <div className="flex-1 flex flex-col sm:flex-row gap-2 w-full">
            <input
              type="text"
              placeholder="What's on your mind?"
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handlePostSubmit();
                }
              }}
              className="flex-1 bg-[#2A2A2A] px-3 sm:px-4 py-2 sm:py-3 rounded-xl text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
            />

            <div className="flex gap-2">
              {/* File Upload */}
              <label className="cursor-pointer bg-[#2A2A2A] px-3 py-2 rounded-xl hover:bg-[#3A3A3A] transition-colors">
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <CiFileOn className="text-2xl sm:text-2xl text-amber-50 hover:text-amber-100 font-bold" />
              </label>

              {/* Post Button */}
              <button
                onClick={handlePostSubmit}
                disabled={!newPost.trim() && !selectedFile}
                className="bg-yellow-400 text-black px-3 sm:px-4 lg:px-6 py-2 rounded-xl font-semibold hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
              >
                Post
              </button>
            </div>
          </div>
        </div>

        {/*Media Preview */}
        {previewUrl && (
          <div className="relative w-full mt-3">
            {isVideo ? (
              <video
                src={previewUrl}
                controls
                className="w-full max-h-60 sm:max-h-80 rounded-xl"
              />
            ) : (
              <img
                src={previewUrl}
                alt="preview"
                className="w-full max-h-60 sm:max-h-80 object-contain rounded-xl"
              />
            )}
            <button
              onClick={() => {
                setSelectedFile(null);
                setPreviewUrl(null);
                setIsVideo(false);
              }}
              className="absolute top-2 right-2 bg-yellow-400 text-black w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-full font-bold shadow-lg hover:bg-yellow-500 transition"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/*Posts */}
      {filteredPosts.map((post) => (
        <div
          key={post.id}
          className="bg-[#1A1A1A]/40 backdrop-blur-3xl text-white rounded-2xl shadow-lg overflow-hidden p-3 sm:p-4"
        >
          {/* User Info */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div onClick={() => navigate(`/profile/${post.author.id}`)}>
                <Avatar
                  src={post.author.profileImage}
                  name={post.author.name}
                  size="medium"
                  className="cursor-pointer hover:ring-2 hover:ring-yellow-400/50 transition"
                />
              </div>
              <div className="ml-3">
                <h2 className="font-semibold text-sm sm:text-base">
                  {post.author.name}
                </h2>
                <p className="text-gray-400 text-xs sm:text-sm">
                  {post.timestamp}
                </p>
              </div>
            </div>
            {post.author.id === currentUserId && (
              <div className="relative">
                <button
                  onClick={() =>
                    setShowComments((prev) => ({
                      ...prev,
                      [post.id + "_menu"]: !prev[post.id + "_menu"],
                    }))
                  }
                  className="text-gray-400 hover:text-white"
                >
                  <FaEllipsisV />
                </button>
                {showComments[post.id + "_menu"] && (
                  <div className="absolute right-0 mt-2 bg-[#2A2A2A] rounded-lg shadow-lg py-2 z-10">
                    <button
                      onClick={() => {
                        handleEditPost(post.id);
                        setShowComments((prev) => ({
                          ...prev,
                          [post.id + "_menu"]: false,
                        }));
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-[#3A3A3A] w-full text-left"
                    >
                      <FaEdit /> Edit
                    </button>
                    <button
                      onClick={() => {
                        handleDeletePost(post.id);
                        setShowComments((prev) => ({
                          ...prev,
                          [post.id + "_menu"]: false,
                        }));
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-[#3A3A3A] w-full text-left text-red-400"
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
            <div className="mb-3 space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="Edit your post..."
                className="w-full bg-[#2A2A2A] px-3 py-2 rounded-xl text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 resize-none"
                rows={3}
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setEditingPostId(null);
                    setEditContent("");
                  }}
                  className="px-4 py-1 bg-gray-600 text-gray-300 rounded-lg hover:bg-gray-500 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSaveEdit(post.id)}
                  className="px-4 py-1 bg-yellow-400 text-black rounded-lg font-semibold hover:bg-yellow-500 text-sm"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            post.content && (
              <p className="mb-3 text-sm sm:text-base">{post.content}</p>
            )
          )}

          {/* Media */}
          {post.media &&
            (post.isVideo ? (
              <video
                src={post.media}
                controls
                className="w-full rounded-lg mb-3"
              />
            ) : (
              <img
                src={post.media}
                alt="post"
                className="w-full rounded-lg mb-3"
              />
            ))}

          {/* Actions */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => handleLike(post.id)}
              className={`flex items-center gap-1 text-sm sm:text-base ${
                likedPosts.has(post.id)
                  ? "text-pink-500"
                  : "hover:text-pink-500"
              }`}
            >
              {likedPosts.has(post.id) ? (
                <FaHeart className="fill-pink-500" />
              ) : (
                <FaRegHeart />
              )}
              <span>{post.likes}</span>
            </button>

            <button
              onClick={() => toggleComments(post.id)}
              className="hover:text-sky-400 flex items-center gap-1 text-sm sm:text-base"
            >
              <FaRegComment />
              <span>{post.comments.length}</span>
            </button>
            <button
              onClick={() => setSharePostId(post.id)}
              className="hover:text-green-400"
            >
              <FaTelegramPlane />
            </button>
          </div>

          {/* Comments */}
          {showComments[post.id] && (
            <div className="mt-3 sm:mt-4 space-y-3 sm:space-y-4">
              <div className="space-y-2">
                {post.comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="flex items-start gap-2 text-xs sm:text-sm group"
                  >
                    <span className="font-semibold">{comment.user}:</span>
                    <p className="text-gray-300 flex-1">{comment.text}</p>
                    {comment.userId === currentUserId && (
                      <button
                        onClick={() => handleDeleteComment(post.id, comment.id)}
                        className="text-red-400 hover:text-red-300 text-xs transition-colors"
                        title="Delete comment"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
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
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleComment(post.id);
                    }
                  }}
                  className="flex-1 bg-[#2A2A2A] px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm text-gray-300 focus:outline-none"
                />

                <button
                  onClick={() => handleComment(post.id)}
                  className="bg-yellow-400 text-black px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-semibold hover:bg-yellow-500"
                >
                  Comment
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/*Share Modal */}
      {sharePostId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1A1A1A] p-4 sm:p-6 rounded-xl w-full max-w-sm sm:max-w-md space-y-4">
            <h2 className="text-base sm:text-lg font-semibold text-white mb-2">
              Share Post With:
            </h2>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {friends.map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center justify-between bg-[#2A2A2A] p-2 rounded-lg"
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Avatar
                    src={friend.profileImage}
                    name={friend.name}
                    size="w-6 h-6 sm:w-8 sm:h-8"
                    />
                    <p className="text-white text-xs sm:text-sm">
                      {friend.name}
                    </p>
                  </div>
                  <button
                    onClick={() => handleShare(friend, sharePostId)}
                    className="bg-yellow-400 text-black px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm font-semibold hover:bg-yellow-500"
                  >
                    Send
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => setSharePostId(null)}
              className="w-full mt-3 bg-gray-700 text-gray-200 py-2 rounded-lg hover:bg-gray-600 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/*Delete Confirmation Modal */}
      {deletePostId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1A1A1A] p-4 sm:p-6 rounded-xl w-full max-w-sm sm:max-w-md space-y-4">
            <h2 className="text-base sm:text-lg font-semibold text-white mb-2">
              Delete Post
            </h2>
            <p className="text-gray-300 text-sm mb-4">
              Are you sure you want to delete this post? This action cannot be
              undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeletePostId(null)}
                className="px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeletePost}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-semibold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Image Modal */}
      {showProfileImage && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setShowProfileImage(null)}
        >
          <div className="relative max-w-md max-h-screen">
            <img
              src={showProfileImage}
              alt="Profile"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            <button
              onClick={() => setShowProfileImage(null)}
              className="absolute top-2 right-2 bg-yellow-400 text-black w-8 h-8 flex items-center justify-center rounded-full font-bold shadow-lg hover:bg-yellow-500 transition"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostSlide;
