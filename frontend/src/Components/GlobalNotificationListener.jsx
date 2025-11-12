/**
 * GlobalNotificationListener - Handles Socket.IO message notifications globally
 * This component should be placed at the top level (in main.jsx or root layout)
 * to ensure notifications work on all pages
 */

import useGlobalNotifications from "../hooks/useGlobalNotifications";

const GlobalNotificationListener = () => {
  // Initialize global notifications
  // This will listen for incoming messages and show toasts on any page
  useGlobalNotifications();

  // This component doesn't render anything
  return null;
};

export default GlobalNotificationListener;
