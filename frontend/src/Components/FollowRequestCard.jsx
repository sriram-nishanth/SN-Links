import React, { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import Avatar from "./Avatar";

const FollowRequestCard = ({ request, onAccept, onDecline }) => {
  const [isLoading, setIsLoading] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

  const getToken = () => {
    const token = document.cookie
      .split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1];
    return token;
  };

  const handleAccept = async () => {
    setIsLoading(true);
    try {
      const token = getToken();
      if (!token) {
        toast.error("Authentication required");
        return;
      }

      const response = await axios.post(
        `${API_BASE_URL}/user/accept-request/${request._id}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        toast.success("Follow request accepted");
        if (onAccept) onAccept(request._id);
      }
    } catch (error) {
      console.error("Error accepting follow request:", error);
      toast.error("Failed to accept follow request");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecline = async () => {
    setIsLoading(true);
    try {
      const token = getToken();
      if (!token) {
        toast.error("Authentication required");
        return;
      }

      const response = await axios.post(
        `${API_BASE_URL}/user/decline-request/${request._id}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        toast.success("Follow request declined");
        if (onDecline) onDecline(request._id);
      }
    } catch (error) {
      console.error("Error declining follow request:", error);
      toast.error("Failed to decline follow request");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#232323] rounded-lg p-4 flex items-center justify-between gap-4 hover:bg-[#2a2a2a] transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Avatar
          src={request.profileImage}
          name={request.name}
          size="md"
          className="shadow-md"
        />
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-sm truncate">
            {request.name}
          </h3>
          <p className="text-gray-400 text-xs truncate">
            {request.bio || "No bio"}
          </p>
        </div>
      </div>

      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={handleAccept}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white text-sm font-semibold rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "..." : "Accept"}
        </button>
        <button
          onClick={handleDecline}
          disabled={isLoading}
          className="px-4 py-2 bg-gray-600 text-white text-sm font-semibold rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Decline
        </button>
      </div>
    </div>
  );
};

export default FollowRequestCard;
