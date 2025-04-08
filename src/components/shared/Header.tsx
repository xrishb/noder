import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LuBrainCircuit, LuLogOut, LuUser, LuMenu, LuX } from 'react-icons/lu';
import { useAuth } from '../../contexts/AuthContext';

const Header: React.FC = () => {
  const [scrollY, setScrollY] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isMobileMenuOpen && !target.closest('.mobile-menu') && !target.closest('.mobile-menu-toggle')) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileMenuOpen]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4">
      <div 
        className={`relative transition-all duration-300 ease-in-out ${
          isScrolled ? 'w-[90%] max-w-4xl' : 'w-[80%] max-w-3xl'
        }`}
      >
        {/* Glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-secondary-700/30 to-accent-600/30 rounded-full blur-md opacity-70"></div>
        
        {/* Main header container */}
        <div className="relative bg-[#0A0F1C]/90 backdrop-blur-md border border-secondary-800/40 rounded-full py-2.5 px-4 flex justify-between items-center shadow-lg">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="relative group">
              <div className="absolute inset-0 bg-secondary-600/30 rounded-full blur-md group-hover:bg-secondary-500/50 transition-all duration-300"></div>
              <div className="relative bg-[#0A0F1C] p-1.5 rounded-full border border-secondary-600/30 group-hover:border-secondary-500/50 transition-all duration-300">
                <LuBrainCircuit size={22} className="text-secondary-400 group-hover:scale-110 transition-transform duration-300" />
              </div>
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-secondary-300 via-accent-200 to-primary-300 bg-clip-text text-transparent">
              Noder
            </h1>
          </div>
          
          {/* Mobile menu toggle */}
          <button 
            className="mobile-menu-toggle md:hidden text-white p-1 rounded-full hover:bg-white/10 transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <LuX size={24} /> : <LuMenu size={24} />}
          </button>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-6 items-center">
            <Link to="/" className="text-secondary-200/90 hover:text-secondary-100 transition-all duration-200 hover:text-shadow text-sm font-medium">Home</Link>
            <Link to="/projects" className="text-secondary-200/90 hover:text-secondary-100 transition-all duration-200 hover:text-shadow text-sm font-medium">Projects</Link>
            <Link to="/roadmap" className="text-secondary-200/90 hover:text-secondary-100 transition-all duration-200 hover:text-shadow text-sm font-medium">Roadmap</Link>
            <Link to="/issues" className="text-secondary-200/90 hover:text-secondary-100 transition-all duration-200 hover:text-shadow text-sm font-medium">Issues</Link>
            
            {currentUser ? (
              <div className="relative">
                <button 
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 focus:outline-none"
                >
                  <div className="relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full opacity-70 blur-[1px]"></div>
                    <div className="relative bg-[#0A0F1C] p-1.5 rounded-full border border-primary-500/50">
                      {currentUser.photoURL ? (
                        <img 
                          src={currentUser.photoURL} 
                          alt={currentUser.displayName || 'User'} 
                          className="w-6 h-6 rounded-full"
                        />
                      ) : (
                        <LuUser className="w-5 h-5 text-primary-300" />
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-200 hidden sm:block">
                    {currentUser.displayName || 'User'}
                  </span>
                </button>
                
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-[#0A0F1C] border border-gray-800 rounded-lg shadow-lg py-1 z-50">
                    <div className="px-4 py-2 border-b border-gray-800">
                      <p className="text-sm font-medium text-gray-200">{currentUser.displayName || 'User'}</p>
                      <p className="text-xs text-gray-400 truncate">{currentUser.email}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 flex items-center"
                    >
                      <LuLogOut className="mr-2 text-gray-400" size={14} />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link 
                to="/login" 
                className="px-4 py-1.5 rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 text-white text-sm font-medium hover:shadow-lg hover:shadow-primary-500/20 transition-all duration-300"
              >
                Sign In
              </Link>
            )}
          </nav>
        </div>
        
        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="mobile-menu absolute top-full left-0 right-0 mt-2 bg-[#0A0F1C]/95 backdrop-blur-md border border-secondary-800/40 rounded-xl py-3 px-4 shadow-xl z-50">
            <nav className="flex flex-col space-y-3">
              <Link 
                to="/" 
                className="text-secondary-200/90 hover:text-secondary-100 transition-all duration-200 py-2 px-3 rounded-lg hover:bg-white/5"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Home
              </Link>
              <Link 
                to="/projects" 
                className="text-secondary-200/90 hover:text-secondary-100 transition-all duration-200 py-2 px-3 rounded-lg hover:bg-white/5"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Projects
              </Link>
              <Link 
                to="/roadmap" 
                className="text-secondary-200/90 hover:text-secondary-100 transition-all duration-200 py-2 px-3 rounded-lg hover:bg-white/5"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Roadmap
              </Link>
              <Link 
                to="/issues" 
                className="text-secondary-200/90 hover:text-secondary-100 transition-all duration-200 py-2 px-3 rounded-lg hover:bg-white/5"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Issues
              </Link>
              
              {currentUser ? (
                <>
                  <div className="border-t border-gray-800 my-2"></div>
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium text-gray-200">{currentUser.displayName || 'User'}</p>
                    <p className="text-xs text-gray-400 truncate">{currentUser.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 flex items-center rounded-lg"
                  >
                    <LuLogOut className="mr-2 text-gray-400" size={14} />
                    Sign out
                  </button>
                </>
              ) : (
                <Link 
                  to="/login" 
                  className="mt-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 text-white text-sm font-medium hover:shadow-lg hover:shadow-primary-500/20 transition-all duration-300 text-center"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header; 