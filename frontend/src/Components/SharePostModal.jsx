import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IoClose, IoSearch } from "react-icons/io5";
import toast from "react-hot-toast";
import axios from "axios";
import Avatar from "./Avatar";

const SharePostModal = ({ isOpen, onClose, post, onSendSuccess }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sendingTo, setSendingTo] = useState(null);

  const getToken = () => {
    const token = document.cookie
      .split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1];
    return token;
  };

  useEffect(() => {
    if (isOpen) {
      fetchFriends();
    }
  }, [isOpen]);

  const fetchFriends = async () => {
    try {
      setLoading(true);
      const token = getToken();
      const response = await axios.get(
        `${import.meta.env.VITE_API_CALL}/messages/conversations`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.data) {
        setFriends(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching friends:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredFriends = friends.filter((friend) =>
    friend.user?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendPost = async (friendId) => {
    try {
      setSendingTo(friendId);
      const token = getToken();

      const payload = {
        receiverId: friendId,
        postId: post._id,
        content: post.caption || post.content || "",
        image: post.image || "",
        messageType: "post",
      };

      const response = await axios.post(
        `${import.meta.env.VITE_API_CALL}/chat/sharePost`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        toast.success("Post shared successfully!");
        
        if (onSendSuccess) {
          onSendSuccess(response.data.sharedMessage);
        }
        onClose();
      }
    } catch (error) {
      console.error("Error sharing post:", error);
      toast.error("Failed to share post");
    } finally {
      setSendingTo(null);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between flex-shrink-0">
              <h2 className="text-white text-xl font-bold">Share Post</h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              >
                <IoClose className="w-5 h-5" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-4 border-b border-white/10 flex-shrink-0">
              <div className="relative">
                <IoSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search friends..."
                  className="w-full bg-white/10 rounded-lg px-10 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 text-sm"
                />
              </div>
            </div>

            {/* Friends List */}
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full p-8">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-400"></div>
                  <p className="text-gray-400 text-sm mt-3">Loading friends...</p>
                </div>
              ) : filteredFriends.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <p className="text-gray-400 text-sm">No friends found</p>
                </div>
              ) : (
                <div className="space-y-2 p-4">
                  {filteredFriends.map((friend) => (
                    <motion.div
                      key={friend.user?._id}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => handleSendPost(friend.user?._id)}
                      className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group"
                    >
                      <Avatar
                        src={friend.user?.profileImage}
                        name={friend.user?.name}
                        size="medium"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">
                          {friend.user?.name}
                        </p>
                        <p className="text-gray-400 text-xs truncate">
                          {friend.lastMessage
                            ? friend.lastMessage.content.substring(0, 40) + "..."
                            : "No messages yet"}
                        </p>
                      </div>
                      <button
                        disabled={sendingTo === friend.user?._id}
                        className="px-3 py-1 bg-yellow-400 text-black text-xs font-semibold rounded-lg hover:bg-yellow-500 disabled:opacity-50 transition-colors"
                      >
                        {sendingTo === friend.user?._id ? "Sending..." : "Send"}
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SharePostModal;
