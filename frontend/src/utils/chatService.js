import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_CALL;

const getToken = () => {
  const token = document.cookie
    .split("; ")
    .find((row) => row.startsWith("token="))
    ?.split("=")[1];
  return token;
};

const getAuthHeaders = () => ({
  headers: {
    Authorization: `Bearer ${getToken()}`,
    "Content-Type": "application/json",
  },
});

export const sharePost = async (payload) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/chat/sharePost`,
      payload,
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    console.error("Error sharing post:", error);
    throw error;
  }
};

export const getConversations = async () => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/messages/conversations`,
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching conversations:", error);
    throw error;
  }
};

export const markAsSeen = async (senderId) => {
  try {
    const response = await axios.put(
      `${API_BASE_URL}/messages/markAsSeen`,
      { senderId },
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    console.error("Error marking messages as seen:", error);
    throw error;
  }
};

export const deleteMessageForMe = async (messageId) => {
  try {
    const response = await axios.patch(
      `${API_BASE_URL}/messages/deleteForMe`,
      { messageId },
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    console.error("Error deleting message for me:", error);
    throw error;
  }
};

export const deleteMessageForEveryone = async (messageId) => {
  try {
    const response = await axios.patch(
      `${API_BASE_URL}/messages/deleteForEveryone`,
      { messageId },
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    console.error("Error deleting message for everyone:", error);
    throw error;
  }
};

export default {
  sharePost,
  getConversations,
  markAsSeen,
  deleteMessageForMe,
  deleteMessageForEveryone,
};
