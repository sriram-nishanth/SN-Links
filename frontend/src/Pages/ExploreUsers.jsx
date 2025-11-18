import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../Context/UserContext";
import ModernNavbar from "../Components/ModernNavbar";
import Avatar from "../Components/Avatar";
import FollowButton from "../Components/FollowButton";
import Toast from "../Components/Toast";
import axios from "axios";
import { BsSearch, BsFilter } from "react-icons/bs";

const ExploreUsers = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [followedUsers, setFollowedUsers] = useState(new Set());
  const [followers, setFollowers] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all"); // all, followers, following, suggestions
  const [toast, setToast] = useState({ message: "", type: "" });
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const filterRef = useRef(null);

  const API_BASE_URL = "http://localhost:3000/api";

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
          navigate("/login");
          return;
        }

        const response = await axios.get(`${API_BASE_URL}/user/all`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.data.success) {
          // Filter out current user
          const allUsers = response.data.data.filter(
            (u) => u.id !== user?._id
          );
          setUsers(allUsers);
          setFilteredUsers(allUsers);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
        setToast({ message: "Error loading users", type: "error" });
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [user]);

  // Fetch current user's following and followers lists
  useEffect(() => {
    const fetchRelationships = async () => {
      try {
        const token = getToken();
        if (!token) return;

        // Fetch following
        const profileResponse = await axios.get(`${API_BASE_URL}/user/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (profileResponse.data.success) {
          const followingIds = new Set(
            profileResponse.data.data.following.map((id) => id.toString())
          );
          setFollowedUsers(followingIds);
        }

        // Fetch followers
        const followersResponse = await axios.get(`${API_BASE_URL}/user/followers`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (followersResponse.data.success) {
          const followerIds = new Set(
            followersResponse.data.data.map((follower) => follower.id.toString())
          );
          setFollowers(followerIds);
        }
      } catch (error) {
        console.error("Error fetching relationships:", error);
      }
    };

    fetchRelationships();
  }, [user]);

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
    };

    window.addEventListener("followStateChanged", handleFollowChange);
    return () => {
      window.removeEventListener("followStateChanged", handleFollowChange);
    };
  }, []);

  // Handle click outside to close filter dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilterDropdown(false);
      }
    };

    if (showFilterDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showFilterDropdown]);

  // Filter users based on search and filter type
  useEffect(() => {
    let result = users;

    // Apply search filter
    if (searchQuery.trim()) {
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.bio?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply relationship filter
    if (filterType === "followers") {
      // Users who follow the current user
      result = result.filter((u) => followers.has(u.id));
    } else if (filterType === "following") {
      // Users the current user follows
      result = result.filter((u) => followedUsers.has(u.id));
    } else if (filterType === "suggestions") {
      // Users not followed by current user and don't follow current user
      result = result.filter((u) => !followedUsers.has(u.id) && !followers.has(u.id));
    }
    // "all" shows all users (no additional filtering)

    setFilteredUsers(result);
  }, [searchQuery, filterType, users, followedUsers, followers]);

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

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-zinc-900 to-slate-900 min-h-screen">
        <ModernNavbar searchQuery="" setSearchQuery={() => {}} />
        <div className="flex justify-center items-center min-h-screen pt-20">
          <div className="text-white text-xl">Loading users...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-zinc-900 to-slate-900 min-h-screen">
      <ModernNavbar searchQuery="" setSearchQuery={() => {}} />
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: "" })}
      />

      <div className="container mx-auto px-4 py-6 pt-24 pb-24 sm:pb-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-white text-3xl font-bold mb-2">
              Explore Users
            </h1>
            <p className="text-gray-400 text-sm">
              Discover and connect with people on SN Link
            </p>
          </div>

          {/* Search and Filter Bar */}
          <div className="bg-[#1A1A1A]/40 backdrop-blur-2xl rounded-xl p-4 mb-6 flex flex-col sm:flex-row gap-3 relative z-20">
            {/* Search Input */}
            <div className="flex-1 relative">
              <BsSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name or bio..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-800 text-white rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-all"
              />
            </div>

            {/* Filter Dropdown */}
            <div className="relative inline-block text-left pointer-events-auto" ref={filterRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFilterDropdown(!showFilterDropdown);
                }}
                className="flex items-center gap-2 bg-gray-700 text-white px-4 py-2.5 rounded-lg hover:bg-gray-600 transition-all w-full sm:w-auto justify-center pointer-events-auto"
              >
                <BsFilter className="w-5 h-5" />
                <span className="capitalize">
                  {filterType === "all"
                    ? "All Users"
                    : filterType === "followers"
                    ? "Followers"
                    : filterType === "following"
                    ? "Following"
                    : "Suggestions"}
                </span>
              </button>

              {showFilterDropdown && (
                <div className="absolute right-0 mt-2 w-40 rounded-xl shadow-lg z-[100] bg-[#1e1e1e] border border-neutral-700 transition-all duration-200 pointer-events-auto">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFilterType("all");
                      setShowFilterDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-700 rounded-t-xl transition ${
                      filterType === "all" ? "bg-gray-700 text-yellow-400" : "text-white"
                    }`}
                  >
                    All Users
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFilterType("followers");
                      setShowFilterDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-700 transition ${
                      filterType === "followers" ? "bg-gray-700 text-yellow-400" : "text-white"
                    }`}
                  >
                    Followers
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFilterType("following");
                      setShowFilterDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-700 transition ${
                      filterType === "following" ? "bg-gray-700 text-yellow-400" : "text-white"
                    }`}
                  >
                    Following
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFilterType("suggestions");
                      setShowFilterDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-700 rounded-b-xl transition ${
                      filterType === "suggestions" ? "bg-gray-700 text-yellow-400" : "text-white"
                    }`}
                  >
                    Suggestions
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-[#1A1A1A]/40 backdrop-blur-2xl rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-yellow-400">{filteredUsers.length}</p>
              <p className="text-gray-400 text-sm">
                {filterType === "all"
                  ? "Total Users"
                  : filterType === "followers"
                  ? "Followers"
                  : filterType === "following"
                  ? "Following"
                  : "Suggestions"}
              </p>
            </div>
            <div className="bg-[#1A1A1A]/40 backdrop-blur-2xl rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-400">
                {filterType === "all"
                  ? followedUsers.size
                  : filterType === "followers"
                  ? followers.size
                  : filterType === "following"
                  ? followedUsers.size
                  : users.filter((u) => !followedUsers.has(u.id) && !followers.has(u.id)).length}
              </p>
              <p className="text-gray-400 text-sm">
                {filterType === "all"
                  ? "Following"
                  : filterType === "followers"
                  ? "Total Followers"
                  : filterType === "following"
                  ? "Total Following"
                  : "Suggestions"}
              </p>
            </div>
            <div className="bg-[#1A1A1A]/40 backdrop-blur-2xl rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-blue-400">
                {filterType === "all"
                  ? users.length
                  : filterType === "followers"
                  ? followers.size
                  : filterType === "following"
                  ? followedUsers.size
                  : users.filter((u) => !followedUsers.has(u.id) && !followers.has(u.id)).length}
              </p>
              <p className="text-gray-400 text-sm">
                {filterType === "all"
                  ? "All Users"
                  : filterType === "followers"
                  ? "Followers Count"
                  : filterType === "following"
                  ? "Following Count"
                  : "Suggestions Count"}
              </p>
            </div>
          </div>

          {/* Users Grid */}
          {filteredUsers.length === 0 ? (
            <div className="bg-[#1A1A1A]/40 backdrop-blur-2xl rounded-xl p-8 text-center">
              <p className="text-gray-400 text-lg mb-2">No users found</p>
              <p className="text-gray-500 text-sm">
                {searchQuery
                  ? "Try adjusting your search query"
                  : filterType === "followers"
                  ? "No followers yet"
                  : filterType === "following"
                  ? "You're not following anyone yet"
                  : filterType === "suggestions"
                  ? "No suggestions available"
                  : "Start exploring and connecting!"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
              {filteredUsers.map((person) => (
                <div
                  key={person.id}
                  className="bg-[#1A1A1A]/40 backdrop-blur-2xl rounded-xl p-4 hover:bg-[#1A1A1A]/60 transition-all duration-200 flex flex-col"
                >
                  {/* User Info */}
                  <div
                    className="flex flex-col items-center mb-4 cursor-pointer"
                    onClick={() => navigate(`/profile/${person.id}`)}
                  >
                    <div className="mb-3">
                      <Avatar
                        src={person.profileImage}
                        name={person.name}
                        size="xl"
                        className="hover:ring-4 hover:ring-yellow-400/50 transition"
                      />
                    </div>

                    <h3 className="text-white font-semibold text-center hover:text-yellow-400 transition flex items-center gap-1">
                      {person.name}
                      {person.isVerified && (
                        <span className="bg-yellow-400 text-black text-xs px-1.5 py-0.5 rounded-full">
                          ✓
                        </span>
                      )}
                    </h3>

                    <p className="text-gray-400 text-sm text-center mt-1 line-clamp-2">
                      {person.bio || "Social media enthusiast"}
                    </p>

                    <div className="flex gap-4 mt-2 text-xs text-gray-500">
                      <span>{person.followers?.length || 0} followers</span>
                      <span>{person.following?.length || 0} following</span>
                    </div>
                  </div>

                  {/* Follow Button */}
                  <div className="mt-auto">
                    <FollowButton
                      targetUserId={person.id}
                      targetUserName={person.name}
                      initialFollowState={followedUsers.has(person.id)}
                      onFollowChange={handleFollowChange}
                      size="medium"
                      className="w-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Back to Home Button */}
          <div className="mt-8 text-center">
            <button
              onClick={() => navigate("/home")}
              className="bg-gray-700 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-all inline-flex items-center gap-2"
            >
              <span>←</span>
              <span>Back to Home</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExploreUsers;
