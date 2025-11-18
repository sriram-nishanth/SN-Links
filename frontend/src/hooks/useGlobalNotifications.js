import { useEffect } from "react";
import { useSocket } from "../Context/SocketContext";
import { useNotification } from "../Context/NotificationContext";

/**
 * Hook to enable global notifications across all pages
 * Uses the existing NotificationContext to show messages
 * The SocketContext already listens for "receive_message" events
 * This hook just ensures the notification system is active
 */
const useGlobalNotifications = () => {
  const { isConnected } = useSocket();
  const { showNotification } = useNotification();

  useEffect(() => {
   }, [isConnected, showNotification]);

  // This hook doesn't need to do anything - it just ensures
  // the providers are mounted. The actual notification logic
  // is handled by SocketContext's handleReceiveMessageGlobal.
  return null;
};

export default useGlobalNotifications;
