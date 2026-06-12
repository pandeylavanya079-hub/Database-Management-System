import { Response } from 'express';
import { MilkPurchase } from '../models/MilkPurchase';
import { Supplier } from '../models/Supplier';
import { Payable } from '../models/Payable';
import { DailyMilkCollection } from '../models/DailyMilkCollection';
import { AuthenticatedRequest } from '../middleware/auth';
import { logAudit } from '../utils/audit';
import { recalculateCachedProfitReports } from '../utils/profitLoss';

export const getPurchases = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { startDate, endDate, supplierId, village } = req.query;
  const filter: any = {};

  if (startDate || endDate) {
    filter.purchaseDate = {};
    if (startDate) filter.purchaseDate.$gte = new Date(startDate as string);
    if (endDate) filter.purchaseDate.$lte = new Date(endDate as string);
  }

  if (supplierId) {
    filter.supplierId = supplierId;
  }

  if (village) {
    filter.village = new RegExp(village as string, 'i');
  }

  try {
    const purchases = await MilkPurchase.find(filter).sort({ purchaseDate: -1 });
    res.json(purchases);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

import mongoose from 'mongoose';

export const createPurchase = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { purchaseDate, supplierId, milkType, quantity, fatPercentage, snfPercentage, ratePerLiter, notes } = req.body;

  try {
    if (!supplierId || !mongoose.Types.ObjectId.isValid(supplierId)) {
      res.status(400).json({ message: 'Invalid or missing Supplier selection. Please select a valid supplier.' });
      return;
    }

    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      res.status(404).json({ message: 'Supplier not found' });
      return;
    }

    const totalAmount = Number((quantity * ratePerLiter).toFixed(2));
    const pDate = purchaseDate ? new Date(purchaseDate) : new Date();

    // Create Milk Purchase
    const purchase = await MilkPurchase.create({
      purchaseDate: pDate,
      supplierId,
      supplierName: supplier.name,
      village: supplier.village,
      mobileNumber: supplier.mobileNumber,
      milkType,
      quantity,
      fatPercentage,
      snfPercentage,
      ratePerLiter,
      totalAmount,
      paymentStatus: 'Unpaid',
      notes,
    });

    // Update Supplier aggregates
    supplier.totalMilkSupplied += quantity;
    supplier.totalAmountPayable += totalAmount;
    supplier.outstandingAmount += totalAmount;
    await supplier.save();

    // Create a corresponding accounts payable record
    await Payable.create({
      supplierId,
      supplierName: supplier.name,
      amountPayable: totalAmount,
      dueDate: new Date(pDate.getTime() + 15 * 24 * 60 * 60 * 1000), // Default: 15-day credit period
      paidAmount: 0,
      remainingAmount: totalAmount,
      status: 'Unpaid',
    });

    // Sync to Daily Milk Collection registry
    await DailyMilkCollection.create({
      date: pDate,
      supplierId,
      quantity,
      fat: fatPercentage,
      snf: snfPercentage,
      rate: ratePerLiter,
      totalAmount,
    });

    res.status(201).json(purchase);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const updatePurchase = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { purchaseDate, milkType, quantity, fatPercentage, snfPercentage, ratePerLiter, notes } = req.body;

  try {
    const purchase = await MilkPurchase.findById(id);
    if (!purchase) {
      res.status(404).json({ message: 'Purchase record not found' });
      return;
    }

    const oldQuantity = purchase.quantity;
    const oldAmount = purchase.totalAmount;
    
    // Ensure fallback to current values if fields are missing in the request body
    const qty = quantity !== undefined ? Number(quantity) : purchase.quantity;
    const rate = ratePerLiter !== undefined ? Number(ratePerLiter) : purchase.ratePerLiter;
    const newAmount = Number((qty * rate).toFixed(2));

    const oldSnapshot = {
      quantity: purchase.quantity,
      ratePerLiter: purchase.ratePerLiter,
      totalAmount: purchase.totalAmount
    };

    // Update purchase document fields
    purchase.purchaseDate = purchaseDate ? new Date(purchaseDate) : purchase.purchaseDate;
    purchase.milkType = milkType || purchase.milkType;
    purchase.quantity = qty;
    purchase.fatPercentage = fatPercentage !== undefined ? Number(fatPercentage) : purchase.fatPercentage;
    purchase.snfPercentage = snfPercentage !== undefined ? Number(snfPercentage) : purchase.snfPercentage;
    purchase.ratePerLiter = rate;
    purchase.totalAmount = newAmount;
    purchase.notes = notes !== undefined ? notes : purchase.notes;
    await purchase.save();

    // Create Audit Log
    await logAudit(
      req.user?.email || 'Admin',
      'Edit Purchase',
      oldSnapshot,
      { quantity: qty, ratePerLiter: rate, totalAmount: newAmount }
    );

    // Rebalance Supplier aggregates
    const supplier = await Supplier.findById(purchase.supplierId);
    if (supplier) {
      supplier.totalMilkSupplied = Number((supplier.totalMilkSupplied - oldQuantity + qty).toFixed(2));
      supplier.totalAmountPayable = Number((supplier.totalAmountPayable - oldAmount + newAmount).toFixed(2));
      supplier.outstandingAmount = Number((supplier.outstandingAmount - oldAmount + newAmount).toFixed(2));
      await supplier.save();
    }

    // Adjust Payable matching this amount
    const payable = await Payable.findOne({ supplierId: purchase.supplierId, amountPayable: oldAmount });
    if (payable) {
      payable.amountPayable = newAmount;
      payable.remainingAmount = Number((newAmount - payable.paidAmount).toFixed(2));
      if (payable.remainingAmount <= 0) {
        payable.status = 'Paid';
        payable.remainingAmount = 0;
      } else if (payable.paidAmount > 0) {
        payable.status = 'Partially Paid';
      } else {
        payable.status = 'Unpaid';
      }
      await payable.save();
    }

    // Sync to Daily Collection registry
    const dailyColl = await DailyMilkCollection.findOne({ supplierId: purchase.supplierId, totalAmount: oldAmount });
    if (dailyColl) {
      dailyColl.date = purchase.purchaseDate;
      dailyColl.quantity = qty;
      dailyColl.fat = purchase.fatPercentage;
      dailyColl.snf = purchase.snfPercentage;
      dailyColl.rate = rate;
      dailyColl.totalAmount = newAmount;
      await dailyColl.save();
    }

    // Automatically update P&L cache entries covering this date
    await recalculateCachedProfitReports(purchase.purchaseDate);

    res.json(purchase);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const deletePurchase = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const purchase = await MilkPurchase.findById(id);
    if (!purchase) {
      res.status(404).json({ message: 'Purchase record not found' });
      return;
    }

    // Reduce Supplier balances
    const supplier = await Supplier.findById(purchase.supplierId);
    if (supplier) {
      supplier.totalMilkSupplied = Math.max(0, supplier.totalMilkSupplied - purchase.quantity);
      supplier.totalAmountPayable = Math.max(0, supplier.totalAmountPayable - purchase.totalAmount);
      supplier.outstandingAmount = supplier.outstandingAmount - purchase.totalAmount;
      await supplier.save();
    }

    // Delete matching Payable & DailyCollection record
    await Payable.deleteOne({ supplierId: purchase.supplierId, amountPayable: purchase.totalAmount });
    await DailyMilkCollection.deleteOne({ supplierId: purchase.supplierId, totalAmount: purchase.totalAmount });
    await purchase.deleteOne();

    res.json({ message: 'Purchase record deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const getPurchaseSummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const dailySummary = await MilkPurchase.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$purchaseDate' } },
          totalQuantity: { $sum: '$quantity' },
          totalAmount: { $sum: '$totalAmount' },
          averageRate: { $avg: '$ratePerLiter' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } },
      { $limit: 30 },
    ]);

    const monthlySummary = await MilkPurchase.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$purchaseDate' } },
          totalQuantity: { $sum: '$quantity' },
          totalAmount: { $sum: '$totalAmount' },
          averageRate: { $avg: '$ratePerLiter' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } },
    ]);

    res.json({ dailySummary, monthlySummary });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
