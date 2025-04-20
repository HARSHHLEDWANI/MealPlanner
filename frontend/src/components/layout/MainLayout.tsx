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
  X 
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
    { to: '/dashboard', label: 'Dashboard', icon: <Home size={18} /> },
    { to: '/ingredient-search', label: 'Ingredient Search', icon: <Search size={18} /> },
    { to: '/image-recognition', label: 'Snap & Cook', icon: <Camera size={18} /> },
    { to: '/meal-planner', label: 'Meal Planner', icon: <Calendar size={18} /> },
    { to: '/grocery-list', label: 'Grocery List', icon: <ShoppingCart size={18} /> },
    { to: '/leftover-magic', label: 'Leftover Magic', icon: <Sparkles size={18} /> },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      {/* Top Navigation Bar */}
      <header className="bg-white shadow-sm py-4 px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          {/* Logo and title */}
          <div className="flex items-center space-x-2">
            <Utensils className="h-6 w-6 text-primary-500" />
            <span className="font-semibold text-xl text-primary-600">Pantry Chef</span>
          </div>
          
          {/* Mobile menu button */}
          <button 
            className="lg:hidden p-2 rounded-md focus:outline-none"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          
          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-4">
            {menuItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  isActive 
                    ? "flex items-center px-3 py-2 rounded-md bg-primary-50 text-primary-600" 
                    : "flex items-center px-3 py-2 rounded-md hover:bg-gray-100 text-gray-700"
                }
              >
                {item.icon}
                <span className="ml-2">{item.label}</span>
              </NavLink>
            ))}
          </nav>
          
          {/* User menu */}
          <div className="hidden lg:flex items-center">
            <div className="px-3 py-2 rounded-md bg-neutral-100 flex items-center">
              <User size={18} className="text-gray-700 mr-2" />
              <span className="text-sm font-medium text-gray-800">
                {user?.email || user?.phone || 'User'}
              </span>
            </div>
            <button 
              onClick={handleLogout}
              className="ml-4 px-3 py-2 rounded-md hover:bg-gray-100 text-gray-700"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      
      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white shadow-md z-20 absolute top-16 left-0 right-0 animate-slide-up">
          <nav className="flex flex-col p-4">
            {menuItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  isActive 
                    ? "flex items-center px-3 py-3 rounded-md bg-primary-50 text-primary-600 mb-1" 
                    : "flex items-center px-3 py-3 rounded-md hover:bg-gray-100 text-gray-700 mb-1"
                }
              >
                {item.icon}
                <span className="ml-2">{item.label}</span>
              </NavLink>
            ))}
            <div className="border-t border-gray-200 my-2 pt-2">
              <div className="px-3 py-2 rounded-md bg-neutral-100 flex items-center mb-2">
                <User size={18} className="text-gray-700 mr-2" />
                <span className="text-sm font-medium text-gray-800">
                  {user?.email || user?.phone || 'User'}
                </span>
              </div>
              <button 
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 text-gray-700"
              >
                Logout
              </button>
            </div>
          </nav>
        </div>
      )}
      
      {/* Main Content */}
      <main className="flex-grow p-4 md:p-6 max-w-7xl mx-auto w-full">
        <Outlet />
      </main>
      
      {/* Footer */}
      <footer className="bg-white shadow-sm py-4 px-6 mt-auto">
        <div className="max-w-7xl mx-auto text-center text-sm text-gray-500">
          <p>&copy; 2025 Pantry Chef. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;