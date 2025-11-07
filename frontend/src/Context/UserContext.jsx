import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const UserContext = createContext();

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_BASE_URL = "http://localhost:3000/api";

  // Get token from cookie
  const getToken = () => {
    const token = document.cookie
      .split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1];
    return token;
  };

  // Fetch user profile from backend
  const fetchUserProfile = async () => {
    try {
      const token = getToken();

      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      const response = await axios.get(`${API_BASE_URL}/user/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.data.success && response.data.data) {
        setUser(response.data.data);
        // Update localStorage as backup
        localStorage.setItem("user", JSON.stringify(response.data.data));
      } else {
        setUser(null);
      }
    } catch (err) {
      // Error fetching user profile
      // Try to get from localStorage as fallback
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (parseErr) {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  // Login function
  const login = async (email, password, googleToken = null) => {
    setLoading(true);
    try {
      let response;
      if (googleToken) {
        response = await axios.post(`${API_BASE_URL}/user/auth/google`, {
          token: googleToken,
        });
      } else {
        response = await axios.post(`${API_BASE_URL}/user/login`, {
          email,
          password,
        });
      }

      if (response.data.success) {
        const { token, data: userData } = response.data;
        document.cookie = `token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Strict`;
        setUser(userData);
        localStorage.setItem("user", JSON.stringify(userData));
      } else {
        throw new Error(response.data.message || "Login failed");
      }
    } catch (err) {
      console.error("Login error:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update user data
  const updateUser = (updatedUserData) => {
    setUser(updatedUserData);
    localStorage.setItem("user", JSON.stringify(updatedUserData));
  };

  // Logout function
  const logout = async () => {
    try {
      const token = getToken();

      // Call backend logout endpoint if token exists (optional but recommended)
      if (token) {
        try {
          await axios.post(
            `${API_BASE_URL}/user/logout`,
            {},
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            },
          );
        } catch (err) {
          // Continue with client-side logout even if backend call fails
          console.error("Backend logout failed:", err);
        }
      }

      // Clear user state
      setUser(null);

      // Clear all localStorage items related to auth
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem("authToken");
      localStorage.clear(); // Clear all localStorage (optional - use if only auth data is stored)

      // Clear all sessionStorage
      sessionStorage.clear();

      // Clear all cookies (comprehensive approach)
      document.cookie =
        "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict";
      document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"; // Without SameSite for compatibility

      // Clear any other potential cookies
      const cookies = document.cookie.split(";");
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        const eqPos = cookie.indexOf("=");
        const name =
          eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        document.cookie =
          name + "=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        document.cookie =
          name +
          "=; path=/; domain=" +
          window.location.hostname +
          "; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      }

      // Dispatch logout event for other tabs/windows
      window.dispatchEvent(new Event("userLoggedOut"));

      // Force reload to clear any in-memory state (optional)
      // window.location.href = '/';
    } catch (err) {
      console.error("Logout error:", err);
      // Even if there's an error, clear the local state
      setUser(null);
      localStorage.clear();
      sessionStorage.clear();
    }
  };

  // Initialize user data on mount
  useEffect(() => {
    fetchUserProfile();

    // Listen for profile updates from other components
    const handleProfileUpdate = () => {
      fetchUserProfile();
    };

    window.addEventListener("profileUpdated", handleProfileUpdate);
    window.addEventListener("userLoggedOut", () => {
      setUser(null);
      localStorage.removeItem("user");
    });

    // Listen for storage changes (login from another tab)
    const handleStorageChange = (e) => {
      if (e.key === "user") {
        if (e.newValue) {
          try {
            setUser(JSON.parse(e.newValue));
          } catch (err) {
            // Error parsing user from localStorage
          }
        } else {
          setUser(null);
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("profileUpdated", handleProfileUpdate);
      window.removeEventListener("userLoggedIn", handleProfileUpdate);
      window.removeEventListener("userLoggedOut", handleProfileUpdate);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const value = {
    user,
    loading,
    updateUser,
    logout,
    login,
    refreshUser: fetchUserProfile,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export default UserContext;
