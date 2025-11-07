import React, { useState } from "react";
import ModernNavbar from "../Components/ModernNavbar";
import AccountSlide from "../Components/AccountSlide";
import EnhancedPostSlide from "../Components/EnhancedPostSlide";
import EnhancedFriends from "../Components/EnhancedFriends";

const HomePage = () => {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="bg-gradient-to-r from-zinc-900 to-slate-900 min-h-screen">
      <ModernNavbar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

      {/* Mobile Layout - Only PostSlide */}
      <div className="block lg:hidden">
        <div className="px-3 sm:px-4 py-3 sm:py-4 pt-20 pb-24">
          <EnhancedPostSlide searchQuery={searchQuery} />
        </div>
      </div>

      {/* Desktop Layout - Full 3 column layout */}
      <div className="hidden lg:block">
        <div className="container mx-auto px-4 py-6 pt-24">
          <div className="grid grid-cols-12 gap-6">
            {/* Left Sidebar - Takes 3 columns on desktop */}
            <div className="col-span-3 sticky top-24 self-start">
              <AccountSlide />
            </div>

            {/* Main Content - Takes 6 columns on desktop */}
            <div className="col-span-6">
              <EnhancedPostSlide searchQuery={searchQuery} />
            </div>

            {/* Right Sidebar - Takes 3 columns on desktop */}
            <div className="col-span-3 sticky top-24 self-start">
              <EnhancedFriends searchQuery={searchQuery} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
