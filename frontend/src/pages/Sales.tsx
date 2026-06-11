import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Filter, 
  Sparkles,
  Layers,
  CalendarRange
} from 'lucide-react';

interface Sale {
  _id: string;
  saleDate: string;
  customerId: string;
  customerName: string;
  quantity: number;
  fatPercentage: number;
  snfPercentage: number;
  ratePerLiter: number;
  totalAmount: number;
  paymentStatus: 'Paid' | 'Unpaid' | 'Partially Paid';
}

interface Customer {
  _id: string;
  name: string;
  customerType: 'Retail' | 'Wholesale';
}

import { useToast } from '../context/ToastContext';

export const Sales: React.FC = () => {
  const { user } = useAuth();
  const canModify = user?.role === 'Admin';
  const toast = useToast();

  // Core states
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filters state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');

  // Dialog state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    customerId: '',
    quantity: '',
    fatPercentage: '4.2',
    snfPercentage: '8.8',
    ratePerLiter: '55',
    saleDate: new Date().toISOString().substring(0, 10),
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (selectedCustomerId) params.customerId = selectedCustomerId;

      const [salesResp, custResp] = await Promise.all([
        api.get('/sales', { params }),
        api.get('/customers')
      ]);

      setSales(salesResp.data);
      setCustomers(custResp.data);
    } catch (err) {
      console.error('Error loading sales page data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [startDate, endDate, selectedCustomerId]);

  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormData({
      customerId: customers[0]?._id || '',
      quantity: '',
      fatPercentage: '4.2',
      snfPercentage: '8.8',
      ratePerLiter: '55',
      saleDate: new Date().toISOString().substring(0, 10),
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (s: Sale) => {
    setEditingId(s._id);
    setFormData({
      customerId: s.customerId,
      quantity: String(s.quantity),
      fatPercentage: String(s.fatPercentage),
      snfPercentage: String(s.snfPercentage),
      ratePerLiter: String(s.ratePerLiter),
      saleDate: new Date(s.saleDate).toISOString().substring(0, 10),
    });
    setModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        quantity: Number(formData.quantity),
        fatPercentage: Number(formData.fatPercentage),
        snfPercentage: Number(formData.snfPercentage),
        ratePerLiter: Number(formData.ratePerLiter),
      };

      if (editingId) {
        await api.put(`/sales/${editingId}`, payload);
        toast.success('Sales distribution record updated successfully!');
      } else {
        await api.post('/sales', payload);
        toast.success('New sales distribution recorded successfully!');
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      toast.error('Failed to save sales record: ' + ((err as any).response?.data?.message || 'Server error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this sales log? This adjusts customer outstanding balance and removes matching receivables.')) return;
    try {
      await api.delete(`/sales/${id}`);
      toast.success('Sales record deleted successfully.');
      loadData();
    } catch (err) {
      toast.error('Failed to delete sales record.');
    }
  };

  // Helper auto-calculate pricing based on customer type selection
  const handleCustomerChange = (cid: string) => {
    const cust = customers.find(c => c._id === cid);
    const defaultRate = cust?.customerType === 'Wholesale' ? '55' : '62';
    setFormData({
      ...formData,
      customerId: cid,
      ratePerLiter: defaultRate
    });
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
  };

  const totalVolume = sales.reduce((acc, curr) => acc + curr.quantity, 0);
  const totalBilling = sales.reduce((acc, curr) => acc + curr.totalAmount, 0);

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-xs text-slate-400">Track and manage milk distribution and sales billing.</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center px-4 py-2.5 bg-dairy-500 hover:bg-dairy-600 text-white font-semibold rounded-2xl shadow-lg shadow-dairy-500/20 transition-all duration-150 text-sm"
        >
          <Plus className="w-5 h-5 mr-1" /> Add Distribution Entry
        </button>
      </div>

      {/* Grid container: Summaries & Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Filters Panel */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl lg:col-span-2 space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Filter className="w-4 h-4 text-dairy-500" />
            <h3 className="font-bold text-sm text-slate-800 dark:text-white">Filter Distribution Logs</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Customer Name</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl text-xs outline-none"
              >
                <option value="">All Customers</option>
                {customers.map(c => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
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

          {(startDate || endDate || selectedCustomerId) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setSelectedCustomerId('');
              }}
              className="text-xs text-dairy-500 font-semibold hover:underline"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Aggregate metrics */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <h3 className="font-bold text-sm text-slate-800 dark:text-white">Active Range Summary</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-900/30 rounded-2xl">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Distributed</h4>
              <p className="text-lg font-extrabold text-slate-800 dark:text-white mt-1">{totalVolume.toFixed(1)} L</p>
            </div>
            <div className="p-3 bg-dairy-50/50 dark:bg-dairy-950/20 border border-dairy-100/50 dark:border-dairy-900/30 rounded-2xl">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Revenue</h4>
              <p className="text-lg font-extrabold text-slate-800 dark:text-white mt-1">{formatCurrency(totalBilling)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sales Grid Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-4">Delivery Date</th>
                <th className="px-6 py-4">Customer Name</th>
                <th className="px-6 py-4">Quantity</th>
                <th className="px-6 py-4">Fat / SNF</th>
                <th className="px-6 py-4">Rate Per Liter</th>
                <th className="px-6 py-4">Total Amount</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    <div className="w-8 h-8 border-4 border-dairy-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Fetching sales logs...
                  </td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">No sales transactions logged for the criteria.</td>
                </tr>
              ) : (
                sales.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                    <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-200">
                      {new Date(s.saleDate).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-100">{s.customerName}</td>
                    <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{s.quantity} L</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                      {s.fatPercentage.toFixed(1)}% / {s.snfPercentage.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">₹{s.ratePerLiter.toFixed(2)}</td>
                    <td className="px-6 py-4 font-extrabold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(s.totalAmount)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <button
                          disabled={!canModify}
                          onClick={() => handleOpenEditModal(s)}
                          className="p-1.5 text-slate-400 hover:text-dairy-500 disabled:opacity-30 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Edit log"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          disabled={!canModify}
                          onClick={() => handleDelete(s._id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 disabled:opacity-30 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Delete log"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Edit/Add Sales entry Dialog */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg p-6 rounded-3xl shadow-2xl relative">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              {editingId ? 'Edit Distribution Order' : 'Record Milk Delivery'}
            </h3>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Select Customer</label>
                  <select
                    required
                    value={formData.customerId}
                    onChange={(e) => handleCustomerChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none"
                  >
                    {customers.map(c => (
                      <option key={c._id} value={c._id}>{c.name} ({c.customerType})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Delivery Date</label>
                  <input
                    type="date"
                    required
                    value={formData.saleDate}
                    onChange={(e) => setFormData({ ...formData, saleDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Liters Distributed</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder="e.g. 150"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Rate per Liter (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.ratePerLiter}
                    onChange={(e) => setFormData({ ...formData, ratePerLiter: e.target.value })}
                    placeholder="e.g. 55"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Fat Percentage (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.fatPercentage}
                    onChange={(e) => setFormData({ ...formData, fatPercentage: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">SNF Percentage (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.snfPercentage}
                    onChange={(e) => setFormData({ ...formData, snfPercentage: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none"
                  />
                </div>
              </div>

              {/* Display running total */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl flex items-center justify-between border border-slate-100 dark:border-slate-800">
                <span className="font-bold text-slate-500">Invoice Amount:</span>
                <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(Number(formData.quantity || 0) * Number(formData.ratePerLiter || 0))}
                </span>
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
                  {submitting ? 'Saving...' : 'Record Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;
