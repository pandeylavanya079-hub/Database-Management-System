import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowUpRight, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle,
  Plus,
  Coins
} from 'lucide-react';

interface Payable {
  _id: string;
  supplierId: string;
  supplierName: string;
  amountPayable: number;
  dueDate: string;
  paidAmount: number;
  remainingAmount: number;
  status: 'Unpaid' | 'Partially Paid' | 'Paid';
}

interface Supplier {
  _id: string;
  name: string;
  outstandingAmount: number;
}

export const Payables: React.FC = () => {
  const { user } = useAuth();
  const canModify = ['admin', 'manager'].includes(user?.role?.toLowerCase() || '');

  // Core States
  const [payables, setPayables] = useState<Payable[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('Unpaid');
  const [submitting, setSubmitting] = useState(false);

  // Modals
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    supplierId: '',
    amount: '',
    paymentMethod: 'UPI',
    referenceNumber: '',
    date: new Date().toISOString().substring(0, 10),
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;

      const [payResp, suppResp] = await Promise.all([
        api.get('/payables', { params }),
        api.get('/suppliers')
      ]);

      setPayables(payResp.data);
      // Fetch all suppliers so we can record disbursements to any vendor
      setSuppliers(suppResp.data);
    } catch (err) {
      console.error('Error loading payables:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleOpenPaymentModal = () => {
    setFormData({
      supplierId: '',
      amount: '',
      paymentMethod: 'UPI',
      referenceNumber: '',
      date: new Date().toISOString().substring(0, 10),
    });
    setPaymentModalOpen(true);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        amount: Number(formData.amount),
      };
      await api.post('/payables/payments', payload);
      setPaymentModalOpen(false);
      loadData();
    } catch (err) {
      alert('Error recording disbursement: ' + (err as any).response?.data?.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
  };

  const totalOutstanding = payables.reduce((acc, curr) => acc + curr.remainingAmount, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100/50 dark:border-rose-900/30 rounded-2xl flex items-center space-x-3 w-full sm:w-auto">
          <Coins className="w-10 h-10 text-rose-600 dark:text-rose-400 shrink-0" />
          <div>
            <p className="text-[10px] font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider">Total Outstanding Payables</p>
            <h3 className="text-xl font-extrabold text-rose-600 dark:text-rose-400">{formatCurrency(totalOutstanding)}</h3>
          </div>
        </div>

        <button
          disabled={!canModify || suppliers.length === 0}
          onClick={handleOpenPaymentModal}
          className="flex items-center px-4 py-2.5 bg-dairy-500 hover:bg-dairy-600 disabled:opacity-40 text-white font-semibold rounded-2xl shadow-lg shadow-dairy-500/20 transition-all duration-150 text-sm w-full sm:w-auto justify-center"
        >
          <ArrowUpRight className="w-5 h-5 mr-1" /> Record Supplier Payment
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-3xl flex items-center justify-between">
        <div className="flex space-x-2">
          {['Unpaid', 'Partially Paid', 'Paid'].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-4 py-1.5 rounded-xl font-semibold text-xs transition-colors ${
                statusFilter === tab 
                  ? 'bg-dairy-500 text-white'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab} Payables
            </button>
          ))}
        </div>
      </div>

      {/* Payables Data Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-4">Supplier Name</th>
                <th className="px-6 py-4">Due Date</th>
                <th className="px-6 py-4">Invoice Cost</th>
                <th className="px-6 py-4">Amount Paid</th>
                <th className="px-6 py-4">Outstanding Bal</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    <div className="w-8 h-8 border-4 border-dairy-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : payables.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">No payable accounts match this criteria.</td>
                </tr>
              ) : (
                payables.map((p) => {
                  const daysLate = Math.ceil((new Date().getTime() - new Date(p.dueDate).getTime()) / (1000 * 3600 * 24));
                  const isOverdue = daysLate > 0 && p.status !== 'Paid';

                  return (
                    <tr key={p._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                      <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-100">{p.supplierName}</td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {new Date(p.dueDate).toLocaleDateString('en-IN')}
                        </div>
                        {isOverdue && (
                          <span className="inline-flex items-center text-[10px] font-bold text-rose-500 animate-pulse mt-0.5">
                            <AlertTriangle className="w-3 h-3 mr-1" /> Overdue by {daysLate} days
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{formatCurrency(p.amountPayable)}</td>
                      <td className="px-6 py-4 text-rose-600 font-medium">-{formatCurrency(p.paidAmount)}</td>
                      <td className="px-6 py-4 font-extrabold text-slate-800 dark:text-slate-200">
                        {formatCurrency(p.remainingAmount)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          p.status === 'Paid'
                            ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                            : p.status === 'Partially Paid'
                            ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                            : 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                        }`}>
                          {p.status === 'Paid' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                          {p.status === 'Partially Paid' && <HelpCircle className="w-3 h-3 mr-1" />}
                          {p.status === 'Unpaid' && <AlertTriangle className="w-3 h-3 mr-1" />}
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Dialog */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 rounded-3xl shadow-2xl relative">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              Disburse Supplier Payment
            </h3>

            <form onSubmit={handlePaymentSubmit} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Select Supplier</label>
                <select
                  required
                  value={formData.supplierId}
                  onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none"
                >
                  <option value="" disabled>Select Supplier</option>
                  {suppliers.map(s => (
                    <option key={s._id} value={s._id}>
                      {s.name} (Outstanding: {formatCurrency(s.outstandingAmount)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Amount Disbursed (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="e.g. 10000"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none font-extrabold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Payment Method</label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none"
                  >
                    <option value="UPI">UPI</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Disbursement Date</label>
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
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Reference Number (Txn ID)</label>
                <input
                  type="text"
                  value={formData.referenceNumber}
                  onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                  placeholder="e.g. TXN29482948"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-400 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-dairy-500 hover:bg-dairy-600 text-white font-bold rounded-xl shadow-lg shadow-dairy-500/20"
                >
                  {submitting ? 'Recording...' : 'Submit Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payables;
