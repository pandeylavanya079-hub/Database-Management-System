import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowDownLeft, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle,
  Plus,
  Coins,
  Calendar,
  Bell,
  Smartphone,
  Send,
  Share2,
  Check,
  X,
  Edit3
} from 'lucide-react';

interface Receivable {
  _id: string;
  customerId: string;
  customerName: string;
  customerMobile?: string;
  amountDue: number;
  dueDate: string;
  paidAmount: number;
  remainingAmount: number;
  status: 'Unpaid' | 'Partially Paid' | 'Paid';
  promisedDate?: string;
}

interface Customer {
  _id: string;
  name: string;
  outstandingBalance: number;
}

export const Receivables: React.FC = () => {
  const { user } = useAuth();
  const canModify = ['admin', 'manager'].includes(user?.role?.toLowerCase() || '');

  // Core stats
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('Unpaid');
  const [submitting, setSubmitting] = useState(false);

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');

  // Payment Receipt Modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    customerId: '',
    amount: '',
    paymentMethod: 'UPI',
    referenceNumber: '',
    date: new Date().toISOString().substring(0, 10),
  });

  // Promised Date Modal states
  const [promisedModalOpen, setPromisedModalOpen] = useState(false);
  const [selectedReceivable, setSelectedReceivable] = useState<Receivable | null>(null);
  const [promisedDateInput, setPromisedDateInput] = useState('');

  // Simulated Reminder smartphone states
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [reminderReceivable, setReminderReceivable] = useState<Receivable | null>(null);
  const [simulatingStep, setSimulatingStep] = useState<'idle' | 'sending' | 'delivered'>('idle');

  // Edit Receivable Dues Modal states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editReceivable, setEditReceivable] = useState<Receivable | null>(null);
  const [editFormData, setEditFormData] = useState({
    amountDue: '',
    paidAmount: '',
    dueDate: '',
    promisedDate: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;

      const [recResp, custResp] = await Promise.all([
        api.get('/receivables', { params }),
        api.get('/customers')
      ]);

      setReceivables(recResp.data);
      // Fetch all customers so we can record receipts for any user (including advance payments)
      setCustomers(custResp.data);
    } catch (err) {
      console.error('Error loading receivables:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleOpenPaymentModal = () => {
    setFormData({
      customerId: '',
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
      await api.post('/receivables/payments', payload);
      setPaymentModalOpen(false);
      loadData();
    } catch (err) {
      alert('Error recording payment: ' + (err as any).response?.data?.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePromisedDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReceivable) return;
    try {
      await api.put(`/receivables/${selectedReceivable._id}/promised-date`, {
        promisedDate: promisedDateInput || null
      });
      setPromisedModalOpen(false);
      loadData();
    } catch (err) {
      alert('Error updating promised date: ' + (err as any).response?.data?.message);
    }
  };

  const handleOpenEditModal = (r: Receivable) => {
    setEditReceivable(r);
    setEditFormData({
      amountDue: String(r.amountDue),
      paidAmount: String(r.paidAmount),
      dueDate: r.dueDate.substring(0, 10),
      promisedDate: r.promisedDate ? r.promisedDate.substring(0, 10) : '',
    });
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editReceivable) return;
    setSubmitting(true);
    try {
      const payload = {
        amountDue: Number(editFormData.amountDue),
        paidAmount: Number(editFormData.paidAmount),
        dueDate: editFormData.dueDate,
        promisedDate: editFormData.promisedDate || null,
      };
      await api.put(`/receivables/${editReceivable._id}`, payload);
      setEditModalOpen(false);
      loadData();
    } catch (err) {
      alert('Error updating dues: ' + (err as any).response?.data?.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
  };

  // Filter receivables client-side by search term
  const filteredReceivables = receivables.filter(r => 
    r.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalOutstanding = receivables.reduce((acc, curr) => acc + curr.remainingAmount, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-900/30 rounded-2xl flex items-center space-x-3 w-full sm:w-auto">
          <Coins className="w-10 h-10 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div>
            <p className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">Total Outstanding Dues</p>
            <h3 className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalOutstanding)}</h3>
          </div>
        </div>

        <button
          disabled={!canModify || customers.length === 0}
          onClick={handleOpenPaymentModal}
          className="flex items-center px-4 py-2.5 bg-dairy-500 hover:bg-dairy-600 disabled:opacity-40 text-white font-semibold rounded-2xl shadow-lg shadow-dairy-500/20 transition-all duration-150 text-sm w-full sm:w-auto justify-center"
        >
          <ArrowDownLeft className="w-5 h-5 mr-1" /> Record Customer Payment
        </button>
      </div>

      {/* Tabs, Search, and Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
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
              {tab} Invoices
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search by customer name"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl text-xs outline-none shadow-sm placeholder:text-slate-450"
          />
        </div>
      </div>

      {/* Receivables Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-4">Customer Name</th>
                <th className="px-6 py-4">Due Date</th>
                <th className="px-6 py-4">Original Bill</th>
                <th className="px-6 py-4">Amount Paid</th>
                <th className="px-6 py-4">Remaining Balance</th>
                <th className="px-6 py-4">Promised Payment Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Reminders & Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400">
                    <div className="w-8 h-8 border-4 border-dairy-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredReceivables.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400">No invoices match the selection.</td>
                </tr>
              ) : (
                filteredReceivables.map((r) => {
                  const daysLate = Math.ceil((new Date().getTime() - new Date(r.dueDate).getTime()) / (1000 * 3600 * 24));
                  const isOverdue = daysLate > 0 && r.status !== 'Paid';

                  const promisedDateObj = r.promisedDate ? new Date(r.promisedDate) : null;
                  const isPromisedOverdue = promisedDateObj && 
                                           r.status !== 'Paid' && 
                                           Math.ceil((new Date().getTime() - promisedDateObj.getTime()) / (1000 * 3600 * 24)) > 0;

                  return (
                    <tr key={r._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800 dark:text-slate-100">{r.customerName}</div>
                        <div className="text-[10px] text-slate-400">{r.customerMobile || 'No contact'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {new Date(r.dueDate).toLocaleDateString('en-IN')}
                        </div>
                        {isOverdue && (
                          <span className="inline-flex items-center text-[10px] font-bold text-rose-500 animate-pulse mt-0.5">
                            <AlertTriangle className="w-3 h-3 mr-1" /> Overdue by {daysLate} days
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{formatCurrency(r.amountDue)}</td>
                      <td className="px-6 py-4 text-emerald-600 font-medium">+{formatCurrency(r.paidAmount)}</td>
                      <td className="px-6 py-4 font-extrabold text-slate-800 dark:text-slate-200">
                        {formatCurrency(r.remainingAmount)}
                      </td>
                      <td className="px-6 py-4">
                        {promisedDateObj ? (
                          <div className="flex flex-col">
                            <div className="flex items-center space-x-1.5">
                              <span className={`font-semibold ${isPromisedOverdue ? 'text-amber-500 font-bold' : 'text-slate-700 dark:text-slate-350'}`}>
                                {promisedDateObj.toLocaleDateString('en-IN')}
                              </span>
                              {isPromisedOverdue && (
                                <span className="text-[8px] font-extrabold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded-md animate-pulse">
                                  Lapsed
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-xs">Not promised yet</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          r.status === 'Paid'
                            ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                            : r.status === 'Partially Paid'
                            ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                            : 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                        }`}>
                          {r.status === 'Paid' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                          {r.status === 'Partially Paid' && <HelpCircle className="w-3 h-3 mr-1" />}
                          {r.status === 'Unpaid' && <AlertTriangle className="w-3 h-3 mr-1" />}
                          {r.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center space-x-3">
                          <button
                            disabled={!canModify}
                            onClick={() => {
                              setSelectedReceivable(r);
                              setPromisedDateInput(r.promisedDate ? r.promisedDate.substring(0, 10) : '');
                              setPromisedModalOpen(true);
                            }}
                            className="flex items-center px-3 py-1.5 text-slate-500 hover:text-dairy-500 dark:text-slate-400 dark:hover:text-dairy-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs transition-colors border border-slate-200 dark:border-slate-850"
                            title="Set Promised Date"
                          >
                            <Calendar className="w-3.5 h-3.5 mr-1" />
                            {r.promisedDate ? 'Edit Date' : 'Set Date'}
                          </button>

                          <button
                            disabled={!canModify}
                            onClick={() => handleOpenEditModal(r)}
                            className="flex items-center px-3 py-1.5 text-slate-500 hover:text-dairy-500 dark:text-slate-400 dark:hover:text-dairy-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs transition-colors border border-slate-200 dark:border-slate-850"
                            title="Edit Invoice Dues"
                          >
                            <Edit3 className="w-3.5 h-3.5 mr-1" />
                            Edit Dues
                          </button>

                          {r.status !== 'Paid' && (
                            <button
                              onClick={() => {
                                setReminderReceivable(r);
                                setSimulatingStep('idle');
                                setReminderModalOpen(true);
                              }}
                              className={`flex items-center px-3 py-1.5 text-xs font-bold rounded-xl transition-all duration-150 ${
                                isPromisedOverdue
                                  ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/10'
                                  : 'bg-dairy-50 dark:bg-dairy-950/30 text-dairy-600 dark:text-dairy-400 hover:bg-dairy-500 hover:text-white border border-dairy-100 dark:border-dairy-900/30'
                              }`}
                            >
                              <Bell className="w-3.5 h-3.5 mr-1 shrink-0" />
                              Remind
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Dialog Modal */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 rounded-3xl shadow-2xl relative">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              Record Customer Receipt
            </h3>

            <form onSubmit={handlePaymentSubmit} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Select Customer</label>
                <select
                  required
                  value={formData.customerId}
                  onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none"
                >
                  <option value="" disabled>Select Customer</option>
                  {customers.map(c => (
                    <option key={c._id} value={c._id}>
                      {c.name} (Outstanding: {formatCurrency(c.outstandingBalance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Amount Paid (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="e.g. 5000"
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
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Receipt Date</label>
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
                  placeholder="e.g. UPI820491823"
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
                  {submitting ? 'Recording...' : 'Submit Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Set Promised Date Modal */}
      {promisedModalOpen && selectedReceivable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-sm p-6 rounded-3xl shadow-2xl relative">
            <h3 className="text-base font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              Commit Date for Receivable Dues
            </h3>

            <form onSubmit={handleUpdatePromisedDate} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1.5">Customer Name</label>
                <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{selectedReceivable.customerName}</p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-wider mb-1.5">Dues Amount</label>
                <p className="font-extrabold text-base text-rose-500">{formatCurrency(selectedReceivable.remainingAmount)}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Promised Date</label>
                <input
                  type="date"
                  required
                  value={promisedDateInput}
                  onChange={(e) => setPromisedDateInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPromisedModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-400 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-dairy-500 hover:bg-dairy-600 text-white font-bold rounded-xl shadow-lg shadow-dairy-500/20"
                >
                  Save Date
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Dues Modal */}
      {editModalOpen && editReceivable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 rounded-3xl shadow-2xl relative">
            <h3 className="text-base font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              Edit Invoice Dues & Payment
            </h3>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-405 uppercase tracking-wider mb-1.5">Customer Name</label>
                <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{editReceivable.customerName}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Original Bill (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editFormData.amountDue}
                    onChange={(e) => setEditFormData({ ...editFormData, amountDue: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Amount Paid (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editFormData.paidAmount}
                    onChange={(e) => setEditFormData({ ...editFormData, paidAmount: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none font-bold text-emerald-600 dark:text-emerald-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Due Date</label>
                  <input
                    type="date"
                    required
                    value={editFormData.dueDate}
                    onChange={(e) => setEditFormData({ ...editFormData, dueDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Promised Date</label>
                  <input
                    type="date"
                    value={editFormData.promisedDate}
                    onChange={(e) => setEditFormData({ ...editFormData, promisedDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none"
                  />
                </div>
              </div>

              {/* Calculated Dues Preview */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl flex items-center justify-between border border-slate-100 dark:border-slate-800">
                <span className="font-bold text-slate-500">Calculated Remaining Balance:</span>
                <span className="text-base font-extrabold text-rose-500">
                  {formatCurrency(Math.max(0, Number(editFormData.amountDue || 0) - Number(editFormData.paidAmount || 0)))}
                </span>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-400 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-dairy-500 hover:bg-dairy-600 text-white font-bold rounded-xl shadow-lg shadow-dairy-500/20"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Simulated Smartphone Reminder Dialog */}
      {reminderModalOpen && reminderReceivable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-4xl p-6 rounded-3xl shadow-2xl relative grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left Column: Actions and Text Config */}
            <div className="flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center">
                    <Bell className="w-5 h-5 text-amber-500 mr-2 shrink-0 animate-pulse" /> Outbound Payment Reminder
                  </h3>
                  <button 
                    onClick={() => setReminderModalOpen(false)}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-slate-400">
                  Send a reminder notification directly to this customer. Click the WhatsApp button to open WhatsApp Web/App pre-filled with the message, or simulate an SMS notification.
                </p>

                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Customer Mobile</label>
                    <input 
                      type="text" 
                      readOnly
                      value={reminderReceivable.customerMobile || 'No contact number registered'} 
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Outbound Message Template</label>
                    <textarea 
                      readOnly
                      value={`Dear ${reminderReceivable.customerName}, this is a reminder from PITAMBARA DOODH DAIRY. Your promised payment of ₹${reminderReceivable.remainingAmount} was due/expected on ${reminderReceivable.promisedDate ? new Date(reminderReceivable.promisedDate).toLocaleDateString('en-IN') : new Date(reminderReceivable.dueDate).toLocaleDateString('en-IN')}. Please arrange to clear this balance at your earliest convenience. Thank you!`} 
                      className="w-full h-32 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-350 rounded-xl text-xs outline-none resize-none font-medium leading-relaxed"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    const textMsg = `Dear ${reminderReceivable.customerName}, this is a reminder from PITAMBARA DOODH DAIRY. Your promised payment of ₹${reminderReceivable.remainingAmount} was due on ${reminderReceivable.promisedDate ? new Date(reminderReceivable.promisedDate).toLocaleDateString('en-IN') : new Date(reminderReceivable.dueDate).toLocaleDateString('en-IN')}. Please arrange to clear this balance at your earliest convenience. Thank you!`;
                    const encoded = encodeURIComponent(textMsg);
                    const mobile = reminderReceivable.customerMobile || '9123456780';
                    const cleanMobile = mobile.replace(/[^0-9]/g, '');
                    const finalMobile = cleanMobile.length === 10 ? '91' + cleanMobile : cleanMobile;
                    
                    window.open(`https://wa.me/${finalMobile}?text=${encoded}`, '_blank');
                  }}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl flex items-center justify-center space-x-2 text-xs shadow-lg shadow-emerald-500/20 transition-all"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Send via WhatsApp</span>
                </button>

                <button
                  type="button"
                  disabled={simulatingStep !== 'idle'}
                  onClick={() => {
                    setSimulatingStep('sending');
                    setTimeout(() => {
                      setSimulatingStep('delivered');
                    }, 2200);
                  }}
                  className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center space-x-2 text-xs shadow-lg shadow-blue-500/20 transition-all"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Simulate Phone SMS</span>
                </button>
              </div>
            </div>

            {/* Right Column: Premium iPhone mockup display */}
            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-3xl flex items-center justify-center border border-slate-100 dark:border-slate-800">
              <div className="w-[280px] h-[520px] bg-black rounded-[48px] shadow-2xl relative border-[6px] border-slate-800 dark:border-slate-750 overflow-hidden flex flex-col justify-between p-3 select-none">
                
                {/* Speaker/Camera (Dynamic Island notch) */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full z-20 flex items-center justify-between px-4">
                  <div className="w-2.5 h-2.5 bg-slate-900 rounded-full"></div>
                  <div className="w-10 h-1.5 bg-slate-850 rounded-full"></div>
                  <div className="w-2.5 h-2.5 bg-slate-900 rounded-full"></div>
                </div>

                {/* Display Area */}
                <div 
                  className="w-full h-full bg-cover bg-center rounded-[38px] relative overflow-hidden flex flex-col justify-between py-8 px-4"
                  style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=280&auto=format&fit=crop")' }}
                >
                  {/* Digital Clock Lockscreen Widget */}
                  <div className="text-center text-white mt-4 backdrop-blur-md bg-black/15 rounded-2xl py-2.5 border border-white/10">
                    <p className="text-2xl font-bold">20:03</p>
                    <p className="text-[8px] font-semibold tracking-wider uppercase opacity-80">Wed, June 3</p>
                  </div>

                  {/* Incoming sliding alert panel */}
                  <div className="flex-1 flex items-start justify-center mt-6">
                    {simulatingStep === 'sending' && (
                      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl border border-white/15 shadow-xl w-full text-center py-6 text-xs text-slate-500 dark:text-slate-400">
                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        Routing SMS to phone...
                      </div>
                    )}

                    {simulatingStep === 'delivered' && (
                      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 rounded-2xl border border-white/10 shadow-xl w-full animate-[bounce_1s_ease-in-out_1]">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[9px] font-bold text-blue-500 flex items-center">
                            <Send className="w-2.5 h-2.5 mr-1" /> SMS MESSAGE
                          </span>
                          <span className="text-[8px] text-slate-400">now</span>
                        </div>
                        <h4 className="text-[10px] font-bold text-slate-800 dark:text-white">Pitambara Dairy</h4>
                        <p className="text-[9px] text-slate-600 dark:text-slate-300 leading-snug mt-0.5 font-medium line-clamp-4">
                          Dear {reminderReceivable.customerName}, this is a reminder from PITAMBARA DOODH DAIRY. Your promised payment of ₹{reminderReceivable.remainingAmount} was due on {reminderReceivable.promisedDate ? new Date(reminderReceivable.promisedDate).toLocaleDateString('en-IN') : new Date(reminderReceivable.dueDate).toLocaleDateString('en-IN')}. Please arrange to clear...
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Indicator notch bar */}
                  <div className="w-24 h-1 bg-white/70 rounded-full mx-auto"></div>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default Receivables;
