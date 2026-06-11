import { Response } from 'express';
import { Expense } from '../models/Expense';
import { AuthenticatedRequest } from '../middleware/auth';
import { logAudit } from '../utils/audit';
import { recalculateCachedProfitReports } from '../utils/profitLoss';

export const getExpenses = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { startDate, endDate, expenseType } = req.query;
  const filter: any = {};

  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate as string);
    if (endDate) filter.date.$lte = new Date(endDate as string);
  }

  if (expenseType) {
    filter.expenseType = expenseType;
  }

  try {
    const expenses = await Expense.find(filter).sort({ date: -1 });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const createExpense = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { date, expenseType, amount, description } = req.body;
  try {
    const expense = await Expense.create({
      date: date ? new Date(date) : new Date(),
      expenseType,
      amount,
      description,
    });
    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const updateExpense = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { date, expenseType, amount, description } = req.body;

  try {
    const expense = await Expense.findById(id);
    if (!expense) {
      res.status(404).json({ message: 'Expense record not found' });
      return;
    }

    const oldSnapshot = {
      date: expense.date,
      expenseType: expense.expenseType,
      amount: expense.amount,
      description: expense.description
    };

    const newAmount = amount !== undefined && amount !== null ? Number(amount) : expense.amount;

    expense.date = date ? new Date(date) : expense.date;
    expense.expenseType = expenseType || expense.expenseType;
    expense.amount = newAmount;
    expense.description = description !== undefined ? description : expense.description;
    await expense.save();

    // Create Audit Log
    await logAudit(
      req.user?.email || 'Admin',
      'Edit Expense',
      oldSnapshot,
      {
        date: expense.date,
        expenseType: expense.expenseType,
        amount: newAmount,
        description: expense.description
      }
    );

    // Automatically update P&L cache entries covering this date
    await recalculateCachedProfitReports(expense.date);

    res.json(expense);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const deleteExpense = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const expense = await Expense.findById(id);
    if (!expense) {
      res.status(404).json({ message: 'Expense record not found' });
      return;
    }

    const expenseDate = expense.date;
    await expense.deleteOne();

    // Recalculate profit report
    await recalculateCachedProfitReports(expenseDate);

    res.json({ message: 'Expense record deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const getExpenseAnalysis = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Aggregation of total expenses grouped by expenseType
    const breakdown = await Expense.aggregate([
      {
        $group: {
          _id: '$expenseType',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalAmount: -1 } },
    ]);

    // Aggregation of monthly expense patterns
    const monthlyTrend = await Expense.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
          totalAmount: { $sum: '$amount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({ breakdown, monthlyTrend });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
