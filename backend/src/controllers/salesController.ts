import { Response } from 'express';
import { MilkSale } from '../models/MilkSale';
import { Customer } from '../models/Customer';
import { Receivable } from '../models/Receivable';
import { DailyMilkDistribution } from '../models/DailyMilkDistribution';
import { AuthenticatedRequest } from '../middleware/auth';
import { logAudit } from '../utils/audit';
import { recalculateCachedProfitReports } from '../utils/profitLoss';

export const getSales = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { startDate, endDate, customerId, customerType } = req.query;
  const filter: any = {};

  if (startDate || endDate) {
    filter.saleDate = {};
    if (startDate) filter.saleDate.$gte = new Date(startDate as string);
    if (endDate) filter.saleDate.$lte = new Date(endDate as string);
  }

  if (customerId) {
    filter.customerId = customerId;
  }

  try {
    let sales = await MilkSale.find(filter).sort({ saleDate: -1 });

    // Optional client-side customer type filtering
    if (customerType) {
      const customersOfType = await Customer.find({ customerType }).select('_id');
      const allowedIds = customersOfType.map(c => c._id.toString());
      sales = sales.filter(s => allowedIds.includes(s.customerId.toString()));
    }

    res.json(sales);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

import mongoose from 'mongoose';

export const createSale = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { saleDate, customerId, quantity, fatPercentage, snfPercentage, ratePerLiter } = req.body;

  try {
    if (!customerId || !mongoose.Types.ObjectId.isValid(customerId)) {
      res.status(400).json({ message: 'Invalid or missing Customer selection. Please select a valid customer.' });
      return;
    }

    const customer = await Customer.findById(customerId);
    if (!customer) {
      res.status(404).json({ message: 'Customer not found' });
      return;
    }

    const totalAmount = Number((quantity * ratePerLiter).toFixed(2));
    const sDate = saleDate ? new Date(saleDate) : new Date();

    // Create Milk Sale
    const sale = await MilkSale.create({
      saleDate: sDate,
      customerId,
      customerName: customer.name,
      quantity,
      fatPercentage,
      snfPercentage,
      ratePerLiter,
      totalAmount,
      paymentStatus: 'Unpaid',
    });

    // Update Customer outstanding balances
    customer.outstandingBalance += totalAmount;
    await customer.save();

    // Create accounts receivable record
    await Receivable.create({
      customerId,
      customerName: customer.name,
      customerMobile: customer.mobileNumber,
      amountDue: totalAmount,
      dueDate: new Date(sDate.getTime() + 15 * 24 * 60 * 60 * 1000), // Default: 15-day credit period
      paidAmount: 0,
      remainingAmount: totalAmount,
      status: 'Unpaid',
    });

    // Sync to Daily Milk Distribution registry
    await DailyMilkDistribution.create({
      date: sDate,
      customerId,
      quantity,
      rate: ratePerLiter,
      totalAmount,
    });

    res.status(201).json(sale);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const updateSale = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { saleDate, quantity, fatPercentage, snfPercentage, ratePerLiter } = req.body;

  try {
    const sale = await MilkSale.findById(id);
    if (!sale) {
      res.status(404).json({ message: 'Sale record not found' });
      return;
    }

    const oldAmount = sale.totalAmount;
    const oldQty = sale.quantity;

    // Use current DB values if new ones are omitted or null
    const qty = quantity !== undefined && quantity !== null ? Number(quantity) : sale.quantity;
    const rate = ratePerLiter !== undefined && ratePerLiter !== null ? Number(ratePerLiter) : sale.ratePerLiter;
    const newAmount = Number((qty * rate).toFixed(2));

    const oldSnapshot = {
      quantity: sale.quantity,
      ratePerLiter: sale.ratePerLiter,
      totalAmount: sale.totalAmount
    };

    sale.saleDate = saleDate ? new Date(saleDate) : sale.saleDate;
    sale.quantity = qty;
    sale.fatPercentage = fatPercentage !== undefined && fatPercentage !== null ? Number(fatPercentage) : sale.fatPercentage;
    sale.snfPercentage = snfPercentage !== undefined && snfPercentage !== null ? Number(snfPercentage) : sale.snfPercentage;
    sale.ratePerLiter = rate;
    sale.totalAmount = newAmount;
    await sale.save();

    // Create Audit Log
    await logAudit(
      req.user?.email || 'Admin',
      'Edit Sale',
      oldSnapshot,
      { quantity: qty, ratePerLiter: rate, totalAmount: newAmount }
    );

    // Rebalance Customer balance
    const customer = await Customer.findById(sale.customerId);
    if (customer) {
      customer.outstandingBalance = Number((customer.outstandingBalance - oldAmount + newAmount).toFixed(2));
      await customer.save();
    }

    // Adjust matching Receivable
    const receivable = await Receivable.findOne({ customerId: sale.customerId, amountDue: oldAmount });
    if (receivable) {
      receivable.amountDue = newAmount;
      receivable.remainingAmount = Number((newAmount - receivable.paidAmount).toFixed(2));
      if (receivable.remainingAmount <= 0) {
        receivable.status = 'Paid';
        receivable.remainingAmount = 0;
      } else if (receivable.paidAmount > 0) {
        receivable.status = 'Partially Paid';
      } else {
        receivable.status = 'Unpaid';
      }
      await receivable.save();
    }

    // Adjust Daily Distribution record
    const dailyDist = await DailyMilkDistribution.findOne({ customerId: sale.customerId, totalAmount: oldAmount });
    if (dailyDist) {
      dailyDist.date = sale.saleDate;
      dailyDist.quantity = qty;
      dailyDist.rate = rate;
      dailyDist.totalAmount = newAmount;
      await dailyDist.save();
    }

    // Automatically update P&L cache entries covering this date
    await recalculateCachedProfitReports(sale.saleDate);

    res.json(sale);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const deleteSale = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const sale = await MilkSale.findById(id);
    if (!sale) {
      res.status(404).json({ message: 'Sale record not found' });
      return;
    }

    // Rollback Customer outstanding
    const customer = await Customer.findById(sale.customerId);
    if (customer) {
      customer.outstandingBalance = Math.max(0, Number((customer.outstandingBalance - sale.totalAmount).toFixed(2)));
      await customer.save();
    }

    // Delete matching Receivable & DailyDistribution records
    await Receivable.deleteOne({ customerId: sale.customerId, amountDue: sale.totalAmount });
    await DailyMilkDistribution.deleteOne({ customerId: sale.customerId, totalAmount: sale.totalAmount });
    
    const saleDate = sale.saleDate;
    await sale.deleteOne();

    // Recalculate profit report
    await recalculateCachedProfitReports(saleDate);

    res.json({ message: 'Sale record deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
