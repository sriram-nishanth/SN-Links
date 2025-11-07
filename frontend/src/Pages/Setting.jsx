import React, { useState, useEffect, useRef } from "react";
import ModernNavbar from "../Components/ModernNavbar";
import { BsSearch, BsList, BsX } from "react-icons/bs";
import { menu, ProfileData } from "../utils/assest";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Toast from "../Components/Toast";
import { useUser } from "../Context/UserContext";

const Setting = () => {
  const [selected, setSelected] = useState(1);
  const [languageKey, setLanguageKey] = useState(Date.now());
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const SelectedIcon = menu.find((m) => m.id === selected)?.icon;
  const { user, updateUser, logout } = useUser();

  // Image upload states
  const [profileImagePreview, setProfileImagePreview] = useState(null);
  const [coverImagePreview, setCoverImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [currentImageType, setCurrentImageType] = useState(""); // 'profile' or 'cover'
  const profileImageRef = useRef(null);
  const coverImageRef = useRef(null);
  const [toast, setToast] = useState({ message: "", type: "" });

  // Profile state
  const [profile, setProfile] = useState({
    fullName: "",
    username: "",
    bio: "",
  });

  // Connected apps state
  const [connectedApps, setConnectedApps] = useState({
    google: false,
    facebook: false,
  });

  // New app modal state
  const [showNewAppModal, setShowNewAppModal] = useState(false);
  const [newAppName, setNewAppName] = useState("");

  // Password change state
  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    retypePassword: "",
  });

  // Activity logs state
  const [activityLogs, setActivityLogs] = useState([]);

  // Privacy settings state
  const [privacySettings, setPrivacySettings] = useState({
    privateAccount: false,
    showActivityStatus: true,
    twoFactorAuth: {
      useAuthApp: true,
      useSms: true,
    },
  });

  // Notifications state
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Loading state for profile save
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Load data from backend on component mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = user?.token;
        if (!token) {
          return;
        }

        const response = await fetch("http://localhost:3000/api/user/profile", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setProfile({
              fullName: data.data.name || "",
              username:
                `@${data.data.name.toLowerCase().replace(/\s+/g, "")}` || "",
              bio: data.data.bio || "",
            });
          }
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };

    fetchUserProfile();

    const savedConnectedApps = localStorage.getItem("connectedApps");
    if (savedConnectedApps) {
      setConnectedApps(JSON.parse(savedConnectedApps));
    }

    const savedPrivacySettings = localStorage.getItem("privacySettings");
    if (savedPrivacySettings) {
      setPrivacySettings(JSON.parse(savedPrivacySettings));
    }

    const savedNotifications = localStorage.getItem("notificationsEnabled");
    if (savedNotifications !== null) {
      setNotificationsEnabled(JSON.parse(savedNotifications));
    }

    const savedActivityLogs = localStorage.getItem("activityLogs");
    if (savedActivityLogs) {
      setActivityLogs(JSON.parse(savedActivityLogs));
    }
  }, []);

  // Initialize selected language with current i18n language
  useEffect(() => {
    setSelectedLanguage(i18n.language || "en");
  }, [i18n.language]);

  // Listen for language changes and force re-render
  useEffect(() => {
    const handleLanguageChanged = (lng) => {
      console.log("Language changed event received:", lng);
      setLanguageKey(Date.now());
    };

    i18n.on("languageChanged", handleLanguageChanged);

    return () => {
      i18n.off("languageChanged", handleLanguageChanged);
    };
  }, [i18n]);

  const handleLanguageChange = (language) => {
    console.log("Changing language to:", language);

    // Change language immediately
    i18n.changeLanguage(language);
    localStorage.setItem("i18nextLng", language);

    // Force immediate re-render by updating key
    setLanguageKey(Date.now());

    console.log("Language change initiated:", language);
  };

  const handleSaveLanguage = () => {
    if (selectedLanguage !== i18n.language) {
      handleLanguageChange(selectedLanguage);
    }
  };

  // Helper function to add activity log
  const addActivityLog = (action) => {
    const newLog = {
      id: Date.now(),
      action,
      timestamp: new Date().toISOString(),
    };
    const updatedLogs = [newLog, ...activityLogs].slice(0, 10); // Keep only last 10 logs
    setActivityLogs(updatedLogs);
    localStorage.setItem("activityLogs", JSON.stringify(updatedLogs));
  };

  // Profile save handler
  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      const token = user?.token;
      if (!token) {
        setToast({ type: "error", message: "Authentication required!" });
        return;
      }

      const response = await fetch("http://localhost:3000/api/user/profile", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: profile.fullName,
          bio: profile.bio,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Update local state with the response data
        setProfile({
          fullName: data.data.name,
          username: `@${data.data.name.toLowerCase().replace(/\s+/g, "")}`,
          bio: data.data.bio,
        });
        // Update localStorage with fresh user data
        localStorage.setItem("user", JSON.stringify(data.data));
        // Dispatch event to notify AccountSlide to refresh
        window.dispatchEvent(new CustomEvent("profileUpdated"));
        addActivityLog("Profile updated");
        setToast({ type: "success", message: "Profile saved successfully!" });
      } else {
        setToast({
          type: "error",
          message: data.message || "Failed to save profile!",
        });
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      setToast({
        type: "error",
        message: "Error saving profile. Please try again.",
      });
    } finally {
      setIsSavingProfile(false);
    }
    setTimeout(() => setToast({ type: "", message: "" }), 3000);
  };

  // Connected apps handler
  const handleConnectApp = (app) => {
    const updatedApps = { ...connectedApps, [app]: !connectedApps[app] };
    setConnectedApps(updatedApps);
    localStorage.setItem("connectedApps", JSON.stringify(updatedApps));
    addActivityLog(`${app} ${updatedApps[app] ? "connected" : "disconnected"}`);
    setToast({
      type: "success",
      message: `${app} ${
        updatedApps[app] ? "connected" : "disconnected"
      } successfully!`,
    });
    setTimeout(() => setToast({ type: "", message: "" }), 3000);
  };

  // New app handler
  const handleConnectNewApp = () => {
    if (!newAppName.trim()) {
      setToast({ type: "error", message: "Please enter an app name!" });
      setTimeout(() => setToast({ type: "", message: "" }), 3000);
      return;
    }

    const updatedApps = { ...connectedApps, [newAppName.toLowerCase()]: true };
    setConnectedApps(updatedApps);
    localStorage.setItem("connectedApps", JSON.stringify(updatedApps));
    addActivityLog(`${newAppName} connected`);
    setToast({
      type: "success",
      message: `${newAppName} connected successfully!`,
    });
    setTimeout(() => setToast({ type: "", message: "" }), 3000);
    setNewAppName("");
    setShowNewAppModal(false);
  };

  // Password change handler
  const handleChangePassword = () => {
    if (passwordData.newPassword !== passwordData.retypePassword) {
      setToast({ type: "error", message: "Passwords do not match!" });
      setTimeout(() => setToast({ type: "", message: "" }), 3000);
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setToast({
        type: "error",
        message: "Password must be at least 6 characters!",
      });
      setTimeout(() => setToast({ type: "", message: "" }), 3000);
      return;
    }
    // Simulate password change
    localStorage.setItem(
      "passwordChanged",
      JSON.stringify({ timestamp: new Date().toISOString() })
    );
    addActivityLog("Password changed");
    setPasswordData({ newPassword: "", retypePassword: "" });
    setToast({ type: "success", message: "Password changed successfully!" });
    setTimeout(() => setToast({ type: "", message: "" }), 3000);
  };

  // Privacy settings handler
  const handlePrivacyChange = (setting, value) => {
    const updatedSettings = { ...privacySettings, [setting]: value };
    setPrivacySettings(updatedSettings);
    localStorage.setItem("privacySettings", JSON.stringify(updatedSettings));
    addActivityLog(`Privacy setting updated: ${setting}`);
  };

  // Notifications handler
  const handleNotificationsChange = (enabled) => {
    setNotificationsEnabled(enabled);
    localStorage.setItem("notificationsEnabled", JSON.stringify(enabled));
    addActivityLog(`Notifications ${enabled ? "enabled" : "disabled"}`);
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      // Add activity log BEFORE logout (while user data still exists)
      addActivityLog("Logged out");

      // Perform logout (clears all auth data)
      await logout();

      // Navigate to login page
      // Using replace: true to prevent going back with browser back button
      navigate("/login", { replace: true });

      // Optional: Force reload to ensure clean state
      // window.location.href = '/';
    } catch (error) {
      console.error("Logout failed:", error);
      // Force navigation even if logout fails
      navigate("/login", { replace: true });
    }
  };

  // Image upload handlers
  const handleImageSelect = (type) => {
    setCurrentImageType(type);
    setShowImageModal(true);
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setToast({ type: "error", message: "Please select an image file" });
        setTimeout(() => setToast({ type: "", message: "" }), 3000);
        return;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        setToast({ type: "error", message: "File size must be less than 5MB" });
        setTimeout(() => setToast({ type: "", message: "" }), 3000);
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        if (currentImageType === "profile") {
          setProfileImagePreview(e.target.result);
        } else {
          setCoverImagePreview(e.target.result);
        }
      };
      reader.readAsDataURL(file);

      // Upload immediately
      uploadImage(file, currentImageType);
    }
  };

  const uploadImage = async (file, type) => {
    setUploadingImage(true);
    try {
      const token = user?.token;
      const formData = new FormData();
      formData.append(type === "profile" ? "profileImage" : "coverImage", file);

      const response = await axios.put(
        `http://localhost:3000/api/user/profile/${
          type === "profile" ? "image" : "cover"
        }`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data.success) {
        // Update global user state using context
        const updatedUser = {
          ...user,
          [type === "profile" ? "profileImage" : "backgroundImage"]:
            response.data.data[
              type === "profile" ? "profileImage" : "backgroundImage"
            ],
        };
        updateUser(updatedUser);

        // Clear previews
        if (type === "profile") {
          setProfileImagePreview(null);
        } else {
          setCoverImagePreview(null);
        }

        // Dispatch custom event for other components
        window.dispatchEvent(new CustomEvent("profileUpdated"));

        addActivityLog(
          `${type === "profile" ? "Profile" : "Cover"} image updated`
        );
        setToast({
          type: "success",
          message: `${
            type === "profile" ? "Profile" : "Cover"
          } image updated successfully!`,
        });
      }
    } catch (error) {
      console.error("Upload error:", error);
      if (error.response?.data?.message) {
        setToast({ type: "error", message: error.response.data.message });
      } else {
        setToast({
          type: "error",
          message: "Failed to upload image. Please try again.",
        });
      }
    } finally {
      setUploadingImage(false);
      setShowImageModal(false);
    }
    setTimeout(() => setToast({ type: "", message: "" }), 3000);
  };

  return (
    <div
      key={languageKey}
      className="bg-gradient-to-r from-zinc-900 to-slate-900 min-h-screen"
    >
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: "" })}
      />
      <ModernNavbar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-120px)] px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6 lg:py-8 gap-4 sm:gap-6 lg:gap-8 pt-20 lg:pt-24 pb-24 sm:pb-4">
        {/* Mobile Menu Button */}
        <div className="lg:hidden flex justify-between items-center mb-4">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex items-center gap-2 px-3 py-2 bg-[#181818]/40 backdrop-blur-2xl rounded-lg text-white hover:bg-[#232323] transition-colors"
          >
            {isMobileMenuOpen ? (
              <BsX className="w-5 h-5" />
            ) : (
              <BsList className="w-5 h-5" />
            )}
            <span className="text-sm font-medium">{t("settings.menu")}</span>
          </button>
          <div className="flex items-center gap-2 text-white">
            <SelectedIcon className="w-5 h-5" />
            <span className="text-sm sm:text-base font-medium">
              {t(menu.find((m) => m.id === selected)?.labelKey)}
            </span>
          </div>
        </div>

        {/* Sidebar */}
        <aside
          className={`
          ${isMobileMenuOpen ? "block" : "hidden"} lg:block
          w-full lg:w-80 xl:w-96 2xl:w-[28rem]
          h-auto lg:h-full
          bg-[#181818]/40 backdrop-blur-2xl rounded-2xl
          p-3 sm:p-4 md:p-5 lg:p-8 xl:p-10 2xl:p-12
          flex flex-col gap-3 sm:gap-4 md:gap-5 lg:gap-8 xl:gap-10 2xl:gap-12
          lg:sticky lg:top-0
        `}
        >
          {/* Sidebar menu */}
          <nav className="flex flex-col gap-1">
            {menu.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setSelected(item.id);
                    setIsMobileMenuOpen(false); // Close mobile menu on selection
                  }}
                  className={`
                    flex items-center gap-2 sm:gap-3
                    px-3 sm:px-4 py-2.5 sm:py-3
                    rounded-lg text-left
                    transition-all duration-200 ease-in-out
                    text-sm sm:text-base
                    min-h-[44px] sm:min-h-[48px] // Touch target size
                    ${
                      selected === item.id
                        ? "bg-yellow-400 text-black font-semibold shadow-lg"
                        : "text-white hover:bg-[#232323] hover:text-yellow-200"
                    }
                  `}
                >
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 flex-shrink-0" />
                  <span className="truncate">{t(item.labelKey)}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main
          className="
          flex-1 h-full
          bg-[#181818]/40 backdrop-blur-2xl rounded-2xl
          p-3 sm:p-4 md:p-5 lg:p-6 xl:p-8
          overflow-y-auto
          ${isMobileMenuOpen ? 'hidden lg:block' : 'block'}
        "
        >
          <div className="flex items-center gap-3 mb-4 sm:mb-6 lg:mb-8">
            <SelectedIcon className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-white" />
            <h2 className="text-white text-md sm:text-xl lg:text-xl font-semibold">
              {t(menu.find((m) => m.id === selected)?.labelKey)}
            </h2>
          </div>

          {/* Profile Information */}
          {selected === 1 && (
            <section className="space-y-4 sm:space-y-6 md:space-y-8 max-w-2xl">
              <div>
                <h3 className="text-white text-md sm:text-xl lg:text-xl font-semibold mb-3 sm:mb-4 lg:mb-5">
                  {t("settings.profileInformation")}
                </h3>
                <div className="grid gap-3 sm:gap-5 md:gap-5">
                  {/* Profile Image */}
                  <div className="space-y-2">
                    <span className="text-white text-sm sm:text-base md:text-md font-medium">
                      {t("settings.profileImage")}
                    </span>
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <img
                          src={
                            profileImagePreview ||
                            user?.profileImage ||
                            "/default-avatar.png"
                          }
                          alt="Profile"
                          className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-yellow-400"
                        />
                        {uploadingImage && currentImageType === "profile" && (
                          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-400"></div>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleImageSelect("profile")}
                        disabled={uploadingImage}
                        className="bg-yellow-400 text-black font-semibold px-4 py-2 rounded-lg hover:bg-yellow-500 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {t("settings.changeImage")}
                      </button>
                    </div>
                  </div>

                  {/* Cover Image */}
                  <div className="space-y-2">
                    <span className="text-white text-sm sm:text-base md:text-md font-medium">
                      {t("settings.coverImage")}
                    </span>
                    <div className="space-y-3">
                      <div className="relative">
                        <img
                          src={
                            coverImagePreview ||
                            user?.coverImage ||
                            "/default-cover.png"
                          }
                          alt="Cover"
                          className="w-full h-48 sm:h-56 rounded-lg object-cover border-2 border-yellow-400"
                        />
                        {uploadingImage && currentImageType === "cover" && (
                          <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleImageSelect("cover")}
                        disabled={uploadingImage}
                        className="bg-yellow-400 text-black font-semibold px-4 py-2 rounded-lg hover:bg-yellow-500 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {t("settings.changeCover")}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="flex flex-col">
                      <span className="text-white mb-2 text-sm sm:text-base md:text-md font-medium">
                        {t("settings.fullName")}
                      </span>
                      <input
                        type="text"
                        value={profile.fullName}
                        onChange={(e) =>
                          setProfile({ ...profile, fullName: e.target.value })
                        }
                        placeholder={
                          profile.fullName || t("settings.enterFullName")
                        }
                        className="bg-[#232323] text-white rounded-lg px-4 sm:px-5 py-3 sm:py-4 text-sm sm:text-base md:text-md outline-none focus:ring-2 focus:ring-yellow-400 transition-all min-h-[48px] sm:min-h-[52px]"
                      />
                    </label>
                  </div>
                  <div className="space-y-2">
                    <label className="flex flex-col">
                      <span className="text-white mb-2 text-sm sm:text-base md:text-md font-medium">
                        {t("settings.username")}
                      </span>
                      <input
                        type="text"
                        value={profile.username}
                        onChange={(e) =>
                          setProfile({ ...profile, username: e.target.value })
                        }
                        placeholder={
                          profile.username || t("settings.enterUsername")
                        }
                        className="bg-[#232323] text-white rounded-lg px-4 sm:px-5 py-3 sm:py-4 text-sm sm:text-base md:text-md outline-none focus:ring-2 focus:ring-yellow-400 transition-all min-h-[48px] sm:min-h-[52px]"
                      />
                    </label>
                  </div>
                  <div className="space-y-2">
                    <label className="flex flex-col">
                      <span className="text-white mb-2 text-sm sm:text-base md:text-md font-medium">
                        {t("settings.bio")}
                      </span>
                      <textarea
                        value={profile.bio}
                        onChange={(e) =>
                          setProfile({ ...profile, bio: e.target.value })
                        }
                        placeholder={
                          profile.bio || t("settings.tellAboutYourself")
                        }
                        className="bg-[#232323] text-white rounded-lg px-4 sm:px-5 py-3 sm:py-4 text-sm sm:text-base md:text-md outline-none focus:ring-2 focus:ring-yellow-400 transition-all resize-none min-h-[100px] sm:min-h-[120px]"
                        rows={4}
                      />
                    </label>
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-2 sm:pt-4">
                <button
                  onClick={handleSaveProfile}
                  disabled={isSavingProfile}
                  className="bg-yellow-400 text-black font-semibold px-6 sm:px-8 py-3 sm:py-4 rounded-lg hover:bg-yellow-500 transition-all text-sm sm:text-base md:text-md min-h-[48px] sm:min-h-[52px] shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingProfile ? "Saving..." : t("common.save")}
                </button>
              </div>
            </section>
          )}

          {/* Apps and Website */}
          {selected === 2 && (
            <section className="space-y-4 sm:space-y-6 md:space-y-8 max-w-2xl">
              <div>
                <h3 className="text-white text-md sm:text-xl lg:text-xl font-semibold mb-3 sm:mb-4 lg:mb-5">
                  {t("settings.connectedApps")}
                </h3>
                <div className="bg-[#232323] rounded-lg p-4 sm:p-5 md:p-6 flex flex-col gap-4 sm:gap-5 md:gap-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-500 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-sm">G</span>
                      </div>
                      <span className="text-white font-semibold text-sm sm:text-base md:text-md">
                        {t("settings.google")}
                      </span>
                    </div>
                    <button
                      onClick={() => handleConnectApp("google")}
                      className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg transition-all text-sm sm:text-base font-medium min-h-[44px] sm:min-h-[48px] shadow-md hover:shadow-lg ${
                        connectedApps.google
                          ? "bg-red-500 text-white hover:bg-red-600"
                          : "bg-green-500 text-white hover:bg-green-600"
                      }`}
                    >
                      {connectedApps.google
                        ? t("settings.disconnect")
                        : t("settings.connect")}
                    </button>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-sm">f</span>
                      </div>
                      <span className="text-white font-semibold text-sm sm:text-base md:text-md">
                        {t("settings.facebook")}
                      </span>
                    </div>
                    <button
                      onClick={() => handleConnectApp("facebook")}
                      className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg transition-all text-sm sm:text-base font-medium min-h-[44px] sm:min-h-[48px] shadow-md hover:shadow-lg ${
                        connectedApps.facebook
                          ? "bg-red-500 text-white hover:bg-red-600"
                          : "bg-green-500 text-white hover:bg-green-600"
                      }`}
                    >
                      {connectedApps.facebook
                        ? t("settings.disconnect")
                        : t("settings.connect")}
                    </button>
                  </div>
                </div>
              </div>
              <div className="pt-2 sm:pt-4">
                <h3 className="text-white text-md sm:text-xl lg:text-xl font-semibold mb-3 sm:mb-4 lg:mb-5">
                  {t("settings.addNewApp")}
                </h3>
                <button
                  onClick={() => setShowNewAppModal(true)}
                  className="bg-yellow-400 text-black font-semibold px-6 sm:px-8 py-3 sm:py-4 rounded-lg hover:bg-yellow-500 transition-all text-sm sm:text-base md:text-md min-h-[48px] sm:min-h-[52px] shadow-lg hover:shadow-xl"
                >
                  {t("settings.connectNewApp")}
                </button>
              </div>
            </section>
          )}

          {/* Change Password */}
          {selected === 3 && (
            <section className="space-y-4 sm:space-y-6 md:space-y-8 max-w-lg">
              <div>
                <h3 className="text-white text-md sm:text-xl lg:text-xl font-semibold mb-3 sm:mb-4 lg:mb-5">
                  {t("settings.changePassword")}
                </h3>
                <div className="grid gap-4 sm:gap-5 md:gap-6">
                  <div className="space-y-2">
                    <label className="flex flex-col">
                      <span className="text-white mb-2 text-sm sm:text-base md:text-md font-medium">
                        {t("settings.newPassword")}
                      </span>
                      <input
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) =>
                          setPasswordData({
                            ...passwordData,
                            newPassword: e.target.value,
                          })
                        }
                        placeholder={t("settings.newPassword")}
                        className="bg-[#232323] text-white rounded-lg px-4 sm:px-5 py-3 sm:py-4 text-sm sm:text-base md:text-md outline-none focus:ring-2 focus:ring-yellow-400 transition-all min-h-[48px] sm:min-h-[52px]"
                      />
                    </label>
                  </div>
                  <div className="space-y-2">
                    <label className="flex flex-col">
                      <span className="text-white mb-2 text-sm sm:text-base md:text-md font-medium">
                        {t("settings.retypePassword")}
                      </span>
                      <input
                        type="password"
                        value={passwordData.retypePassword}
                        onChange={(e) =>
                          setPasswordData({
                            ...passwordData,
                            retypePassword: e.target.value,
                          })
                        }
                        placeholder={t("settings.retypePassword")}
                        className="bg-[#232323] text-white rounded-lg px-4 sm:px-5 py-3 sm:py-4 text-sm sm:text-base md:text-md outline-none focus:ring-2 focus:ring-yellow-400 transition-all min-h-[48px] sm:min-h-[52px]"
                      />
                    </label>
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-2 sm:pt-4">
                <button
                  onClick={handleChangePassword}
                  className="bg-yellow-400 text-black font-semibold px-6 sm:px-8 py-3 sm:py-4 rounded-lg hover:bg-yellow-500 transition-all text-sm sm:text-base md:text-md min-h-[48px] sm:min-h-[52px] shadow-lg hover:shadow-xl"
                >
                  {t("settings.changePasswordBtn")}
                </button>
              </div>
            </section>
          )}

          {/* Activity Log */}
          {selected === 4 && (
            <section className="space-y-4 sm:space-y-6">
              <div>
                <h3 className="text-white text-md sm:text-xl lg:text-xl font-semibold mb-3 sm:mb-4 lg:mb-5">
                  {t("settings.accountLog")}
                </h3>
                <div className="bg-[#232323] rounded-lg p-4 sm:p-5 md:p-6 text-gray-400 text-sm sm:text-base md:text-md">
                  <div className="space-y-3 sm:space-y-4">
                    {activityLogs.length > 0 ? (
                      activityLogs.map((log, index) => (
                        <div
                          key={log.id}
                          className={`flex items-center justify-between py-2 ${
                            index < activityLogs.length - 1
                              ? "border-b border-gray-600/30"
                              : ""
                          }`}
                        >
                          <span className="font-medium">{log.action}</span>
                          <span className="text-xs sm:text-sm text-gray-500">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-gray-500">
                        {t("settings.noActivityLogs")}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Privacy and Security */}
          {selected === 5 && (
            <section className="space-y-3 sm:space-y-4 md:space-y-5 max-w-2xl">
              <div>
                <h3 className="text-white text-md sm:text-xl lg:text-xl font-semibold mb-2 sm:mb-3 lg:mb-3">
                  {t("settings.accountPrivacy")}
                </h3>
                <div className="bg-[#232323] rounded-lg p-3 sm:p-4 md:p-4">
                  <label className="flex items-center gap-3 py-2">
                    <input
                      type="checkbox"
                      checked={privacySettings.privateAccount}
                      onChange={(e) =>
                        handlePrivacyChange("privateAccount", e.target.checked)
                      }
                      className="accent-yellow-400 w-4 h-4 sm:w-5 sm:h-5"
                    />
                    <span className="text-white text-sm sm:text-base md:text-md">
                      {t("settings.privateAccount")}
                    </span>
                  </label>
                </div>
              </div>
              <div>
                <h3 className="text-white text-md sm:text-xl lg:text-xl font-semibold mb-2 sm:mb-3 lg:mb-3">
                  {t("settings.accountStatus")}
                </h3>
                <div className="bg-[#232323] rounded-lg p-3 sm:p-4 md:p-4">
                  <label className="flex items-center gap-3 py-2">
                    <input
                      type="checkbox"
                      checked={privacySettings.showActivityStatus}
                      onChange={(e) =>
                        handlePrivacyChange(
                          "showActivityStatus",
                          e.target.checked
                        )
                      }
                      className="accent-yellow-400 w-4 h-4 sm:w-5 sm:h-5"
                    />
                    <span className="text-white text-sm sm:text-base md:text-md">
                      {t("settings.showActivityStatus")}
                    </span>
                  </label>
                </div>
              </div>
              <div>
                <h3 className="text-white text-md sm:text-xl lg:text-xl font-semibold mb-2 sm:mb-3 lg:mb-3">
                  {t("settings.twoFactorAuth")}
                </h3>
                <div className="bg-[#232323] rounded-lg p-3 sm:p-4 md:p-4 space-y-2 sm:space-y-3">
                  <label className="flex items-center gap-3 py-2">
                    <input
                      type="checkbox"
                      checked={privacySettings.twoFactorAuth.useAuthApp}
                      onChange={(e) =>
                        handlePrivacyChange("twoFactorAuth", {
                          ...privacySettings.twoFactorAuth,
                          useAuthApp: e.target.checked,
                        })
                      }
                      className="accent-yellow-400 w-4 h-4 sm:w-5 sm:h-5"
                    />
                    <span className="text-white text-sm sm:text-base md:text-md">
                      {t("settings.useAuthApp")}
                    </span>
                  </label>
                  <label className="flex items-center gap-3 py-2">
                    <input
                      type="checkbox"
                      checked={privacySettings.twoFactorAuth.useSms}
                      onChange={(e) =>
                        handlePrivacyChange("twoFactorAuth", {
                          ...privacySettings.twoFactorAuth,
                          useSms: e.target.checked,
                        })
                      }
                      className="accent-yellow-400 w-4 h-4 sm:w-5 sm:h-5"
                    />
                    <span className="text-white text-sm sm:text-base md:text-md">
                      {t("settings.useSms")}
                    </span>
                  </label>
                </div>
              </div>
            </section>
          )}

          {/* Others */}
          {selected === 6 && (
            <section className="space-y-4 sm:space-y-6 md:space-y-8 max-w-2xl">
              <div>
                <h3 className="text-white text-md sm:text-xl lg:text-xl font-semibold mb-3 sm:mb-4 lg:mb-5">
                  {t("settings.otherSettings")}
                </h3>
                <div className="bg-[#232323] rounded-lg p-4 sm:p-5 md:p-6 space-y-4 sm:space-y-5 md:space-y-6">
                  {/* Language */}
                  <div className="space-y-2">
                    <label className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <span className="text-white font-semibold text-sm sm:text-base md:text-md min-w-0 sm:min-w-[128px]">
                        {t("settings.language")}
                      </span>
                      <select
                        value={selectedLanguage}
                        onChange={(e) => setSelectedLanguage(e.target.value)}
                        className="flex-1 bg-[#181818] text-white rounded-lg px-4 sm:px-5 py-3 sm:py-4 text-sm sm:text-base md:text-md outline-none focus:ring-2 focus:ring-yellow-400 transition-all min-h-[48px] sm:min-h-[52px]"
                      >
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                      </select>
                    </label>
                  </div>
                  {/* Notifications */}
                  <div className="space-y-2">
                    <label className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <span className="text-white font-semibold text-sm sm:text-base md:text-md min-w-0 sm:min-w-[128px]">
                        {t("settings.notifications")}
                      </span>
                      <div className="flex items-center gap-3 py-2">
                        <input
                          type="checkbox"
                          checked={notificationsEnabled}
                          onChange={(e) =>
                            handleNotificationsChange(e.target.checked)
                          }
                          className="accent-yellow-400 w-4 h-4 sm:w-5 sm:h-5"
                        />
                        <span className="text-white text-sm sm:text-base md:text-md">
                          {t("settings.enableNotifications")}
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-2 sm:pt-4">
                <button
                  onClick={handleSaveLanguage}
                  className="bg-yellow-400 text-black font-semibold px-6 sm:px-8 py-3 sm:py-4 rounded-lg hover:bg-yellow-500 transition-all text-sm sm:text-base md:text-md min-h-[48px] sm:min-h-[52px] shadow-lg hover:shadow-xl"
                >
                  {t("common.save")}
                </button>
              </div>
            </section>
          )}

          {/* Log Out */}
          {selected === 7 && (
            <section className="flex flex-col items-center justify-center h-full">
              <h2 className="text-white text-xl sm:text-2xl lg:text-3xl font-semibold mb-4">
                {t("settings.logOut")}
              </h2>
              <p className="text-gray-400 mb-6 sm:mb-8 text-center max-w-md text-sm sm:text-base md:text-md px-4">
                {t("settings.logOutMessage")}
              </p>
              <button
                className="bg-yellow-400 text-black font-semibold px-6 sm:px-8 py-2 sm:py-3 rounded-lg hover:bg-yellow-500 transition text-sm sm:text-base md:text-md"
                onClick={handleLogout}
              >
                {t("settings.logOut")}
              </button>
            </section>
          )}
        </main>
      </div>

      {/* New App Modal */}
      {showNewAppModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#181818] rounded-2xl p-6 sm:p-8 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white text-xl font-semibold">
                {t("settings.connectNewApp")}
              </h3>
              <button
                onClick={() => setShowNewAppModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <BsX className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  {t("settings.appName")}
                </label>
                <input
                  type="text"
                  value={newAppName}
                  onChange={(e) => setNewAppName(e.target.value)}
                  placeholder={t("settings.enterAppName")}
                  className="w-full bg-[#232323] text-white rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-yellow-400 transition-all"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      handleConnectNewApp();
                    }
                  }}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowNewAppModal(false)}
                  className="flex-1 bg-gray-600 text-white font-semibold py-3 rounded-lg hover:bg-gray-700 transition-all"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={handleConnectNewApp}
                  className="flex-1 bg-yellow-400 text-black font-semibold py-3 rounded-lg hover:bg-yellow-500 transition-all"
                >
                  {t("settings.connect")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Upload Modal */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#181818] rounded-2xl p-6 sm:p-8 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white text-xl font-semibold">
                {currentImageType === "profile"
                  ? t("settings.changeProfileImage")
                  : t("settings.changeCoverImage")}
              </h3>
              <button
                onClick={() => setShowImageModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <BsX className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="text-center">
                <div className="mb-4">
                  {currentImageType === "profile" ? (
                    <div className="w-24 h-24 mx-auto rounded-full border-2 border-yellow-400 overflow-hidden">
                      <img
                        src={
                          profileImagePreview ||
                          user?.profileImage ||
                          "/default-avatar.png"
                        }
                        alt="Current profile"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-48 rounded-lg border-2 border-yellow-400 overflow-hidden">
                      <img
                        src={
                          coverImagePreview ||
                          user?.coverImage ||
                          "/default-cover.png"
                        }
                        alt="Current cover"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
                <p className="text-gray-400 text-sm mb-4">
                  {currentImageType === "profile"
                    ? t("settings.selectProfileImage")
                    : t("settings.selectCoverImage")}
                </p>
              </div>

              <input
                ref={
                  currentImageType === "profile"
                    ? profileImageRef
                    : coverImageRef
                }
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="flex gap-3">
                <button
                  onClick={() => setShowImageModal(false)}
                  className="flex-1 bg-gray-600 text-white font-semibold py-3 rounded-lg hover:bg-gray-700 transition-all"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={() => {
                    const fileInput =
                      currentImageType === "profile"
                        ? profileImageRef.current
                        : coverImageRef.current;
                    fileInput?.click();
                  }}
                  className="flex-1 bg-yellow-400 text-black font-semibold py-3 rounded-lg hover:bg-yellow-500 transition-all"
                >
                  {t("settings.selectFile")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="text-gray-400 text-xs text-right pr-6 sm:pr-8 pb-2">
        Copyright @ {new Date().getFullYear()}
      </footer>
    </div>
  );
};

export default Setting;
