import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { 
  Scale, 
  Droplet, 
  Users, 
  Contact, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle,
  FileCheck2,
  Calendar
} from 'lucide-react';

interface Stats {
  isDemoMode?: boolean;
  todayPurchasedLiters: number;
  todaySoldLiters: number;
  totalCustomers: number;
  totalSuppliers: number;
  collectionTrend: Array<{ _id: string; quantity: number }>;
  distributionTrend: Array<{ _id: string; quantity: number }>;
  todayPurchasedCost?: number;
  todaySoldRevenue?: number;
  totalReceivables?: number;
  totalPayables?: number;
  monthlyExpenses?: number;
  mtdRevenue?: number;
  mtdNetProfit?: number;
  duePaymentsCount?: number;
  remindersSentToday?: number;
  overdueCustomerCount?: number;
}

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const response = await api.get('/dashboard/stats');
        setStats(response.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load dashboard metrics');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-10 h-10 border-4 border-dairy-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 p-6 rounded-2xl flex items-start text-red-700 dark:text-red-300">
        <AlertCircle className="w-5 h-5 mr-3 shrink-0" />
        <p>{error || 'An unexpected error occurred while fetching analytics.'}</p>
      </div>
    );
  }

  // Merge collection and distribution trends into a single chart datasource
  const trendMap: { [key: string]: { date: string; purchased: number; sold: number } } = {};
  
  stats.collectionTrend.forEach((item) => {
    trendMap[item._id] = { date: item._id, purchased: item.quantity, sold: 0 };
  });
  
  stats.distributionTrend.forEach((item) => {
    if (trendMap[item._id]) {
      trendMap[item._id].sold = item.quantity;
    } else {
      trendMap[item._id] = { date: item._id, purchased: 0, sold: item.quantity };
    }
  });

  const chartData = Object.values(trendMap).sort((a, b) => a.date.localeCompare(b.date));

  // Format currencies
  const formatCurrency = (val?: number) => {
    if (val === undefined) return '₹0';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Offline Demo Fallback warning */}
      {stats.isDemoMode && (
        <div className="flex items-center p-4 bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 rounded-3xl">
          <AlertCircle className="w-5 h-5 mr-3 text-amber-500 animate-pulse shrink-0" />
          <div>
            <p className="text-xs sm:text-sm font-bold">Running in Offline Demo Mode</p>
            <p className="text-[10px] sm:text-xs text-amber-600/80 dark:text-amber-400/85 mt-0.5">
              MongoDB server is currently offline. DMS transactions, client registries, and charts are running in-memory fallback.
            </p>
          </div>
        </div>
      )}

      {/* Greetings bar */}
      <div className="bg-gradient-to-r from-dairy-600 to-teal-500 rounded-3xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/3 pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <span className="inline-block text-xs font-bold bg-white/20 px-3 py-1 rounded-full uppercase tracking-wider">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold font-sans">
            Welcome Back, {user?.name}!
          </h2>
          <p className="text-white/80 text-sm max-w-xl leading-relaxed">
            Pitambara Doodh Dairy DMS dashboard. You have active <strong>{user?.role}</strong> level operational and security authorization.
          </p>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Purchased Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Today's Milk Intake</p>
              <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white mt-2">
                {stats.todayPurchasedLiters.toLocaleString()} L
              </h3>
              {isAdmin && (
                <p className="text-xs text-slate-400 mt-1">Cost: {formatCurrency(stats.todayPurchasedCost)}</p>
              )}
            </div>
            <div className="w-12 h-12 rounded-2xl bg-dairy-50 dark:bg-dairy-950 flex items-center justify-center text-dairy-600 dark:text-dairy-400">
              <Droplet className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Sold Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Today's Distribution</p>
              <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white mt-2">
                {stats.todaySoldLiters.toLocaleString()} L
              </h3>
              {isAdmin && (
                <p className="text-xs text-slate-400 mt-1">Revenue: {formatCurrency(stats.todaySoldRevenue)}</p>
              )}
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Scale className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Suppliers Count */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Suppliers</p>
              <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white mt-2">
                {stats.totalSuppliers}
              </h3>
              <p className="text-xs text-slate-400 mt-1">Vendors registry</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950 flex items-center justify-center text-sky-600 dark:text-sky-400">
              <Contact className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Customers Count */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Customers</p>
              <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white mt-2">
                {stats.totalCustomers}
              </h3>
              <p className="text-xs text-slate-400 mt-1">Retail & Wholesale</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Admin-only Financial KPI Cards */}
      {isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Receivables Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Receivables</p>
                <h3 className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">
                  {formatCurrency(stats.totalReceivables)}
                </h3>
                <p className="text-xs text-slate-400 mt-1">Outstanding to collect</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Payables Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Payables</p>
                <h3 className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-2">
                  {formatCurrency(stats.totalPayables)}
                </h3>
                <p className="text-xs text-slate-400 mt-1">Outstanding to suppliers</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <TrendingDown className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Monthly Expenses Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">MTD Expenses</p>
                <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white mt-2">
                  {formatCurrency(stats.monthlyExpenses)}
                </h3>
                <p className="text-xs text-slate-400 mt-1">Monthly business overheads</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <FileCheck2 className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* MTD Profit Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">MTD Net Profit</p>
                <h3 className={`text-2xl font-extrabold mt-2 ${(stats.mtdNetProfit || 0) >= 0 ? 'text-dairy-600 dark:text-dairy-400' : 'text-rose-500'}`}>
                  {formatCurrency(stats.mtdNetProfit)}
                </h3>
                <p className="text-xs text-slate-400 mt-1">Sales - Purchases - Expenses</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-dairy-50 dark:bg-dairy-950 flex items-center justify-center text-dairy-600 dark:text-dairy-400">
                <Calendar className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payments & Reminders Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Customers Owed Balance</p>
              <h3 className="text-2xl font-extrabold text-amber-500 mt-2">
                {stats.duePaymentsCount || 0} Customers
              </h3>
              <p className="text-xs text-slate-400 mt-1">Outstanding active accounts</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center text-amber-500">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overdue Accounts</p>
              <h3 className="text-2xl font-extrabold text-rose-500 mt-2">
                {stats.overdueCustomerCount || 0} Overdue
              </h3>
              <p className="text-xs text-slate-400 mt-1">Invoices past their due date</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center text-rose-500">
              <AlertCircle className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Reminders Sent Today</p>
              <h3 className="text-2xl font-extrabold text-sky-500 mt-2">
                {stats.remindersSentToday || 0} Sent
              </h3>
              <p className="text-xs text-slate-400 mt-1">Notification dispatch count</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/30 flex items-center justify-center text-sky-500">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Graph */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
        <div className="mb-4">
          <h4 className="text-base font-bold text-slate-800 dark:text-white">Daily Channelling Trends (Last 7 Days)</h4>
          <p className="text-xs text-slate-400">Comparing total milk purchased vs distributed quantity in liters.</p>
        </div>
        
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPurchased" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorSold" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '16px', 
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                  border: 'none',
                  backgroundColor: 'rgba(255, 255, 255, 0.95)'
                }}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              <Area 
                name="Purchased Intake" 
                type="monotone" 
                dataKey="purchased" 
                stroke="#14b8a6" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorPurchased)" 
              />
              <Area 
                name="Sold Distribution" 
                type="monotone" 
                dataKey="sold" 
                stroke="#10b981" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorSold)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
