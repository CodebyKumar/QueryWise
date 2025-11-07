import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../utils/constants';

export function Header() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = () => {
    logout();
    navigate(ROUTES.HOME);
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 backdrop-blur-sm bg-white/95">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div 
            className="flex items-center gap-3 cursor-pointer group" 
            onClick={() => navigate(ROUTES.HOME)}
          >
            <div className="relative">
              <img 
                src="/logo.svg" 
                alt="DocuMind Logo" 
                className="w-10 h-10 transition-transform group-hover:scale-110"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight">
                <span className="text-gray-900">Docu</span>
                <span className="text-orange-500">Mind</span>
              </span>
              <span className="text-xs text-gray-500 -mt-1">
                AI Document Assistant
              </span>
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
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    Chat
                  </div>
                </button>
                
                <button 
                  onClick={() => navigate(ROUTES.DOCUMENTS_LIST)} 
                  className="px-4 py-2 text-gray-700 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all font-medium"
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Documents
                  </div>
                </button>

                {/* User Menu */}
                <div className="relative ml-2">
                  <button 
                    onClick={() => setShowMenu(!showMenu)}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg transition-all"
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-sm">
                      <span className="text-white font-semibold text-sm">
                        {user?.username?.[0]?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div className="hidden lg:block text-left">
                      <p className="text-sm font-medium text-gray-900">{user?.username}</p>
                      <p className="text-xs text-gray-500">Account</p>
                    </div>
                    <svg 
                      className={`w-4 h-4 text-gray-500 transition-transform ${showMenu ? 'rotate-180' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {showMenu && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setShowMenu(false)}
                      />
                      <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg py-2 z-20">
                        <div className="px-4 py-3 border-b border-gray-100">
                          <p className="text-sm font-semibold text-gray-900">{user?.username}</p>
                          <p className="text-xs text-gray-500 mt-1">{user?.email || 'No email'}</p>
                        </div>
                        
                        <button 
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Sign Out
                        </button>
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
                  className="px-6 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 font-medium shadow-sm hover:shadow transition-all"
                >
                  Get Started
                </button>
              </>
            )}
          </nav>

          {/* Mobile menu button */}
          <button className="md:hidden p-2 text-gray-600 hover:text-gray-900">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
