import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  FileText, 
  ArrowLeft,
  X,
  UserCheck,
  TrendingDown,
  Share2,
  Bell
} from 'lucide-react';

interface Customer {
  _id: string;
  name: string;
  mobileNumber: string;
  address: string;
  dailyMilkRequirement: number;
  customerType: 'Retail' | 'Wholesale';
  outstandingBalance: number;
  lastPaymentDate?: string;
  email?: string;
  lastReminderDate?: string;
  totalRemindersSent?: number;
}

interface LedgerItem {
  id: string;
  date: string;
  type: 'Sale' | 'Payment';
  details: string;
  amount: number;
  direction: 'Debit' | 'Credit';
  runningBalance: number;
}

export const Customers: React.FC = () => {
  const { user } = useAuth();
  const canModify = ['admin', 'manager'].includes(user?.role?.toLowerCase() || '');

  // Core Data
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Ledger details view
  const [activeLedgerCustomer, setActiveLedgerCustomer] = useState<Customer | null>(null);
  const [ledgerData, setLedgerData] = useState<LedgerItem[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Reminders states
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [reminderType, setReminderType] = useState<'WhatsApp' | 'SMS' | 'Email'>('WhatsApp');
  const [remindersHistory, setRemindersHistory] = useState<any[]>([]);
  const [remindersLoading, setRemindersLoading] = useState(false);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    mobileNumber: '',
    address: '',
    dailyMilkRequirement: '',
    customerType: 'Retail',
    email: '',
  });

  // Edit Payment states
  const [paymentEditModalOpen, setPaymentEditModalOpen] = useState(false);
  const [editPaymentId, setEditPaymentId] = useState<string | null>(null);
  const [paymentEditFormData, setPaymentEditFormData] = useState({
    amount: '',
    paymentMethod: 'UPI',
    referenceNumber: '',
    date: '',
  });
  const [submittingPaymentEdit, setSubmittingPaymentEdit] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/customers');
      setCustomers(response.data);
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormData({
      name: '',
      mobileNumber: '',
      address: '',
      dailyMilkRequirement: '',
      customerType: 'Retail',
      email: '',
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (c: Customer) => {
    setEditingId(c._id);
    setFormData({
      name: c.name,
      mobileNumber: c.mobileNumber,
      address: c.address,
      dailyMilkRequirement: String(c.dailyMilkRequirement),
      customerType: c.customerType,
      email: c.email || '',
    });
    setModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        dailyMilkRequirement: Number(formData.dailyMilkRequirement),
      };

      if (editingId) {
        await api.put(`/customers/${editingId}`, payload);
      } else {
        await api.post('/customers', payload);
      }
      setModalOpen(false);
      fetchCustomers();
    } catch (err: any) {
      alert('Error saving customer: ' + (err.response?.data?.message || 'Error occurred'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this customer? This removes the customer profile.')) return;
    try {
      await api.delete(`/customers/${id}`);
      fetchCustomers();
    } catch (err) {
      alert('Error deleting customer profile');
    }
  };

  const fetchRemindersHistory = async (customerId: string) => {
    setRemindersLoading(true);
    try {
      const response = await api.get(`/customers/${customerId}/reminders`);
      setRemindersHistory(response.data);
    } catch (err) {
      console.error('Error fetching reminders history:', err);
    } finally {
      setRemindersLoading(false);
    }
  };

  // Open running balance ledger view
  const handleViewLedger = async (cust: Customer) => {
    setActiveLedgerCustomer(cust);
    setLedgerLoading(true);
    try {
      const response = await api.get(`/customers/${cust._id}/ledger`);
      setLedgerData(response.data.ledger);
      fetchRemindersHistory(cust._id);
    } catch (err) {
      console.error('Error fetching ledger details:', err);
    } finally {
      setLedgerLoading(false);
    }
  };

  const handleOpenPaymentEditModal = (item: LedgerItem) => {
    setEditPaymentId(item.id);
    let refNum = '';
    const refMatch = item.details.match(/\(Ref: ([^\)]+)\)/);
    if (refMatch) refNum = refMatch[1];

    let method = 'UPI';
    if (item.details.includes('Received via UPI')) method = 'UPI';
    else if (item.details.includes('Received via Cash')) method = 'Cash';
    else if (item.details.includes('Received via Bank Transfer')) method = 'Bank Transfer';

    setPaymentEditFormData({
      amount: String(item.amount),
      paymentMethod: method,
      referenceNumber: refNum,
      date: item.date ? (typeof item.date === 'string' ? item.date.substring(0, 10) : new Date(item.date).toISOString().substring(0, 10)) : '',
    });
    setPaymentEditModalOpen(true);
  };

  const handlePaymentEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPaymentId || !activeLedgerCustomer) return;
    setSubmittingPaymentEdit(true);
    try {
      const payload = {
        amount: Number(paymentEditFormData.amount),
        paymentMethod: paymentEditFormData.paymentMethod,
        referenceNumber: paymentEditFormData.referenceNumber || '',
        date: paymentEditFormData.date,
      };
      await api.put(`/receivables/payments/${editPaymentId}`, payload);
      setPaymentEditModalOpen(false);

      // Refresh ledger & customer profiles
      const updatedCustResp = await api.get(`/customers/${activeLedgerCustomer._id}`);
      setActiveLedgerCustomer(updatedCustResp.data);
      handleViewLedger(updatedCustResp.data);
      fetchCustomers();
    } catch (err) {
      alert('Error updating payment: ' + (err as any).response?.data?.message);
    } finally {
      setSubmittingPaymentEdit(false);
    }
  };

  const handleSendReminderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLedgerCustomer) return;
    try {
      const response = await api.post(`/customers/${activeLedgerCustomer._id}/remind`, { reminderType });
      alert(`${reminderType} reminder triggered: ` + response.data.message);
      
      // If WhatsApp, open the wa.me client link for user manual send as fallback
      if (reminderType === 'WhatsApp') {
        const textMsg = `Dear ${activeLedgerCustomer.name},\n\nThis is a manual payment reminder from Pitambara Doodh Dairy.\n\nYour current outstanding balance is ₹${activeLedgerCustomer.outstandingBalance}. Please clear the payment at your earliest convenience.\n\nThank you.`;
        const encoded = encodeURIComponent(textMsg);
        const mobile = activeLedgerCustomer.mobileNumber || '';
        const cleanMobile = mobile.replace(/[^0-9]/g, '');
        const finalMobile = cleanMobile.length === 10 ? '91' + cleanMobile : cleanMobile;
        window.open(`https://wa.me/${finalMobile}?text=${encoded}`, '_blank');
      }

      setReminderModalOpen(false);

      // Refresh customer profile & reminders log
      const updatedCustResp = await api.get(`/customers/${activeLedgerCustomer._id}`);
      setActiveLedgerCustomer(updatedCustResp.data);
      fetchRemindersHistory(activeLedgerCustomer._id);
      fetchCustomers();
    } catch (err: any) {
      alert('Error triggering reminder: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleSendWhatsAppReminder = async (c: Customer) => {
    try {
      await api.post(`/customers/${c._id}/remind`);
    } catch (err) {
      console.warn('Backend WhatsApp API trigger failed or skipped:', err);
    }
    const textMsg = `Dear ${c.name}, this is a reminder from PITAMBARA DOODH DAIRY. Your current outstanding balance is ₹${c.outstandingBalance}. Please arrange to clear this balance at your earliest convenience. Thank you!`;
    const encoded = encodeURIComponent(textMsg);
    const mobile = c.mobileNumber || '';
    const cleanMobile = mobile.replace(/[^0-9]/g, '');
    const finalMobile = cleanMobile.length === 10 ? '91' + cleanMobile : cleanMobile;
    window.open(`https://wa.me/${finalMobile}?text=${encoded}`, '_blank');
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.mobileNumber.includes(searchTerm) ||
    c.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
  };

  // If viewing ledger details, render secondary view
  if (activeLedgerCustomer) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setActiveLedgerCustomer(null)}
            className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Customer Ledger: {activeLedgerCustomer.name}</h2>
            <p className="text-xs text-slate-400">{activeLedgerCustomer.mobileNumber} | {activeLedgerCustomer.address}</p>
          </div>
        </div>        {/* Balance Card Info */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Outstanding Balance</p>
            <div className="flex items-center space-x-3 mt-1">
              <p className="text-2xl font-extrabold text-rose-500">{formatCurrency(activeLedgerCustomer.outstandingBalance)}</p>
              {activeLedgerCustomer.outstandingBalance > 0 && (
                <button
                  onClick={() => setReminderModalOpen(true)}
                  className="flex items-center px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-500/10 transition-all"
                  title="Send Reminder Alert"
                >
                  <Share2 className="w-3.5 h-3.5 mr-1 shrink-0" /> Remind
                </button>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Last Payment Date</p>
            <p className="text-lg font-bold text-slate-800 dark:text-white mt-1">
              {activeLedgerCustomer.lastPaymentDate ? new Date(activeLedgerCustomer.lastPaymentDate).toLocaleDateString('en-IN') : 'No payments logged'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Last Reminder Sent</p>
            <p className="text-lg font-bold text-slate-800 dark:text-white mt-1">
              {activeLedgerCustomer.lastReminderDate ? new Date(activeLedgerCustomer.lastReminderDate).toLocaleDateString('en-IN') : 'Never'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Reminders Sent</p>
            <p className="text-lg font-bold text-slate-800 dark:text-white mt-1">
              {activeLedgerCustomer.totalRemindersSent || 0} Alerts
            </p>
          </div>
        </div>

        {/* Ledger table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Transaction Date</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Details</th>
                  <th className="px-6 py-4">Debit (We Charged)</th>
                  <th className="px-6 py-4">Credit (Customer Paid)</th>
                  <th className="px-6 py-4">Running Balance</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {ledgerLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">
                      <div className="w-8 h-8 border-4 border-dairy-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : ledgerData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">No account ledger transactions recorded yet.</td>
                  </tr>
                ) : (
                  ledgerData.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                        {new Date(item.date).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          item.type === 'Sale' 
                            ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                            : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                        }`}>
                          {item.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{item.details}</td>
                      <td className="px-6 py-4 font-bold text-rose-500">
                        {item.direction === 'Debit' ? formatCurrency(item.amount) : '-'}
                      </td>
                      <td className="px-6 py-4 font-bold text-emerald-500">
                        {item.direction === 'Credit' ? formatCurrency(item.amount) : '-'}
                      </td>
                      <td className="px-6 py-4 font-extrabold text-slate-800 dark:text-slate-200">
                        {formatCurrency(item.runningBalance)}
                      </td>
                      <td className="px-6 py-4">
                        {item.type === 'Payment' && (
                          <button
                            disabled={!canModify}
                            onClick={() => handleOpenPaymentEditModal(item)}
                            className="p-1.5 text-slate-400 hover:text-dairy-500 disabled:opacity-30 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Edit Payment"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Reminders Log History */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Communication & Reminder Logs</h3>
              <p className="text-xs text-slate-400">Audit trail of manual alerts sent to this customer.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-3">Date & Time</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Amount Owed</th>
                  <th className="px-6 py-3">Expected Due Date</th>
                  <th className="px-6 py-3">Delivery Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {remindersLoading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-slate-400">
                      <div className="w-6 h-6 border-3 border-dairy-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : remindersHistory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-slate-400">No payment reminders dispatched to this customer yet.</td>
                  </tr>
                ) : (
                  remindersHistory.map((rem: any) => (
                    <tr key={rem._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                      <td className="px-6 py-3 text-slate-600 dark:text-slate-400">
                        {rem.sentAt ? new Date(rem.sentAt).toLocaleString('en-IN') : new Date(rem.createdAt).toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-3 font-semibold text-slate-700 dark:text-slate-300">
                        {rem.reminderType}
                      </td>
                      <td className="px-6 py-3 font-bold text-slate-800 dark:text-slate-200">
                        {formatCurrency(rem.amount)}
                      </td>
                      <td className="px-6 py-3 text-slate-600 dark:text-slate-400">
                        {rem.dueDate ? new Date(rem.dueDate).toLocaleDateString('en-IN') : '-'}
                      </td>
                      <td className="px-6 py-3">
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          rem.reminderStatus === 'Sent'
                            ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                            : rem.reminderStatus === 'Failed'
                            ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                            : 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                        }`}>
                          {rem.reminderStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit Payment Modal */}
        {paymentEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 rounded-3xl shadow-2xl relative">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                  Edit Payment Transaction
                </h3>
                <button
                  onClick={() => setPaymentEditModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handlePaymentEditSubmit} className="space-y-4 text-xs sm:text-sm">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Amount (INR)</label>
                  <input
                    type="number"
                    required
                    value={paymentEditFormData.amount}
                    onChange={(e) => setPaymentEditFormData({ ...paymentEditFormData, amount: e.target.value })}
                    placeholder="e.g. 5000"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Payment Method</label>
                  <select
                    value={paymentEditFormData.paymentMethod}
                    onChange={(e) => setPaymentEditFormData({ ...paymentEditFormData, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-808 dark:text-white rounded-xl outline-none"
                  >
                    <option value="UPI">UPI</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Reference Number</label>
                  <input
                    type="text"
                    value={paymentEditFormData.referenceNumber}
                    onChange={(e) => setPaymentEditFormData({ ...paymentEditFormData, referenceNumber: e.target.value })}
                    placeholder="e.g. Transaction ID / Receipt No"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-808 dark:text-white rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Date</label>
                  <input
                    type="date"
                    required
                    value={paymentEditFormData.date}
                    onChange={(e) => setPaymentEditFormData({ ...paymentEditFormData, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-808 dark:text-white rounded-xl outline-none"
                  />
                </div>

                <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setPaymentEditModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-400 font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingPaymentEdit}
                    className="px-4 py-2 bg-dairy-500 hover:bg-dairy-600 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-dairy-500/20"
                  >
                    {submittingPaymentEdit ? 'Saving...' : 'Update Payment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Send Reminder Modal Dialog */}
        {reminderModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 rounded-3xl shadow-2xl relative">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                  Send Payment Reminder
                </h3>
                <button
                  onClick={() => setReminderModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSendReminderSubmit} className="space-y-4 text-xs sm:text-sm">
                <p className="text-slate-500 leading-relaxed text-xs">
                  This will log a reminder event and attempt dispatch to <strong>{activeLedgerCustomer.name}</strong>. Choose the preferred channel below:
                </p>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Reminder Mode</label>
                  <select
                    value={reminderType}
                    onChange={(e) => setReminderType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none"
                  >
                    <option value="WhatsApp">WhatsApp Message</option>
                    <option value="SMS">Mobile SMS Sandbox</option>
                    <option value="Email" disabled={!activeLedgerCustomer.email}>
                      Email Notification {!activeLedgerCustomer.email && '(No Email Configured)'}
                    </option>
                  </select>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1.5 text-xs text-slate-500">
                  <div className="font-bold text-slate-700 dark:text-slate-350">Recipient Details:</div>
                  <div>Mobile: {activeLedgerCustomer.mobileNumber}</div>
                  {activeLedgerCustomer.email && <div>Email: {activeLedgerCustomer.email}</div>}
                  <div>Total Dues: {formatCurrency(activeLedgerCustomer.outstandingBalance)}</div>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setReminderModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-400 font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20"
                  >
                    Trigger Notification
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-72">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search by name, mobile, address"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white rounded-xl text-sm outline-none shadow-sm placeholder:text-slate-400"
          />
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center px-4 py-2.5 bg-dairy-500 hover:bg-dairy-600 text-white font-semibold rounded-2xl shadow-lg shadow-dairy-500/20 transition-all duration-150 text-sm w-full sm:w-auto justify-center"
        >
          <Plus className="w-5 h-5 mr-1" /> Add Customer
        </button>
      </div>

      {/* Customer Registry Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-4">Customer Details</th>
                <th className="px-6 py-4">Address</th>
                <th className="px-6 py-4">Customer Type</th>
                <th className="px-6 py-4">Daily Volume Req.</th>
                <th className="px-6 py-4">Outstanding Balance</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    <div className="w-8 h-8 border-4 border-dairy-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">No customers registered in database matching that name.</td>
                </tr>
              ) : (
                filteredCustomers.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800 dark:text-slate-100">{c.name}</div>
                      <div className="text-[10px] text-slate-400">{c.mobileNumber}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{c.address}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        c.customerType === 'Wholesale' 
                          ? 'bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300'
                          : 'bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300'
                      }`}>
                        {c.customerType}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{c.dailyMilkRequirement} Liters</td>
                    <td className="px-6 py-4">
                      <p className={`font-extrabold ${c.outstandingBalance > 0 ? 'text-rose-500' : 'text-slate-500'}`}>
                        {formatCurrency(c.outstandingBalance)}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => handleViewLedger(c)}
                          className="p-1.5 text-slate-400 hover:text-dairy-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="View Ledger Statement"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        {c.outstandingBalance > 0 && (
                          <button
                            onClick={() => handleSendWhatsAppReminder(c)}
                            className="p-1.5 text-slate-400 hover:text-emerald-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Send WhatsApp Reminder"
                          >
                            <Bell className="w-4 h-4 text-emerald-600 dark:text-emerald-450" />
                          </button>
                        )}
                        <button
                          disabled={!canModify}
                          onClick={() => handleOpenEditModal(c)}
                          className="p-1.5 text-slate-400 hover:text-dairy-500 disabled:opacity-30 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Edit Profile"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          disabled={!canModify}
                          onClick={() => handleDelete(c._id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 disabled:opacity-30 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Delete Profile"
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

      {/* Edit/Add Modal Customer Dialog */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 rounded-3xl shadow-2xl relative">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              {editingId ? 'Edit Customer Profile' : 'Register Customer'}
            </h3>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Customer Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Gopal Dairy Parlour"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Mobile Number</label>
                <input
                  type="text"
                  required
                  value={formData.mobileNumber}
                  onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                  placeholder="10 digit number"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Address</label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Chauraha / Sector, City"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. customer@example.com (optional)"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-808 text-slate-800 dark:text-white rounded-xl outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Daily Requirement (L)</label>
                  <input
                    type="number"
                    required
                    value={formData.dailyMilkRequirement}
                    onChange={(e) => setFormData({ ...formData, dailyMilkRequirement: e.target.value })}
                    placeholder="e.g. 15"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Customer Type</label>
                  <select
                    value={formData.customerType}
                    onChange={(e) => setFormData({ ...formData, customerType: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none"
                  >
                    <option value="Retail">Retail</option>
                    <option value="Wholesale">Wholesale</option>
                  </select>
                </div>
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
                  className="px-4 py-2 bg-dairy-500 hover:bg-dairy-600 text-white font-bold rounded-xl shadow-lg shadow-dairy-500/20"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
