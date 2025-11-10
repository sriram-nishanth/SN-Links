import React, { useState } from 'react';
import DefaultAvatar from './DefaultAvatar';

const Avatar = ({ image, username, size = 'w-10 h-10', className = '' }) => {
  const [imageError, setImageError] = useState(false);

  if (!image || imageError) {
    return <DefaultAvatar name={username} size={size} className={className} />;
  }

  return (
    <img
      src={image}
      alt={username}
      className={`${size} rounded-full object-cover ${className}`}
      onError={() => setImageError(true)}
    />
  );
};

export default Avatar;
