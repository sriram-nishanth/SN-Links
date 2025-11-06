import React from 'react';
import { motion } from 'framer-motion';

// Fade in animation for content loading
export const FadeIn = ({ children, delay = 0, duration = 0.5 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration, delay }}
  >
    {children}
  </motion.div>
);

// Scale animation for interactive elements
export const ScaleOnHover = ({ children, scale = 1.05 }) => (
  <motion.div
    whileHover={{ scale }}
    whileTap={{ scale: 0.95 }}
    transition={{ type: "spring", stiffness: 300, damping: 20 }}
  >
    {children}
  </motion.div>
);

// Shimmer effect for loading states
export const Shimmer = ({ children, isLoading }) => (
  <motion.div
    animate={isLoading ? {
      background: [
        "linear-gradient(90deg, #1a1a1a 0%, #2a2a2a 50%, #1a1a1a 100%)",
        "linear-gradient(90deg, #2a2a2a 0%, #1a1a1a 50%, #2a2a2a 100%)"
      ]
    } : {}}
    transition={{ duration: 1.5, repeat: isLoading ? Infinity : 0 }}
  >
    {children}
  </motion.div>
);

// Stagger animation for lists
export const StaggerContainer = ({ children, staggerDelay = 0.1 }) => (
  <motion.div
    initial="hidden"
    animate="visible"
    variants={{
      hidden: {},
      visible: {
        transition: {
          staggerChildren: staggerDelay
        }
      }
    }}
  >
    {children}
  </motion.div>
);

export const StaggerItem = ({ children }) => (
  <motion.div
    variants={{
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0 }
    }}
    transition={{ duration: 0.5 }}
  >
    {children}
  </motion.div>
);

// Pulse animation for loading indicators
export const PulseLoader = ({ size = "w-8 h-8", color = "bg-yellow-400" }) => (
  <motion.div
    animate={{
      scale: [1, 1.1, 1],
      opacity: [0.7, 1, 0.7]
    }}
    transition={{
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut"
    }}
    className={`${size} ${color} rounded-full`}
  />
);

// Slide in from right animation
export const SlideInRight = ({ children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, x: 50 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.6, delay }}
  >
    {children}
  </motion.div>
);

// Bounce animation for notifications
export const BounceIn = ({ children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.3 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{
      type: "spring",
      stiffness: 260,
      damping: 20,
      delay
    }}
  >
    {children}
  </motion.div>
);

// Page transition wrapper
export const PageTransition = ({ children }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.3 }}
  >
    {children}
  </motion.div>
);

// Card hover effect
export const CardHover = ({ children }) => (
  <motion.div
    whileHover={{
      y: -5,
      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
    }}
    transition={{ type: "spring", stiffness: 300, damping: 30 }}
  >
    {children}
  </motion.div>
);

// Button press animation
export const ButtonPress = ({ children, onClick }) => (
  <motion.button
    whileTap={{ scale: 0.95 }}
    whileHover={{ scale: 1.02 }}
    transition={{ type: "spring", stiffness: 400, damping: 17 }}
    onClick={onClick}
  >
    {children}
  </motion.button>
);

export default {
  FadeIn,
  ScaleOnHover,
  Shimmer,
  StaggerContainer,
  StaggerItem,
  PulseLoader,
  SlideInRight,
  BounceIn,
  PageTransition,
  CardHover,
  ButtonPress
};
