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
  Filter,
  Users,
  X
} from 'lucide-react';

interface Supplier {
  _id: string;
  name: string;
  village: string;
  mobileNumber: string;
  totalMilkSupplied: number;
  totalAmountPayable: number;
  outstandingAmount: number;
}

interface LedgerItem {
  id: string;
  date: string;
  type: 'Purchase' | 'Payment';
  details: string;
  amount: number;
  direction: 'Credit' | 'Debit';
  runningBalance: number;
}

export const Suppliers: React.FC = () => {
  const { user } = useAuth();
  const canModify = ['admin', 'manager'].includes(user?.role?.toLowerCase() || '');

  // Core data states
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Ledger details view
  const [activeLedgerSupplier, setActiveLedgerSupplier] = useState<Supplier | null>(null);
  const [ledgerData, setLedgerData] = useState<LedgerItem[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    village: '',
    mobileNumber: '',
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

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/suppliers');
      setSuppliers(response.data);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormData({ name: '', village: '', mobileNumber: '' });
    setModalOpen(true);
  };

  const handleOpenEditModal = (s: Supplier) => {
    setEditingId(s._id);
    setFormData({ name: s.name, village: s.village, mobileNumber: s.mobileNumber });
    setModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/suppliers/${editingId}`, formData);
      } else {
        await api.post('/suppliers', formData);
      }
      setModalOpen(false);
      fetchSuppliers();
    } catch (err: any) {
      alert('Error saving supplier profile: ' + (err.response?.data?.message || 'Error occurred'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this supplier? This removes the supplier record.')) return;
    try {
      await api.delete(`/suppliers/${id}`);
      fetchSuppliers();
    } catch (err) {
      alert('Error deleting supplier profile');
    }
  };

  // Open running balance ledger view
  const handleViewLedger = async (supp: Supplier) => {
    setActiveLedgerSupplier(supp);
    setLedgerLoading(true);
    try {
      const response = await api.get(`/suppliers/${supp._id}/ledger`);
      setLedgerData(response.data.ledger);
    } catch (err) {
      console.error('Error fetching supplier ledger logs:', err);
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
    if (item.details.includes('Paid via UPI')) method = 'UPI';
    else if (item.details.includes('Paid via Cash')) method = 'Cash';
    else if (item.details.includes('Paid via Bank Transfer')) method = 'Bank Transfer';

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
    if (!editPaymentId || !activeLedgerSupplier) return;
    setSubmittingPaymentEdit(true);
    try {
      const payload = {
        amount: Number(paymentEditFormData.amount),
        paymentMethod: paymentEditFormData.paymentMethod,
        referenceNumber: paymentEditFormData.referenceNumber || '',
        date: paymentEditFormData.date,
      };
      await api.put(`/payables/payments/${editPaymentId}`, payload);
      setPaymentEditModalOpen(false);

      // Refresh ledger & supplier profiles
      const updatedSuppResp = await api.get(`/suppliers/${activeLedgerSupplier._id}`);
      setActiveLedgerSupplier(updatedSuppResp.data);
      handleViewLedger(updatedSuppResp.data);
      fetchSuppliers();
    } catch (err) {
      alert('Error updating payment: ' + (err as any).response?.data?.message);
    } finally {
      setSubmittingPaymentEdit(false);
    }
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.village.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.mobileNumber.includes(searchTerm)
  );

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
  };

  // Render unified ledger view if active supplier ledger is selected
  if (activeLedgerSupplier) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setActiveLedgerSupplier(null)}
            className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Supplier Account Ledger: {activeLedgerSupplier.name}</h2>
            <p className="text-xs text-slate-400">Village: {activeLedgerSupplier.village} | Contact: {activeLedgerSupplier.mobileNumber}</p>
          </div>
        </div>

        {/* Balance metrics */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Milk Delivered</p>
            <p className="text-2xl font-extrabold text-slate-800 dark:text-white mt-1">
              {activeLedgerSupplier.totalMilkSupplied.toLocaleString()} Liters
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Billings</p>
            <p className="text-2xl font-extrabold text-slate-800 dark:text-white mt-1">
              {formatCurrency(activeLedgerSupplier.totalAmountPayable)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Outstanding Payable (Owed)</p>
            <p className="text-2xl font-extrabold text-rose-500 mt-1">{formatCurrency(activeLedgerSupplier.outstandingAmount)}</p>
          </div>
        </div>

        {/* Ledger logs */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Transaction Date</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Details</th>
                  <th className="px-6 py-4">Credit (Milk Supplied)</th>
                  <th className="px-6 py-4">Debit (We Paid Cash)</th>
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
                    <td colSpan={7} className="text-center py-8 text-slate-400">No account ledger entries registered yet.</td>
                  </tr>
                ) : (
                  ledgerData.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                        {new Date(item.date).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          item.type === 'Purchase' 
                            ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                            : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                        }`}>
                          {item.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{item.details}</td>
                      <td className="px-6 py-4 font-bold text-slate-800 dark:text-white">
                        {item.direction === 'Credit' ? formatCurrency(item.amount) : '-'}
                      </td>
                      <td className="px-6 py-4 font-bold text-emerald-500">
                        {item.direction === 'Debit' ? formatCurrency(item.amount) : '-'}
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

        {/* Edit Supplier Payment Modal */}
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
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none"
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
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Date</label>
                  <input
                    type="date"
                    required
                    value={paymentEditFormData.date}
                    onChange={(e) => setPaymentEditFormData({ ...paymentEditFormData, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none"
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
            placeholder="Search by name, village, mobile"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white rounded-xl text-sm outline-none shadow-sm placeholder:text-slate-400"
          />
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center px-4 py-2.5 bg-dairy-500 hover:bg-dairy-600 text-white font-semibold rounded-2xl shadow-lg shadow-dairy-500/20 transition-all duration-150 text-sm w-full sm:w-auto justify-center"
        >
          <Plus className="w-5 h-5 mr-1" /> Add Supplier
        </button>
      </div>

      {/* Supplier Registry Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-4">Supplier Name</th>
                <th className="px-6 py-4">Village</th>
                <th className="px-6 py-4">Total Supplied</th>
                <th className="px-6 py-4">Owed Amount (Payable)</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400">
                    <div className="w-8 h-8 border-4 border-dairy-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400">No suppliers registered in database matching criteria.</td>
                </tr>
              ) : (
                filteredSuppliers.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800 dark:text-slate-100">{s.name}</div>
                      <div className="text-[10px] text-slate-400">{s.mobileNumber}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{s.village}</td>
                    <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">
                      {s.totalMilkSupplied.toLocaleString()} Liters
                    </td>
                    <td className="px-6 py-4 font-extrabold text-rose-500">
                      {formatCurrency(s.outstandingAmount)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => handleViewLedger(s)}
                          className="p-1.5 text-slate-400 hover:text-dairy-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="View Ledger Statement"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                          disabled={!canModify}
                          onClick={() => handleOpenEditModal(s)}
                          className="p-1.5 text-slate-400 hover:text-dairy-500 disabled:opacity-30 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Edit Profile"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          disabled={!canModify}
                          onClick={() => handleDelete(s._id)}
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

      {/* Edit/Add Modal Supplier Dialog */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 rounded-3xl shadow-2xl relative">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              {editingId ? 'Edit Supplier Profile' : 'Register Supplier'}
            </h3>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Supplier Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Rajesh Singh"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Village</label>
                <input
                  type="text"
                  required
                  value={formData.village}
                  onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                  placeholder="Village / Tehsil name"
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

export default Suppliers;
