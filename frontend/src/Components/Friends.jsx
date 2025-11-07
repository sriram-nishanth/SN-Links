import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../Context/UserContext";
import Toast from "./Toast";

const Friends = ({ searchQuery }) => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [friends, setFriends] = useState([]);
  const [followedFriends, setFollowedFriends] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [followLoading, setFollowLoading] = useState(new Set());
  const [toast, setToast] = useState({ message: "", type: "" });

  // Fetch all users from API
  useEffect(() => {
    const fetchAllUsers = async () => {
      try {
        const token = user?.token;
        if (!token) {
          setLoading(false);
          return;
        }

        const response = await fetch("http://localhost:3000/api/user/all", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setFriends(data.data);
          }
        } else {
          setError("Failed to fetch users");
        }
      } catch (error) {
        console.error("Error fetching users:", error);
        setError("Error fetching users");
      } finally {
        setLoading(false);
      }
    };

    fetchAllUsers();
  }, []);

  // Fetch current user's following list to initialize followedFriends
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = user?.token;
        if (!token) return;

        const response = await fetch("http://localhost:3000/api/user/profile", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            const followingIds = new Set(
              data.data.following.map((id) => id.toString()),
            );
            setFollowedFriends(followingIds);
          }
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };

    fetchUserProfile();
  }, []);

  // handle remove
  const handleRemove = (id) => {
    setFriends((prev) => prev.filter((friend) => friend.id !== id));
  };

  // handle follow/unfollow
  const handleFollowBack = async (id) => {
    try {
      const token = user?.token;
      if (!token) {
        setToast({ message: "Please login to follow users", type: "error" });
        return;
      }

      setFollowLoading((prev) => new Set(prev).add(id));

      const isFollowing = followedFriends.has(id);
      const endpoint = isFollowing ? "unfollow" : "follow";
      const method = isFollowing ? "DELETE" : "POST";

      const response = await fetch(
        `http://localhost:3000/api/user/${endpoint}/${id}`,
        {
          method: method,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      const data = await response.json();

      if (response.ok && data.success) {
        // Update local state
        setFollowedFriends((prev) => {
          const newSet = new Set(prev);
          if (isFollowing) {
            newSet.delete(id);
          } else {
            newSet.add(id);
            // Remove from friends list when followed
            setFriends((prevFriends) =>
              prevFriends.filter((friend) => friend.id !== id),
            );

            // Add to chat list
            const friend = friends.find((f) => f.id === id);
            if (friend) {
              const existingChatData = JSON.parse(
                localStorage.getItem("chatData") || "{}",
              );
              const activeChats = existingChatData.activeChats || [];
              const existingChatIndex = activeChats.findIndex(
                (chat) => chat.id === id,
              );
              if (existingChatIndex === -1) {
                const newChat = {
                  id: id,
                  name: friend.name,
                  avatar: friend.profileImage,
                  lastMessage: `Started following ${friend.name}`,
                  lastMessageTime: "now",
                  isOnline: false,
                };
                activeChats.push(newChat);
                existingChatData.activeChats = activeChats;
                localStorage.setItem(
                  "chatData",
                  JSON.stringify(existingChatData),
                );
              }
            }
          }
          return newSet;
        });

        // Dispatch custom event to notify PostSlide of follow change
        window.dispatchEvent(new CustomEvent("followChange"));
      } else {
        setToast({
          message:
            data.message ||
            `Failed to ${isFollowing ? "unfollow" : "follow"} user`,
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error following/unfollowing user:", error);
      setToast({
        message: `Error ${followedFriends.has(id) ? "unfollowing" : "following"} user`,
        type: "error",
      });
    } finally {
      setFollowLoading((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  // filter based on search
  const filteredPeople = friends.filter((person) =>
    person.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="w-full max-w-md mx-auto space-y-3 sm:space-y-4">
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: "" })}
      />
      <h2 className="text-white font-semibold text-base sm:text-lg mb-2">
        Recent Activity
      </h2>

      {loading && (
        <div className="text-gray-400 text-center py-4">
          Loading followers...
        </div>
      )}

      {error && <div className="text-red-400 text-center py-4">{error}</div>}

      {!loading && !error && filteredPeople.length === 0 && (
        <div className="text-gray-400 text-center py-4">No followers found</div>
      )}

      {filteredPeople.map((friend) => (
        <div
          key={friend.id}
          className="bg-[#1A1A1A]/40 backdrop-blur-3xl rounded-xl p-3 sm:p-4 flex items-center justify-between gap-2 sm:gap-3"
        >
          {/* Left Section */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            {friend.profileImage && friend.profileImage.trim() !== "" ? (
              <img
                src={friend.profileImage}
                alt={friend.name}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-yellow-400/50 transition"
                onClick={() => navigate(`/profile/${friend.id}`)}
              />
            ) : (
              <DefaultAvatar
                name={friend.name}
                size="w-10 h-10 sm:w-12 sm:h-12"
                className="flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-yellow-400/50 transition"
                onClick={() => navigate(`/profile/${friend.id}`)}
              />
            )}
            <div className="min-w-0 flex-1">
              <h3 className="text-white font-medium flex items-center gap-1 text-sm sm:text-base truncate">
                <span
                  className="truncate cursor-pointer hover:text-yellow-400 transition"
                  onClick={() => navigate(`/profile/${friend.id}`)}
                >
                  {friend.name}
                </span>
                {friend.isVerified && (
                  <span className="bg-yellow-400 text-black text-xs px-1 rounded-full flex-shrink-0">
                    ✔
                  </span>
                )}
              </h3>
              <p className="text-gray-400 text-xs sm:text-sm truncate">
                {friend.action} ·{" "}
                <span className="text-yellow-400">{friend.time}</span>
              </p>
            </div>
          </div>

          {/* Right Section (Buttons) */}
          <div className="flex gap-1 sm:gap-2 flex-shrink-0">
            <button
              onClick={() => handleRemove(friend.id)}
              className="text-gray-300 text-xs sm:text-sm border border-gray-600 px-2 sm:px-3 py-1 rounded-lg hover:bg-gray-700"
            >
              Remove
            </button>
            <button
              onClick={() => handleFollowBack(friend.id)}
              disabled={followLoading.has(friend.id)}
              className={`text-xs sm:text-sm font-semibold px-2 sm:px-3 py-1 rounded-lg ${
                followedFriends.has(friend.id)
                  ? "bg-gray-600 text-white hover:bg-gray-700"
                  : "bg-yellow-400 text-black hover:bg-yellow-500"
              } ${followLoading.has(friend.id) ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {followLoading.has(friend.id)
                ? "Loading..."
                : followedFriends.has(friend.id)
                  ? "Following"
                  : "Follow Back"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Friends;
