import { Response } from 'express';
import { Payable } from '../models/Payable';
import { Supplier } from '../models/Supplier';
import { Payment } from '../models/Payment';
import { AuthenticatedRequest } from '../middleware/auth';
import { logAudit } from '../utils/audit';

export const getPayables = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { status } = req.query;
  const filter: any = {};
  if (status) {
    filter.status = status;
  }

  try {
    const payables = await Payable.find(filter).sort({ dueDate: 1 });
    res.json(payables);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const recordSupplierPayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { supplierId, amount, paymentMethod, referenceNumber, date } = req.body;

  try {
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      res.status(404).json({ message: 'Supplier not found' });
      return;
    }

    const payDate = date ? new Date(date) : new Date();

    // Create Outflow Payment record
    const payment = await Payment.create({
      date: payDate,
      type: 'Outflow',
      supplierId,
      amount,
      paymentMethod,
      referenceNumber,
    });

    // Update Supplier outstanding amount
    supplier.outstandingAmount = Number((supplier.outstandingAmount - amount).toFixed(2));
    await supplier.save();

    // Allocate payment across supplier's open payables in FIFO order
    let remainingPayment = amount;
    const openPayables = await Payable.find({
      supplierId,
      status: { $in: ['Unpaid', 'Partially Paid'] },
    }).sort({ dueDate: 1 });

    for (const pay of openPayables) {
      if (remainingPayment <= 0) break;

      const debt = pay.remainingAmount;
      if (remainingPayment >= debt) {
        remainingPayment = Number((remainingPayment - debt).toFixed(2));
        pay.paidAmount = Number((pay.paidAmount + debt).toFixed(2));
        pay.remainingAmount = 0;
        pay.status = 'Paid';
      } else {
        pay.paidAmount = Number((pay.paidAmount + remainingPayment).toFixed(2));
        pay.remainingAmount = Number((pay.remainingAmount - remainingPayment).toFixed(2));
        pay.status = 'Partially Paid';
        remainingPayment = 0;
      }
      await pay.save();
    }

    res.status(201).json({
      message: 'Payment to supplier recorded successfully',
      payment,
      newOutstandingAmount: supplier.outstandingAmount,
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

const recalculateSupplierFIFO = async (supplierId: any): Promise<void> => {
  // 1. Reset all payables of this supplier
  const payables = await Payable.find({ supplierId });
  for (const p of payables) {
    p.paidAmount = 0;
    p.remainingAmount = p.amountPayable;
    p.status = 'Unpaid';
    await p.save();
  }

  // 2. Fetch all payments of this supplier (Outflow) sorted by date ascending
  const payments = await Payment.find({ supplierId, type: 'Outflow' }).sort({ date: 1 });

  // 3. For each payment, run FIFO allocation
  for (const pay of payments) {
    let remainingPayment = pay.amount;
    const openPayables = await Payable.find({
      supplierId,
      status: { $in: ['Unpaid', 'Partially Paid'] },
    }).sort({ dueDate: 1 });

    for (const p of openPayables) {
      if (remainingPayment <= 0) break;
      const debt = p.remainingAmount;
      if (remainingPayment >= debt) {
        remainingPayment = Number((remainingPayment - debt).toFixed(2));
        p.paidAmount = Number((p.paidAmount + debt).toFixed(2));
        p.remainingAmount = 0;
        p.status = 'Paid';
      } else {
        p.paidAmount = Number((p.paidAmount + remainingPayment).toFixed(2));
        p.remainingAmount = Number((p.remainingAmount - remainingPayment).toFixed(2));
        p.status = 'Partially Paid';
        remainingPayment = 0;
      }
      await p.save();
    }
  }
};

export const updateSupplierPayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { amount, paymentMethod, referenceNumber, date } = req.body;

  try {
    const payment = await Payment.findById(id);
    if (!payment) {
      res.status(404).json({ message: 'Payment record not found' });
      return;
    }

    const oldAmount = payment.amount;
    const oldSnapshot = {
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      referenceNumber: payment.referenceNumber,
      date: payment.date
    };

    const newAmount = amount !== undefined && amount !== null ? Number(amount) : payment.amount;
    const diff = newAmount - oldAmount;

    // Update payment fields
    payment.amount = newAmount;
    payment.paymentMethod = paymentMethod || payment.paymentMethod;
    payment.referenceNumber = referenceNumber !== undefined ? referenceNumber : payment.referenceNumber;
    payment.date = date ? new Date(date) : payment.date;
    await payment.save();

    // Create Audit Log
    await logAudit(
      req.user?.email || 'Admin',
      'Edit Supplier Payment',
      oldSnapshot,
      {
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        referenceNumber: payment.referenceNumber,
        date: payment.date
      }
    );

    // Adjust Supplier's outstandingAmount
    if (payment.supplierId) {
      const supplier = await Supplier.findById(payment.supplierId);
      if (supplier) {
        supplier.outstandingAmount = Number((supplier.outstandingAmount - diff).toFixed(2));
        await supplier.save();
        
        // Recalculate FIFO allocations
        await recalculateSupplierFIFO(payment.supplierId);
      }
    }

    res.json({ message: 'Supplier payment updated successfully', payment });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const updatePayable = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { amountPayable, paidAmount, dueDate } = req.body;

  try {
    const payable = await Payable.findById(id);
    if (!payable) {
      res.status(404).json({ message: 'Payable invoice not found' });
      return;
    }

    const oldSnapshot = {
      amountPayable: payable.amountPayable,
      paidAmount: payable.paidAmount,
      remainingAmount: payable.remainingAmount,
      dueDate: payable.dueDate,
      status: payable.status
    };

    const oldAmountPayable = payable.amountPayable;

    if (amountPayable !== undefined && amountPayable !== null) payable.amountPayable = Number(amountPayable);
    if (paidAmount !== undefined && paidAmount !== null) payable.paidAmount = Number(paidAmount);
    if (dueDate !== undefined && dueDate !== null) payable.dueDate = new Date(dueDate);

    // Recalculate remainingAmount and status
    payable.remainingAmount = Number((payable.amountPayable - payable.paidAmount).toFixed(2));
    if (payable.remainingAmount <= 0) {
      payable.status = 'Paid';
      payable.remainingAmount = 0;
    } else if (payable.paidAmount > 0) {
      payable.status = 'Partially Paid';
    } else {
      payable.status = 'Unpaid';
    }

    await payable.save();

    // Create Audit Log
    await logAudit(
      req.user?.email || 'Admin',
      'Edit Payable',
      oldSnapshot,
      {
        amountPayable: payable.amountPayable,
        paidAmount: payable.paidAmount,
        remainingAmount: payable.remainingAmount,
        dueDate: payable.dueDate,
        status: payable.status
      }
    );

    // If amountPayable changed, rebalance Supplier aggregates and run FIFO
    const diff = payable.amountPayable - oldAmountPayable;
    if (diff !== 0 && payable.supplierId) {
      const supplier = await Supplier.findById(payable.supplierId);
      if (supplier) {
        supplier.outstandingAmount = Number((supplier.outstandingAmount + diff).toFixed(2));
        await supplier.save();
        
        // Recalculate FIFO allocations
        await recalculateSupplierFIFO(payable.supplierId);
      }
    }

    res.json(payable);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

