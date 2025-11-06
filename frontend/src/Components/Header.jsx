import React, { useState, useEffect } from 'react'
import {Head,assert, ProfileData} from '../utils/assest'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useUser } from '../Context/UserContext'
import DefaultAvatar from './DefaultAvatar'

const Header = ({ searchQuery, setSearchQuery }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { user, loading: userLoading } = useUser();
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className='w-full h-16 sm:h-20 flex flex-row justify-between items-center px-3 sm:px-4 sticky top-0 z-50 bg-gradient-to-r from-zinc-900 to-slate-900 backdrop-blur-md'>
        <div className='flex justify-between items-center gap-2 sm:gap-3 w-full sm:w-80 p-2 sm:p-3'>
           <img onClick={()=> navigate('/home')} src={assert.Logo} alt={assert.Logo} className='size-8 sm:size-10 cursor-pointer'/>

           {/* Search Input - Hidden on mobile, visible on larger screens */}
           <input
      type='text'
      placeholder={t('header.explore')}
      value={searchQuery}
      onClick={()=>navigate('/home')}
      onChange={e => {
        setSearchQuery(e.target.value);
       }
      }
      className='hidden sm:block bg-gray-800 rounded-md p-2 w-full max-w-xs placeholder:font-extrabold placeholder:text-white text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm sm:text-base'
    />

           {/* Mobile search button */}
           <button
      onClick={() => setIsSearchOpen(!isSearchOpen)}
      className='sm:hidden p-2 text-white hover:text-yellow-400'
    >
      <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' />
      </svg>
    </button>
        </div>
        {/* Desktop Navigation */}
        <div className='hidden sm:flex flex-row justify-center gap-x-6 sm:gap-x-8 lg:gap-x-15 items-center'>
            {Head.map(h => {
              let linkPath = '/';
              const loggedInUserId = user?._id;
              
              if (h.name.toLowerCase() === 'home') linkPath = '/home';
              else if (h.name.toLowerCase() === 'profile') linkPath = loggedInUserId ? `/profile/${loggedInUserId}` : '/home';
              else if (h.name.toLowerCase() === 'chat') linkPath = '/chat';
              else if (h.name.toLowerCase() === 'setting') linkPath = '/setting';

              return (
                <ul key={h.id}>
                  <li className="relative group flex flex-col items-center" title={t(`header.${h.name.toLowerCase()}`)}>
                    <Link to={linkPath}>
                      <img
                        src={h.icon}
                        alt={t(`header.${h.name.toLowerCase()}`)}
                        className="w-5 h-5 sm:w-6 sm:h-6 hover:mix-blend-overlay hover:scale-105 hover:-translate-y-3 transition-all duration-150 ease-in-out"/>
                      <span className="absolute top-5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-150 ease-in-out text-white text-lg">
                        •
                      </span>
                    </Link>
                  </li>
                </ul>
              );
            })}
        </div>

        {/* Mobile Navigation */}
        <div className='sm:hidden flex flex-row justify-around items-center w-full absolute bottom-0 left-0 bg-gradient-to-r from-zinc-900 to-slate-900 border-t border-gray-700 py-2'>
          {Head.map(h => {
            let linkPath = '/';
            const loggedInUserId = user?._id;
            
            if (h.name.toLowerCase() === 'home') linkPath = '/home';
            else if (h.name.toLowerCase() === 'profile') linkPath = loggedInUserId ? `/profile/${loggedInUserId}` : '/home';
            else if (h.name.toLowerCase() === 'chat') linkPath = '/chat';
            else if (h.name.toLowerCase() === 'setting') linkPath = '/setting';

            return (
              <Link key={h.id} to={linkPath} className='text-white hover:text-yellow-400 flex flex-col items-center gap-1'>
                <img src={h.icon} alt={t(`header.${h.name.toLowerCase()}`)} className="w-6 h-6"/>
              </Link>
            );
          })}
        </div>
        {isSearchOpen && (
          <div className="sm:hidden absolute top-16 left-0 right-0 bg-gradient-to-r from-zinc-900 to-slate-900 backdrop-blur-md border-t border-gray-700 p-2">
            <input
              type='text'
              placeholder={t('header.explore')}
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
              }}
              className='bg-gray-800 rounded-md p-2 w-full placeholder:font-extrabold placeholder:text-white text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm'
            />
          </div>
        )}
    </div>
  );
};

export default Header;
