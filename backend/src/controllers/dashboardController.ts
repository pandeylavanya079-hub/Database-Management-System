import { Response } from 'express';
import { MilkPurchase } from '../models/MilkPurchase';
import { MilkSale } from '../models/MilkSale';
import { Customer } from '../models/Customer';
import { Supplier } from '../models/Supplier';
import { Receivable } from '../models/Receivable';
import { Payable } from '../models/Payable';
import { Expense } from '../models/Expense';
import { Reminder } from '../models/Reminder';
import { AuthenticatedRequest } from '../middleware/auth';

export const getDashboardStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const isAdmin = req.user?.role === 'Admin';
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  try {
    // 1. Today's Purchases Liters and Value
    const purchaseStats = await MilkPurchase.aggregate([
      { $match: { purchaseDate: { $gte: today, $lt: tomorrow } } },
      {
        $group: {
          _id: null,
          quantity: { $sum: '$quantity' },
          cost: { $sum: '$totalAmount' },
        },
      },
    ]);

    // 2. Today's Sales Liters and Value
    const salesStats = await MilkSale.aggregate([
      { $match: { saleDate: { $gte: today, $lt: tomorrow } } },
      {
        $group: {
          _id: null,
          quantity: { $sum: '$quantity' },
          revenue: { $sum: '$totalAmount' },
        },
      },
    ]);

    // 3. Count masters
    const totalCustomers = await Customer.countDocuments();
    const totalSuppliers = await Supplier.countDocuments();

    // 4. Accounts Ledger Sums
    const receivablesAgg = await Customer.aggregate([
      { $group: { _id: null, total: { $sum: '$outstandingBalance' } } },
    ]);
    const totalReceivables = receivablesAgg[0]?.total || 0;

    const payablesAgg = await Supplier.aggregate([
      { $group: { _id: null, total: { $sum: '$outstandingAmount' } } },
    ]);
    const totalPayables = payablesAgg[0]?.total || 0;

    // 5. Operational Daily Collection trends (Last 7 Days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const collectionTrend = await MilkPurchase.aggregate([
      { $match: { purchaseDate: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$purchaseDate' } },
          quantity: { $sum: '$quantity' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const distributionTrend = await MilkSale.aggregate([
      { $match: { saleDate: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$saleDate' } },
          quantity: { $sum: '$quantity' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // 6. Expense Calculations (Admin Only)
    let totalExpenses = 0;
    if (isAdmin) {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const expenseAgg = await Expense.aggregate([
        { $match: { date: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);
      totalExpenses = expenseAgg[0]?.total || 0;
    }

    // 7. Reminder and Overdue stats
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const remindersSentToday = await Reminder.countDocuments({
      sentAt: { $gte: todayStart }
    });

    const duePaymentsCount = await Customer.countDocuments({ outstandingBalance: { $gt: 0 } });

    const overdueCustomers = await Receivable.distinct('customerId', {
      status: { $in: ['Unpaid', 'Partially Paid'] },
      dueDate: { $lt: new Date() }
    });
    const overdueCustomerCount = overdueCustomers.length;

    // Response object
    const stats: any = {
      todayPurchasedLiters: purchaseStats[0]?.quantity || 0,
      todaySoldLiters: salesStats[0]?.quantity || 0,
      totalCustomers,
      totalSuppliers,
      collectionTrend,
      distributionTrend,
      duePaymentsCount,
      remindersSentToday,
      overdueCustomerCount,
    };

    // Append financial metrics if Admin
    if (isAdmin) {
      stats.todayPurchasedCost = purchaseStats[0]?.cost || 0;
      stats.todaySoldRevenue = salesStats[0]?.revenue || 0;
      stats.totalReceivables = Number(totalReceivables.toFixed(2));
      stats.totalPayables = Number(totalPayables.toFixed(2));
      stats.monthlyExpenses = Number(totalExpenses.toFixed(2));
      
      // Calculate gross profit and net profit indicators
      // Month-to-date
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const mtdSales = await MilkSale.aggregate([
        { $match: { saleDate: { $gte: startOfMonth } } },
        { $group: { _id: null, sum: { $sum: '$totalAmount' } } }
      ]);
      const mtdPurchases = await MilkPurchase.aggregate([
        { $match: { purchaseDate: { $gte: startOfMonth } } },
        { $group: { _id: null, sum: { $sum: '$totalAmount' } } }
      ]);

      const monthlyRevenue = mtdSales[0]?.sum || 0;
      const monthlyPurchaseCost = mtdPurchases[0]?.sum || 0;
      
      stats.mtdRevenue = Number(monthlyRevenue.toFixed(2));
      stats.mtdNetProfit = Number((monthlyRevenue - monthlyPurchaseCost - totalExpenses).toFixed(2));
    }

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
