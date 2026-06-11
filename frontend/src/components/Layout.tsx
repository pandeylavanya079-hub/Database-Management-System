import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  TrendingUp, 
  Users, 
  Contact, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Truck, 
  IndianRupee, 
  PieChart, 
  UserCog, 
  LogOut, 
  Menu, 
  X, 
  Sun, 
  Moon,
  Receipt
} from 'lucide-react';

export const Layout: React.FC = () => {
  const { user, logout, hasRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['Admin', 'Manager', 'Staff'] },
    { name: 'Milk Purchases', path: '/purchases', icon: ShoppingCart, roles: ['Admin', 'Manager', 'Staff'] },
    { name: 'Milk Sales', path: '/sales', icon: TrendingUp, roles: ['Admin', 'Manager', 'Staff'] },
    { name: 'Customers', path: '/customers', icon: Users, roles: ['Admin', 'Manager', 'Staff'] },
    { name: 'Suppliers', path: '/suppliers', icon: Contact, roles: ['Admin', 'Manager', 'Staff'] },
    { name: 'Receivables', path: '/receivables', icon: ArrowDownLeft, roles: ['Admin', 'Manager'] },
    { name: 'Billing & Invoices', path: '/billing', icon: Receipt, roles: ['Admin', 'Manager'] },
    { name: 'Payables', path: '/payables', icon: ArrowUpRight, roles: ['Admin', 'Manager'] },
    { name: 'Truck Logistics', path: '/logistics', icon: Truck, roles: ['Admin', 'Manager', 'Staff'] },
    { name: 'Expenses', path: '/expenses', icon: IndianRupee, roles: ['Admin'] },
    { name: 'Profit & Loss', path: '/reports', icon: PieChart, roles: ['Admin'] },
    { name: 'User Management', path: '/users', icon: UserCog, roles: ['Admin'] },
  ];

  const activeItem = navItems.find(item => item.path === location.pathname);

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-200">
        {/* Brand Title */}
        <div className="h-16 flex items-center px-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-dairy-600 to-teal-500">
          <div className="flex items-center space-x-2 text-white">
            <img src="/logo.png" alt="Pitambara Dairy Logo" className="w-9 h-9 object-contain bg-white rounded-full p-0.5" />
            <div className="font-extrabold tracking-tight text-sm uppercase leading-tight">
              PITAMBARA <br />
              <span className="text-cream-100 font-semibold tracking-normal text-xs capitalize">Doodh Dairy DMS</span>
            </div>
          </div>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto no-scrollbar">
          {navItems.map((item) => {
            if (item.roles && !item.roles.includes(user?.role || '')) return null;
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-dairy-500 text-white shadow-md shadow-dairy-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User Status Bar */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-dairy-100 dark:bg-dairy-950 flex items-center justify-center font-bold text-dairy-700 dark:text-dairy-300">
              {user?.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-slate-800 dark:text-slate-200">{user?.name}</p>
              <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-dairy-100 dark:bg-dairy-900 text-dairy-700 dark:text-dairy-300 uppercase">
                {user?.role}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-4 py-2 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 text-sm font-semibold border border-transparent hover:border-red-100 dark:hover:border-red-900/30 transition-all duration-150"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-200 z-10">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white capitalize">
              {activeItem ? activeItem.name : 'System'}
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors duration-150"
              title="Toggle Theme"
            >
              {darkMode ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Display Role Badge for Quick Operations */}
            <div className="hidden sm:block text-right">
              <span className="inline-block text-[11px] font-bold tracking-wider px-2.5 py-1 rounded-md bg-dairy-50 dark:bg-dairy-950 border border-dairy-200/50 dark:border-dairy-900 text-dairy-700 dark:text-dairy-300 uppercase">
                {user?.role} Portal
              </span>
            </div>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            {/* Overlay */}
            <div 
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            {/* Drawer */}
            <div className="relative flex flex-col w-64 max-w-xs bg-white dark:bg-slate-900 h-full shadow-2xl transition-transform duration-300">
              <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-dairy-600 to-teal-500">
                <div className="flex items-center space-x-2 text-white">
                  <img src="/logo.png" alt="Pitambara Dairy Logo" className="w-8 h-8 object-contain bg-white rounded-full p-0.5" />
                  <span className="font-extrabold tracking-tight text-sm uppercase">PITAMBARA</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-full text-white/80 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto no-scrollbar">
                {navItems.map((item) => {
                  if (item.roles && !item.roles.includes(user?.role || '')) return null;
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                        isActive
                          ? 'bg-dairy-500 text-white shadow-md shadow-dairy-500/20'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>

              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">LOGGED IN AS</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{user?.name}</p>
                <p className="text-xs text-slate-400 mb-3">{user?.email}</p>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center px-4 py-2 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 text-sm font-semibold border border-transparent hover:border-red-100 dark:hover:border-red-900/30 transition-all duration-150"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content Outlet */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
