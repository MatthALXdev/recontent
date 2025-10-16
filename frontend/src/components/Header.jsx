import { Link, useLocation } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

export default function Header() {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <header className="glass border-b sticky top-0 z-50 animate-slide-down">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo avec gradient */}
          <Link
            to="/"
            className="flex items-center gap-3 group"
          >
            <div className="gradient-primary p-2 rounded-lg transform transition-all duration-200 group-hover:scale-110 group-hover:rotate-3">
              <Sparkles size={24} className="text-white" />
            </div>
            <span className="text-xl font-bold hidden sm:inline gradient-text">
              ReContent.dev
            </span>
          </Link>

          {/* Navigation */}
          <nav className="flex gap-2 sm:gap-4">
            <Link
              to="/"
              className={`px-4 py-2 rounded-lg text-sm sm:text-base font-medium transition-all duration-200 ${
                isActive('/')
                  ? 'bg-primary-500/10 text-primary-400 border border-primary-500/50'
                  : 'text-gray-300 hover:text-white hover:bg-dark-700'
              }`}
            >
              Home
            </Link>
            <Link
              to="/profile"
              className={`px-4 py-2 rounded-lg text-sm sm:text-base font-medium transition-all duration-200 ${
                isActive('/profile')
                  ? 'bg-primary-500/10 text-primary-400 border border-primary-500/50'
                  : 'text-gray-300 hover:text-white hover:bg-dark-700'
              }`}
            >
              Profile
            </Link>
            <Link
              to="/history"
              className={`px-4 py-2 rounded-lg text-sm sm:text-base font-medium transition-all duration-200 ${
                isActive('/history')
                  ? 'bg-primary-500/10 text-primary-400 border border-primary-500/50'
                  : 'text-gray-300 hover:text-white hover:bg-dark-700'
              }`}
            >
              History
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
