import ProfitReport from '../models/ProfitReport';
import MilkSale from '../models/MilkSale';
import MilkPurchase from '../models/MilkPurchase';
import Expense from '../models/Expense';

export const recalculateCachedProfitReports = async (date: Date): Promise<void> => {
  try {
    const matchingReports = await ProfitReport.find({
      startDate: { $lte: date },
      endDate: { $gte: date },
    });

    for (const report of matchingReports) {
      // 1. Calculate Milk Sales Revenue
      const salesAgg = await MilkSale.aggregate([
        { $match: { saleDate: { $gte: report.startDate, $lte: report.endDate } } },
        { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } },
      ]);
      const revenue = salesAgg[0]?.totalRevenue || 0;

      // 2. Calculate Milk Purchase Cost
      const purchaseAgg = await MilkPurchase.aggregate([
        { $match: { purchaseDate: { $gte: report.startDate, $lte: report.endDate } } },
        { $group: { _id: null, totalCost: { $sum: '$totalAmount' } } },
      ]);
      const purchaseCost = purchaseAgg[0]?.totalCost || 0;

      // 3. Calculate Operating Expenses
      const expenseAgg = await Expense.aggregate([
        { $match: { date: { $gte: report.startDate, $lte: report.endDate } } },
        { $group: { _id: null, totalExpenses: { $sum: '$amount' } } },
      ]);
      const expenses = expenseAgg[0]?.totalExpenses || 0;

      // 4. Update cache report fields
      report.revenue = revenue;
      report.purchaseCost = purchaseCost;
      report.expenses = expenses;
      report.grossProfit = Number((revenue - purchaseCost).toFixed(2));
      report.netProfit = Number((revenue - purchaseCost - expenses).toFixed(2));
      await report.save();
    }
  } catch (error: any) {
    console.error(`[RECALCULATE PL ERROR] Failed: ${error.message}`);
  }
};
export default recalculateCachedProfitReports;
