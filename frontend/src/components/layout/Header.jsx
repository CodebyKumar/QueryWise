import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../utils/constants";

export function Header() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const handleLogout = () => {
    logout();
    setShowMobileMenu(false);
    navigate(ROUTES.HOME);
  };

  const handleNavigation = (route) => {
    navigate(route);
    setShowMobileMenu(false);
  };

  return (
    <header className="border-b border-gray-200 sticky top-0 z-50 backdrop-blur-sm bg-white/95">
      <div className="max-w-screen-2xl mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => navigate(isAuthenticated ? ROUTES.CHAT : ROUTES.HOME)}
          >
            <div className="flex items-center gap-2">
              <img
                src="/brand-logo.png"
                alt="QueryWise Logo"
                className="h-10 w-auto object-contain"
              />
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <button
                  onClick={() => navigate(ROUTES.CHAT)}
                  className="px-4 py-2 text-gray-700 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all font-medium"
                >
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                      />
                    </svg>
                    Chat
                  </div>
                </button>

                <button
                  onClick={() => navigate(ROUTES.DOCUMENTS_LIST)}
                  className="px-4 py-2 text-gray-700 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all font-medium"
                >
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    Documents
                  </div>
                </button>

                <button
                  onClick={() => navigate(ROUTES.DATABASE_CHAT)}
                  className="px-4 py-2 text-gray-700 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all font-medium"
                >
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
                      />
                    </svg>
                    Database
                  </div>
                </button>

                {/* User Menu */}
                <div className="relative ml-2">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg transition-all"
                  >
                    <div className="w-9 h-9 rounded-full bg-orange-50 flex items-center justify-center">
                      <span className="text-orange-600 font-semibold text-sm">
                        {user?.username?.[0]?.toUpperCase() || "U"}
                      </span>
                    </div>
                    <div className="hidden lg:block text-left">
                      <p className="text-sm font-medium text-gray-900">
                        {user?.username}
                      </p>
                    </div>
                    <svg
                      className={`w-4 h-4 text-gray-500 transition-transform ${showMenu ? "rotate-180" : ""
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

                  {showMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowMenu(false)}
                      />
                      <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-100 rounded-2xl shadow-2xl py-2 z-20 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/30">
                          <p className="text-sm font-bold text-gray-900 leading-none">
                            {user?.username}
                          </p>
                          <p className="text-[11px] text-gray-500 mt-1.5 font-medium truncate">
                            {user?.email || "No email provided"}
                          </p>
                        </div>

                        <div className="p-1.5 space-y-0.5">
                          <button
                            onClick={() => handleNavigation(ROUTES.ACCOUNT)}
                            className="w-full text-left px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-xl flex items-center gap-3 transition-all group"
                          >
                            <div className="p-1.5 bg-gray-50 rounded-lg group-hover:bg-orange-100/50 transition-colors">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </div>
                            Account Settings
                          </button>

                          <button
                            onClick={handleLogout}
                            className="w-full text-left px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl flex items-center gap-3 transition-all group"
                          >
                            <div className="p-1.5 bg-red-50/50 rounded-lg group-hover:bg-red-100/50 transition-colors">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                              </svg>
                            </div>
                            Sign Out
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate(ROUTES.LOGIN)}
                  className="px-5 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigate(ROUTES.SIGNUP)}
                  className="px-6 py-2 bg-linear-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 font-medium shadow-sm hover:shadow transition-all"
                >
                  Get Started
                </button>
              </>
            )}
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="md:hidden p-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            {showMobileMenu ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {showMobileMenu && (
        <>
          <div
            className="fixed inset-0 top-16 bg-gray-900/10 backdrop-blur-xs z-40 md:hidden"
            onClick={() => setShowMobileMenu(false)}
          />
          <div className="absolute top-16 left-0 right-0 bg-white border-b border-gray-100 shadow-xl z-50 md:hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="px-6 py-4 space-y-2">
              {isAuthenticated ? (
                <>
                  {/* User Info */}
                  <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                    <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center">
                      <span className="text-orange-600 font-semibold">
                        {user?.username?.[0]?.toUpperCase() || "U"}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{user?.username}</p>
                      <p className="text-xs text-gray-500">{user?.email || "No email"}</p>
                    </div>
                  </div>

                  {/* Navigation Links */}
                  <button
                    onClick={() => handleNavigation(ROUTES.CHAT)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-lg transition-all font-medium"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    Chat
                  </button>

                  <button
                    onClick={() => handleNavigation(ROUTES.DOCUMENTS_LIST)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-lg transition-all font-medium"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Documents
                  </button>

                  <button
                    onClick={() => handleNavigation(ROUTES.DATABASE_CHAT)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-lg transition-all font-medium"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                    </svg>
                    Database
                  </button>

                  <button
                    onClick={() => handleNavigation(ROUTES.ACCOUNT)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-lg transition-all font-medium"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Account Settings
                  </button>

                  {/* Logout */}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-all font-medium mt-2 border-t border-gray-200 pt-4"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleNavigation(ROUTES.LOGIN)}
                    className="w-full px-5 py-3 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => handleNavigation(ROUTES.SIGNUP)}
                    className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 font-medium shadow-sm hover:shadow transition-all"
                  >
                    Get Started
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </header>
  );
}
