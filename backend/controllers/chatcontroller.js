import Message from "../models/message.js";
import User from "../models/user.js";
import { getIO } from "../socketServer.js";

export const sharePost = async (req, res) => {
  try {
    const {
      receiverId,
      postId,
      content,
      image,
      messageType = "post",
    } = req.body;
    const senderId = req.user._id;

    if (!receiverId) {
      return res.status(400).json({
        success: false,
        message: "Receiver ID is required",
      });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: "Receiver not found",
      });
    }

    const message = new Message({
      sender: senderId,
      receiver: receiverId,
      content: content || "",
      messageType: messageType,
      media: image || null,
      postId: postId || null,
    });

    await message.save();

    await message.populate("sender", "name profileImage _id");
    await message.populate("receiver", "name profileImage _id");

    const messagePayload = {
      _id: message._id,
      id: message._id,
      senderId: message.sender._id,
      receiverId: message.receiver._id,
      sender: message.sender,
      receiver: message.receiver,
      content: message.content,
      messageType: message.messageType,
      media: message.media,
      image: message.media,
      postId: message.postId,
      createdAt: message.createdAt,
      timestamp: message.createdAt,
      isRead: message.isRead,
      seen: message.seen,
    };

    const io = getIO();
    if (io) {
      io.to(receiverId.toString()).emit("receive_message", messagePayload);
    }

    res.status(201).json({
      success: true,
      sharedMessage: messagePayload,
    });
  } catch (error) {
    console.error("Error sharing post:", error);
    res.status(500).json({
      success: false,
      message: "Failed to share post",
      error: error.message,
    });
  }
};

export default { sharePost };
