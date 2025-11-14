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
  isPrivateAccount = false,
}) => {
  const { user } = useUser();
  const [isFollowing, setIsFollowing] = useState(initialFollowState);
  const [requestStatus, setRequestStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

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
    e.stopPropagation();

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
      if (isFollowing) {
        // Unfollow
        const response = await axios({
          method: "delete",
          url: `${API_BASE_URL}/user/unfollow/${targetUserId}`,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.data.success) {
          setIsFollowing(false);
          setRequestStatus(null);
          if (onFollowChange) {
            onFollowChange(targetUserId, false, response.data.data);
          }
          window.dispatchEvent(
            new CustomEvent("followStateChanged", {
              detail: {
                targetUserId,
                targetUserName,
                isFollowing: false,
                counts: response.data.data,
              },
            })
          );
        }
      } else if (requestStatus === "requested") {
        // Cancel follow request
        const response = await axios({
          method: "post",
          url: `${API_BASE_URL}/user/cancel-request/${targetUserId}`,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.data.success) {
          setRequestStatus(null);
        }
      } else {
        // Follow
        const response = await axios({
          method: "post",
          url: `${API_BASE_URL}/user/follow/${targetUserId}`,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.data.success) {
          if (response.data.data.status === "requested") {
            setRequestStatus("requested");
          } else {
            setIsFollowing(true);
            setRequestStatus(null);
            if (onFollowChange) {
              onFollowChange(targetUserId, true, response.data.data);
            }
            window.dispatchEvent(
              new CustomEvent("followStateChanged", {
                detail: {
                  targetUserId,
                  targetUserName,
                  isFollowing: true,
                  counts: response.data.data,
                },
              })
            );
          }
        }
      }
    } catch (error) {
      console.error("Error toggling follow state:", error);
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

  const getButtonStyles = () => {
    if (isFollowing) {
      return "bg-gray-600 text-white hover:bg-gray-700 border border-gray-500";
    } else if (requestStatus === "requested") {
      return "bg-orange-500 text-white hover:bg-orange-600 border border-orange-500";
    } else {
      return "bg-yellow-400 text-black hover:bg-yellow-500 border border-yellow-500";
    }
  };

  const getButtonText = () => {
    if (isLoading) {
      return (
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
          ...
        </span>
      );
    } else if (isFollowing) {
      return "Following";
    } else if (requestStatus === "requested") {
      return "Requested";
    } else {
      return "Follow";
    }
  };

  return (
    <button
      onClick={handleFollowToggle}
      disabled={isLoading}
      className={`
        font-semibold rounded-lg transition-all duration-200
        ${sizeClass}
        ${getButtonStyles()}
        ${isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        ${className}
      `}
      aria-label={
        isFollowing ? `Unfollow ${targetUserName}` : `Follow ${targetUserName}`
      }
    >
      {getButtonText()}
    </button>
  );
};

export default FollowButton;
