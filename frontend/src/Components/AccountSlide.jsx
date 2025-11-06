import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { useUser } from "../Context/UserContext";
import DefaultAvatar from "./DefaultAvatar";
import Toast from './Toast';
import { ProfileSkeleton } from "./LoadingSkeleton";
import bgProfile from '../assets/bgprofile.png';
import { FadeIn, CardHover } from "./AnimatedComponents";

const AccountSlide = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, loading: userLoading, updateUser } = useUser();
  const [userPosts, setUserPosts] = useState([]);
  const [userMedia, setUserMedia] = useState([]);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [toast, setToast] = useState({ message: '', type: '' });


  // Cover image states
  const [coverImagePreview, setCoverImagePreview] = useState(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverFileInputRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  const API_BASE_URL = "http://localhost:3000/api";

  // Get token from cookie
  const getToken = () => {
    const token = document.cookie
      .split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1];
    return token;
  };

  // Fetch user posts
  const fetchUserPosts = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const currentUserId = user?._id;

      if (!currentUserId) {
        return;
      }

      // Fetch all posts
      const response = await axios.get(`${API_BASE_URL}/posts`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.data.success && response.data.data) {
        // Filter posts by logged-in user
        const filteredPosts = response.data.data.filter((post) => {
          let authorId;
          if (post.author && typeof post.author === "object") {
            authorId = post.author._id || post.author;
          } else {
            authorId = post.author;
          }
          return authorId?.toString() === currentUserId.toString();
        });

        // Transform posts
        const transformedPosts = filteredPosts.map((post) => ({
          id: post._id,
          content: post.content || "",
          media: post.media || "",
          isVideo: post.isVideo || false,
          likes: post.likes ? (Array.isArray(post.likes) ? post.likes.length : 0) : 0,
          comments: post.comments || [],
          timestamp: post.createdAt
            ? new Date(post.createdAt).toLocaleDateString()
            : "Recently",
        }));

        setUserPosts(transformedPosts);

        // Extract media from posts
        const mediaItems = transformedPosts
          .filter((post) => post.media && post.media.trim() !== "")
          .map((post) => ({
            type: post.isVideo ? "video" : "image",
            url: post.media,
          }));

        setUserMedia(mediaItems);
      }
    } catch (err) {
      console.error("Error fetching user posts:", err);
    }
  };

  // Fetch posts when user changes
  useEffect(() => {
    if (user && !userLoading) {
      fetchUserPosts();
    }
  }, [user, userLoading]);



  // Loading state
  if (userLoading) {
    return <ProfileSkeleton />;
  }

  // No user logged in
  if (!user) {
    return (
      <div className="w-full bg-[#1A1A1A]/40 backdrop-blur-3xl flex flex-wrap gap-4 sm:gap-6 text-white p-3 sm:p-4 lg:p-6 rounded-2xl">
        <div className="w-full text-center py-8">
          <p className="text-gray-400 text-lg mb-2">Login to view your profile</p>
          <button
            onClick={() => navigate("/login")}
            className="mt-4 px-6 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded-lg text-sm font-medium"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }



  // Handle file selection for cover image
  const handleCoverFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setToast({ message: 'Please select an image file', type: 'error' });
        return;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        setToast({ message: 'File size must be less than 5MB', type: 'error' });
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setCoverImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);

      // Upload immediately
      uploadCoverImage(file);
    }
  };

  // Upload cover image
  const uploadCoverImage = async (file) => {
    setUploadingCover(true);
    try {
      const token = getToken();
      const formData = new FormData();
      formData.append('coverImage', file);

      const response = await axios.put(`${API_BASE_URL}/user/profile/cover`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        // Update global user state using context
        updateUser({
          ...user,
          coverImage: response.data.data.coverImage
        });

        // Clear preview
        setCoverImagePreview(null);

        // Dispatch custom event for other components
        window.dispatchEvent(new CustomEvent('profileUpdated'));

        setToast({ message: 'Cover image updated successfully!', type: 'success' });
      }
    } catch (error) {
      console.error('Cover upload error:', error);
      if (error.response?.data?.message) {
        setToast({ message: error.response.data.message, type: 'error' });
      } else {
        setToast({ message: 'Failed to upload cover image. Please try again.', type: 'error' });
      }
    } finally {
      setUploadingCover(false);
    }
  };

  // User profile data - use real-time data from database
  // Only use defaults if data is missing, never use dummy data
  const profile = {
    id: user._id, // Always from database
    name: user.name, // Real name from database
    username: `@${user.name.toLowerCase().replace(/\s+/g, "")}`, // Generated from real name
    bio: user.bio || "No bio available", // Real bio from database (or empty message)
    profileImage: user.profileImage || "", // Real profile image from database
    backgroundImage: user.coverImage || bgProfile,
    followers: Array.isArray(user.followers) ? user.followers.length : 0, // Real followers count from database
    following: Array.isArray(user.following) ? user.following.length : 0, // Real following count from database
  };

  return (
    <FadeIn>
      <React.Fragment>
        <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />
        <div className="w-full bg-[#1A1A1A]/40 backdrop-blur-3xl flex flex-col gap-4 sm:gap-6 text-white p-3 sm:p-4 lg:p-6 rounded-2xl overflow-hidden">
        {/* Profile Card */}
        <CardHover>
          <div className="w-full rounded-2xl overflow-hidden transform transition-all duration-300">
        {/* Background image */}
        <div
          className="h-32 sm:h-40 bg-cover bg-center relative rounded-t-2xl backdrop-blur-2xl group cursor-pointer"
          style={{ backgroundImage: `url(${coverImagePreview || profile.backgroundImage})` }}
        >
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-300"></div>

          {/* Edit Cover Image Button */}
          <button
            onClick={() => coverFileInputRef.current?.click()}
            className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-black/50 hover:bg-black/70 text-white p-1.5 sm:p-2 rounded-full transition-colors duration-200 z-10"
            disabled={uploadingCover}
            title="Edit cover image"
          >
            {uploadingCover ? (
              <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b border-white"></div>
            ) : (
              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            )}
          </button>

          {/* Hidden file input for cover image */}
          <input
            ref={coverFileInputRef}
            type="file"
            accept="image/*"
            onChange={handleCoverFileSelect}
            className="hidden"
          />



          {user.profileImage && user.profileImage.trim() !== "" ? (
            <img
              src={user.profileImage}
              alt={`${user.name}'s profile`}
              className="absolute left-1/2 -bottom-12 sm:-bottom-16 transform -translate-x-1/2 w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover border-4 border-[#1A1A1A] transition-transform duration-300 group-hover:scale-110 shadow-lg"
              onError={(e) => {
                e.target.style.display = "none";
                e.target.nextSibling.style.display = "flex";
              }}
            />
          ) : (
            <div className="absolute left-1/2 -bottom-12 sm:-bottom-16 transform -translate-x-1/2">
              <DefaultAvatar
                name={user.name}
                size="w-20 h-20 sm:w-24 sm:h-24"
                className="border-4 border-[#1A1A1A] transition-transform duration-300 group-hover:scale-110 shadow-lg"
              />
            </div>
          )}
        </div>

        {/* Card Content */}
        <div className="pt-12 sm:pt-16 pb-4 sm:pb-6 px-3 sm:px-4 text-center rounded-b-2xl shadow-2xl bg-gradient-to-b from-transparent to-[#1A1A1A]/20">
          <div className="flex justify-between px-2 sm:px-6 mb-4 sm:mb-6">
            <div className="text-center transform transition-transform duration-200 hover:scale-105 flex-1">
              <p className="font-bold text-lg sm:text-xl text-yellow-400">
                {Array.isArray(user.followers) ? user.followers.length : 0}
              </p>
              <p className="text-xs sm:text-sm text-gray-400 font-medium">Followers</p>
            </div>
            <div className="text-center transform transition-transform duration-200 hover:scale-105 flex-1">
              <p className="font-bold text-lg sm:text-xl text-yellow-400">
                {Array.isArray(user.following) ? user.following.length : 0}
              </p>
              <p className="text-xs sm:text-sm text-gray-400 font-medium">Following</p>
            </div>
          </div>

          <h2 className="font-semibold text-lg sm:text-xl mb-1 text-white break-words">
            {user.name}
          </h2>
          <p className="text-gray-400 text-sm sm:text-base mb-2 font-medium break-words">
            {profile.username}
          </p>
          <p className="text-gray-300 text-xs sm:text-sm leading-relaxed px-2 break-words line-clamp-3">
            {user.bio || "No bio available"}
          </p>

          <button
            onClick={() => navigate(`/profile/${profile.id}`)}
            className="mt-4 sm:mt-6 w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-semibold text-sm sm:text-base cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95"
          >
            My Profile
          </button>
        </div>
      </div>
        </CardHover>

      {/* Posts Section */}
      <div className="mt-4">
        <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-3 sm:mb-4 text-yellow-400">
          Posts
        </h2>
        {userPosts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {userPosts.map((post) => (
              <div
                key={post.id}
                className="bg-[#2A2A2A] rounded-lg overflow-hidden hover:scale-[1.02] transition-transform duration-200 cursor-pointer shadow-md hover:shadow-lg"
                onClick={() => navigate(`/profile/${profile.id}`)}
              >
                {post.media && post.media.trim() !== "" && (
                  <div className="w-full aspect-square sm:aspect-video overflow-hidden">
                    <img
                      src={post.media}
                      alt="post"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="p-3 min-h-[80px]">
                  {post.content && post.content.trim() !== "" ? (
                    <p className="text-sm text-gray-300 line-clamp-2 break-words">
                      {post.content}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No content</p>
                  )}
                  <p className="text-gray-400 text-xs mt-2">{post.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm">No posts yet</p>
          </div>
        )}
      </div>

      {/* Media Gallery */}
      <div className="mt-4">
        <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-3 sm:mb-4 text-yellow-400">
          Media
        </h2>
        {userMedia.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
            {userMedia.map((item, idx) => (
              <div
                key={idx}
                className="rounded-lg overflow-hidden cursor-pointer hover:scale-105 transition-transform duration-200 aspect-square"
                onClick={() => setSelectedMedia(item)}
              >
                {item.type === "image" ? (
                  <img
                    src={item.url}
                    alt={`media-${idx}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : item.type === "video" ? (
                  <video className="w-full h-full object-cover" muted>
                    <source src={item.url} type="video/mp4" />
                  </video>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm">No media yet</p>
          </div>
        )}
      </div>

      {/* Fullscreen Media Preview */}
      {selectedMedia && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedMedia(null)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedMedia(null);
            }}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 text-white text-2xl sm:text-3xl font-bold hover:text-yellow-400 z-10"
          >
            ✖
          </button>
          {selectedMedia.type === "image" ? (
            <img
              src={selectedMedia.url}
              alt="full-preview"
              className="max-w-full max-h-full rounded-lg shadow-lg"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <video
              controls
              autoPlay
              className="max-w-full max-h-full rounded-lg shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <source src={selectedMedia.url} type="video/mp4" />
            </video>
          )}
        </div>
      )}
    </div>
  </React.Fragment>
  </FadeIn>
  );
};

export default AccountSlide;
