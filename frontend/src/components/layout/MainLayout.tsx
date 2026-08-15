import { useEffect, useState } from 'react';
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
  LogOut,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/cn';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: Home },
  { to: '/recipe-finder', label: 'Recipe Finder', icon: Search },
  { to: '/image-recognition', label: 'Snap & Cook', icon: Camera },
  { to: '/meal-planner', label: 'Meal Planner', icon: Calendar },
  { to: '/grocery-list', label: 'Grocery List', icon: ShoppingCart },
  { to: '/leftover-magic', label: 'Leftover Magic', icon: Sparkles },
];

const MainLayout = () => {
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Escape closes the drawer, matching every other overlay convention.
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileMenuOpen]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
      // Labels must not wrap: at the breakpoint where the nav first appears
      // there is just enough room, and wrapping doubles the header height.
      'whitespace-nowrap',
      isActive
        ? 'bg-primary-50 text-primary-700'
        : 'text-neutral-700 hover:bg-neutral-100'
    );

  const accountLabel = user?.email ?? 'Account';

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      <header className="bg-white sticky top-0 z-40 border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 gap-4">
            <NavLink to="/dashboard" className="flex items-center gap-2.5 shrink-0">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary-600">
                <Utensils className="h-5 w-5 text-white" aria-hidden />
              </div>
              <span className="font-display font-bold text-lg text-primary-900 hidden sm:inline">
                Pantry Chef
              </span>
            </NavLink>

            {/* The full nav needs a lot of horizontal room; below xl it moves
                into the drawer rather than wrapping or overflowing. */}
            <nav className="hidden xl:flex items-center gap-1" aria-label="Main">
              {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} className={navLinkClass}>
                  <Icon size={18} aria-hidden />
                  <span className="text-sm">{label}</span>
                </NavLink>
              ))}
            </nav>

            <div className="hidden xl:flex items-center gap-2 shrink-0">
              {/* The address only appears once there is genuinely room for it;
                  between xl and 2xl the nav needs that width. */}
              <div className="hidden 2xl:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-100 max-w-[200px]">
                <User size={15} className="text-neutral-500 shrink-0" aria-hidden />
                <span className="text-sm text-neutral-700 truncate">{accountLabel}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-neutral-700 hover:bg-neutral-100 font-medium text-sm transition-colors"
              >
                <LogOut size={17} aria-hidden />
                Sign out
              </button>
            </div>

            <button
              className="xl:hidden p-2 rounded-lg hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="xl:hidden border-t border-neutral-200 bg-white animate-slide-up">
            <nav className="flex flex-col p-3 gap-1" aria-label="Main">
              {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  // Closed here rather than in an effect on the pathname: the
                  // click is the actual cause, and an effect would also fire
                  // on unrelated route changes.
                  onClick={() => setMobileMenuOpen(false)}
                  className={navLinkClass}
                >
                  <Icon size={19} aria-hidden />
                  {label}
                </NavLink>
              ))}

              <div className="border-t border-neutral-200 mt-2 pt-2">
                <div className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-600">
                  <User size={15} className="shrink-0" aria-hidden />
                  <span className="truncate">{accountLabel}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-neutral-700 hover:bg-neutral-100 font-medium"
                >
                  <LogOut size={18} aria-hidden />
                  Sign out
                </button>
              </div>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Outlet />
      </main>

      <footer className="bg-white border-t border-neutral-200 py-6 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Utensils className="h-4 w-4 text-primary-600" aria-hidden />
            <span className="font-display font-semibold text-neutral-700">Pantry Chef</span>
          </div>
          <p className="text-sm text-neutral-500">
            &copy; {new Date().getFullYear()} Pantry Chef
          </p>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;
