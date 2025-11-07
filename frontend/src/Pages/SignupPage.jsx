import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { useTranslation } from "react-i18next";
import { assert } from "../utils/assest";
import { useUser } from "../Context/UserContext";
import Toast from "../Components/Toast";

const SignupPage = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    bio: "",
    profileImage: null,
  });
  const [toast, setToast] = useState({ message: "", type: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const { t } = useTranslation();
  const { login } = useUser();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "http://localhost:3000/api/user/createuser",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fullName: formData.fullName,
            email: formData.email,
            password: formData.password,
            bio: formData.bio,
            profileImage: formData.profileImage,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Error creating account");
      }

      // Use the login function from UserContext to handle token and user data
      await login(formData.email, formData.password);
      setToast({ message: "Account created successfully!", type: "success" });
      navigate("/home");
    } catch (err) {
      setToast({
        message: err.message || "Error creating account",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-zinc-900 to-slate-900 min-h-screen w-full relative">
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: "" })}
      />
      <div className="bg-amber-100 animate-pulse h-20 w-20 sm:h-30 sm:w-30 rounded-b-full absolute blur-3xl "></div>
      <div className="bg-blue-950 h-40 w-40 sm:h-50 sm:w-50 rounded-full absolute bottom-20 right-0 blur-lg animate-bounce"></div>
      {/* Logo */}
      <div className="relative flex justify-start items-center gap-2 mb-4 sm:mb-6 p-4 sm:p-5">
        <img src={assert.Logo} alt="logo" className="w-8 h-8 sm:w-10 sm:h-10" />
        <span className="font-bold text-base sm:text-lg text-white">
          SN Link
        </span>
      </div>
      <div className="relative p-4 sm:p-8 flex justify-center items-center w-full min-h-screen text-white">
        <div className="flex flex-col justify-center gap-4 sm:gap-6 lg:gap-10 w-full max-w-md mx-auto px-2 sm:px-4">
          {/* Title */}
          <h2 className="text-lg sm:text-xl font-semibold text-center mb-4 sm:mb-6">
            {t("signup.createAccount")}
          </h2>

          {/* Form */}
          <form
            className="flex flex-col gap-3 sm:gap-4 lg:gap-6"
            onSubmit={handleSubmit}
          >
            <div className="flex flex-col">
              <label className="mb-2 text-sm sm:text-base">
                {t("signup.fullName")}
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder={t("signup.enterFullName")}
                className="p-3 sm:p-4 rounded-lg bg-transparent border border-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm sm:text-base"
                required
              />
            </div>

            <div className="flex flex-col">
              <label className="mb-2 text-sm sm:text-base">
                {t("login.email")}
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder={t("signup.enterEmail")}
                className="p-3 sm:p-4 rounded-lg bg-transparent border border-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm sm:text-base"
                required
              />
            </div>

            <div className="flex flex-col">
              <label className="mb-2 text-sm sm:text-base">
                {t("login.password")}
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder={t("signup.enterPassword")}
                className="p-3 sm:p-4 rounded-lg bg-transparent border border-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm sm:text-base"
                required
                autoComplete="new-password"
              />
            </div>

            <div className="flex flex-col">
              <label className="mb-2 text-sm sm:text-base">
                {t("signup.confirmPassword")}
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder={t("signup.reenterPassword")}
                className="p-3 sm:p-4 rounded-lg bg-transparent border border-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm sm:text-base"
                required
                autoComplete="new-password"
              />
            </div>

            <div className="flex flex-col">
              <label className="mb-2 text-sm sm:text-base">
                Bio (Optional)
              </label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                placeholder="Tell us about yourself..."
                className="p-3 sm:p-4 rounded-lg bg-transparent border border-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm sm:text-base resize-none"
                rows={3}
              />
            </div>

            <div className="flex flex-col">
              <label className="mb-2 text-sm sm:text-base">
                Profile Image (Optional)
              </label>
              <input
                type="file"
                name="profileImage"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                      setFormData((prev) => ({
                        ...prev,
                        profileImage: e.target.result,
                      }));
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                accept="image/*"
                className="p-3 sm:p-4 rounded-lg bg-transparent border border-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm sm:text-base file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-yellow-400 file:text-black hover:file:bg-yellow-500"
              />
            </div>

            <div className="flex flex-col text-xs sm:text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="accent-yellow-400 w-4 h-4"
                  required
                />
                {t("signup.agreeToTerms")}
              </label>
            </div>

            {/* Error Message */}

            {/* Buttons */}
            <div className="flex flex-col gap-3 sm:gap-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-yellow-400 text-black font-semibold py-3 sm:py-4 rounded-lg hover:bg-yellow-500 transition text-sm sm:text-base disabled:opacity-50"
              >
                {loading ? "Creating Account..." : t("signup.signUp")}
              </button>

              <GoogleOAuthProvider
                clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}
              >
                <GoogleLogin
                  onSuccess={async (credentialResponse) => {
                    try {
                      await login(null, null, credentialResponse.credential);
                      setToast({
                        message: "Google authentication successful!",
                        type: "success",
                      });
                      navigate("/home");
                    } catch (err) {
                      setToast({
                        message: err.message || "Google authentication failed",
                        type: "error",
                      });
                    }
                  }}
                  onError={() => {
                    setToast({
                      message: "Google authentication failed",
                      type: "error",
                    });
                  }}
                  theme="filled_black"
                  size="large"
                  text="signup_with"
                  shape="rectangular"
                />
              </GoogleOAuthProvider>
            </div>
          </form>

          {/* Footer */}
          <p className="text-xs text-center text-gray-400 mt-4 sm:mt-6">
            {t("signup.alreadyHaveAccount")}{" "}
            <span
              className="text-yellow-400 cursor-pointer hover:underline"
              onClick={() => navigate("/")}
            >
              {t("signup.signIn")}
            </span>
          </p>
          <p className="text-xs text-center text-gray-400 mt-2">
            Copyright @ {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
