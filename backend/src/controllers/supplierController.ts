import { Response } from 'express';
import { Supplier } from '../models/Supplier';
import { MilkPurchase } from '../models/MilkPurchase';
import { Payment } from '../models/Payment';
import { AuthenticatedRequest } from '../middleware/auth';

export const getSuppliers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const suppliers = await Supplier.find({}).sort({ name: 1 });
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const getSupplierById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      res.status(404).json({ message: 'Supplier not found' });
      return;
    }
    res.json(supplier);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const createSupplier = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { name, village, mobileNumber } = req.body;
  try {
    const supplierExists = await Supplier.findOne({ mobileNumber });
    if (supplierExists) {
      res.status(400).json({ message: 'Supplier with this mobile number already exists' });
      return;
    }

    const supplier = await Supplier.create({
      name,
      village,
      mobileNumber,
      totalMilkSupplied: 0,
      totalAmountPayable: 0,
      outstandingAmount: 0,
    });

    res.status(201).json(supplier);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const updateSupplier = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!supplier) {
      res.status(404).json({ message: 'Supplier not found' });
      return;
    }
    res.json(supplier);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const deleteSupplier = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      res.status(404).json({ message: 'Supplier not found' });
      return;
    }
    
    // Check if supplier has history before deleting or just allow deletion
    await supplier.deleteOne();
    res.json({ message: 'Supplier removed successfully' });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const getSupplierLedger = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const supplier = await Supplier.findById(id);
    if (!supplier) {
      res.status(404).json({ message: 'Supplier not found' });
      return;
    }

    const purchases = await MilkPurchase.find({ supplierId: id }).sort({ purchaseDate: 1 });
    const payments = await Payment.find({ supplierId: id, type: 'Outflow' }).sort({ date: 1 });

    // Construct unified sorted ledger of credits (purchases) and debits (payments)
    const ledger: any[] = [];

    purchases.forEach((p) => {
      ledger.push({
        id: p._id,
        date: p.purchaseDate,
        type: 'Purchase',
        details: `${p.quantity}L of ${p.milkType} Milk (Fat: ${p.fatPercentage}%, SNF: ${p.snfPercentage}%)`,
        amount: p.totalAmount,
        direction: 'Credit', // We owe supplier money
      });
    });

    payments.forEach((pay) => {
      ledger.push({
        id: pay._id,
        date: pay.date,
        type: 'Payment',
        details: `Paid via ${pay.paymentMethod}${pay.referenceNumber ? ' (Ref: ' + pay.referenceNumber + ')' : ''}`,
        amount: pay.amount,
        direction: 'Debit', // We paid supplier money
      });
    });

    // Sort by chronological date
    ledger.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate running balance
    let runningBalance = 0;
    const ledgerWithBalance = ledger.map((item) => {
      if (item.direction === 'Credit') {
        runningBalance += item.amount;
      } else {
        runningBalance -= item.amount;
      }
      return { ...item, runningBalance: Number(runningBalance.toFixed(2)) };
    });

    res.json({
      supplier,
      ledger: ledgerWithBalance,
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
