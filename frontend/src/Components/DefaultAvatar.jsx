import React from 'react';

const DefaultAvatar = ({ name, size = 'w-10 h-10', className = '' }) => {
  const firstLetter = name ? name.charAt(0).toUpperCase() : '?';

  return (
    <div
      className={`${size} rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-yellow-400/50 transition ${className}`}
      title={name || 'User'}
    >
      <span className="text-black font-bold text-lg">
        {firstLetter}
      </span>
    </div>
  );
};

export default DefaultAvatar;
