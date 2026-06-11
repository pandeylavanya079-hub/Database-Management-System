import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  IndianRupee, 
  PieChart, 
  HelpCircle,
  FileCheck2,
  CalendarRange
} from 'lucide-react';
import { 
  Cell, 
  PieChart as RePieChart, 
  Pie, 
  ResponsiveContainer, 
  Tooltip, 
  Legend 
} from 'recharts';

interface Expense {
  _id: string;
  date: string;
  expenseType: 'Fuel' | 'Salary' | 'Transport' | 'Maintenance' | 'Electricity' | 'Miscellaneous';
  amount: number;
  description: string;
}

const COLORS = ['#14b8a6', '#0d9488', '#0f766e', '#0284c7', '#f59e0b', '#ef4444'];

export const Expenses: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [breakdown, setBreakdown] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [expenseTypeFilter, setExpenseTypeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    expenseType: 'Miscellaneous',
    amount: '',
    description: '',
    date: new Date().toISOString().substring(0, 10),
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (expenseTypeFilter) params.expenseType = expenseTypeFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const [expResp, analysisResp] = await Promise.all([
        api.get('/expenses', { params }),
        api.get('/expenses/analysis')
      ]);

      setExpenses(expResp.data);
      setBreakdown(analysisResp.data.breakdown);
    } catch (err) {
      console.error('Error loading expenses data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [expenseTypeFilter, startDate, endDate]);

  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormData({
      expenseType: 'Miscellaneous',
      amount: '',
      description: '',
      date: new Date().toISOString().substring(0, 10),
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (e: Expense) => {
    setEditingId(e._id);
    setFormData({
      expenseType: e.expenseType,
      amount: String(e.amount),
      description: e.description,
      date: new Date(e.date).toISOString().substring(0, 10),
    });
    setModalOpen(true);
  };

  const handleFormSubmit = async (evt: React.FormEvent) => {
    evt.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        amount: Number(formData.amount),
      };

      if (editingId) {
        await api.put(`/expenses/${editingId}`, payload);
      } else {
        await api.post('/expenses', payload);
      }
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      alert('Error saving expense log: ' + (err.response?.data?.message || 'Error occurred'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this expense record?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      loadData();
    } catch (err) {
      alert('Error deleting expense');
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
  };

  // Format Recharts data structure
  const pieData = breakdown.map(item => ({
    name: item._id,
    value: item.totalAmount
  }));

  const totalExpenseSum = expenses.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner stats */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-100/50 dark:border-amber-900/30 rounded-2xl flex items-center space-x-3 w-full sm:w-auto">
          <IndianRupee className="w-10 h-10 text-amber-600 dark:text-amber-400 shrink-0" />
          <div>
            <p className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">Filtered Expenses Sum</p>
            <h3 className="text-xl font-extrabold text-amber-600 dark:text-amber-400">{formatCurrency(totalExpenseSum)}</h3>
          </div>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center px-4 py-2.5 bg-dairy-500 hover:bg-dairy-600 text-white font-semibold rounded-2xl shadow-lg shadow-dairy-500/20 transition-all duration-150 text-sm w-full sm:w-auto justify-center"
        >
          <Plus className="w-5 h-5 mr-1" /> Log Expense Invoice
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Filters and List */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-bold text-sm text-slate-800 dark:text-white">Filter Parameters</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Expense Type</label>
              <select
                value={expenseTypeFilter}
                onChange={(e) => setExpenseTypeFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl text-xs outline-none"
              >
                <option value="">All Categories</option>
                <option value="Fuel">Fuel</option>
                <option value="Salary">Salary</option>
                <option value="Transport">Transport</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Electricity">Electricity</option>
                <option value="Miscellaneous">Miscellaneous</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl text-xs outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl text-xs outline-none"
              />
            </div>
          </div>

          {/* Expenses Table */}
          <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden mt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Options</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-slate-400">Loading expense sheets...</td>
                    </tr>
                  ) : expenses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-slate-400">No expense records found.</td>
                    </tr>
                  ) : (
                    expenses.map((e) => (
                      <tr key={e._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                        <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                          {new Date(e.date).toLocaleDateString('en-IN')}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-block px-2 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wide bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350">
                            {e.expenseType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-650 dark:text-slate-400 max-w-[150px] truncate" title={e.description}>
                          {e.description}
                        </td>
                        <td className="px-4 py-3 font-extrabold text-slate-800 dark:text-slate-100">{formatCurrency(e.amount)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-2">
                            <button
                              disabled={!isAdmin}
                              onClick={() => handleOpenEditModal(e)}
                              className="p-1 text-slate-400 hover:text-dairy-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 rounded-md transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              disabled={!isAdmin}
                              onClick={() => handleDelete(e._id)}
                              className="p-1 text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 rounded-md transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Categorized Breakdown Pie Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl flex flex-col justify-between">
          <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
            <PieChart className="w-4 h-4 text-dairy-500" />
            <h3 className="font-bold text-sm text-slate-800 dark:text-white">Expenses Share (%)</h3>
          </div>

          <div className="h-64 w-full flex-1">
            {pieData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">No share data available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCurrency(value)} />
                  <Legend layout="horizontal" align="center" verticalAlign="bottom" iconSize={8} iconType="circle" />
                </RePieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Expense form modal Dialog */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 rounded-3xl shadow-2xl relative">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              {editingId ? 'Edit Expense Record' : 'Record Expense Invoice'}
            </h3>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Category</label>
                  <select
                    value={formData.expenseType}
                    onChange={(e) => setFormData({ ...formData, expenseType: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none"
                  >
                    <option value="Fuel">Fuel</option>
                    <option value="Salary">Salary</option>
                    <option value="Transport">Transport</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Electricity">Electricity</option>
                    <option value="Miscellaneous">Miscellaneous</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Invoice Date</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Amount Paid (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="e.g. 1500"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none font-extrabold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Description</label>
                <textarea
                  required
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. Purchased generator diesel fuel (50 Liters)"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-400 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-dairy-500 hover:bg-dairy-600 text-white font-bold rounded-xl shadow-lg shadow-dairy-500/20"
                >
                  {submitting ? 'Saving...' : 'Save Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;
