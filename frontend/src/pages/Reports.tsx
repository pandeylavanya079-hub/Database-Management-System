import React, { useState } from 'react';
import api from '../services/api';
import { 
  PieChart, 
  ArrowDownLeft, 
  ArrowUpRight, 
  TrendingUp, 
  Calendar,
  FileSpreadsheet,
  Printer,
  FileText,
  AlertCircle,
  Users,
  Bell,
  Clock
} from 'lucide-react';

interface ProfitLossData {
  startDate: string;
  endDate: string;
  revenue: number;
  purchaseCost: number;
  expenses: number;
  grossProfit: number;
  netProfit: number;
}

export const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pnl' | 'outstanding' | 'overdue' | 'reminders'>('pnl');
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().substring(0, 10) // Start of month
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().substring(0, 10)
  );

  const [pnlReport, setPnlReport] = useState<ProfitLossData | null>(null);
  const [outstandingData, setOutstandingData] = useState<any[]>([]);
  const [overdueData, setOverdueData] = useState<any[]>([]);
  const [remindersData, setRemindersData] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePnlReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/reports/pnl', {
        params: { startDate, endDate }
      });
      setPnlReport(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to aggregate profit & loss statements.');
    } finally {
      setLoading(false);
    }
  };

  const fetchOutstandingReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/reports/outstanding');
      setOutstandingData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load outstanding dues report.');
    } finally {
      setLoading(false);
    }
  };

  const fetchOverdueReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/reports/overdue');
      setOverdueData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load overdue invoices report.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRemindersReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/reports/reminders');
      setRemindersData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load reminders log report.');
    } finally {
      setLoading(false);
    }
  };

  // CSV Exporters
  const handleExportPnlCSV = () => {
    if (!pnlReport) return;
    const rows = [
      ['PITAMBARA DOODH DAIRY - FINANCIAL REPORT', ''],
      ['Reporting Period', `${new Date(pnlReport.startDate).toLocaleDateString('en-IN')} to ${new Date(pnlReport.endDate).toLocaleDateString('en-IN')}`],
      ['Generated On', new Date().toLocaleString()],
      ['', ''],
      ['Financial Parameter', 'Amount (INR)'],
      ['Milk Sales Revenue (A)', pnlReport.revenue.toFixed(2)],
      ['Milk Purchase Cost (B)', pnlReport.purchaseCost.toFixed(2)],
      ['Gross Profit (A - B)', pnlReport.grossProfit.toFixed(2)],
      ['Operating Expenses (C)', pnlReport.expenses.toFixed(2)],
      ['Net Profit (A - B - C)', pnlReport.netProfit.toFixed(2)]
    ];
    triggerCSVDownload(rows, `Pitambara_PL_Report_${startDate}_to_${endDate}.csv`);
  };

  const handleExportOutstandingCSV = () => {
    if (outstandingData.length === 0) return;
    const rows = [
      ['PITAMBARA DOODH DAIRY - OUTSTANDING DUES REPORT', ''],
      ['Generated On', new Date().toLocaleString()],
      ['', ''],
      ['Customer Name', 'Mobile Number', 'Address', 'Customer Type', 'Outstanding Balance (INR)']
    ];
    outstandingData.forEach(c => {
      rows.push([c.name, c.mobileNumber, c.address, c.customerType, c.outstandingBalance.toFixed(2)]);
    });
    triggerCSVDownload(rows, `Pitambara_Outstanding_Dues_${new Date().toISOString().substring(0, 10)}.csv`);
  };

  const handleExportOverdueCSV = () => {
    if (overdueData.length === 0) return;
    const rows = [
      ['PITAMBARA DOODH DAIRY - OVERDUE INVOICES REPORT', ''],
      ['Generated On', new Date().toLocaleString()],
      ['', ''],
      ['Customer Name', 'Mobile Number', 'Invoice Status', 'Due Date', 'Total Amount Due (INR)', 'Remaining Dues (INR)']
    ];
    overdueData.forEach(r => {
      rows.push([
        r.customerName, 
        r.customerMobile || '', 
        r.status, 
        new Date(r.dueDate).toLocaleDateString('en-IN'), 
        r.amountDue.toFixed(2), 
        r.remainingAmount.toFixed(2)
      ]);
    });
    triggerCSVDownload(rows, `Pitambara_Overdue_Invoices_${new Date().toISOString().substring(0, 10)}.csv`);
  };

  const handleExportRemindersCSV = () => {
    if (remindersData.length === 0) return;
    const rows = [
      ['PITAMBARA DOODH DAIRY - REMINDERS HISTORY LOG REPORT', ''],
      ['Generated On', new Date().toLocaleString()],
      ['', ''],
      ['Sent Date & Time', 'Customer Name', 'Mobile Number', 'Reminder Type', 'Amount Reminded (INR)', 'Delivery Status']
    ];
    remindersData.forEach(rem => {
      const time = rem.sentAt ? new Date(rem.sentAt).toLocaleString('en-IN') : new Date(rem.createdAt).toLocaleString('en-IN');
      rows.push([time, rem.customerName, rem.mobile, rem.reminderType, rem.amount.toFixed(2), rem.reminderStatus]);
    });
    triggerCSVDownload(rows, `Pitambara_Reminders_History_${new Date().toISOString().substring(0, 10)}.csv`);
  };

  const triggerCSVDownload = (rows: Array<string[]>, fileName: string) => {
    const csvContent = 'data:text/csv;charset=utf-8,' 
      + rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Report Tab Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-6 hide-on-print">
        <button
          onClick={() => { setActiveTab('pnl'); setError(null); }}
          className={`pb-3 font-bold text-sm transition-all relative ${
            activeTab === 'pnl' ? 'text-dairy-500 border-b-2 border-b-dairy-500' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <div className="flex items-center"><PieChart className="w-4 h-4 mr-1.5" /> P&L Statement</div>
        </button>
        <button
          onClick={() => { setActiveTab('outstanding'); fetchOutstandingReport(); }}
          className={`pb-3 font-bold text-sm transition-all relative ${
            activeTab === 'outstanding' ? 'text-dairy-500 border-b-2 border-b-dairy-500' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <div className="flex items-center"><Users className="w-4 h-4 mr-1.5" /> Outstanding Dues</div>
        </button>
        <button
          onClick={() => { setActiveTab('overdue'); fetchOverdueReport(); }}
          className={`pb-3 font-bold text-sm transition-all relative ${
            activeTab === 'overdue' ? 'text-dairy-500 border-b-2 border-b-dairy-500' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <div className="flex items-center"><Clock className="w-4 h-4 mr-1.5" /> Overdue Invoices</div>
        </button>
        <button
          onClick={() => { setActiveTab('reminders'); fetchRemindersReport(); }}
          className={`pb-3 font-bold text-sm transition-all relative ${
            activeTab === 'reminders' ? 'text-dairy-500 border-b-2 border-b-dairy-500' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <div className="flex items-center"><Bell className="w-4 h-4 mr-1.5" /> Reminders Sent</div>
        </button>
      </div>

      {/* Date filters only for Profit & Loss tab */}
      {activeTab === 'pnl' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm hide-on-print">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex items-center">
            <Calendar className="w-4 h-4 mr-2 text-dairy-500" />
            Specify Financial Report Duration
          </h3>

          <form onSubmit={generatePnlReport} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end text-xs sm:text-sm">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Start Date</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">End Date</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-dairy-500 hover:bg-dairy-600 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-dairy-500/20 transition-all text-xs"
            >
              {loading ? 'Compiling statistics...' : 'Compile Profit & Loss'}
            </button>
          </form>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 p-4 rounded-2xl flex items-start text-red-700 dark:text-red-300 hide-on-print">
          <AlertCircle className="w-5 h-5 mr-3 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* RENDER TAB CONTENTS */}

      {/* 1. PROFIT & LOSS REPORT VIEW */}
      {activeTab === 'pnl' && (
        pnlReport ? (
          <div className="space-y-6 print-container">
            <div className="flex justify-end space-x-3 hide-on-print">
              <button
                onClick={handleExportPnlCSV}
                className="flex items-center px-4 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl text-xs font-semibold text-slate-750 dark:text-slate-350 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-500" />
                Export Excel/CSV
              </button>
              <button
                onClick={handlePrintPDF}
                className="flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-md transition-colors"
              >
                <Printer className="w-4 h-4 mr-1.5" />
                Print / Save PDF
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl space-y-6 shadow-sm border-t-4 border-t-dairy-500">
              <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-6">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">PITAMBARA DOODH DAIRY</h2>
                  <p className="text-xs text-slate-400 mt-1">Milk Dairy Chilling & Supply Logistics Center</p>
                  <p className="text-xs text-slate-450 mt-0.5">Address: Devpura, Jaitpur Kala, District Agra, Pincode 283114</p>
                </div>
                <div className="text-right">
                  <img src="/logo.png" alt="Pitambara Dairy Logo" className="w-9 h-9 object-contain bg-white rounded-full p-0.5 ml-auto" />
                  <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-2">Statement of Profit & Loss</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Duration: {new Date(pnlReport.startDate).toLocaleDateString('en-IN')} - {new Date(pnlReport.endDate).toLocaleDateString('en-IN')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
                <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100/50 dark:border-emerald-900/20">
                  <p className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">Gross Milk Revenue</p>
                  <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{formatCurrency(pnlReport.revenue)}</p>
                </div>
                <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100/50 dark:border-rose-900/20">
                  <p className="text-[10px] font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider">Milk Intake Cost</p>
                  <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">{formatCurrency(pnlReport.purchaseCost)}</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Net Surplus (Profit)</p>
                  <p className={`text-2xl font-extrabold mt-1 ${pnlReport.netProfit >= 0 ? 'text-dairy-600 dark:text-dairy-400' : 'text-rose-500'}`}>
                    {formatCurrency(pnlReport.netProfit)}
                  </p>
                </div>
              </div>

              <div className="border border-slate-150 dark:border-slate-800 rounded-2xl overflow-hidden mt-6">
                <div className="bg-slate-50 dark:bg-slate-900 px-6 py-3 border-b border-slate-150 dark:border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Financial Schedule Overview
                </div>
                <div className="divide-y divide-slate-150 dark:divide-slate-800 text-sm">
                  <div className="px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center">
                      <ArrowDownLeft className="w-5 h-5 text-emerald-500 mr-3" />
                      <div>
                        <h4 className="font-bold text-slate-800 dark:text-white">Revenue (Total Sales)</h4>
                        <p className="text-xs text-slate-400">Total milk distributed to parlours</p>
                      </div>
                    </div>
                    <span className="font-bold text-slate-800 dark:text-white">{formatCurrency(pnlReport.revenue)}</span>
                  </div>

                  <div className="px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center">
                      <ArrowUpRight className="w-5 h-5 text-rose-500 mr-3" />
                      <div>
                        <h4 className="font-bold text-slate-800 dark:text-white">Purchase Cost (Milk Purchases)</h4>
                        <p className="text-xs text-slate-400">Total payments owed to village vendors</p>
                      </div>
                    </div>
                    <span className="font-bold text-slate-850 dark:text-slate-100">({formatCurrency(pnlReport.purchaseCost)})</span>
                  </div>

                  <div className="px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center">
                      <TrendingUp className="w-5 h-5 text-dairy-600 mr-3" />
                      <div>
                        <h4 className="font-bold text-slate-800 dark:text-white">Gross Operational Margin</h4>
                        <p className="text-xs text-slate-400">Revenue minus purchase cost</p>
                      </div>
                    </div>
                    <span className="font-bold text-slate-800 dark:text-white">{formatCurrency(pnlReport.grossProfit)}</span>
                  </div>

                  <div className="px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center">
                      <FileText className="w-5 h-5 text-amber-500 mr-3" />
                      <div>
                        <h4 className="font-bold text-slate-800 dark:text-white">Operating Expenses</h4>
                        <p className="text-xs text-slate-400">Salaries, fuel, transport overheads, chiller maintenance</p>
                      </div>
                    </div>
                    <span className="font-bold text-slate-850 dark:text-slate-100">({formatCurrency(pnlReport.expenses)})</span>
                  </div>

                  <div className="px-6 py-5 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 border-t-2 border-t-slate-200 dark:border-t-slate-800">
                    <span className="font-extrabold text-base text-slate-800 dark:text-white">NET PROFIT / LOSS</span>
                    <span className={`font-extrabold text-lg ${pnlReport.netProfit >= 0 ? 'text-dairy-600 dark:text-dairy-400' : 'text-rose-500'}`}>
                      {formatCurrency(pnlReport.netProfit)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="text-[10px] text-slate-450 text-center border-t border-slate-100 dark:border-slate-800 pt-6">
                Pitambara Doodh Dairy DMS ERP • Confidential Financial Summary • Generated on {new Date().toLocaleString()}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl text-center text-slate-400 text-sm">
            Select date criteria above and click "Compile" to generate profit & loss statements.
          </div>
        )
      )}

      {/* 2. OUTSTANDING DUES GRID VIEW */}
      {activeTab === 'outstanding' && (
        <div className="space-y-6">
          <div className="flex justify-end space-x-3 hide-on-print">
            <button
              onClick={handleExportOutstandingCSV}
              disabled={outstandingData.length === 0}
              className="flex items-center px-4 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl text-xs font-semibold text-slate-750 dark:text-slate-350 disabled:opacity-50 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-500" />
              Export Excel/CSV
            </button>
            <button
              onClick={handlePrintPDF}
              className="flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-md transition-colors"
            >
              <Printer className="w-4 h-4 mr-1.5" />
              Print / Save PDF
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="bg-slate-50 dark:bg-slate-900 px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-slate-800 dark:text-white">Outstanding Customer Balances</h3>
              <p className="text-xs text-slate-450 mt-0.5">List of active retail and wholesale customer ledger balances requiring collection.</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-4">Customer Name</th>
                    <th className="px-6 py-4">Mobile Number</th>
                    <th className="px-6 py-4">Address</th>
                    <th className="px-6 py-4">Customer Type</th>
                    <th className="px-6 py-4">Outstanding Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-400">
                        <div className="w-8 h-8 border-4 border-dairy-500 border-t-transparent rounded-full animate-spin mx-auto" />
                      </td>
                    </tr>
                  ) : outstandingData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-400">No customers found with outstanding balances!</td>
                    </tr>
                  ) : (
                    outstandingData.map((cust) => (
                      <tr key={cust._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                        <td className="px-6 py-4 font-bold text-slate-850 dark:text-slate-100">{cust.name}</td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{cust.mobileNumber}</td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{cust.address}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            cust.customerType === 'Wholesale'
                              ? 'bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300'
                              : 'bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300'
                          }`}>
                            {cust.customerType}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-extrabold text-rose-500">{formatCurrency(cust.outstandingBalance)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. OVERDUE INVOICES GRID VIEW */}
      {activeTab === 'overdue' && (
        <div className="space-y-6">
          <div className="flex justify-end space-x-3 hide-on-print">
            <button
              onClick={handleExportOverdueCSV}
              disabled={overdueData.length === 0}
              className="flex items-center px-4 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl text-xs font-semibold text-slate-750 dark:text-slate-350 disabled:opacity-50 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-500" />
              Export Excel/CSV
            </button>
            <button
              onClick={handlePrintPDF}
              className="flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-md transition-colors"
            >
              <Printer className="w-4 h-4 mr-1.5" />
              Print / Save PDF
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="bg-slate-50 dark:bg-slate-900 px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-slate-800 dark:text-white">Overdue Invoices Grid</h3>
              <p className="text-xs text-slate-450 mt-0.5">List of unpaid/partially paid credit sales transactions that have exceeded their 15-day credit period.</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-4">Customer Name</th>
                    <th className="px-6 py-4">Mobile Number</th>
                    <th className="px-6 py-4">Invoice Status</th>
                    <th className="px-6 py-4">Original Due Date</th>
                    <th className="px-6 py-4">Total Amount Due</th>
                    <th className="px-6 py-4">Remaining Dues</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400">
                        <div className="w-8 h-8 border-4 border-dairy-500 border-t-transparent rounded-full animate-spin mx-auto" />
                      </td>
                    </tr>
                  ) : overdueData.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400">Great! No overdue invoices found.</td>
                    </tr>
                  ) : (
                    overdueData.map((rec) => (
                      <tr key={rec._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                        <td className="px-6 py-4 font-bold text-slate-850 dark:text-slate-100">{rec.customerName}</td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{rec.customerMobile || '-'}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            rec.status === 'Unpaid'
                              ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                              : 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                          }`}>
                            {rec.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-rose-500 font-semibold">{new Date(rec.dueDate).toLocaleDateString('en-IN')}</td>
                        <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{formatCurrency(rec.amountDue)}</td>
                        <td className="px-6 py-4 font-extrabold text-rose-600 dark:text-rose-400">{formatCurrency(rec.remainingAmount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. REMINDERS HISTORY REPORT VIEW */}
      {activeTab === 'reminders' && (
        <div className="space-y-6">
          <div className="flex justify-end space-x-3 hide-on-print">
            <button
              onClick={handleExportRemindersCSV}
              disabled={remindersData.length === 0}
              className="flex items-center px-4 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl text-xs font-semibold text-slate-750 dark:text-slate-350 disabled:opacity-50 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-500" />
              Export Excel/CSV
            </button>
            <button
              onClick={handlePrintPDF}
              className="flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-md transition-colors"
            >
              <Printer className="w-4 h-4 mr-1.5" />
              Print / Save PDF
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="bg-slate-50 dark:bg-slate-900 px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-slate-800 dark:text-white">Reminders Dispatch Log</h3>
              <p className="text-xs text-slate-450 mt-0.5">Audit log of all manual and automated payment reminders sent to clients via WhatsApp, SMS, or Email.</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-4">Date & Time</th>
                    <th className="px-6 py-4">Customer Name</th>
                    <th className="px-6 py-4">Mobile Number</th>
                    <th className="px-6 py-4">Reminder Type</th>
                    <th className="px-6 py-4">Amount Reminded</th>
                    <th className="px-6 py-4">Delivery Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400">
                        <div className="w-8 h-8 border-4 border-dairy-500 border-t-transparent rounded-full animate-spin mx-auto" />
                      </td>
                    </tr>
                  ) : remindersData.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400">No payment reminders recorded in the database history.</td>
                    </tr>
                  ) : (
                    remindersData.map((rem) => (
                      <tr key={rem._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                          {rem.sentAt ? new Date(rem.sentAt).toLocaleString('en-IN') : new Date(rem.createdAt).toLocaleString('en-IN')}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-850 dark:text-slate-100">{rem.customerName}</td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{rem.mobile}</td>
                        <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-200">{rem.reminderType}</td>
                        <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300">{formatCurrency(rem.amount)}</td>
                        <td className="px-6 py-4">
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
        </div>
      )}

      {/* CSS injection for print layouts */}
      <style>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          .hide-on-print {
            display: none !important;
          }
          aside, header {
            display: none !important;
          }
          main {
            padding: 0 !important;
          }
          .print-container {
            margin: 0 !important;
            padding: 0 !important;
          }
          .bg-white, .bg-slate-50 {
            background-color: transparent !important;
          }
          .border, .border-slate-200 {
            border-color: #cbd5e1 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Reports;
