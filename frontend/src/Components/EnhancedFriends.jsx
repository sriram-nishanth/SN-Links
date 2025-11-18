import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../Context/UserContext";
import Avatar from "./Avatar";
import FollowButton from "./FollowButton";
import Toast from "./Toast";
import axios from "axios";

const EnhancedFriends = ({ searchQuery }) => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [users, setUsers] = useState([]);
  const [followedUsers, setFollowedUsers] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ message: "", type: "" });

  const API_BASE_URL = `${import.meta.env.VITE_API_CALL}`;

  // Get token
  const getToken = () => {
    const token = document.cookie
      .split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1];
    return token || user?.token;
  };

  // Fetch all users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = getToken();
        if (!token) {
          setLoading(false);
          return;
        }

        const response = await axios.get(`${API_BASE_URL}/user/all`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.data.success) {
          // Filter out current user from the list
          const filteredUsers = response.data.data.filter(
            (u) => u.id !== user?._id
          );
          setUsers(filteredUsers);
        }
      } catch (error) {
        setError("Failed to fetch users");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [user]);

  // Fetch current user's following list
  useEffect(() => {
    const fetchFollowing = async () => {
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
            response.data.data.following.map((id) => id.toString())
          );
          setFollowedUsers(followingIds);
        }
      } catch (error) {
      }
    };

    fetchFollowing();
  }, [user]);

  // Listen for follow state changes from other components
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
    };

    window.addEventListener("followStateChanged", handleFollowChange);
    return () => {
      window.removeEventListener("followStateChanged", handleFollowChange);
    };
  }, []);

  // Handle follow change callback
  const handleFollowChange = (userId, isFollowing, counts) => {
    setFollowedUsers((prev) => {
      const newSet = new Set(prev);
      if (isFollowing) {
        newSet.add(userId);
        setToast({
          message: "User followed successfully!",
          type: "success",
        });
      } else {
        newSet.delete(userId);
        setToast({
          message: "User unfollowed",
          type: "success",
        });
      }
      return newSet;
    });
  };

  // Handle remove user from suggestions
  const handleRemove = (userId) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    setToast({
      message: "User removed from suggestions",
      type: "success",
    });
  };

  // Filter users based on search query
  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Show loading state
  if (loading) {
    return (
      <div className="w-full max-w-md mx-auto space-y-3 sm:space-y-4">
        <h2 className="text-white font-semibold text-base sm:text-lg mb-2">
          Friend Suggestions
        </h2>
        <div className="text-gray-400 text-center py-4">Loading users...</div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="w-full max-w-md mx-auto space-y-3 sm:space-y-4">
        <h2 className="text-white font-semibold text-base sm:text-lg mb-2">
          Friend Suggestions
        </h2>
        <div className="text-red-400 text-center py-4">{error}</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-3 sm:space-y-4">
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: "" })}
      />

      <h2 className="text-white font-semibold text-base sm:text-lg mb-2">
        Friend Suggestions
      </h2>

      {/* Empty state */}
      {filteredUsers.length === 0 && (
        <div className="text-gray-400 text-center py-4">
          {searchQuery
            ? "No users found matching your search"
            : "No friend suggestions available"}
        </div>
      )}

      {/* User list */}
      {filteredUsers.map((friend) => (
        <div
          key={friend.id}
          className="bg-[#1A1A1A]/40 backdrop-blur-3xl rounded-xl p-3 sm:p-4 flex items-center justify-between gap-2 sm:gap-3 hover:bg-[#1A1A1A]/60 transition-all duration-200"
        >
          {/* Left Section - Profile Info */}
          <div
            className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 cursor-pointer"
            onClick={() => navigate(`/profile/${friend.id}`)}
          >
            <Avatar
              src={friend.profileImage}
              name={friend.name}
              size="medium"
              className="flex-shrink-0 hover:ring-2 hover:ring-yellow-400/50 transition"
            />

            <div className="min-w-0 flex-1">
              <h3 className="text-white font-medium flex items-center gap-1 text-sm sm:text-base truncate hover:text-yellow-400 transition">
                <span className="truncate">{friend.name}</span>
                {friend.isVerified && (
                  <span className="bg-yellow-400 text-black text-xs px-1.5 py-0.5 rounded-full flex-shrink-0">
                    ✓
                  </span>
                )}
              </h3>
              <p className="text-gray-400 text-xs sm:text-sm truncate">
                {friend.bio || "Social media user"}
              </p>
              <p className="text-gray-500 text-xs">
                {friend.followers?.length || 0} followers
              </p>
            </div>
          </div>

          {/* Right Section - Action Buttons */}
          <div className="flex gap-1 sm:gap-2 flex-shrink-0 items-center">
            {/* Remove Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemove(friend.id);
              }}
              className="text-gray-400 hover:text-gray-300 text-xs sm:text-sm border border-gray-600 px-2 sm:px-3 py-1 rounded-lg hover:bg-gray-700 transition-all duration-200"
              aria-label={`Remove ${friend.name} from suggestions`}
            >
              Remove
            </button>

            {/* Follow Button */}
            <FollowButton
              targetUserId={friend.id}
              targetUserName={friend.name}
              initialFollowState={followedUsers.has(friend.id)}
              onFollowChange={handleFollowChange}
              size="small"
            />
          </div>
        </div>
      ))}

      {/* Show More Button (if needed) */}
      {filteredUsers.length > 5 && (
        <button
          onClick={() => navigate("/explore/users")}
          className="w-full text-center text-yellow-400 hover:text-yellow-500 text-sm py-2 rounded-lg hover:bg-[#1A1A1A]/40 transition"
        >
          See all suggestions →
        </button>
      )}
    </div>
  );
};

export default EnhancedFriends;
