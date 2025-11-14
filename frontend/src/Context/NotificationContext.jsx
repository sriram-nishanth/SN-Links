import React, { createContext, useContext, useCallback, useRef } from "react";
import { toast } from "react-toastify";

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within a NotificationProvider");
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  // Track recently shown notifications to prevent duplicates
  const notificationTrackerRef = useRef(new Map());
  const DUPLICATE_DEBOUNCE_MS = 2000; // Prevent duplicate notifications within 2 seconds

  /**
   * Show a notification with deduplication
   * @param {string} message - The notification message
   * @param {string} type - Type: 'info', 'success', 'warning', 'error'
   * @param {object} options - Additional toast options
   */
  const showNotification = useCallback((message, type = "info", options = {}) => {
    // Create a unique key for this notification
    const notificationKey = `${type}_${message}`;

    // Check if we've recently shown this exact notification
    const lastShownTime = notificationTrackerRef.current.get(notificationKey);
    const now = Date.now();

    if (lastShownTime && now - lastShownTime < DUPLICATE_DEBOUNCE_MS) {
      console.log("[Notification] Duplicate prevented:", notificationKey);
      return;
    }

    // Update the last shown time
    notificationTrackerRef.current.set(notificationKey, now);

    // Show the toast
    toast[type](message, {
      position: "bottom-right",
      autoClose: 4000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      theme: "dark",
      ...options,
    });

    console.log("[Notification] Shown:", notificationKey);
  }, []);

  /**
   * Show message notification with emoji
   * @param {string} senderName - Name of the sender
   * @param {string} messageContent - Message content
   * @param {string} messageType - 'text', 'image', 'video', 'document'
   */
  const showMessageNotification = useCallback(
    (senderName, messageContent, messageType = "text") => {
      let message = "";
      let notificationType = "info";

      switch (messageType) {
        case "image":
          message = `📷 ${senderName} sent an image`;
          break;
        case "video":
          message = `🎬 ${senderName} sent a video`;
          break;
        case "document":
          message = `📄 ${senderName} sent a document`;
          break;
        case "text":
        default:
          // Limit text preview to 50 characters
          const preview =
            messageContent.length > 50
              ? messageContent.substring(0, 50) + "..."
              : messageContent;
          message = `💬 ${senderName}: ${preview}`;
          break;
      }

      showNotification(message, notificationType, {
        autoClose: 4000,
      });
    },
    [showNotification]
  );

  /**
   * Show follow notification
   * @param {string} userName - Name of the user who followed
   */
  const showFollowNotification = useCallback(
    (userName) => {
      const message = `👥 ${userName} started following you`;
      showNotification(message, "success");
    },
    [showNotification]
  );

  /**
   * Show follow request notification
   * @param {string} userName - Name of the user who requested to follow
   */
  const showFollowRequestNotification = useCallback(
    (userName) => {
      const message = `📨 ${userName} requested to follow you`;
      showNotification(message, "info");
    },
    [showNotification]
  );

  /**
   * Show like notification
   * @param {string} userName - Name of the user who liked
   */
  const showLikeNotification = useCallback(
    (userName) => {
      const message = `❤️ ${userName} liked your post`;
      showNotification(message, "success");
    },
    [showNotification]
  );

  /**
   * Show comment notification
   * @param {string} userName - Name of the user who commented
   */
  const showCommentNotification = useCallback(
    (userName) => {
      const message = `💬 ${userName} commented on your post`;
      showNotification(message, "info");
    },
    [showNotification]
  );

  /**
   * Show error notification
   * @param {string} message - Error message
   */
  const showError = useCallback(
    (message) => {
      showNotification(message, "error");
    },
    [showNotification]
  );

  /**
   * Show success notification
   * @param {string} message - Success message
   */
  const showSuccess = useCallback(
    (message) => {
      showNotification(message, "success");
    },
    [showNotification]
  );

  /**
   * Show warning notification
   * @param {string} message - Warning message
   */
  const showWarning = useCallback(
    (message) => {
      showNotification(message, "warning");
    },
    [showNotification]
  );

  /**
   * Clear all notifications
   */
  const clearAll = useCallback(() => {
    toast.dismiss();
    notificationTrackerRef.current.clear();
  }, []);

  const value = {
    showNotification,
    showMessageNotification,
    showFollowNotification,
    showFollowRequestNotification,
    showLikeNotification,
    showCommentNotification,
    showError,
    showSuccess,
    showWarning,
    clearAll,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
