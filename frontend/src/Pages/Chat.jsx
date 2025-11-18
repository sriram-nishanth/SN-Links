import React, { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import {
  BsSearch,
  BsCheck,
  BsCheckAll,
  BsThreeDots,
  BsArrowLeft,
  BsX,
} from "react-icons/bs";
import {
  IoCallOutline,
  IoVideocamOutline,
  IoSend,
  IoClose,
} from "react-icons/io5";
import { FiSmile, FiPaperclip, FiMoreVertical, FiImage } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import ModernNavbar from "../Components/ModernNavbar";
import Avatar from "../Components/Avatar";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useUser } from "../Context/UserContext";
import { useSocket } from "../Context/SocketContext";
import axios from "axios";

const Chat = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: userLoading } = useUser();
  const {
    socket,
    onlineUsers,
    isUserOnline,
    isUserTyping,
    sendMessage,
    joinRoom,
    startTyping,
    stopTyping,
  } = useSocket();

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState({});
  const [conversations, setConversations] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMobileChatList, setShowMobileChatList] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef(null);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [showAudioCall, setShowAudioCall] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  const messagesEndRef = useRef(null);
  const callIntervalRef = useRef(null);
  const moreOptionsRef = useRef(null);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);
  const [selectedFileType, setSelectedFileType] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  // Get token from cookie
  const getToken = () => {
    const token = document.cookie
      .split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1];
    return token;
  };

  // Update conversations with real-time online status
  const conversationsWithOnlineStatus = (conversations || []).map((chat) => ({
    ...chat,
    id: chat.user?._id,
    isOnline: isUserOnline(chat.user?._id),
  }));

  // Fetch conversations function
  const fetchConversations = async () => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
       setLoading(true);
       const conversationsResponse = await axios.get(
         `${import.meta.env.VITE_API_CALL}/messages/conversations`,
         {
           headers: { Authorization: `Bearer ${token}` },
         }
       );

       const followingResponse = await axios.get(
         `${import.meta.env.VITE_API_CALL}/user/${user._id}/following`,
         {
           headers: { Authorization: `Bearer ${token}` },
         }
       );

      const conversations = conversationsResponse.data.data || [];
      const following = followingResponse.data.data || [];

      const combinedConversations = [...conversations];
      const conversationUserIds = conversations.map((c) => c.user._id);

      following.forEach((followedUser) => {
        if (!conversationUserIds.includes(followedUser._id)) {
          combinedConversations.push({
            user: followedUser,
            lastMessage: null,
            unreadCount: 0,
          });
        }
      });

      setConversations(combinedConversations);
    } catch (error) {
      if (
        error.response?.status === 404 &&
        error.response?.data?.message === "User not found"
      ) {
        document.cookie =
          "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        localStorage.removeItem("user");
        navigate("/login");
        return;
      }
      if (error.response?.status === 401) {
        document.cookie =
          "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch conversations on component mount
  useEffect(() => {
    if (user && !userLoading) {
      fetchConversations();
    } else if (!user && !userLoading) {
      navigate("/login");
    }
  }, [user, userLoading]);

  // Fetch messages and check mute/block status when chat is selected
  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedChatId) return;

      const token = getToken();
      if (!token) return;

      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_CALL}/messages/${selectedChatId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        // Transform messages to match display format
        const transformedMessages = (response.data.data || []).map((msg) => ({
          id: msg._id,
          text: msg.content,
          content: msg.content,
          sender: msg.sender._id === user._id ? "me" : "other",
          senderId: msg.sender._id,
          receiverId: msg.receiver._id,
          timestamp: new Date(msg.createdAt),
          status: msg.isRead ? "read" : "delivered",
          messageType: msg.messageType || "text",
          media: msg.media,
          seen: msg.seen || false,
        }));

        setMessages((prev) => ({
          ...prev,
          [selectedChatId]: transformedMessages,
        }));
      } catch (error) {
        // Error fetching messages
      }
    };

    // Check mute and block status
    const checkStatusAsync = async () => {
      if (!selectedChatId) {
        setIsMuted(false);
        setIsBlocked(false);
        return;
      }

      const token = getToken();
      if (!token) return;

      try {
        const [muteRes, blockRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_CALL}/user/is-muted/${selectedChatId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${import.meta.env.VITE_API_CALL}/user/is-blocked/${selectedChatId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        setIsMuted(muteRes.data?.data?.isMuted || false);
        setIsBlocked(blockRes.data?.data?.isBlocked || false);
      } catch (error) {

      }
    };

    fetchMessages();
    checkStatusAsync();
  }, [selectedChatId, user]);

  // Join room when chat is selected
  useEffect(() => {
    if (selectedChatId && socket && user) {
      // Create room ID matching backend logic: [userId1, userId2].sort().join('_')
      const roomId = [user._id, selectedChatId].sort().join("_");
      joinRoom(roomId);

      // Emit message_seen event to mark messages as seen
      socket.emit("message_seen", {
        senderId: selectedChatId,
        receiverId: user._id,
      });

    }
  }, [selectedChatId, socket, user, joinRoom]);

  // Socket event listeners
  useEffect(() => {
    if (!socket || !user) return;


    // Handle receiving messages from other users
    const handleReceiveMessage = (message) => {
      // Determine conversation ID
      const conversationId = message.senderId || message.sender?._id;
      if (!conversationId) {
        return;
      }

      // Create message object with proper structure
      const newMessage = {
        id: message._id,
        text: message.content,
        content: message.content,
        sender: "other", // Always "other" since this is receive_message event
        senderId: message.senderId || message.sender?._id,
        receiverId: message.receiverId,
        timestamp: new Date(message.createdAt || message.timestamp),
        status: "delivered",
        messageType: message.messageType || "text",
        media: message.media,
        seen: message.seen || false,
      };

      setMessages((prev) => {
        const currentMessages = prev[conversationId] || [];

        // Check for duplicate using message ID
        const isDuplicate = currentMessages.some(
          (msg) => msg.id === newMessage.id
        );

        if (isDuplicate) {
          return prev;
        }
        return {
          ...prev,
          [conversationId]: [...currentMessages, newMessage],
        };
      });

      // Update conversation's last message
      setConversations((prev) =>
        prev.map((conv) =>
          conv.user._id === conversationId
            ? {
                ...conv,
                lastMessage: {
                  content: message.content,
                  createdAt: new Date(message.createdAt || message.timestamp),
                },
              }
            : conv
        )
      );

      // Only increment unread count if this chat is not currently open
      setConversations((prev) => {
        const isCurrentChatOpen = selectedChatId === conversationId;
        return prev.map((conv) => {
          if (conv.user._id === conversationId && !isCurrentChatOpen) {
            return { ...conv, unreadCount: (conv.unreadCount || 0) + 1 };
          }
          return conv;
        });
      });

      // Show toast for received message
      toast.success("New message received!", {
        duration: 3000,
        position: "bottom-right",
      });

      setTimeout(scrollToBottom, 100);
    };

    // Handle message sent confirmation (server echo to replace optimistic message)
    const handleMessageSent = (message) => {
      const conversationId = message.receiverId;

      setMessages((prev) => {
        const currentMessages = prev[conversationId] || [];

        // Find and replace the optimistic temporary message with the confirmed message
        const optimisticIndex = currentMessages.findIndex(
          (msg) =>
            msg.id &&
            msg.id.startsWith("temp-") &&
            msg.content === message.content
        );

        if (optimisticIndex !== -1) {
          const updatedMessages = [...currentMessages];
          updatedMessages[optimisticIndex] = {
            id: message._id,
            text: message.content,
            content: message.content,
            sender: "me",
            senderId: message.senderId,
            receiverId: message.receiverId,
            timestamp: new Date(message.createdAt),
            status: "delivered",
            messageType: message.messageType || "text",
            media: message.media,
            seen: message.seen || false,
          };
          return {
            ...prev,
            [conversationId]: updatedMessages,
          };
        }

        // If no optimistic message found, just add it (shouldn't happen)
        return {
          ...prev,
          [conversationId]: [
            ...currentMessages,
            {
              id: message._id,
              text: message.content,
              content: message.content,
              sender: "me",
              senderId: message.senderId,
              receiverId: message.receiverId,
              timestamp: new Date(message.createdAt),
              status: "delivered",
              messageType: message.messageType || "text",
              media: message.media,
              seen: message.seen || false,
            },
          ],
        };
      });

      setTimeout(scrollToBottom, 100);
    };

    const handleTyping = (data) => {
      if (data.conversationId === selectedChatId && data.userId !== user._id) {
        setTyping(data.isTyping);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        if (data.isTyping) {
          typingTimeoutRef.current = setTimeout(() => setTyping(false), 3000);
        }
      }
    };

    const handleFollowStatusChanged = (data) => {
      if (data.action === "follow") {
        fetchConversations();
      }
    };

    const handleMessagesSeen = (data) => {
      const { receiverId } = data;

      // Update all messages sent to this receiver as seen
      setMessages((prev) =>
        Object.keys(prev).reduce((acc, conversationId) => {
          acc[conversationId] = prev[conversationId].map((msg) =>
            msg.receiverId === receiverId && msg.sender === "me"
              ? { ...msg, seen: true }
              : msg
          );
          return acc;
        }, {})
      );

      // Clear unread count for the conversation
      setConversations((prev) =>
        prev.map((conv) =>
          conv.user._id === receiverId ? { ...conv, unreadCount: 0 } : conv
        )
      );
    };

    // FIXED: Proper cleanup with empty dependency array prevents re-registration
    socket.off("receive_message", handleReceiveMessage);
    socket.off("message_sent", handleMessageSent);
    socket.off("user_typing", handleTyping);
    socket.off("follow_status_changed", handleFollowStatusChanged);
    socket.off("messages_seen", handleMessagesSeen);

    socket.on("receive_message", handleReceiveMessage);
    socket.on("message_sent", handleMessageSent);
    socket.on("user_typing", handleTyping);
    socket.on("follow_status_changed", handleFollowStatusChanged);
    socket.on("messages_seen", handleMessagesSeen);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
      socket.off("message_sent", handleMessageSent);
      socket.off("user_typing", handleTyping);
      socket.off("follow_status_changed", handleFollowStatusChanged);
      socket.off("messages_seen", handleMessagesSeen);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [socket, user, selectedChatId]);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (window.innerWidth >= 1024) {
        setShowMobileChatList(false);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, selectedChatId]);

  // Handle outside clicks to close more options menu and emoji picker
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        moreOptionsRef.current &&
        !moreOptionsRef.current.contains(event.target)
      ) {
        setShowMoreOptions(false);
      }
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target)
      ) {
        setShowEmojiPicker(false);
      }
    };

    if (showMoreOptions || showEmojiPicker) {
      document.addEventListener("click", handleClickOutside);
    }

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [showMoreOptions, showEmojiPicker]);

  // Handle send message
  const handleSend = async () => {
    if (!message.trim() || !selectedChatId || sendingMessage) return;

    const messageData = {
      senderId: user._id,
      receiverId: selectedChatId,
      content: message.trim(),
      messageType: "text",
    };

    // Optimistic update
    const tempId = `temp-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const optimisticMessage = {
      id: tempId,
      text: message.trim(),
      content: message.trim(),
      sender: "me",
      senderId: user._id,
      receiverId: selectedChatId,
      timestamp: new Date(),
      status: "sent",
      messageType: "text",
    };

    setMessages((prev) => ({
      ...prev,
      [selectedChatId]: [...(prev[selectedChatId] || []), optimisticMessage],
    }));

    setMessage("");
    setSendingMessage(true);
    scrollToBottom();

    try {
      sendMessage(messageData);
      toast.success("Message sent!");
      textareaRef.current?.focus();
    } catch (error) {
      // Remove optimistic message on error
      setMessages((prev) => ({
        ...prev,
        [selectedChatId]: prev[selectedChatId].filter(
          (msg) => msg.id !== tempId
        ),
      }));
      toast.error("Failed to send message");
    } finally {
      setSendingMessage(false);
    }
  };

  // Handle typing with debounce
  const handleTyping = () => {
    if (selectedChatId && socket) {
      startTyping(selectedChatId);

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout to stop typing after 1 second of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping(selectedChatId);
      }, 1000);
    }
  };

  // Mute/Unmute conversation
  const toggleMute = async () => {
    const token = getToken();
    if (!token || !selectedChatId) return;

    try {
      const response = await axios.post(
        `${API_BASE_URL}/user/mute/${selectedChatId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const isMuted = response.data?.data?.isMuted;
      toast.success(isMuted ? "Chat muted!" : "Chat unmuted!");
      setShowMoreOptions(false);
    } catch (error) {
      toast.error("Failed to update mute status");
    }
  };

  // Clear chat with confirmation
  const clearChat = async () => {
    if (!selectedChatId) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete all messages in this chat? This action cannot be undone."
    );
    if (!confirmed) return;

    const token = getToken();
    if (!token) return;

    try {
      await axios.delete(`${API_BASE_URL}/messages/${selectedChatId}/clear`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setMessages((prev) => ({
        ...prev,
        [selectedChatId]: [],
      }));

      toast.success("Chat cleared successfully!");
      setShowMoreOptions(false);
    } catch (error) {
      toast.error("Failed to clear chat");
    }
  };

  // Block user with confirmation
  const blockUser = async () => {
    if (!selectedChatId) return;

    const confirmed = window.confirm(
      `Are you sure you want to block ${selectedChat?.user?.name}? You won't be able to send or receive messages from them.`
    );
    if (!confirmed) return;

    const token = getToken();
    if (!token) return;

    try {
      await axios.post(
        `${API_BASE_URL}/user/block/${selectedChatId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("User blocked successfully!");

      // Clear input and disable messaging
      setMessage("");
      setShowMoreOptions(false);

      // Optionally navigate away from this chat
      setSelectedChatId(null);
    } catch (error) {
      toast.error("Failed to block user");
    }
  };

  // Send selected media (image/video)
  const handleSendMedia = async () => {
    if (!selectedFile || !selectedChatId || sendingMessage) return;

    setSendingMessage(true);

    const tempId = `temp-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const now = new Date();

    try {
      const token = getToken();
      const formData = new FormData();
      formData.append("file", selectedFile);

      const uploadRes = await axios.post(
        `${API_BASE_URL}/messages/upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const fileUrl = uploadRes.data?.data?.url;
      const fileType = uploadRes.data?.data?.type;

      const payload = {
        senderId: user._id,
        receiverId: selectedChatId,
        content: fileUrl,
        messageType: fileType,
        media: fileUrl,
      };

      const optimisticMessage = {
        id: tempId,
        text: "",
        content: fileUrl,
        sender: "me",
        senderId: user._id,
        receiverId: selectedChatId,
        timestamp: now,
        status: "sent",
        messageType: fileType,
        media: fileUrl,
      };

      setMessages((prev) => ({
        ...prev,
        [selectedChatId]: [...(prev[selectedChatId] || []), optimisticMessage],
      }));
      scrollToBottom();

      sendMessage(payload);
      toast.success("Media sent successfully!");

      clearSelectedFile();
      textareaRef.current?.focus();
    } catch (error) {
      setMessages((prev) => ({
        ...prev,
        [selectedChatId]: (prev[selectedChatId] || []).filter(
          (msg) => msg.id !== tempId
        ),
      }));
      toast.error("Failed to send media");
    } finally {
      setSendingMessage(false);
    }
  };

  // Filter chats
  const filteredChats = conversationsWithOnlineStatus.filter((chat) =>
    chat.user?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedChat = conversationsWithOnlineStatus.find(
    (chat) => chat.id === selectedChatId
  );
  const currentMessages = messages[selectedChatId] || [];

  // Format time
  const formatTime = (date) => {
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) {
      return "";
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 1
    );

    const inputDate = new Date(
      dateObj.getFullYear(),
      dateObj.getMonth(),
      dateObj.getDate()
    );

    if (inputDate.getTime() === today.getTime()) {
      return dateObj.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (inputDate.getTime() === yesterday.getTime()) {
      return "Yesterday";
    } else {
      return dateObj.toLocaleDateString();
    }
  };

  // Get status icon
  const getStatusIcon = (status, sender, seen = false) => {
    if (sender !== "me") return null;

    // Show seen status (double checkmarks in blue) if message is seen
    if (seen) {
      return <BsCheckAll className="w-4 h-4 text-blue-400" />;
    }

    switch (status) {
      case "sent":
        return <BsCheck className="w-4 h-4 text-gray-400" />;
      case "delivered":
        return <BsCheckAll className="w-4 h-4 text-gray-400" />;
      case "read":
        return <BsCheckAll className="w-4 h-4 text-blue-400" />;
      default:
        return null;
    }
  };

  // Call functions
  const startVideoCall = () => {
    setShowVideoCall(true);
    setCallDuration(0);
    callIntervalRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  };

  const endVideoCall = () => {
    setShowVideoCall(false);
    setCallDuration(0);
    if (callIntervalRef.current) {
      clearInterval(callIntervalRef.current);
    }
  };

  const startAudioCall = () => {
    setShowAudioCall(true);
    setCallDuration(0);
    callIntervalRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  };

  const endAudioCall = () => {
    setShowAudioCall(false);
    setCallDuration(0);
    if (callIntervalRef.current) {
      clearInterval(callIntervalRef.current);
    }
  };

  const toggleEmojiPicker = () => {
    setShowEmojiPicker(!showEmojiPicker);
  };

  const addEmoji = (emoji) => {
    setMessage((prev) => prev + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  const formatCallDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Placeholder functions - implementation moved above
  // These are kept here for reference to the UI handlers

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) return;

    setSelectedFile(file);
    setSelectedFileType(isImage ? "image" : "video");
    const preview = URL.createObjectURL(file);
    setFilePreviewUrl(preview);
  };

  const clearSelectedFile = () => {
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setSelectedFile(null);
    setSelectedFileType(null);
    setFilePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Common emojis for the picker
  const emojis = [
    "😀",
    "😃",
    "😄",
    "😁",
    "😆",
    "😅",
    "😂",
    "🤣",
    "😊",
    "😇",
    "🙂",
    "🙃",
    "😉",
    "😌",
    "😍",
    "🥰",
    "😘",
    "😗",
    "😙",
    "😚",
    "😋",
    "😛",
    "😝",
    "😜",
    "🤪",
    "🤨",
    "🧐",
    "🤓",
    "😎",
    "🤩",
    "🥳",
    "😏",
    "😒",
    "😞",
    "😔",
    "😟",
    "😕",
    "🙁",
    "☹️",
    "😣",
    "❤️",
    "💔",
    "💕",
    "💖",
    "💗",
    "💙",
    "💚",
    "💛",
    "🧡",
    "💜",
    "🖤",
    "💯",
    "💢",
    "💥",
    "💫",
    "💦",
    "💨",
    "🕳",
    "👍",
    "👎",
    "👌",
    "✌️",
    "🤞",
    "🤟",
    "🤘",
    "🤙",
    "👈",
    "👉",
    "👆",
    "👇",
    "☝️",
    "✋",
    "🤚",
    "🖐",
    "🖖",
    "👋",
    "🤙",
    "💪",
    "🦾",
    "🖕",
    "✍️",
    "🙏",
    "🔥",
    "✨",
    "🎉",
    "🎊",
    "🎈",
  ];

  // Handle chat selection
  const handleChatSelect = (chatId) => {
    setSelectedChatId(chatId);
    if (isMobile) {
      setShowMobileChatList(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-zinc-900 to-slate-900">
      <ModernNavbar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      <div className="flex h-[calc(110vh-80px)] relative overflow-hidden pt-20 pb-20 sm:pb-0">
        {/* Mobile Chat List Overlay */}
        <AnimatePresence>
          {isMobile && showMobileChatList && (
            <motion.div
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-16 left-0 bottom-0 z-40 lg:hidden"
            >
              <div className="bg-slate-900/95 backdrop-blur-xl h-full w-80 max-w-[85vw] shadow-2xl flex flex-col border-r border-white/10">
                {/* Mobile Chat List Header */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between flex-shrink-0">
                  <h1 className="text-white text-xl font-bold">
                    {t("chat.messages") || "Messages"}
                  </h1>
                  <button
                    onClick={() => setShowMobileChatList(false)}
                    className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                    aria-label="Close chat list"
                  >
                    <BsX className="w-6 h-6" />
                  </button>
                </div>

                {/* Mobile Search */}
                <div className="p-4 flex-shrink-0">
                  <div className="relative">
                    <BsSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={
                        t("chat.searchConversations") ||
                        "Search conversations..."
                      }
                      className="w-full bg-white/10 rounded-xl px-10 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 text-sm"
                    />
                  </div>
                </div>

                {/* Mobile Chat List */}
                <div className="flex-1 overflow-y-auto">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center h-full p-8">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mb-4"></div>
                      <p className="text-gray-400 text-sm">
                        Loading conversations...
                      </p>
                    </div>
                  ) : filteredChats.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                      <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
                        <svg
                          className="w-10 h-10 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"
                          />
                        </svg>
                      </div>
                      <h3 className="text-white font-semibold mb-2">
                        No conversations yet
                      </h3>
                      <p className="text-gray-400 text-sm">
                        Follow people to start chatting with them
                      </p>
                    </div>
                  ) : (
                    filteredChats.map((chat) => (
                      <div
                        key={chat.user?._id}
                        onClick={() => handleChatSelect(chat.user?._id)}
                        className={`p-3 cursor-pointer transition-all duration-200 border-l-4 ${
                          selectedChatId === chat.user?._id
                            ? "bg-slate-700 border-yellow-400"
                            : "border-transparent hover:bg-slate-800"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative flex-shrink-0">
                            <Avatar
                              src={chat.user?.profileImage}
                              name={chat.user?.name}
                              size="medium"
                            />
                            <div
                              className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900 ${
                                chat.isOnline ? "bg-green-400" : "bg-gray-500"
                              }`}
                            ></div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h3
                                className={`font-semibold truncate text-sm ${
                                  selectedChatId === chat.user?._id
                                    ? "text-white"
                                    : "text-slate-200"
                                }`}
                              >
                                {chat.user?.name}
                              </h3>
                              <span
                                className={`text-xs flex-shrink-0 ${
                                  selectedChatId === chat.user?._id
                                    ? "text-yellow-400"
                                    : "text-slate-400"
                                }`}
                              >
                                {chat.lastMessage
                                  ? formatTime(
                                      new Date(chat.lastMessage.createdAt)
                                    )
                                  : ""}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <p
                                className={`text-xs truncate mt-1 ${
                                  selectedChatId === chat.user?._id
                                    ? "text-slate-300"
                                    : "text-slate-400"
                                }`}
                              >
                                {chat.lastMessage
                                  ? chat.lastMessage.content
                                  : "Start a conversation"}
                              </p>
                              {chat.unreadCount > 0 && (
                                <span className="w-5 h-5 bg-green-500 text-white text-xs flex items-center justify-center rounded-full">
                                  {chat.unreadCount}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Desktop Chat List Sidebar */}
        <div className="hidden lg:flex w-80 xl:w-96 bg-[#1A1A1A]/40 backdrop-blur-2xl border-r border-white/10 flex-col">
          {/* Desktop Header */}
          <div className="p-4 border-b border-white/10 flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-white text-xl font-bold">
                {t("chat.messages") || "Messages"}
              </h1>
            </div>

            {/* Desktop Search */}
            <div className="relative">
              <BsSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  t("chat.searchConversations") || "Search conversations..."
                }
                className="w-full bg-white/10 rounded-xl px-10 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 text-sm"
              />
            </div>
          </div>

          {/* Desktop Chat List */}
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mb-4"></div>
                <p className="text-gray-400 text-sm">
                  Loading conversations...
                </p>
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
                  <svg
                    className="w-10 h-10 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"
                    />
                  </svg>
                </div>
                <h3 className="text-white font-semibold mb-2">
                  No conversations yet
                </h3>
                <p className="text-gray-400 text-sm">
                  Follow people to start chatting with them
                </p>
              </div>
            ) : (
              filteredChats.map((chat) => (
                <div
                  key={chat.user?._id}
                  onClick={() => handleChatSelect(chat.user?._id)}
                  className={`p-3 cursor-pointer transition-all duration-200 border-l-4 ${
                    selectedChatId === chat.user?._id
                      ? "bg-slate-700 border-yellow-400"
                      : "border-transparent hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      <Avatar
                        src={chat.user?.profileImage}
                        name={chat.user?.name}
                        size="medium"
                      />
                      <div
                        className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900 ${
                          chat.isOnline ? "bg-green-400" : "bg-gray-500"
                        }`}
                      ></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3
                          className={`font-semibold truncate text-sm ${
                            selectedChatId === chat.user?._id
                              ? "text-white"
                              : "text-slate-200"
                          }`}
                        >
                          {chat.user?.name}
                        </h3>
                        <span
                          className={`text-xs flex-shrink-0 ${
                            selectedChatId === chat.user?._id
                              ? "text-yellow-400"
                              : "text-slate-400"
                          }`}
                        >
                          {chat.lastMessage
                            ? formatTime(new Date(chat.lastMessage.createdAt))
                            : ""}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p
                          className={`text-xs truncate mt-1 ${
                            selectedChatId === chat.user?._id
                              ? "text-slate-300"
                              : "text-slate-400"
                          }`}
                        >
                          {chat.lastMessage
                            ? chat.lastMessage.content
                            : "Start a conversation"}
                        </p>
                        {chat.unreadCount > 0 && (
                          <span className="w-5 h-5 bg-green-500 text-white text-xs flex items-center justify-center rounded-full">
                            {chat.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-transparent min-h-0">
          {!selectedChatId ? (
            // Empty State - No Chat Selected
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="w-32 h-32 bg-white/5 rounded-full flex items-center justify-center mb-6">
                <svg
                  className="w-16 h-16 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <h3 className="text-white text-2xl font-bold mb-3">
                Select a conversation
              </h3>
              <p className="text-gray-400 text-lg">
                Choose a chat from the list to start messaging
              </p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="relative bg-[#1A1A1A]/40 backdrop-blur-2xl border-b border-white/10 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isMobile && (
                    <button
                      onClick={() => setShowMobileChatList(true)}
                      className="lg:hidden w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white"
                    >
                      <BsArrowLeft className="w-5 h-5" />
                    </button>
                  )}
                  <div className="relative">
                    <div
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() =>
                        navigate(`/profile/${selectedChat?.user?._id}`)
                      }
                    >
                      <Avatar
                        src={selectedChat?.user?.profileImage}
                        name={selectedChat?.user?.name}
                        size="medium"
                      />
                    </div>
                    <div
                      className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-slate-900 ${
                        selectedChat?.isOnline ? "bg-green-400" : "bg-gray-500"
                      }`}
                    ></div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-semibold text-md">
                        {selectedChat?.user?.name}
                      </h3>
                      {isMuted && <span className="text-lg">🔕</span>}
                      {isBlocked && <span className="text-lg">🚫</span>}
                    </div>
                    <p className="text-gray-400 text-xs">
                      {isBlocked
                        ? "User blocked"
                        : selectedChat?.isOnline
                        ? "Online"
                        : "Offline"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => startAudioCall()}
                    className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                  >
                    <IoCallOutline className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => startVideoCall()}
                    className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                  >
                    <IoVideocamOutline className="w-5 h-5" />
                  </button>

                  {/* More Options Container */}
                  <div ref={moreOptionsRef} className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMoreOptions(!showMoreOptions);
                      }}
                      className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                    >
                      <BsThreeDots className="w-5 h-5" />
                    </button>

                    {/* More Options Dropdown */}
                    {showMoreOptions && (
                      <div className="absolute top-full right-0 mt-2 bg-[#1A1A1A]/90 backdrop-blur-md rounded-xl shadow-lg border border-white/10 py-2 w-48 z-50">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleMute();
                          }}
                          className="w-full text-left px-4 py-2 text-white hover:bg-white/10 rounded transition-colors flex items-center gap-2 text-sm"
                        >
                          <span>🔇</span>
                          <span>Mute</span>
                        </button>
                        <hr className="border-white/10 my-1" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            clearChat();
                          }}
                          className="w-full text-left px-4 py-2 text-white hover:bg-white/10 rounded transition-colors flex items-center gap-2 text-sm"
                        >
                          <span>🗑️</span>
                          <span>Clear Chat</span>
                        </button>
                        <hr className="border-white/10 my-1" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            blockUser();
                          }}
                          className="w-full text-left px-4 py-2 text-red-400 hover:bg-red-500/10 rounded transition-colors flex items-center gap-2 text-sm"
                        >
                          <span>🚫</span>
                          <span>Block</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-transparent to-slate-900/20">
                {currentMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-4">
                      <svg
                        className="w-12 h-12 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1}
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-white text-xl font-semibold mb-2">
                      No messages yet
                    </h3>
                    <p className="text-gray-400">
                      Start a conversation by sending a message!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {currentMessages.map((msg, index) => {
                      const prevMsg = currentMessages[index - 1];
                      const showTimestamp =
                        !prevMsg ||
                        new Date(msg.timestamp).getTime() -
                          new Date(prevMsg.timestamp).getTime() >
                          300000;

                      return (
                        <div key={`${msg.id}-${index}`}>
                          {showTimestamp && (
                            <div className="flex justify-center my-4">
                              <span className="text-xs text-gray-500 bg-slate-800/50 px-3 py-1 rounded-full">
                                {formatTime(msg.timestamp)}
                              </span>
                            </div>
                          )}
                          <div
                            className={`flex ${
                              msg.sender === "me"
                                ? "justify-end"
                                : "justify-start"
                            }`}
                          >
                            <div
                              className={`max-w-[85%] sm:max-w-[75%] md:max-w-[70%]`}
                            >
                              <div
                                className={`px-4 py-3 rounded-xl ${
                                  msg.sender === "me"
                                    ? "bg-green-600 text-white rounded-br-none"
                                    : "bg-slate-700 text-white rounded-bl-none"
                                }`}
                              >
                                <div className="flex flex-col">
                                  {msg.messageType === "image" &&
                                  (msg.media || msg.content) ? (
                                    <img
                                      src={msg.media || msg.content}
                                      alt="image"
                                      className="max-h-64 rounded-md mt-1"
                                    />
                                  ) : msg.messageType === "video" &&
                                    (msg.media || msg.content) ? (
                                    <video
                                      controls
                                      className="w-full max-h-64 rounded-md mt-1"
                                    >
                                      <source
                                        src={msg.media || msg.content}
                                        type="video/mp4"
                                      />
                                    </video>
                                  ) : (
                                    <p className="text-sm break-words whitespace-pre-wrap">
                                      {msg.text || msg.content}
                                    </p>
                                  )}
                                  <div
                                    className={`flex items-center gap-1 mt-1 text-xs ${
                                      msg.sender === "me"
                                        ? "text-white/70"
                                        : "text-gray-400"
                                    } self-end`}
                                  >
                                    <span>{formatTime(msg.timestamp)}</span>
                                    {getStatusIcon(
                                      msg.status,
                                      msg.sender,
                                      msg.seen
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {typing && (
                      <div className="flex items-center gap-2 text-gray-500 text-xs pl-4">
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" />
                          <span
                            className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"
                            style={{ animationDelay: "0.2s" }}
                          />
                          <span
                            className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"
                            style={{ animationDelay: "0.4s" }}
                          />
                        </div>
                        <span>typing...</span>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className="p-2 sm:p-4 bg-slate-800 border-t border-slate-700">
                {isBlocked ? (
                  <div className="flex items-center justify-center py-4 text-red-400">
                    <span>🚫 You have blocked this user</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 sm:gap-3">
                    <button
                      onClick={toggleEmojiPicker}
                      className="text-gray-400 w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full hover:bg-slate-700 flex-shrink-0"
                    >
                      <FiSmile className="w-5 h-5" />
                    </button>
                    <div className="flex-1 relative">
                      <textarea
                        ref={textareaRef}
                        value={message}
                        onChange={(e) => {
                          setMessage(e.target.value);
                          handleTyping();
                        }}
                        placeholder="Message"
                        className="flex-1 w-full bg-slate-700 text-white outline-none text-sm rounded-full py-3 px-5 resize-none overflow-y-auto max-h-24"
                        rows="1"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                            stopTyping(selectedChatId);
                          }
                        }}
                        onInput={(e) => {
                          e.target.style.height = "auto";
                          e.target.style.height = e.target.scrollHeight + "px";
                        }}
                      />
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                      {filePreviewUrl && (
                        <div className="absolute left-3 -top-20 flex items-center gap-2 bg-slate-700 rounded-xl p-2 shadow-lg">
                          {selectedFileType === "image" ? (
                            <img
                              src={filePreviewUrl}
                              alt="preview"
                              className="w-16 h-16 object-cover rounded-md"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-slate-600 rounded-md flex items-center justify-center text-white">
                              <IoVideocamOutline className="w-6 h-6" />
                            </div>
                          )}
                          <button
                            onClick={clearSelectedFile}
                            className="text-gray-300 hover:text-white"
                          >
                            <BsX className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                      <button
                        onClick={handleFileUpload}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        <FiPaperclip className="w-5 h-5" />
                      </button>
                    </div>
                    <button
                      onClick={selectedFile ? handleSendMedia : handleSend}
                      disabled={!message.trim() && !selectedFile}
                      className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                    >
                      <IoSend className="w-6 h-6 text-white" />
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Video Call Overlay */}
      {showVideoCall && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
          <div className="bg-slate-900 rounded-2xl p-6 w-full max-w-md mx-4">
            <div className="text-center">
              <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <IoVideocamOutline className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-white text-xl font-semibold mb-2">
                Video Call
              </h3>
              <p className="text-gray-400 mb-4">
                Calling {selectedChat?.user?.name}...
              </p>
              <p className="text-yellow-400 font-mono text-lg mb-6">
                {formatCallDuration(callDuration)}
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={endVideoCall}
                  className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors"
                >
                  <IoClose className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audio Call Overlay */}
      {showAudioCall && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
          <div className="bg-slate-900 rounded-2xl p-6 w-full max-w-md mx-4">
            <div className="text-center">
              <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <IoCallOutline className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-white text-xl font-semibold mb-2">
                Audio Call
              </h3>
              <p className="text-gray-400 mb-4">
                Calling {selectedChat?.user?.name}...
              </p>
              <p className="text-yellow-400 font-mono text-lg mb-6">
                {formatCallDuration(callDuration)}
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={endAudioCall}
                  className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors"
                >
                  <IoClose className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Emoji Picker Overlay */}
      {showEmojiPicker && (
        <div
          ref={emojiPickerRef}
          className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50"
        >
          <div className="bg-slate-900 rounded-2xl p-4 shadow-2xl border border-white/10">
            <div className="grid grid-cols-8 gap-2 max-h-48 overflow-y-auto">
              {emojis.map((emoji, index) => (
                <button
                  key={index}
                  onClick={() => addEmoji(emoji)}
                  className="w-8 h-8 flex items-center justify-center text-lg hover:bg-white/10 rounded transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
