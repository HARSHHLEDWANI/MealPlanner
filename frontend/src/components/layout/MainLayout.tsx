import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { 
  Utensils, 
  Home, 
  Search, 
  Camera, 
  Calendar, 
  ShoppingCart, 
  Sparkles,
  User,
  Menu,
  X,
  LogOut
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const MainLayout: React.FC = () => {
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const menuItems = [
    { to: '/dashboard', label: 'Dashboard', icon: <Home size={20} /> },
    { to: '/recipe-finder', label: 'Recipe Finder', icon: <Search size={20} /> },
    { to: '/image-recognition', label: 'Snap & Cook', icon: <Camera size={20} /> },
    { to: '/meal-planner', label: 'Meal Planner', icon: <Calendar size={20} /> },
    { to: '/grocery-list', label: 'Grocery List', icon: <ShoppingCart size={20} /> },
    { to: '/leftover-magic', label: 'Leftover Magic', icon: <Sparkles size={20} /> },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      {/* Top Navigation Bar */}
      <header className="bg-white shadow-sm sticky top-0 z-50 border-b border-primary-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and title */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary-100">
                <Utensils className="h-6 w-6 text-primary-600" />
              </div>
              <span className="font-display font-semibold text-xl text-primary-700">Pantry Chef</span>
            </div>
            
            {/* Mobile menu button */}
            <button 
              className="lg:hidden p-2 rounded-md hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            
            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-1">
              {menuItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    isActive 
                      ? "flex items-center px-4 py-2 rounded-lg bg-primary-50 text-primary-700 font-medium transition-colors" 
                      : "flex items-center px-4 py-2 rounded-lg hover:bg-primary-50 text-neutral-700 font-medium transition-colors"
                  }
                >
                  {item.icon}
                  <span className="ml-2">{item.label}</span>
                </NavLink>
              ))}
            </nav>
            
            {/* User menu */}
            <div className="hidden lg:flex items-center space-x-4">
              <div className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-primary-50">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-100">
                  <User size={16} className="text-primary-600" />
                </div>
                <span className="text-sm font-medium text-neutral-800">
                  {user?.email || user?.phone || 'User'}
                </span>
              </div>
              <button 
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-primary-50 text-neutral-700 font-medium transition-colors"
              >
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white shadow-lg z-40 animate-slide-up border-b border-primary-100">
          <nav className="flex flex-col p-4 space-y-1">
            {menuItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  isActive 
                    ? "flex items-center px-4 py-3 rounded-lg bg-primary-50 text-primary-700 font-medium" 
                    : "flex items-center px-4 py-3 rounded-lg hover:bg-primary-50 text-neutral-700 font-medium"
                }
              >
                {item.icon}
                <span className="ml-3">{item.label}</span>
              </NavLink>
            ))}
            <div className="border-t border-primary-100 mt-2 pt-2">
              <div className="flex items-center space-x-2 px-4 py-3 rounded-lg bg-primary-50 mb-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-100">
                  <User size={16} className="text-primary-600" />
                </div>
                <span className="text-sm font-medium text-neutral-800">
                  {user?.email || user?.phone || 'User'}
                </span>
              </div>
              <button 
                onClick={handleLogout}
                className="flex items-center space-x-3 w-full px-4 py-3 rounded-lg hover:bg-primary-50 text-neutral-700 font-medium"
              >
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </div>
          </nav>
        </div>
      )}
      
      {/* Main Content */}
      <main className="flex-grow p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        <Outlet />
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t border-primary-100 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="flex items-center space-x-3">
              <Utensils className="h-5 w-5 text-primary-600" />
              <span className="font-display font-semibold text-lg text-primary-700">Pantry Chef</span>
            </div>
            <p className="text-sm text-neutral-500 text-center">
              &copy; {new Date().getFullYear()} Pantry Chef. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;