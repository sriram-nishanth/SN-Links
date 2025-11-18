import React, { useState, useEffect } from 'react';
import { BsWifiOff } from 'react-icons/bs';
import { toast } from 'react-toastify';
import useNetworkStatus from '../hooks/useNetworkStatus';

const NoInternetPage = () => {
  const isOnline = useNetworkStatus();
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (isOnline) {
      toast.success('Back online! Redirecting...', {
        position: "bottom-right",
        autoClose: 2000,
        theme: "dark",
      });
      // Auto redirect after showing toast
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
  }, [isOnline]);

  const handleRetry = () => {
    setRetrying(true);
    // Simulate checking connection
    setTimeout(() => {
      if (navigator.onLine) {
        toast.success('Connection restored!', {
          position: "bottom-right",
          autoClose: 2000,
          theme: "dark",
        });
        window.location.reload();
      } else {
        toast.error('Still no internet connection', {
          position: "bottom-right",
          autoClose: 3000,
          theme: "dark",
        });
      }
      setRetrying(false);
    }, 1000);
  };

  const handleAutoRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="bg-gradient-to-r from-zinc-900 to-slate-900 min-h-screen w-full relative">
      <div className='bg-amber-100 animate-pulse h-20 w-20 sm:h-30 sm:w-30 rounded-b-full absolute blur-3xl'></div>
      <div className='bg-blue-950 h-40 w-40 sm:h-50 sm:w-50 rounded-full absolute bottom-20 right-0 blur-lg animate-bounce'></div>

      <div className="relative p-4 sm:p-8 flex justify-center items-center w-full min-h-screen text-white">
        <div className='flex flex-col justify-center items-center gap-6 sm:gap-8 lg:gap-10 w-full max-w-md mx-auto px-2 sm:px-4 text-center'>

          {/* Icon */}
          <div className="animate-pulse">
            <BsWifiOff className="text-6xl sm:text-8xl text-yellow-400 mx-auto" />
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            No Internet Connection
          </h1>

          {/* Message */}
          <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
            Please check your network and try again
          </p>

          {/* Buttons */}
          <div className="flex flex-col gap-4 w-full max-w-xs">
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="w-full bg-yellow-400 text-black font-semibold py-3 sm:py-4 rounded-lg hover:bg-yellow-500 transition text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {retrying ? 'Checking...' : 'Retry Connection'}
            </button>

            <button
              onClick={handleAutoRefresh}
              className="w-full bg-transparent border border-gray-500 text-white font-semibold py-3 sm:py-4 rounded-lg hover:bg-gray-700 transition text-sm sm:text-base"
            >
              Refresh Page
            </button>
          </div>

          {/* Status indicator */}
          <div className="mt-4">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs sm:text-sm ${
              isOnline
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}>
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-400'}`}></div>
              {isOnline ? 'Connection Restored' : 'No Connection'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoInternetPage;