import React, { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useUser } from "../Context/UserContext";

const PrivateAccountToggle = ({ isPrivate: initialIsPrivate = false, onToggle }) => {
  const [isPrivate, setIsPrivate] = useState(initialIsPrivate);
  const [isLoading, setIsLoading] = useState(false);
  const { updateUser, user } = useUser();

  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

  const getToken = () => {
    const token = document.cookie
      .split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1];
    return token;
  };

  useEffect(() => {
    setIsPrivate(initialIsPrivate);
  }, [initialIsPrivate]);

  const handleToggle = async () => {
    const newState = !isPrivate;
    setIsPrivate(newState);
    setIsLoading(true);
    
    try {
      const token = getToken();
      if (!token) {
        toast.error("Authentication required");
        setIsPrivate(!newState);
        return;
      }

      const response = await axios.post(
        `${API_BASE_URL}/user/toggle-private`,
        { isPrivate: newState },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        const updatedState = response.data.data.isPrivate;
        setIsPrivate(updatedState);
        
        if (user) {
          updateUser({ ...user, isPrivate: updatedState });
        }
        
        window.dispatchEvent(new CustomEvent("profileUpdated"));
        
        toast.success(response.data.message);
        if (onToggle) {
          onToggle(updatedState);
        }
      } else {
        setIsPrivate(!newState);
        toast.error("Failed to update privacy settings");
      }
    } catch (error) {
      console.error("Error toggling private account:", error);
      setIsPrivate(!newState);
      toast.error("Failed to update privacy settings");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
        isPrivate ? "bg-red-500" : "bg-gray-600"
      } ${isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:opacity-80"}`}
      aria-label="Toggle private account"
    >
      <span
        className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
          isPrivate ? "translate-x-9" : "translate-x-1"
        }`}
      />
      <span className="absolute left-2 text-xs font-semibold text-white">
        {isPrivate ? "ON" : "OFF"}
      </span>
    </button>
  );
};

export default PrivateAccountToggle;
