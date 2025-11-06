import React, { useState, useEffect } from 'react';

const Toast = ({ message, type, onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  if (!visible) return null;

  const baseStyle = 'fixed top-5 right-5 p-4 rounded-lg text-white';
  const styles = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  };

  return (
    <div className={`${baseStyle} ${styles[type] || styles.info}`}>
      {message}
    </div>
  );
};

export default Toast;
