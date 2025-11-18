import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google'
import {assert} from '../utils/assest'
import { useUser } from '../Context/UserContext'
import { useSocket } from '../Context/SocketContext'
import { useTranslation } from 'react-i18next'
import api from '../utils/axios'

const LoginPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { login, refreshUser } = useUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

 const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError('');

  try {
    const response = await api.post('/user/login', {
      email,
      password,
    });
    if (response.data.success) {
      const { token } = response.data;
      document.cookie = `token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Strict`;
      await refreshUser();
      navigate('/home');
    } else {
      setError(response.data.message || 'Invalid Login Credentials');
    }
  } catch (err) {
    if (!err.response) {
      setError('Server not responding. Try again later.');
    } else {
      setError(err.response?.data?.message || 'Invalid Login Credentials');
    }
  } finally {
    setLoading(false);
  }
 }

  return (
    <div className="bg-gradient-to-r from-zinc-900 to-slate-900 min-h-screen w-full relative">
      <div className='bg-amber-100 animate-pulse h-20 w-20 sm:h-30 sm:w-30 rounded-b-full absolute blur-3xl '></div>
      <div className='bg-blue-950 h-40 w-40 sm:h-50 sm:w-50 rounded-full absolute bottom-20 right-0 blur-lg animate-bounce'></div>
      {/* Logo */}
      <div className="relative flex justify-start items-center gap-2 mb-4 sm:mb-6 p-4 sm:p-5">
          <img src={assert.Logo} alt="logo" className="w-8 h-8 sm:w-10 sm:h-10" />
          <span className="font-bold text-base sm:text-lg text-white">SN Link</span>
        </div>
      <div className="relative p-4 sm:p-8 flex justify-center items-center w-full min-h-screen text-white">
        <div className='flex flex-col justify-center gap-4 sm:gap-6 lg:gap-10 w-full max-w-md mx-auto px-2 sm:px-4'>

        {/* Title */}
        <h2 className="text-lg sm:text-xl font-semibold text-center mb-4 sm:mb-6">
          {t('login.welcomeBack')}
        </h2>

        {/* Form */}
        <form className="flex flex-col gap-3 sm:gap-4 lg:gap-6" onSubmit={handleSubmit}>
          <div className="flex flex-col">
            <label className="mb-2 text-sm sm:text-base">{t('login.email')}</label>
            <input
              type="email"
              placeholder={t('login.usernameOrEmail')}
              className="p-3 sm:p-4 rounded-lg bg-transparent border border-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm sm:text-base"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col">
            <label className="mb-2 text-sm sm:text-base">{t('login.password')}</label>
            <input
              type="password"
              placeholder={t('login.yourPassword')}
              className="p-3 sm:p-4 rounded-lg bg-transparent border border-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm sm:text-base"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-0 text-xs sm:text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="accent-yellow-400 w-4 h-4" />
              {t('login.rememberMe')}
            </label>
            <p className="text-yellow-400 cursor-pointer hover:underline">
              {t('login.forgotPassword')}
            </p>
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-3 sm:gap-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-yellow-400 text-black font-semibold py-3 sm:py-4 rounded-lg hover:bg-yellow-500 transition text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing In...' : (
                <>
                  <img className='size-4 sm:size-5 pb-0.5 mr-2 inline' src={assert.Login} alt={assert.Login}/>
                  {t('login.signIn')}
                </>
              )}
            </button>

            <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
              <GoogleLogin
                onSuccess={async (credentialResponse) => {
                  try {
                    await login(null, null, credentialResponse.credential);
                    navigate('/home');
                  } catch (err) {
                    setError(err.message || 'Google authentication failed');
                  }
                }}
                onError={() => {
                  setError('Google authentication failed');
                }}
                theme="filled_black"
                size="large"
                text="signin_with"
                shape="rectangular"
              />
            </GoogleOAuthProvider>
          </div>
        </form>

        {/* Footer */}
        <p className="text-xs text-center text-gray-400 mt-4 sm:mt-6">
          {t('login.dontHaveAccount')} <span className="text-yellow-400 cursor-pointer hover:underline" onClick={() => navigate('/signup')}>{t('login.signUp')}</span>
        </p>
        <p className="text-xs text-center text-gray-400 mt-2">
          Copyright @ {new Date().getFullYear()}
        </p>
      </div>
      </div>
      {/* <div className='w-full place-content-center'>
        <img src={assert.Login} alt={assert.Login} className='size-150' />
      </div> */}
    </div>
  )
}

export default LoginPage
