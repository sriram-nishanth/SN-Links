import React from "react";
import { useUser } from "./Context/UserContext";
import LoginPage from "./Pages/LoginPage";
import { Navigate } from "react-router-dom";
import useGlobalNotifications from "./hooks/useGlobalNotifications";

const App = () => {
  const { user, loading } = useUser();

  // Initialize global notifications on all pages
  useGlobalNotifications();

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-zinc-900 to-slate-900 min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // If user is authenticated, redirect to home
  if (user) {
    return <Navigate to="/home" replace />;
  }

  // If user is not authenticated, show login page
  return <LoginPage />;
};

export default App;
