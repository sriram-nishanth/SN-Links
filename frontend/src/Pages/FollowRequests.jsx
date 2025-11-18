import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import ModernNavbar from "../Components/ModernNavbar";
import FollowRequestCard from "../Components/FollowRequestCard";
import toast from "react-hot-toast";

const FollowRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const getToken = () => {
    const token = document.cookie
      .split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1];
    return token;
  };

  useEffect(() => {
    fetchFollowRequests();
  }, []);

  const fetchFollowRequests = async () => {
    try {
      const token = getToken();
      if (!token) {
        navigate("/login");
        return;
      }

      const response = await axios.get(
        `${import.meta.env.VITE_API_CALL}/user/follow-requests`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        setRequests(response.data.data.requests || []);
      }
    } catch (error) {
      toast.error("Failed to load follow requests");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = (requestId) => {
    setRequests((prev) => prev.filter((req) => req._id !== requestId));
  };

  const handleDecline = (requestId) => {
    setRequests((prev) => prev.filter((req) => req._id !== requestId));
  };

  const filteredRequests = requests.filter((request) =>
    request.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-gradient-to-r from-zinc-900 to-slate-900 min-h-screen">
      <ModernNavbar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 pt-20 sm:pt-24 pb-24 sm:pb-6">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => navigate(-1)}
              className="text-gray-400 hover:text-white mb-4 flex items-center gap-2"
            >
              <span className="text-xl">←</span> Back
            </button>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
              Follow Requests
            </h1>
            <p className="text-gray-400 text-sm sm:text-base">
              {filteredRequests.length === 0
                ? "No pending follow requests"
                : `${filteredRequests.length} follow request${
                    filteredRequests.length !== 1 ? "s" : ""
                  }`}
            </p>
          </div>

          {/* Requests List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-400"></div>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="bg-[#232323] rounded-xl p-8 text-center">
              <div className="text-4xl mb-4">✨</div>
              <p className="text-gray-400 text-lg">
                {requests.length === 0
                  ? "You don't have any follow requests yet"
                  : "No results match your search"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map((request) => (
                <FollowRequestCard
                  key={request._id}
                  request={request}
                  onAccept={handleAccept}
                  onDecline={handleDecline}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FollowRequests;
