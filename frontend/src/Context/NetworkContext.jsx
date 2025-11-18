import React, { createContext, useContext, useState, useEffect } from "react";
import { toast } from "react-toastify";

const NetworkContext = createContext();

export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error("useNetwork must be used within a NetworkProvider");
  }
  return context;
};

export const NetworkProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Back online!', {
        position: "bottom-right",
        autoClose: 2000,
        theme: "dark",
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error('No internet connection', {
        position: "bottom-right",
        autoClose: 3000,
        theme: "dark",
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Function to check if we can make API calls
  const canMakeRequest = () => {
    if (!navigator.onLine) {
      toast.error('You are offline. Please check your internet connection.', {
        position: "bottom-right",
        autoClose: 3000,
        theme: "dark",
      });
      return false;
    }
    return true;
  };

  const value = {
    isOnline,
    canMakeRequest,
  };

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
};