import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IoClose } from "react-icons/io5";

const MediaPreviewModal = ({ isOpen, url, type, onClose }) => {
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleBackdropClick}
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative flex items-center justify-center"
          >
            <button
              onClick={onClose}
              className="absolute -top-12 right-0 z-50 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              aria-label="Close preview"
            >
              <IoClose className="w-6 h-6" />
            </button>

            {type === "image" ? (
              <motion.img
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3 }}
                src={url}
                alt="Full preview"
                className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
              />
            ) : (
              <motion.video
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3 }}
                src={url}
                controls
                autoPlay
                className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
              />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MediaPreviewModal;
