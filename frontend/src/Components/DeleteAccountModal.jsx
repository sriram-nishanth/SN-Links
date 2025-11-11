import React from "react";

const DeleteAccountModal = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 transition-opacity duration-300">
      <div className="relative w-full max-w-md p-6 mx-4 bg-gray-900 rounded-lg shadow-xl transform transition-all duration-300 ease-in-out">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-white">
            Are you sure you want to delete your account?
          </h3>
          <p className="mt-2 text-sm text-gray-300">
            This action cannot be undone. All your data will be permanently
            lost.
          </p>
        </div>
        <div className="mt-6 flex justify-center space-x-4">
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Delete
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-600"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteAccountModal;
