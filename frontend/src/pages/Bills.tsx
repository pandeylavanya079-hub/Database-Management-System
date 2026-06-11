import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  Plus, 
  Trash2, 
  Search, 
  X, 
  Printer, 
  Share2, 
  FileText, 
  Send,
  Calendar,
  Receipt,
  AlertCircle
} from 'lucide-react';

interface BillItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface Bill {
  _id: string;
  billNumber: string;
  customerId: string;
  customerName: string;
  customerMobile: string;
  billDate: string;
  dueDate: string;
  items: BillItem[];
  subtotal: number;
  discount: number;
  tax: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'Paid' | 'Unpaid' | 'Partially Paid';
  businessName: string;
  businessAddress: string;
  businessPhone: string;
}

interface Customer {
  _id: string;
  name: string;
  mobileNumber: string;
  address: string;
}

export const Bills: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === 'Admin';
  const canCreate = ['Admin', 'Manager'].includes(user?.role || '');

  // Core Data State
  const [bills, setBills] = useState<Bill[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modal Dialog States
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewBill, setViewBill] = useState<Bill | null>(null);

  // Form State
  const [submitting, setSubmitting] = useState(false);
  const [formCustomerId, setFormCustomerId] = useState('');
  const [formBillDate, setFormBillDate] = useState(new Date().toISOString().substring(0, 10));
  const [formDueDate, setFormDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15); // default due in 15 days
    return d.toISOString().substring(0, 10);
  });
  const [formDiscount, setFormDiscount] = useState('0');
  const [formTax, setFormTax] = useState('0');
  const [formPaidAmount, setFormPaidAmount] = useState('0');
  const [formItems, setFormItems] = useState<{ description: string; quantity: string; rate: string }[]>([
    { description: 'Standard Milk Intake', quantity: '10', rate: '50' }
  ]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [billsResp, customersResp] = await Promise.all([
        api.get('/bills'),
        api.get('/customers')
      ]);
      setBills(billsResp.data);
      setCustomers(customersResp.data);
      if (customersResp.data.length > 0) {
        setFormCustomerId(customersResp.data[0]._id);
      }
    } catch (err) {
      console.error('Error fetching billing data:', err);
      toast.error('Failed to load operational bills');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Form Item Actions
  const handleAddItemRow = () => {
    setFormItems([...formItems, { description: '', quantity: '1', rate: '0' }]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (formItems.length === 1) return;
    setFormItems(formItems.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: string, val: string) => {
    const list = [...formItems];
    (list[index] as any)[field] = val;
    setFormItems(list);
  };

  // Math Calculations for Form
  const calcSubtotal = () => {
    return formItems.reduce((sum, item) => {
      const q = parseFloat(item.quantity) || 0;
      const r = parseFloat(item.rate) || 0;
      return sum + (q * r);
    }, 0);
  };

  const calcTotal = () => {
    const sub = calcSubtotal();
    const d = parseFloat(formDiscount) || 0;
    const t = parseFloat(formTax) || 0;
    const tot = sub + t - d;
    return tot < 0 ? 0 : tot;
  };

  const calcRemaining = () => {
    const tot = calcTotal();
    const p = parseFloat(formPaidAmount) || 0;
    const rem = tot - p;
    return rem < 0 ? 0 : rem;
  };

  // Submission handler
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCustomerId) {
      toast.error('Please select a customer first');
      return;
    }

    setSubmitting(true);
    try {
      const itemsPayload = formItems.map(item => ({
        description: item.description || 'Milk supply',
        quantity: parseFloat(item.quantity) || 0,
        rate: parseFloat(item.rate) || 0,
        amount: (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0)
      }));

      const payload = {
        customerId: formCustomerId,
        billDate: formBillDate,
        dueDate: formDueDate,
        items: itemsPayload,
        discount: parseFloat(formDiscount) || 0,
        tax: parseFloat(formTax) || 0,
        paidAmount: parseFloat(formPaidAmount) || 0
      };

      await api.post('/bills', payload);
      toast.success('Invoice bill generated successfully');
      setCreateModalOpen(false);
      
      // Reset form states
      setFormDiscount('0');
      setFormTax('0');
      setFormPaidAmount('0');
      setFormItems([{ description: 'Standard Milk Intake', quantity: '10', rate: '50' }]);
      
      loadData();
    } catch (err: any) {
      console.error('Error creating bill:', err);
      toast.error(err.response?.data?.message || 'Error occurred generating bill');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Handler
  const handleDeleteBill = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this invoice? The customer balance will be automatically reverted.')) return;
    try {
      await api.delete(`/bills/${id}`);
      toast.success('Invoice deleted successfully');
      loadData();
    } catch (err) {
      toast.error('Could not delete bill record');
    }
  };

  // Dispatch Reminders
  const handleSendReminder = async (id: string, type: 'WhatsApp' | 'SMS') => {
    try {
      await api.post(`/bills/${id}/send`, { type });
      toast.success(`Invoice bill sent to customer via ${type}`);
    } catch (err) {
      toast.error('Could not send notification');
    }
  };

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // Filters logic
  const filteredBills = bills.filter(bill => {
    const matchesSearch = bill.billNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          bill.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === 'All') return matchesSearch;
    return matchesSearch && bill.status === statusFilter;
  });

  return (
    <div className="space-y-6 print-container">
      {/* Printable CSS Helper */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-modal, .print-modal * {
            visibility: visible;
          }
          .print-modal {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
            padding: 0 !important;
          }
          .print-btn-group {
            display: none !important;
          }
        }
      `}</style>

      {/* Header operations bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm print:hidden">
        <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search invoice no. / client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-2xl outline-none text-xs font-semibold"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-semibold outline-none"
          >
            <option value="All">All Invoices</option>
            <option value="Paid">Paid</option>
            <option value="Unpaid">Unpaid</option>
            <option value="Partially Paid">Partially Paid</option>
          </select>
        </div>

        {canCreate && (
          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center px-4 py-2.5 bg-dairy-500 hover:bg-dairy-600 text-white font-semibold rounded-2xl shadow-lg shadow-dairy-500/20 text-xs self-stretch sm:self-auto justify-center"
          >
            <Plus className="w-4 h-4 mr-1" /> Generate New Bill
          </button>
        )}
      </div>

      {/* Bills Grid/Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm print:hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-4">Bill Number</th>
                <th className="px-6 py-4">Client Name</th>
                <th className="px-6 py-4">Bill Date</th>
                <th className="px-6 py-4">Due Date</th>
                <th className="px-6 py-4 text-right">Total Amount</th>
                <th className="px-6 py-4 text-right">Remaining Due</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8">
                    <div className="w-8 h-8 border-4 border-dairy-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400 font-semibold">No bills registered in the system.</td>
                </tr>
              ) : (
                filteredBills.map((bill) => (
                  <tr key={bill._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                    <td className="px-6 py-4 font-bold text-dairy-600 dark:text-dairy-400">{bill.billNumber}</td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-100">{bill.customerName}</div>
                      <div className="text-[10px] text-slate-400">{bill.customerMobile}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-450">
                      {new Date(bill.billDate).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-450">
                      {new Date(bill.dueDate).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-850 dark:text-slate-100">
                      ₹{bill.totalAmount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-rose-500 dark:text-rose-450">
                      ₹{bill.remainingAmount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        bill.status === 'Paid'
                          ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                          : bill.status === 'Partially Paid'
                          ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                          : 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                      }`}>
                        {bill.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => setViewBill(bill)}
                          className="p-1.5 text-slate-400 hover:text-dairy-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                          title="View / Print Bill"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteBill(bill._id)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                            title="Delete Bill"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bill View printable Modal Dialog */}
      {viewBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 relative print-modal">
            {/* Header banner */}
            <div className="flex justify-between items-start border-b border-slate-150 dark:border-slate-800 pb-5 mb-5">
              <div className="flex items-center space-x-2">
                <img src="/logo.png" alt="Pitambara Dairy Logo" className="w-10 h-10 object-contain bg-white rounded-full p-0.5" />
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white uppercase leading-none">
                    PITAMBARA <span className="text-dairy-500">DAIRY</span>
                  </h2>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-450">DMS ERP Billing Portal</span>
                </div>
              </div>
              
              <div className="text-right">
                <span className={`inline-flex items-center text-xs font-black px-2.5 py-0.5 rounded-full uppercase ${
                  viewBill.status === 'Paid'
                    ? 'bg-emerald-100 text-emerald-800'
                    : viewBill.status === 'Partially Paid'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}>
                  {viewBill.status}
                </span>
                <p className="text-xs text-slate-400 mt-1 font-mono">Invoice: {viewBill.billNumber}</p>
              </div>

              {/* Close Button (Hidden on Print) */}
              <button 
                onClick={() => setViewBill(null)}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-650 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all print-btn-group"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Bill Details Info */}
            <div className="grid grid-cols-2 gap-6 text-xs text-slate-650 dark:text-slate-350 mb-6">
              <div>
                <h4 className="font-extrabold uppercase text-slate-400 tracking-wider mb-2">FROM (BUSINESS)</h4>
                <p className="font-bold text-slate-800 dark:text-white">{viewBill.businessName}</p>
                <p>{viewBill.businessAddress}</p>
                <p className="font-semibold mt-1">Phone: {viewBill.businessPhone}</p>
              </div>

              <div>
                <h4 className="font-extrabold uppercase text-slate-400 tracking-wider mb-2">BILL TO (CUSTOMER)</h4>
                <p className="font-bold text-slate-800 dark:text-white">{viewBill.customerName}</p>
                <p>{viewBill.customerMobile}</p>
                <p className="font-mono mt-1">
                  Bill Date: {new Date(viewBill.billDate).toLocaleDateString('en-IN')}<br />
                  Due Date: {new Date(viewBill.dueDate).toLocaleDateString('en-IN')}
                </p>
              </div>
            </div>

            {/* Itemized Table */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden mb-6">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-550">
                    <th className="px-4 py-2.5">Item Description</th>
                    <th className="px-4 py-2.5 text-right">Qty (L/Kg)</th>
                    <th className="px-4 py-2.5 text-right">Rate</th>
                    <th className="px-4 py-2.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {viewBill.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-2 font-semibold text-slate-800 dark:text-slate-200">{item.description}</td>
                      <td className="px-4 py-2 text-right font-mono">{item.quantity}</td>
                      <td className="px-4 py-2 text-right font-mono">₹{item.rate}</td>
                      <td className="px-4 py-2 text-right font-bold text-slate-800 dark:text-slate-100">₹{item.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Invoice Totals layout */}
            <div className="flex justify-between items-start text-xs border-t border-slate-150 dark:border-slate-800 pt-5">
              <div className="text-slate-400 italic">
                Thank you for your business!<br />
                Computer generated invoice - no signature required.
              </div>

              <div className="w-64 space-y-2 text-right">
                <div className="flex justify-between font-semibold text-slate-600 dark:text-slate-400">
                  <span>Subtotal:</span>
                  <span className="font-mono">₹{viewBill.subtotal.toLocaleString()}</span>
                </div>
                {viewBill.tax > 0 && (
                  <div className="flex justify-between text-slate-550">
                    <span>Tax (+) :</span>
                    <span className="font-mono">₹{viewBill.tax}</span>
                  </div>
                )}
                {viewBill.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Discount (-) :</span>
                    <span className="font-mono">₹{viewBill.discount}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-slate-800 dark:text-white border-t border-slate-100 dark:border-slate-800 pt-2 text-sm">
                  <span>Grand Total:</span>
                  <span className="font-mono text-dairy-600 dark:text-dairy-400">₹{viewBill.totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-emerald-600">
                  <span>Paid Amount:</span>
                  <span className="font-mono">₹{viewBill.paidAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t border-dashed border-slate-200 dark:border-slate-800 pt-2 font-bold text-rose-500 dark:text-rose-400 text-sm">
                  <span>Balance Due:</span>
                  <span className="font-mono">₹{viewBill.remainingAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Actions Bar Footer (Hidden on print) */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 mt-8 border-t border-slate-150 dark:border-slate-800 pt-5 print-btn-group">
              <button
                onClick={() => handleSendReminder(viewBill._id, 'WhatsApp')}
                className="flex items-center justify-center px-4 py-2 border border-emerald-500/30 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/20 font-bold rounded-xl text-xs transition-colors"
              >
                <Share2 className="w-4 h-4 mr-1.5" /> Share WhatsApp
              </button>
              <button
                onClick={() => handleSendReminder(viewBill._id, 'SMS')}
                className="flex items-center justify-center px-4 py-2 border border-sky-500/30 text-sky-700 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-950/20 font-bold rounded-xl text-xs transition-colors"
              >
                <Send className="w-4 h-4 mr-1.5" /> Send SMS
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center justify-center px-4 py-2 bg-dairy-500 hover:bg-dairy-600 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-dairy-500/20"
              >
                <Printer className="w-4 h-4 mr-1.5" /> Print / Save PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Creation Modal popup dialog */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 relative">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex items-center">
              <Receipt className="w-5 h-5 mr-1.5 text-dairy-500" /> Generate Invoice Bill
            </h3>

            {/* Form */}
            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs sm:text-sm">
              {/* Customer Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Select Client Customer</label>
                <select
                  required
                  value={formCustomerId}
                  onChange={(e) => setFormCustomerId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none font-bold"
                >
                  <option value="">-- Choose Client Customer --</option>
                  {customers.map(c => (
                    <option key={c._id} value={c._id}>{c.name} ({c.mobileNumber})</option>
                  ))}
                </select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Bill Date</label>
                  <input
                    type="date"
                    required
                    value={formBillDate}
                    onChange={(e) => setFormBillDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Due Date</label>
                  <input
                    type="date"
                    required
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none font-bold"
                  />
                </div>
              </div>

              {/* Expandable Items List */}
              <div className="border border-slate-150 dark:border-slate-800 p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wider">Itemized Line Entries</h4>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="px-2.5 py-1 text-[10px] font-bold bg-dairy-100 hover:bg-dairy-200 text-dairy-700 rounded-lg transition-colors"
                  >
                    + Add Entry Row
                  </button>
                </div>

                <div className="space-y-3 max-h-40 overflow-y-auto pr-1">
                  {formItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        required
                        placeholder="Description (e.g. Buffalo Milk)"
                        value={item.description}
                        onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-750 text-slate-800 dark:text-white rounded-xl text-xs outline-none"
                      />
                      <input
                        type="number"
                        required
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        className="w-16 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-750 text-slate-800 dark:text-white rounded-xl text-xs outline-none text-right font-mono"
                      />
                      <input
                        type="number"
                        required
                        placeholder="Rate"
                        value={item.rate}
                        onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                        className="w-16 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-750 text-slate-800 dark:text-white rounded-xl text-xs outline-none text-right font-mono"
                      />
                      <button
                        type="button"
                        disabled={formItems.length === 1}
                        onClick={() => handleRemoveItemRow(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Adjustments */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Discount (₹)</label>
                  <input
                    type="number"
                    value={formDiscount}
                    onChange={(e) => setFormDiscount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none font-semibold text-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tax (₹)</label>
                  <input
                    type="number"
                    value={formTax}
                    onChange={(e) => setFormTax(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none font-semibold text-red-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Paid Amount (₹)</label>
                  <input
                    type="number"
                    value={formPaidAmount}
                    onChange={(e) => setFormPaidAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none font-semibold text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              {/* Live Totals summary */}
              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 border border-slate-150 dark:border-slate-800 rounded-2xl flex justify-between items-center text-xs">
                <div>
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Calculated subtotal</p>
                  <p className="text-base font-bold text-slate-700 dark:text-slate-350">₹{calcSubtotal().toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Remaining Balance Due</p>
                  <p className="text-base font-black text-rose-500">₹{calcRemaining().toLocaleString()}</p>
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-400 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-dairy-500 hover:bg-dairy-600 text-white font-bold rounded-xl shadow-lg shadow-dairy-500/20 flex items-center"
                >
                  {submitting ? 'Creating...' : 'Save & Print Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Bills;
