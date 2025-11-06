import Message from "../models/message.js";
import User from "../models/user.js";

// Get messages between two users
export const getMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    const messages = await Message.find({
      $or: [
        { sender: currentUserId, receiver: userId },
        { sender: userId, receiver: currentUserId },
      ],
    })
      .populate("sender", "name profileImage")
      .populate("receiver", "name profileImage")
      .sort({ createdAt: 1 })
      .limit(100); // Limit to last 100 messages for performance

    res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch messages",
    });
  }
};

// Send a message
export const sendMessage = async (req, res) => {
  try {
    const {
      receiverId,
      content,
      messageType = "text",
      media = null,
    } = req.body;
    const senderId = req.user._id;

    // Validate receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: "Receiver not found",
      });
    }



    // Create message
    const message = new Message({
      sender: senderId,
      receiver: receiverId,
      content,
      messageType,
      media,
    });

    await message.save();

    // Populate sender info for response
    await message.populate("sender", "name profileImage");
    await message.populate("receiver", "name profileImage");

    res.status(201).json({
      success: true,
      data: message,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send message",
    });
  }
};

// Mark messages as read
export const markMessagesAsRead = async (req, res) => {
  try {
    const { senderId } = req.params;
    const currentUserId = req.user._id;

    await Message.updateMany(
      {
        sender: senderId,
        receiver: currentUserId,
        isRead: false,
      },
      {
        isRead: true,
        readAt: new Date(),
      },
    );

    res.status(200).json({
      success: true,
      message: "Messages marked as read",
    });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark messages as read",
    });
  }
};

// Get unread message count
export const getUnreadCount = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    const unreadCount = await Message.countDocuments({
      receiver: currentUserId,
      isRead: false,
    });

    res.status(200).json({
      success: true,
      data: { unreadCount },
    });
  } catch (error) {
    console.error("Error getting unread count:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get unread count",
    });
  }
};

// Get recent conversations
export const getConversations = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    // Get current user to find following/followers
    const currentUser = await User.findById(currentUserId);
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Convert currentUserId to ObjectId for proper matching
    const mongoose = (await import("mongoose")).default;
    const currentUserObjectId = new mongoose.Types.ObjectId(currentUserId);

    // Get all users that current user has chatted with (from messages)
    const chattedUsers = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: currentUserObjectId },
            { receiver: currentUserObjectId },
          ],
        },
      },
      {
        $group: {
          _id: {
            $cond: {
              if: { $eq: ["$sender", currentUserObjectId] },
              then: "$receiver",
              else: "$sender",
            },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $project: {
          _id: "$user._id",
          name: "$user.name",
          profileImage: "$user.profileImage",
          email: "$user.email",
        },
      },
    ]);

    // Get all users that current user follows
    const followingUsers = await User.find({
      _id: { $in: currentUser.following },
    }).select("_id name profileImage email");

    // Combine and deduplicate users
    const userMap = new Map();

    // Add chatted users
    chattedUsers.forEach((user) => {
      userMap.set(user._id.toString(), user);
    });

    // Add following users (will overwrite if already exists from chatted)
    followingUsers.forEach((user) => {
      userMap.set(user._id.toString(), user);
    });

    // Convert map to array
    const chatUsers = Array.from(userMap.values());

    // Get the latest message for each conversation (if any exist)
    const conversationsWithMessages = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: currentUserObjectId },
            { receiver: currentUserObjectId },
          ],
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: {
            $cond: {
              if: { $eq: ["$sender", currentUserObjectId] },
              then: "$receiver",
              else: "$sender",
            },
          },
          lastMessage: { $first: "$$ROOT" },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$receiver", currentUserObjectId] },
                    { $eq: ["$isRead", false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    // Create a map of conversations with messages
    const conversationsMap = new Map();
    conversationsWithMessages.forEach((conv) => {
      conversationsMap.set(conv._id.toString(), {
        lastMessage: conv.lastMessage,
        unreadCount: conv.unreadCount,
      });
    });

    // Combine chat users with their conversation data (if any)
    const conversations = chatUsers.map((user) => {
      const userId = user._id.toString();
      const conversationData = conversationsMap.get(userId);

      return {
        user: {
          _id: user._id,
          name: user.name,
          profileImage: user.profileImage || "",
          email: user.email,
        },
        lastMessage: conversationData?.lastMessage || null,
        unreadCount: conversationData?.unreadCount || 0,
      };
    });

    // Sort by last message time (conversations with messages first, then by user name)
    conversations.sort((a, b) => {
      if (a.lastMessage && b.lastMessage) {
        return (
          new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt)
        );
      }
      if (a.lastMessage && !b.lastMessage) return -1;
      if (!a.lastMessage && b.lastMessage) return 1;
      return a.user.name.localeCompare(b.user.name);
    });

    res.status(200).json({
      success: true,
      data: conversations,
    });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch conversations",
    });
  }
};
