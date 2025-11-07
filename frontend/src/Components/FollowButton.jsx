import React, { useState, useEffect } from "react";
import { useUser } from "../Context/UserContext";
import axios from "axios";

const FollowButton = ({
  targetUserId,
  targetUserName,
  initialFollowState = false,
  onFollowChange,
  size = "medium",
  className = "",
}) => {
  const { user } = useUser();
  const [isFollowing, setIsFollowing] = useState(initialFollowState);
  const [isLoading, setIsLoading] = useState(false);

  const API_BASE_URL = "http://localhost:3000/api";

  // Get token from cookie or user object
  const getToken = () => {
    const token = document.cookie
      .split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1];
    return token || user?.token;
  };

  // Update follow state when initialFollowState changes
  useEffect(() => {
    setIsFollowing(initialFollowState);
  }, [initialFollowState]);

  // Handle follow/unfollow action
  const handleFollowToggle = async (e) => {
    e.stopPropagation(); // Prevent event bubbling

    // Check if user is trying to follow themselves
    if (user?._id === targetUserId) {
      console.warn("Cannot follow yourself");
      return;
    }

    const token = getToken();
    if (!token) {
      console.error("No authentication token found");
      return;
    }

    setIsLoading(true);

    try {
      const endpoint = isFollowing ? "unfollow" : "follow";
      const method = isFollowing ? "delete" : "post";

      const response = await axios({
        method: method,
        url: `${API_BASE_URL}/user/${endpoint}/${targetUserId}`,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.data.success) {
        // Toggle the follow state
        const newFollowState = !isFollowing;
        setIsFollowing(newFollowState);

        // Call the callback if provided
        if (onFollowChange) {
          onFollowChange(targetUserId, newFollowState, response.data.data);
        }

        // Dispatch custom event for other components to listen
        window.dispatchEvent(
          new CustomEvent("followStateChanged", {
            detail: {
              targetUserId,
              targetUserName,
              isFollowing: newFollowState,
              counts: response.data.data,
            },
          })
        );
      }
    } catch (error) {
      console.error("Error toggling follow state:", error);
      // Revert the state on error
      setIsFollowing(!isFollowing);
    } finally {
      setIsLoading(false);
    }
  };

  // Don't show button if user is viewing their own profile
  if (user?._id === targetUserId) {
    return null;
  }

  // Size variants
  const sizeClasses = {
    small: "text-xs px-2 py-1",
    medium: "text-sm px-3 py-1.5",
    large: "text-base px-4 py-2",
  };

  const sizeClass = sizeClasses[size] || sizeClasses.medium;

  return (
    <button
      onClick={handleFollowToggle}
      disabled={isLoading}
      className={`
        font-semibold rounded-lg transition-all duration-200
        ${sizeClass}
        ${
          isFollowing
            ? "bg-gray-600 text-white hover:bg-gray-700 border border-gray-500"
            : "bg-yellow-400 text-black hover:bg-yellow-500 border border-yellow-500"
        }
        ${isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        ${className}
      `}
      aria-label={
        isFollowing ? `Unfollow ${targetUserName}` : `Follow ${targetUserName}`
      }
    >
      {isLoading ? (
        <span className="flex items-center gap-1">
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          Loading...
        </span>
      ) : isFollowing ? (
        "Following"
      ) : (
        "Follow"
      )}
    </button>
  );
};

export default FollowButton;
