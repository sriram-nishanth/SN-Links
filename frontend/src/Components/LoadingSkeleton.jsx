import React from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

export const ProfileSkeleton = () => (
  <div className="w-full bg-[#1A1A1A]/40 backdrop-blur-3xl flex flex-col gap-4 sm:gap-6 text-white p-3 sm:p-4 lg:p-6 rounded-2xl">
    {/* Profile Card Skeleton */}
    <div className="w-full rounded-2xl overflow-hidden transform transition-all duration-300">
      {/* Background image skeleton */}
      <div className="h-32 sm:h-40 bg-gray-700 rounded-t-2xl">
        <Skeleton height="100%" className="rounded-t-2xl" />
      </div>

      {/* Card Content Skeleton */}
      <div className="pt-12 sm:pt-16 pb-4 sm:pb-6 px-3 sm:px-4 text-center rounded-b-2xl bg-gradient-to-b from-transparent to-[#1A1A1A]/20">
        <div className="flex justify-between px-2 sm:px-6 mb-4 sm:mb-6">
          <div className="text-center flex-1">
            <Skeleton width={40} height={20} className="mb-1" />
            <Skeleton width={60} height={14} />
          </div>
          <div className="text-center flex-1">
            <Skeleton width={40} height={20} className="mb-1" />
            <Skeleton width={60} height={14} />
          </div>
        </div>

        <Skeleton width={150} height={24} className="mb-1" />
        <Skeleton width={120} height={16} className="mb-2" />
        <Skeleton width={100} height={14} className="mb-4" />

        <Skeleton width={120} height={40} className="rounded-xl" />
      </div>
    </div>

    {/* Posts Section Skeleton */}
    <div className="mt-4">
      <Skeleton width={80} height={20} className="mb-3" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-[#2A2A2A] rounded-lg overflow-hidden">
            <Skeleton height={200} />
            <div className="p-3">
              <Skeleton count={2} className="mb-1" />
              <Skeleton width={80} height={12} />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const PostSkeleton = () => (
  <div className="bg-[#1A1A1A]/40 backdrop-blur-3xl text-white rounded-2xl shadow-lg overflow-hidden p-3 sm:p-4">
    {/* User Info Skeleton */}
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center">
        <Skeleton circle width={48} height={48} className="mr-3" />
        <div>
          <Skeleton width={120} height={16} className="mb-1" />
          <Skeleton width={80} height={12} />
        </div>
      </div>
    </div>

    {/* Post Content Skeleton */}
    <div className="mb-3">
      <Skeleton count={2} className="mb-2" />
    </div>

    {/* Media Skeleton */}
    <Skeleton height={200} className="mb-3 rounded-lg" />

    {/* Actions Skeleton */}
    <div className="flex items-center gap-3 sm:gap-4">
      <Skeleton width={60} height={16} />
      <Skeleton width={60} height={16} />
      <Skeleton width={20} height={16} />
    </div>
  </div>
);

export const ProfilePageSkeleton = () => (
  <div className="bg-gradient-to-r from-zinc-900 to-slate-900 min-h-screen">
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
      <div className="flex flex-col lg:flex-row justify-center lg:justify-between gap-4 sm:gap-6 lg:gap-8 items-start rounded-2xl p-3 sm:p-4 lg:p-6 text-white">
        {/* Profile Card Skeleton */}
        <div className="bg-[#1A1A1A]/40 backdrop-blur-2xl w-full lg:w-1/3 p-4 sm:p-6 lg:p-8 flex flex-col items-center gap-3 sm:gap-4 lg:gap-6 rounded-2xl lg:sticky lg:top-24">
          <Skeleton circle width={128} height={128} className="mb-4" />
          <Skeleton width={150} height={24} className="mb-2" />
          <Skeleton width={120} height={16} className="mb-2" />
          <Skeleton width={100} height={14} className="mb-4" />

          {/* Followers/Following Skeleton */}
          <div className="flex gap-4 text-center mb-4">
            <div className="text-center flex-1">
              <Skeleton width={40} height={20} className="mb-1" />
              <Skeleton width={60} height={14} />
            </div>
            <div className="text-center flex-1">
              <Skeleton width={40} height={20} className="mb-1" />
              <Skeleton width={60} height={14} />
            </div>
          </div>

          <Skeleton width={120} height={40} className="rounded-full" />
        </div>

        {/* Posts and Media Gallery Skeleton */}
        <div className="flex-1 bg-[#1A1A1A]/40 backdrop-blur-2xl rounded-2xl p-3 sm:p-4 lg:p-6 max-h-[calc(100vh-96px)] overflow-y-auto">
          {/* Posts Skeleton */}
          <div className="mb-6">
            <Skeleton width={80} height={20} className="mb-4" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-[#2A2A2A] rounded-lg overflow-hidden">
                  <Skeleton height={200} />
                  <div className="p-3">
                    <Skeleton count={2} className="mb-1" />
                    <Skeleton width={80} height={12} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Media Gallery Skeleton */}
          <div>
            <Skeleton width={80} height={20} className="mb-4" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <Skeleton key={i} height={120} className="rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const SettingsSkeleton = () => (
  <div className="bg-gradient-to-r from-zinc-900 to-slate-900 min-h-screen">
    <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)] px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6 lg:py-8 gap-3 sm:gap-4 md:gap-6 lg:gap-8">
      {/* Sidebar Skeleton */}
      <aside className="w-full lg:w-80 xl:w-96 2xl:w-[28rem] h-auto lg:h-full bg-[#181818]/40 backdrop-blur-2xl rounded-2xl p-3 sm:p-4 md:p-5 lg:p-8 xl:p-10 2xl:p-12 flex flex-col gap-3 sm:gap-4 md:gap-5 lg:gap-8 xl:gap-10 2xl:gap-12 lg:sticky lg:top-0">
        <nav className="flex flex-col gap-1">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Skeleton key={i} height={44} className="rounded-lg" />
          ))}
        </nav>
      </aside>

      {/* Main Content Skeleton */}
      <main className="flex-1 h-full bg-[#181818]/40 backdrop-blur-2xl rounded-2xl p-3 sm:p-4 md:p-5 lg:p-6 xl:p-8 overflow-y-auto">
        <div className="flex items-center gap-3 mb-4 sm:mb-6 lg:mb-8">
          <Skeleton width={24} height={24} />
          <Skeleton width={150} height={24} />
        </div>

        <section className="space-y-4 sm:space-y-6 md:space-y-8 max-w-2xl">
          <div>
            <Skeleton width={200} height={24} className="mb-4" />
            <div className="grid gap-3 sm:gap-5 md:gap-5">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton width={120} height={16} />
                  <Skeleton height={48} className="rounded-lg" />
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end pt-2 sm:pt-4">
            <Skeleton width={120} height={48} className="rounded-lg" />
          </div>
        </section>
      </main>
    </div>
  </div>
);

export default {
  ProfileSkeleton,
  PostSkeleton,
  ProfilePageSkeleton,
  SettingsSkeleton
};
