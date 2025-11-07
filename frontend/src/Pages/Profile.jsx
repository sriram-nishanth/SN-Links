import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ModernNavbar from "../Components/ModernNavbar";
import Toast from "../Components/Toast";
import { useSocket } from "../Context/SocketContext";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { useUser } from "../Context/UserContext";
import DefaultAvatar from "../Components/DefaultAvatar";
import { ProfileData, chatData, Posts, Friend } from "../utils/assest";

const Profile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [followersCount, setFollowersCount] = useState(0);
  const [currentProfileImage, setCurrentProfileImage] = useState(null);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [userMedia, setUserMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileImageLoaded, setProfileImageLoaded] = useState(false);
  const fileInputRef = React.useRef(null);
  const { t } = useTranslation();
  const { user, refreshUser } = useUser();

  // Modal states for followers/following lists
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(""); // 'followers' or 'following'
  const [modalData, setModalData] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [toast, setToast] = useState({ message: "", type: "" });

  const isOwnProfile = user?._id === userId;
  const isFollowing = userProfile?.followers?.some(
    (follower) =>
      (typeof follower === "string" ? follower : follower?._id) === user?._id
  );

  // Get token helper
  const getToken = () => {
    const token = document.cookie
      .split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1];
    return token;
  };

  // Fetch user posts from backend
  const fetchUserPosts = async () => {
    try {
      const token = getToken();
      if (!token) {
        setUserPosts([]);
        setUserMedia([]);
        return;
      }

      // Get target user ID - always use userId from URL params (dynamic)
      const targetUserId = userId;

      if (!targetUserId) {
        setUserPosts([]);
        setUserMedia([]);
        return;
      }

      // Fetch all posts using Axios
      const response = await axios.get("http://localhost:3000/api/posts", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.data.success && response.data.data) {
        // Filter posts by target user
        const filteredPosts = response.data.data.filter((post) => {
          let authorId;
          if (post.author && typeof post.author === "object") {
            authorId = post.author._id || post.author;
          } else {
            authorId = post.author;
          }
          return authorId?.toString() === targetUserId?.toString();
        });

        // Transform posts
        const transformedPosts = filteredPosts.map((post) => ({
          id: post._id,
          author: {
            id: post.author && post.author._id ? post.author._id : post.author,
            name:
              post.author && post.author.name ? post.author.name : "Unknown",
            username: `@${(post.author && post.author.name
              ? post.author.name
              : "unknown"
            )
              .toLowerCase()
              .replace(/\s+/g, "")}`,
            profileImage:
              post.author && post.author.profileImage
                ? post.author.profileImage
                : "",
          },
          content: post.content || "",
          media: post.media || "",
          isVideo: post.isVideo || false,
          likes: post.likes
            ? Array.isArray(post.likes)
              ? post.likes.length
              : 0
            : 0,
          comments: post.comments || [],
          timestamp: post.createdAt
            ? new Date(post.createdAt).toLocaleDateString()
            : "Recently",
        }));

        setUserPosts(transformedPosts);

        // Extract media from posts for media gallery
        const mediaItems = transformedPosts
          .filter((post) => post.media && post.media.trim() !== "")
          .map((post) => ({
            type: post.isVideo ? "video" : "image",
            url: post.media,
          }));

        setUserMedia(mediaItems);
      } else {
        setUserPosts([]);
        setUserMedia([]);
      }
    } catch (error) {
      console.error("Error fetching user posts:", error);
      setUserPosts([]);
      setUserMedia([]);
    }
  };

  // Fetch user profile data from backend
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = getToken();
        console.log("Token exists:", !!token);
        console.log("UserId from URL:", userId);
        console.log("Logged-in user ID:", user?._id);

        if (!token) {
          console.error("No authentication token found");
          setLoading(false);
          return;
        }

        if (!userId) {
          console.error("No userId in URL params");
          setLoading(false);
          return;
        }

        console.log("Fetching profile for userId:", userId);

        // Always use the dynamic userId from URL params
        const response = await axios.get(
          `http://localhost:3000/api/user/${userId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        console.log("Profile API response:", response.data);

        if (response.data.success && response.data.data) {
          setUserProfile(response.data.data);
          console.log("Profile set successfully:", response.data.data.name);
        } else {
          console.error("API returned success=false or no data");
          setUserProfile(null);
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        console.error("Error details:", error.response?.data || error.message);
        setUserProfile(null);
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if we have userId and user is set
    if (userId && user?._id) {
      console.log("Conditions met, fetching profile...");
      setLoading(true);
      fetchUserProfile();
      fetchUserPosts();
    } else if (!userId) {
      console.error("Missing userId - cannot fetch profile");
      setLoading(false);
    } else if (!user?._id) {
      console.log("Waiting for user context to load...");
      // Keep loading true, wait for user to load
    }
  }, [userId, user?._id]);

  // Follow/Unfollow functions
  const handleFollow = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await axios.post(
        `http://localhost:3000/api/user/follow/${userId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        setIsFollowing(true);
        setFollowersCount((prev) => prev + 1);
        refreshUser();
      }
    } catch (error) {
      console.error("Error following user:", error);
      if (
        error.response &&
        error.response.data &&
        error.response.data.message
      ) {
        setToast({
          message: `Error: ${error.response.data.message}`,
          type: "error",
        });
      } else {
        setToast({
          message:
            "An error occurred while following the user. Please try again.",
          type: "error",
        });
      }
    }
  };

  const handleUnfollow = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await axios.delete(
        `http://localhost:3000/api/user/unfollow/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        setIsFollowing(false);
        setFollowersCount((prev) => prev - 1);
        localStorage.removeItem(`followed_${userId}`);
        // Dispatch custom event to notify PostSlide of follow change
        refreshUser();
      }
    } catch (error) {
      console.error("Error unfollowing user:", error);
    }
  };

  // Modal functions for followers/following lists
  const openModal = async (type) => {
    setModalType(type);
    setModalLoading(true);
    setModalError(null);
    setShowModal(true);

    try {
      const token = getToken();
      if (!token) {
        setModalError("Authentication required");
        return;
      }

      const response = await axios.get(
        `http://localhost:3000/api/user/${userId}/${type}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        setModalData(response.data.data);
      } else {
        setModalError("Failed to load data");
      }
    } catch (error) {
      console.error(`Error fetching ${type}:`, error);
      setModalError("Failed to load data");
    } finally {
      setModalLoading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setModalData([]);
    setModalType("");
    setModalError(null);
  };

  // Handle follow/unfollow in modal
  const handleModalFollow = async (targetUserId) => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await axios.post(
        `http://localhost:3000/api/user/follow/${targetUserId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        // Update modal data to reflect the follow
        setModalData((prev) =>
          prev.map((user) =>
            user._id === targetUserId ? { ...user, isFollowing: true } : user
          )
        );
        // Dispatch custom event to notify other components
        refreshUser();
      }
    } catch (error) {
      console.error("Error following user from modal:", error);
    }
  };

  const handleModalUnfollow = async (targetUserId) => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await axios.delete(
        `http://localhost:3000/api/user/unfollow/${targetUserId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        // Update modal data to reflect the unfollow
        setModalData((prev) =>
          prev.map((user) =>
            user._id === targetUserId ? { ...user, isFollowing: false } : user
          )
        );
        // Dispatch custom event to notify other components
        refreshUser();
      }
    } catch (error) {
      console.error("Error unfollowing user from modal:", error);
    }
  };

  // Profile image change functions
  const handleImageClick = () => {
    if (isOwnProfile) {
      fileInputRef.current.click();
    }
  };

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCurrentProfileImage(e.target.result);
      };
      reader.readAsDataURL(file);
      setShowImageUpload(true);
    }
  };

  const handleSaveImage = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const fileInput = fileInputRef.current;
      if (!fileInput || !fileInput.files[0]) return;

      const formData = new FormData();
      formData.append("profileImage", fileInput.files[0]);

      const response = await axios.put(
        "http://localhost:3000/api/user/profile/image",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data.success) {
        // Update the user context to refresh profile image
        refreshUser();

        // Dispatch event to update header and other components
        refreshUser();

        setShowImageUpload(false);
        setCurrentProfileImage(null);
        fileInputRef.current.value = "";
      } else {
        setToast({ message: "Failed to update profile image", type: "error" });
      }
    } catch (error) {
      console.error("Error updating profile image:", error);
      setToast({ message: "Failed to update profile image", type: "error" });
    }
  };

  const handleCancelImage = () => {
    setCurrentProfileImage(null);
    setShowImageUpload(false);
    fileInputRef.current.value = "";
  };

  // Function to generate dummy profile data for non-existent users
  const generateDummyProfile = (id) => {
    const userId = parseInt(id);

    // First check chatData for chat users (prioritize for navigation from chat)
    const chatUser = chatData.activeChats.find((c) => c.id === userId);
    if (chatUser) {
      return {
        id: userId,
        name: chatUser.name,
        username: `@${chatUser.name.toLowerCase().replace(/\s+/g, "")}`,
        description: `Active user in conversations. Connecting and sharing moments.`,
        profileImage: chatUser.avatar,
        backgroundImage:
          "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&h=400&fit=crop",
        followers: 150 + ((userId * 10) % 100),
        following: 80 + ((userId * 5) % 50),
        skills: ["Social Media", "Networking", "Communication"],
        media: [
          {
            type: "image",
            url: `https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=face&faceindex=${
              userId % 10
            }`,
          },
          {
            type: "image",
            url: `https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&h=300&fit=crop&crop=face&faceindex=${
              (userId + 1) % 10
            }`,
          },
          {
            type: "image",
            url: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&h=300&fit=crop&crop=face&faceindex=${
              (userId + 2) % 10
            }`,
          },
        ],
      };
    }

    // Then check Posts data if available
    const existingAuthors = Posts.map((post) => post.author);
    const existingAuthor = existingAuthors.find(
      (author) => author.id === userId
    );

    if (existingAuthor) {
      // Use the actual author data from Posts
      return {
        id: userId,
        name: existingAuthor.name,
        username: existingAuthor.username,
        description: `Content creator and developer. Sharing my journey in tech and design.`,
        profileImage: existingAuthor.profileImage,
        backgroundImage:
          "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&h=400&fit=crop",
        followers: 342, // Real count instead of random
        following: 128, // Real count instead of random
        skills: ["Web Development", "React", "JavaScript"],
        media: [
          {
            type: "image",
            url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=face&faceindex=1",
          },
          {
            type: "image",
            url: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&h=300&fit=crop&crop=face&faceindex=2",
          },
          {
            type: "image",
            url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&h=300&fit=crop&crop=face&faceindex=3",
          },
        ],
      };
    }

    // Then check if it's a friend from Friends data
    const friend = Friend.find((f) => f.id === userId);

    if (friend) {
      // Use the actual friend data from Friends
      return {
        id: userId,
        name: friend.name,
        username: `@${friend.name.toLowerCase().replace(" ", "")}`,
        description: `Social media user and content creator. Connecting with friends and sharing moments.`,
        profileImage: friend.profileImage,
        backgroundImage:
          "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&h=400&fit=crop",
        followers: 234, // Consistent count for friends
        following: 89, // Consistent count for friends
        skills: ["Content Creator", "Social Media", "Networking"],
        media: [
          {
            type: "image",
            url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=face&faceindex=1",
          },
          {
            type: "image",
            url: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&h=300&fit=crop&crop=face&faceindex=2",
          },
          {
            type: "image",
            url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&h=300&fit=crop&crop=face&faceindex=3",
          },
        ],
      };
    }

    // For completely new users, use consistent dummy data with realistic counts
    const dummyNames = [
      "Alex Johnson",
      "Sarah Wilson",
      "Mike Chen",
      "Emma Davis",
      "David Brown",
      "Lisa Garcia",
      "Tom Anderson",
      "Rachel Martinez",
    ];
    const dummyUsernames = [
      "@alex_dev",
      "@sarah_w",
      "@mike_c",
      "@emma_d",
      "@david_b",
      "@lisa_g",
      "@tom_a",
      "@rachel_m",
    ];
    const dummyDescriptions = [
      "Full Stack Developer | React & Node.js enthusiast",
      "UI/UX Designer | Creating beautiful digital experiences",
      "Frontend Developer | JavaScript lover",
      "Product Designer | Building user-centered solutions",
      "Software Engineer | Passionate about clean code",
      "Creative Designer | Art & Technology enthusiast",
      "Web Developer | Always learning new technologies",
      "Digital Artist | Bringing ideas to life",
    ];

    // Use consistent counts based on user ID instead of random
    const baseFollowers = [156, 289, 445, 623, 78, 934, 267, 512];
    const baseFollowing = [89, 234, 167, 398, 45, 678, 123, 456];

    const name = dummyNames[(userId - 1) % dummyNames.length];
    const username = dummyUsernames[(userId - 1) % dummyUsernames.length];
    const description =
      dummyDescriptions[(userId - 1) % dummyDescriptions.length];
    const followers = baseFollowers[(userId - 1) % baseFollowers.length];
    const following = baseFollowing[(userId - 1) % baseFollowing.length];

    return {
      id: userId,
      name,
      username,
      description,
      profileImage: null,
      backgroundImage:
        "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&h=400&fit=crop",
      followers: followers, // Consistent count instead of random
      following: following, // Consistent count instead of random
      skills: ["Web Development", "React", "JavaScript"],
      media: [],
    };
  };

  // Function to generate dummy posts for non-existent users
  const generateDummyPosts = (userId) => {
    const profile = generateDummyProfile(userId);
    const dummyPosts = [];
    const numPosts = Math.floor(Math.random() * 3) + 1; // 1-3 posts

    for (let i = 0; i < numPosts; i++) {
      dummyPosts.push({
        id: parseInt(userId) * 100 + i,
        author: {
          id: parseInt(userId),
          name: profile.name,
          username: profile.username,
          profileImage: profile.profileImage,
        },
        content: `This is a sample post from ${profile.name}. Lorem ipsum dolor sit amet, consectetur adipiscing elit.`,
        media: `https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=300&fit=crop&crop=entropy&auto=format&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8cmFuZG9tJTIwaW1hZ2V8ZW58MHx8MHx8fDA%3D`,
        isVideo: false,
        likes: Math.floor(Math.random() * 100) + 10,
        comments: [],
        timestamp: `${Math.floor(Math.random() * 24)} hours ago`,
      });
    }

    return dummyPosts;
  };

  // Show loading state
  if (loading) {
    return (
      <div className="bg-gradient-to-r from-zinc-900 to-slate-900 min-h-screen">
        <ModernNavbar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 pt-20 sm:pt-24 pb-24 sm:pb-6">
          <div className="flex justify-center items-center h-[60vh]">
            <div className="text-white text-xl">Loading profile...</div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if no profile data
  if (!userProfile) {
    return (
      <div className="bg-gradient-to-r from-zinc-900 to-slate-900 min-h-screen">
        <ModernNavbar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 pt-20 sm:pt-24 pb-24 sm:pb-6">
          <div className="flex flex-col justify-center items-center h-[60vh] gap-4">
            <div className="text-white text-xl">User not found</div>
            <button
              onClick={() => navigate("/home")}
              className="px-6 py-2 bg-yellow-400 text-gray-900 font-semibold rounded-lg hover:bg-yellow-500 transition"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Use backend data - no fallback to dummy data
  const profile = {
    id: userProfile._id,
    name: userProfile.name,
    username: `@${userProfile.name.toLowerCase().replace(/\s+/g, "")}`,
    description: userProfile.bio || "No bio available",
    profileImage: userProfile.profileImage,
    backgroundImage:
      userProfile.backgroundImage ||
      "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&h=400&fit=crop",
    followers: userProfile.followers?.length || 0,
    following: userProfile.following?.length || 0,
    skills: ["Social Media", "Networking"], // TODO: Add skills to user model
    media: userMedia, // Use real media from posts
  };

  return (
    <div className="bg-gradient-to-r from-zinc-900 to-slate-900 min-h-screen">
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: "" })}
      />
      <ModernNavbar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 pt-20 sm:pt-24 pb-24 sm:pb-6">
        <div className="flex flex-col lg:flex-row justify-center lg:justify-between gap-4 sm:gap-6 lg:gap-8 items-start rounded-2xl p-3 sm:p-4 lg:p-6 text-white">
          {/* Profile Card - Left */}
          <div className="bg-[#1A1A1A]/40 backdrop-blur-2xl w-full lg:w-1/3 p-4 sm:p-6 lg:p-8 flex flex-col items-center gap-3 sm:gap-4 lg:gap-6 rounded-2xl lg:sticky lg:top-24">
            <div className="relative">
              {currentProfileImage || profile.profileImage ? (
                <div className="relative">
                  {!profileImageLoaded && (
                    <div
                      className={`w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 animate-pulse ring-2 ${
                        isOwnProfile
                          ? "ring-yellow-400/50 cursor-pointer hover:ring-yellow-400/80 hover:scale-105"
                          : "ring-yellow-400/50"
                      }`}
                    />
                  )}
                  <img
                    src={currentProfileImage || profile.profileImage}
                    alt={profile.name}
                    className={`w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 rounded-full object-cover shadow-xl ring-2 transition-all duration-300 ${
                      profileImageLoaded
                        ? "opacity-100 scale-100"
                        : "opacity-0 scale-95"
                    } ${
                      isOwnProfile
                        ? "ring-yellow-400/50 cursor-pointer hover:ring-yellow-400/80 hover:scale-105"
                        : "ring-yellow-400/50"
                    }`}
                    onClick={handleImageClick}
                    onLoad={() => setProfileImageLoaded(true)}
                    onError={() => setProfileImageLoaded(false)}
                  />
                </div>
              ) : (
                <DefaultAvatar
                  name={profile.name}
                  size="w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32"
                  className={`ring-2 transition-all ${
                    isOwnProfile
                      ? "ring-yellow-400/50 cursor-pointer hover:ring-yellow-400/80 hover:scale-105"
                      : "ring-yellow-400/50"
                  }`}
                  onClick={handleImageClick}
                />
              )}
              {isOwnProfile && (
                <div className="absolute bottom-0 right-0 bg-yellow-400 text-black rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-lg">
                  ✏️
                </div>
              )}
            </div>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-center">
              {profile.name}
            </h1>
            <p className="text-gray-400 text-center text-sm sm:text-base">
              {profile.username}
            </p>
            <p className="text-center text-gray-300 text-xs sm:text-sm lg:text-base px-2">
              {profile.description}
            </p>

            {/* Followers/Following */}
            <div className="flex gap-4 text-center">
              <div
                className="cursor-pointer hover:bg-gray-700/50 rounded-lg p-2 transition-colors"
                onClick={() => openModal("followers")}
              >
                <p className="text-lg font-bold">
                  {profile.followers + followersCount}
                </p>
                <p className="text-gray-400 text-sm">Followers</p>
              </div>
              <div
                className="cursor-pointer hover:bg-gray-700/50 rounded-lg p-2 transition-colors"
                onClick={() => openModal("following")}
              >
                <p className="text-lg font-bold">{profile.following}</p>
                <p className="text-gray-400 text-sm">Following</p>
              </div>
            </div>

            {/* Conditional Button - Edit Profile for own profile, Follow/Unfollow for others */}
            {isOwnProfile ? (
              <button
                onClick={() => navigate("/Setting")}
                className="bg-yellow-400 text-black text-sm sm:text-base lg:text-lg font-semibold px-4 sm:px-6 lg:px-8 py-2 rounded-full hover:bg-yellow-500 transition-colors w-full sm:w-auto"
              >
                {t("profile.editProfile")}
              </button>
            ) : (
              <button
                onClick={isFollowing ? handleUnfollow : handleFollow}
                className={`text-sm sm:text-base lg:text-lg font-semibold px-4 sm:px-6 lg:px-8 py-2 rounded-full transition-colors w-full sm:w-auto ${
                  isFollowing
                    ? "bg-gray-600 text-white hover:bg-gray-700"
                    : "bg-blue-500 text-white hover:bg-blue-600"
                }`}
              >
                {isFollowing ? "Unfollow" : "Follow"}
              </button>
            )}
          </div>

          {/* Posts and Media Gallery - Right */}
          <div className="flex-1 bg-[#1A1A1A]/40 backdrop-blur-2xl rounded-2xl p-3 sm:p-4 lg:p-6 max-h-[calc(100vh-130px)] overflow-y-auto">
            {/* User Posts */}
            {userPosts.length > 0 && (
              <div className="mb-6">
                <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-3 sm:mb-4 text-yellow-400">
                  Posts
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {userPosts.map((post) => (
                    <div
                      key={post.id}
                      className="bg-[#2A2A2A] rounded-lg overflow-hidden"
                    >
                      {post.media && (
                        <img
                          src={post.media}
                          alt="post"
                          className="w-full h-48 object-cover"
                        />
                      )}
                      <div className="p-3">
                        <p className="text-sm">{post.content}</p>
                        <p className="text-gray-400 text-xs mt-1">
                          {post.timestamp}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Media Gallery */}
            <div>
              <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-3 sm:mb-4 text-yellow-400">
                {t("profile.media")}
              </h2>
              {userMedia.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
                  {userMedia.map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg overflow-hidden cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => setSelectedMedia(item)}
                    >
                      {item.type === "image" ? (
                        <img
                          src={item.url}
                          alt={`media-${idx}`}
                          className="w-full h-20 sm:h-24 lg:h-32 object-cover"
                        />
                      ) : item.type === "video" ? (
                        <video className="w-full h-20 sm:h-24 lg:h-32 object-cover">
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
          </div>
        </div>
      </div>

      {/* Fullscreen Media Preview */}
      {selectedMedia && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <button
            onClick={() => setSelectedMedia(null)}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 text-white text-2xl sm:text-3xl font-bold hover:text-yellow-400"
          >
            ✖
          </button>
          {selectedMedia.type === "image" ? (
            <img
              src={selectedMedia.url}
              alt="full-preview"
              className="max-w-full max-h-full rounded-lg shadow-lg"
            />
          ) : (
            <video
              controls
              autoPlay
              className="max-w-full max-h-full rounded-lg shadow-lg"
            >
              <source src={selectedMedia.url} type="video/mp4" />
            </video>
          )}
        </div>
      )}

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageChange}
        accept="image/*"
        className="hidden"
      />

      {/* Image Upload Modal */}
      {showImageUpload && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1A1A1A] rounded-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4 text-center">
              Change Profile Picture
            </h3>

            <div className="flex flex-col items-center gap-4">
              <img
                src={currentProfileImage}
                alt="New profile"
                className="w-32 h-32 rounded-full object-cover ring-2 ring-yellow-400/50"
              />

              <div className="flex gap-3 w-full">
                <button
                  onClick={handleCancelImage}
                  className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveImage}
                  className="flex-1 bg-yellow-400 text-black py-2 px-4 rounded-lg hover:bg-yellow-500 transition-colors font-semibold"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Followers/Following Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1A1A1A] rounded-2xl p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white capitalize">
                {modalType}
              </h3>
              <button
                onClick={closeModal}
                className="text-white text-2xl font-bold hover:text-yellow-400"
              >
                ✖
              </button>
            </div>

            {modalLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-400">Loading...</p>
              </div>
            ) : modalError ? (
              <div className="text-center py-8">
                <p className="text-red-400">{modalError}</p>
              </div>
            ) : modalData.length > 0 ? (
              <div className="space-y-3">
                {modalData.map((modalUser) => (
                  <div
                    key={modalUser._id}
                    className="flex items-center justify-between p-3 bg-[#2A2A2A] rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={
                          modalUser.profileImage ||
                          `https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face`
                        }
                        alt={modalUser.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <p className="text-white font-medium">
                          {modalUser.name}
                        </p>
                        <p className="text-gray-400 text-sm">
                          @{modalUser.name.toLowerCase().replace(/\s+/g, "")}
                        </p>
                      </div>
                    </div>
                    {user?._id !== modalUser._id && (
                      <button
                        onClick={() =>
                          modalUser.isFollowing
                            ? handleModalUnfollow(modalUser._id)
                            : handleModalFollow(modalUser._id)
                        }
                        className={`px-4 py-1 rounded-full text-sm font-medium transition-colors ${
                          modalUser.isFollowing
                            ? "bg-gray-600 text-white hover:bg-gray-700"
                            : "bg-blue-500 text-white hover:bg-blue-600"
                        }`}
                      >
                        {modalUser.isFollowing ? "Unfollow" : "Follow"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400">No {modalType} yet</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
