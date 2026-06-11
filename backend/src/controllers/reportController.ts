import { Response } from 'express';
import { MilkSale } from '../models/MilkSale';
import { MilkPurchase } from '../models/MilkPurchase';
import { Expense } from '../models/Expense';
import { ProfitReport } from '../models/ProfitReport';
import { Customer } from '../models/Customer';
import { Receivable } from '../models/Receivable';
import { Reminder } from '../models/Reminder';
import { AuthenticatedRequest } from '../middleware/auth';

export const getProfitLossReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    res.status(400).json({ message: 'Start date and end date parameters are required' });
    return;
  }

  const sDate = new Date(startDate as string);
  const eDate = new Date(endDate as string);
  // Ensure eDate covers the full day up to 23:59:59
  eDate.setHours(23, 59, 59, 999);

  try {
    // 1. Calculate Milk Sales Revenue
    const salesAgg = await MilkSale.aggregate([
      { $match: { saleDate: { $gte: sDate, $lte: eDate } } },
      { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } },
    ]);
    const revenue = salesAgg[0]?.totalRevenue || 0;

    // 2. Calculate Milk Purchase Cost
    const purchaseAgg = await MilkPurchase.aggregate([
      { $match: { purchaseDate: { $gte: sDate, $lte: eDate } } },
      { $group: { _id: null, totalCost: { $sum: '$totalAmount' } } },
    ]);
    const purchaseCost = purchaseAgg[0]?.totalCost || 0;

    // 3. Calculate Operating Expenses
    const expenseAgg = await Expense.aggregate([
      { $match: { date: { $gte: sDate, $lte: eDate } } },
      { $group: { _id: null, totalExpenses: { $sum: '$amount' } } },
    ]);
    const expenses = expenseAgg[0]?.totalExpenses || 0;

    // 4. Calculate Margins
    const grossProfit = Number((revenue - purchaseCost).toFixed(2));
    const netProfit = Number((revenue - purchaseCost - expenses).toFixed(2));

    // Save/cache this report structure
    const report = await ProfitReport.create({
      startDate: sDate,
      endDate: eDate,
      revenue,
      purchaseCost,
      expenses,
      grossProfit,
      netProfit,
      generatedBy: req.user._id,
    });

    res.json(report);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const getSavedReports = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const reports = await ProfitReport.find({})
      .populate('generatedBy', 'name email')
      .sort({ createdAt: -1 });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const getOutstandingReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const customers = await Customer.find({ outstandingBalance: { $gt: 0 } }).sort({ outstandingBalance: -1 });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const getOverdueReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const today = new Date();
    const overdue = await Receivable.find({
      status: { $in: ['Unpaid', 'Partially Paid'] },
      dueDate: { $lt: today }
    }).sort({ dueDate: 1 });
    res.json(overdue);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const getRemindersReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const reminders = await Reminder.find({}).sort({ createdAt: -1 });
    res.json(reminders);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
