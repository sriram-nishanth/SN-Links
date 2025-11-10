import React, { useState } from "react";

const Avatar = ({ src, name = "User", size = "medium", className = "" }) => {
  const [imgError, setImgError] = useState(false);

  // Extract the first letter of the user's name
  const firstLetter = name?.charAt(0)?.toUpperCase() || "U";

  // Size handling
  const sizeClasses = {
    small: "w-8 h-8 text-sm",
    medium: "w-12 h-12 text-base",
    large: "w-20 h-20 text-xl",
    xl: "w-16 h-16 text-lg",
    "2xl": "w-20 h-20 text-2xl",
    "3xl": "w-24 h-24 text-3xl",
    "4xl": "w-32 h-32 text-4xl",
  };

  // Use custom size if not in predefined sizes
  const sizeClass = sizeClasses[size] || size;

  // Fallback condition
  const shouldShowImage = src && !imgError;

  return (
    <div
      className={`rounded-full flex items-center justify-center overflow-hidden ${sizeClass} ${className}`}
      style={{
        background: shouldShowImage
          ? "transparent"
          : "linear-gradient(135deg, #facc15, #f59e0b)", // yellow-orange gradient fallback
        color: "black",
        fontWeight: "600",
      }}
    >
      {shouldShowImage ? (
        <img
          src={src}
          alt={name}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <span>{firstLetter}</span>
      )}
    </div>
  );
};

export default Avatar;
