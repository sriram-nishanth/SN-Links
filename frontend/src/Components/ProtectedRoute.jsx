import React from "react";
import { Navigate } from "react-router-dom";
import { useUser } from "../Context/UserContext";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-zinc-900 to-slate-900 min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
