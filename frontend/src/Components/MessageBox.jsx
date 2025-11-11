import React, { useState, useEffect } from "react";

const MessageBox = ({ message, type, onDismiss }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleDismiss();
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    if (onDismiss) {
      onDismiss();
    }
  };

  const baseClasses =
    "fixed top-20 right-5 p-4 rounded-lg shadow-lg text-white transition-transform transform-gpu";
  const typeClasses = {
    success: "bg-green-500",
    error: "bg-red-500",
  };

  const animationClass = visible ? "translate-x-0" : "translate-x-full";

  return (
    <div className={`${baseClasses} ${typeClasses[type]} ${animationClass}`}>
      <div className="flex justify-between items-center">
        <span>{message}</span>
        <button onClick={handleDismiss} className="ml-4 text-white">
          &times;
        </button>
      </div>
    </div>
  );
};

export default MessageBox;
