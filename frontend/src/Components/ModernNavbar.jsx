import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUser } from '../Context/UserContext';
import DefaultAvatar from './DefaultAvatar';
import { assert } from '../utils/assest';
import {
  HiHome,
  HiUser,
  HiChatAlt2,
  HiCog,
  HiSearch,
  HiMenu,
  HiX,
  HiLogout,
  HiUserCircle,
} from 'react-icons/hi';

const ModernNavbar = ({ searchQuery, setSearchQuery }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, logout, loading: userLoading } = useUser();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle logout with comprehensive cleanup
  const handleLogout = async () => {
    try {
      // Close dropdown
      setIsDropdownOpen(false);

      // Perform logout (clears all auth data)
      await logout();

      // Navigate to login page with replace to prevent back navigation
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout failed:', error);
      // Force navigation even if logout fails
      navigate('/login', { replace: true });
    }
  };

  // Navigation items with icons
  const navItems = [
    {
      id: 1,
      name: 'Home',
      path: '/home',
      icon: HiHome,
      label: t('header.home') || 'Home',
    },
    {
      id: 2,
      name: 'Profile',
      path: user?._id ? `/profile/${user._id}` : '/home',
      icon: HiUser,
      label: t('header.profile') || 'Profile',
    },
    {
      id: 3,
      name: 'Chat',
      path: '/chat',
      icon: HiChatAlt2,
      label: t('header.chat') || 'Chat',
    },
    {
      id: 4,
      name: 'Settings',
      path: '/setting',
      icon: HiCog,
      label: t('header.setting') || 'Settings',
    },
  ];

  // Get user initials for avatar fallback
  const getUserInitials = () => {
    if (!user) return 'U';
    if (user.name) {
      const names = user.name.split(' ');
      return names.length > 1
        ? `${names[0][0]}${names[1][0]}`.toUpperCase()
        : names[0][0].toUpperCase();
    }
    if (user.email) return user.email[0].toUpperCase();
    return 'U';
  };

  return (
    <>
      {/* Main Navbar - Fixed at top */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-zinc-900 to-slate-900 backdrop-blur-md border-b border-gray-800 shadow-lg">
        <div className="w-full h-16 sm:h-20 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-full">
            {/* Left Section - Logo & Explore */}
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Logo */}
              <div
                onClick={() => navigate('/home')}
                className="flex items-center gap-2 cursor-pointer group"
              >
                <img
                  src={assert.Logo}
                  alt="Logo"
                  className="h-8 w-8 sm:h-10 sm:w-10 transition-transform duration-200 group-hover:scale-110"
                />
                <span className="hidden sm:block text-white font-bold text-lg lg:text-xl">
                  SN Link
                </span>
              </div>

              {/* Explore Search - Desktop */}
              <div className="hidden md:block relative">
                <div className="relative">
                  <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder={t('header.explore') || 'Explore'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onClick={() => navigate('/home')}
                    className="bg-gray-800 text-white rounded-lg pl-10 pr-4 py-2 w-48 lg:w-64 xl:w-80 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-all duration-200"
                  />
                </div>
              </div>

              {/* Mobile Search Toggle */}
              <button
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="md:hidden p-2 text-white hover:text-yellow-400 transition-colors"
              >
                <HiSearch className="w-6 h-6" />
              </button>
            </div>

            {/* Center Section - Navigation Icons (Desktop/Tablet) */}
            <div className="hidden sm:flex items-center gap-2 lg:gap-4">
              {navItems.map((item) => (
                <NavLink
                  key={item.id}
                  to={item.path}
                  className={({ isActive }) =>
                    `relative group flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'text-yellow-400'
                        : 'text-white hover:text-yellow-400 hover:bg-gray-800'
                    }`
                  }
                  title={item.label}
                >
                  {({ isActive }) => (
                    <>
                      <item.icon className="w-6 h-6 lg:w-7 lg:h-7" />
                      <span
                        className={`text-xs mt-1 font-medium ${
                          isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        } transition-opacity duration-200`}
                      >
                        {item.name}
                      </span>
                      {/* Active indicator dot */}
                      {isActive && (
                        <span className="absolute -bottom-1 w-1 h-1 bg-yellow-400 rounded-full"></span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>

            {/* Right Section - User Profile with Dropdown */}
            <div className="flex items-center gap-3">
              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="sm:hidden p-2 text-white hover:text-yellow-400 transition-colors"
              >
                {isMobileMenuOpen ? (
                  <HiX className="w-6 h-6" />
                ) : (
                  <HiMenu className="w-6 h-6" />
                )}
              </button>

              {/* User Avatar Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 focus:outline-none group"
                >
                  {/* User Avatar */}
                  <div className="relative">
                    {user?.profileImage ? (
                      <img
                        src={user.profileImage}
                        alt="Profile"
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-gray-700 group-hover:border-yellow-400 transition-all duration-200 cursor-pointer"
                      />
                    ) : (
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg border-2 border-gray-700 group-hover:border-yellow-400 transition-all duration-200 cursor-pointer">
                        {getUserInitials()}
                      </div>
                    )}
                    {/* Online indicator */}
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900"></span>
                  </div>

                  {/* User name - Desktop only */}
                  <div className="hidden lg:block text-left">
                    <p className="text-white text-sm font-medium">
                      {user?.name || 'User'}
                    </p>
                    <p className="text-gray-400 text-xs">
                      {user?.username || '@user'}
                    </p>
                  </div>

                  {/* Dropdown indicator */}
                  <svg
                    className={`hidden lg:block w-4 h-4 text-gray-400 transition-transform duration-200 ${
                      isDropdownOpen ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-3 w-56 sm:w-64 bg-gray-800 rounded-xl shadow-2xl border border-gray-700 overflow-hidden z-50 transition-all duration-200">
                    {/* User Info Header */}
                    <div className="px-4 py-3 bg-gradient-to-r from-zinc-900 to-slate-900 border-b border-gray-700">
                      <p className="text-white font-semibold text-sm">
                        {user?.name || 'User'}
                      </p>
                      <p className="text-gray-400 text-xs mt-0.5">
                        {user?.email || user?.username || '@user'}
                      </p>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                      {/* View Profile */}
                      <Link
                        to={user?._id ? `/profile/${user._id}` : '/home'}
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-yellow-400 transition-all duration-200 cursor-pointer"
                      >
                        <HiUserCircle className="w-5 h-5" />
                        <span className="text-sm font-medium">
                          {t('settings.viewProfile') || 'View Profile'}
                        </span>
                      </Link>

                      {/* Settings */}
                      <Link
                        to="/setting"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-yellow-400 transition-all duration-200 cursor-pointer"
                      >
                        <HiCog className="w-5 h-5" />
                        <span className="text-sm font-medium">
                          {t('settings.settings') || 'Settings'}
                        </span>
                      </Link>
                    </div>

                    {/* Logout Button */}
                    <div className="border-t border-gray-700 py-2">
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-200 w-full"
                      >
                        <HiLogout className="w-5 h-5" />
                        <span className="text-sm font-medium">
                          {t('settings.logOut') || 'Logout'}
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Search Bar */}
        {isSearchOpen && (
          <div className="md:hidden border-t border-gray-800 bg-gradient-to-r from-zinc-900 to-slate-900 px-4 py-3 transition-all duration-300">
            <div className="relative">
              <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder={t('header.explore') || 'Explore'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="bg-gray-800 text-white rounded-lg pl-10 pr-4 py-2 w-full placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>
          </div>
        )}
      </nav>

      {/* Mobile Bottom Navigation */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-zinc-900 to-slate-900 border-t border-gray-800 shadow-lg">
        <div className="flex items-center justify-around px-2 py-3">
          {navItems.map((item) => (
            <NavLink
              key={item.id}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'text-yellow-400'
                    : 'text-gray-400 hover:text-yellow-400'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className="w-6 h-6" />
                  <span className="text-xs mt-1 font-medium">{item.name}</span>
                  {isActive && (
                    <span className="absolute bottom-0 w-1 h-1 bg-yellow-400 rounded-full"></span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>

      {/* Mobile Slide Menu */}
      {isMobileMenuOpen && (
        <>
          {/* Overlay */}
          <div
            className="sm:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-all duration-200"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>

          {/* Slide Menu */}
          <div className="sm:hidden fixed top-16 right-0 w-64 h-[calc(100vh-4rem)] bg-gradient-to-b from-zinc-900 to-slate-900 border-l border-gray-800 z-50 shadow-2xl transition-all duration-300 overflow-y-auto">
            <div className="p-4">
              {/* User Info */}
              <div className="flex items-center gap-3 pb-4 mb-4 border-b border-gray-800">
                {user?.profileImage ? (
                  <img
                    src={user.profileImage}
                    alt="Profile"
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
                    {getUserInitials()}
                  </div>
                )}
                <div>
                  <p className="text-white font-semibold text-sm">
                    {user?.name || 'User'}
                  </p>
                  <p className="text-gray-400 text-xs">
                    {user?.username || '@user'}
                  </p>
                </div>
              </div>

              {/* Menu Items */}
              <div className="space-y-1">
                <Link
                  to={user?._id ? `/profile/${user._id}` : '/home'}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 text-gray-300 hover:bg-gray-800 hover:text-yellow-400 rounded-lg transition-all duration-200"
                >
                  <HiUserCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">
                    {t('settings.viewProfile') || 'View Profile'}
                  </span>
                </Link>

                <Link
                  to="/setting"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 text-gray-300 hover:bg-gray-800 hover:text-yellow-400 rounded-lg transition-all duration-200"
                >
                  <HiCog className="w-5 h-5" />
                  <span className="text-sm font-medium">
                    {t('settings.settings') || 'Settings'}
                  </span>
                </Link>

                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="flex items-center gap-3 px-3 py-3 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg transition-all duration-200 w-full mt-4"
                >
                  <HiLogout className="w-5 h-5" />
                  <span className="text-sm font-medium">
                    {t('settings.logOut') || 'Logout'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}


    </>
  );
};

export default ModernNavbar;
