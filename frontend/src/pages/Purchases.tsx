import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Filter, 
  ChevronRight, 
  Sparkles,
  Layers,
  CalendarDays
} from 'lucide-react';

interface Purchase {
  _id: string;
  purchaseDate: string;
  supplierId: string;
  supplierName: string;
  village: string;
  mobileNumber: string;
  milkType: 'Cow' | 'Buffalo' | 'Mixed';
  quantity: number;
  fatPercentage: number;
  snfPercentage: number;
  ratePerLiter: number;
  totalAmount: number;
  paymentStatus: 'Paid' | 'Unpaid' | 'Partially Paid';
  notes?: string;
}

interface Supplier {
  _id: string;
  name: string;
  village: string;
}

import { useToast } from '../context/ToastContext';

export const Purchases: React.FC = () => {
  const { user } = useAuth();
  const canModify = user?.role === 'Admin';
  const toast = useToast();

  // Core Data
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filters state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [villageFilter, setVillageFilter] = useState('');

  // Summaries state
  const [dailySummary, setDailySummary] = useState<any[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<any[]>([]);

  // Form modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [formData, setFormData] = useState({
    supplierId: '',
    milkType: 'Cow',
    quantity: '',
    fatPercentage: '',
    snfPercentage: '',
    ratePerLiter: '',
    purchaseDate: new Date().toISOString().substring(0, 10),
    notes: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      // Build filter parameters
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (selectedSupplierId) params.supplierId = selectedSupplierId;
      if (villageFilter) params.village = villageFilter;

      const [purchResp, suppResp, summResp] = await Promise.all([
        api.get('/purchases', { params }),
        api.get('/suppliers'),
        api.get('/purchases/summary')
      ]);

      setPurchases(purchResp.data);
      setSuppliers(suppResp.data);
      setDailySummary(summResp.data.dailySummary);
      setMonthlySummary(summResp.data.monthlySummary);
    } catch (err) {
      console.error('Error loading purchase module data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [startDate, endDate, selectedSupplierId, villageFilter]);

  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormData({
      supplierId: suppliers[0]?._id || '',
      milkType: 'Cow',
      quantity: '',
      fatPercentage: '4.0',
      snfPercentage: '8.5',
      ratePerLiter: '45',
      purchaseDate: new Date().toISOString().substring(0, 10),
      notes: '',
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (p: Purchase) => {
    setEditingId(p._id);
    setFormData({
      supplierId: p.supplierId,
      milkType: p.milkType,
      quantity: String(p.quantity),
      fatPercentage: String(p.fatPercentage),
      snfPercentage: String(p.snfPercentage),
      ratePerLiter: String(p.ratePerLiter),
      purchaseDate: new Date(p.purchaseDate).toISOString().substring(0, 10),
      notes: p.notes || '',
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
        await api.put(`/purchases/${editingId}`, payload);
        toast.success('Purchase record updated successfully!');
      } else {
        await api.post('/purchases', payload);
        toast.success('New milk purchase transaction recorded successfully!');
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      toast.error('Failed to save purchase: ' + ((err as any).response?.data?.message || 'Server error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this purchase entry? This will adjust the supplier account balance and delete matching payables.')) return;
    try {
      await api.delete(`/purchases/${id}`);
      toast.success('Purchase record deleted successfully.');
      loadData();
    } catch (err) {
      toast.error('Failed to delete purchase record.');
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
  };

  // Auto calculate total in modal form helper
  const tempTotal = Number(formData.quantity || 0) * Number(formData.ratePerLiter || 0);

  return (
    <div className="space-y-6">
      {/* Header operations */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-xs text-slate-400">Track and manage milk collected from vendors.</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center px-4 py-2.5 bg-dairy-500 hover:bg-dairy-600 text-white font-semibold rounded-2xl shadow-lg shadow-dairy-500/20 transition-all duration-150 text-sm"
        >
          <Plus className="w-5 h-5 mr-1" /> Add Purchase Entry
        </button>
      </div>

      {/* Grid containing Summary & Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Filters */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl lg:col-span-2 space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Filter className="w-4 h-4 text-dairy-500" />
            <h3 className="font-bold text-sm text-slate-800 dark:text-white">Filter Purchases</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Supplier</label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl text-xs outline-none"
              >
                <option value="">All Suppliers</option>
                {suppliers.map(s => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Village</label>
              <input
                type="text"
                placeholder="Search village"
                value={villageFilter}
                onChange={(e) => setVillageFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl text-xs outline-none"
              />
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

          {(startDate || endDate || selectedSupplierId || villageFilter) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setSelectedSupplierId('');
                setVillageFilter('');
              }}
              className="text-xs text-dairy-500 font-semibold hover:underline"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Summaries widget */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-sm text-slate-800 dark:text-white">Milk Intake Summary</h3>
          </div>

          <div className="space-y-3">
            {/* Daily stats summary */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-dairy-50/50 dark:bg-dairy-950/20 border border-dairy-100/50 dark:border-dairy-900/30">
              <div className="flex items-center">
                <CalendarDays className="w-5 h-5 mr-3 text-dairy-600 dark:text-dairy-400" />
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white">Today's Intake</h4>
                  <p className="text-[10px] text-slate-400">Total liters collected</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-extrabold text-slate-800 dark:text-white">
                  {dailySummary[0]?.totalQuantity ? dailySummary[0].totalQuantity.toFixed(1) : 0} L
                </p>
                <p className="text-[10px] text-slate-400">
                  {formatCurrency(dailySummary[0]?.totalAmount || 0)}
                </p>
              </div>
            </div>

            {/* Monthly Summary */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-100/50 dark:border-teal-900/30">
              <div className="flex items-center">
                <Layers className="w-5 h-5 mr-3 text-teal-600 dark:text-teal-400" />
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white">Monthly Intake</h4>
                  <p className="text-[10px] text-slate-400">Channelling metrics</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-extrabold text-slate-800 dark:text-white">
                  {monthlySummary[0]?.totalQuantity ? monthlySummary[0].totalQuantity.toLocaleString() : 0} L
                </p>
                <p className="text-[10px] text-slate-400">
                  {formatCurrency(monthlySummary[0]?.totalAmount || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Purchases Data Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Supplier</th>
                <th className="px-6 py-4">Village</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Qty (Liters)</th>
                <th className="px-6 py-4">Fat / SNF</th>
                <th className="px-6 py-4">Rate</th>
                <th className="px-6 py-4">Total Amount</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-slate-400">
                    <div className="w-8 h-8 border-4 border-dairy-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Fetching purchase records...
                  </td>
                </tr>
              ) : purchases.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-slate-400">No purchase transactions found for the selection.</td>
                </tr>
              ) : (
                purchases.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                    <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-200">
                      {new Date(p.purchaseDate).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-100">{p.supplierName}</div>
                      <div className="text-[10px] text-slate-400">{p.mobileNumber}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{p.village}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        p.milkType === 'Cow' 
                          ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                          : p.milkType === 'Buffalo'
                          ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                      }`}>
                        {p.milkType}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{p.quantity} L</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                      {p.fatPercentage.toFixed(1)}% / {p.snfPercentage.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">₹{p.ratePerLiter.toFixed(2)}</td>
                    <td className="px-6 py-4 font-extrabold text-dairy-600 dark:text-dairy-400">
                      {formatCurrency(p.totalAmount)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <button
                          disabled={!canModify}
                          onClick={() => handleOpenEditModal(p)}
                          className="p-1.5 text-slate-400 hover:text-dairy-500 disabled:opacity-30 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Edit Entry"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          disabled={!canModify}
                          onClick={() => handleDelete(p._id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 disabled:opacity-30 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Delete Entry"
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

      {/* Edit/Add Modal dialog */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg p-6 rounded-3xl shadow-2xl relative">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              {editingId ? 'Edit Purchase Transaction' : 'Record New Milk Purchase'}
            </h3>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Supplier Name</label>
                  <select
                    required
                    value={formData.supplierId}
                    onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none"
                  >
                    {suppliers.map(s => (
                      <option key={s._id} value={s._id}>{s.name} ({s.village})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Milk Type</label>
                  <select
                    value={formData.milkType}
                    onChange={(e) => setFormData({ ...formData, milkType: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none"
                  >
                    <option value="Cow">Cow</option>
                    <option value="Buffalo">Buffalo</option>
                    <option value="Mixed">Mixed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Quantity (Liters)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder="e.g. 45.5"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Rate Per Liter (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.ratePerLiter}
                    onChange={(e) => setFormData({ ...formData, ratePerLiter: e.target.value })}
                    placeholder="e.g. 48"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Fat Percentage (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
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
                    required
                    value={formData.snfPercentage}
                    onChange={(e) => setFormData({ ...formData, snfPercentage: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Purchase Date</label>
                  <input
                    type="date"
                    required
                    value={formData.purchaseDate}
                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Notes (Optional)</label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Chilling parameters, quality notes"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none"
                  />
                </div>
              </div>

              {/* Live Cost calculation */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl flex items-center justify-between border border-slate-100 dark:border-slate-800">
                <span className="font-bold text-slate-500">Live Calculated Total:</span>
                <span className="text-base font-extrabold text-dairy-600 dark:text-dairy-400">{formatCurrency(tempTotal)}</span>
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
                  {submitting ? 'Saving...' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Purchases;
