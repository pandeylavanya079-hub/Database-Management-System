import { Response } from 'express';
import { Receivable } from '../models/Receivable';
import { Customer } from '../models/Customer';
import { Payment } from '../models/Payment';
import { AuthenticatedRequest } from '../middleware/auth';
import { sendWhatsAppReminder } from '../utils/whatsapp';
import { logAudit } from '../utils/audit';

export const getReceivables = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { status } = req.query;
  const filter: any = {};
  if (status) {
    filter.status = status;
  }

  try {
    const receivables = await Receivable.find(filter).sort({ dueDate: 1 });
    res.json(receivables);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const recordCustomerPayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { customerId, amount, paymentMethod, referenceNumber, date } = req.body;

  try {
    const customer = await Customer.findById(customerId);
    if (!customer) {
      res.status(404).json({ message: 'Customer not found' });
      return;
    }

    const payDate = date ? new Date(date) : new Date();

    // Create Payment log (Inflow)
    const payment = await Payment.create({
      date: payDate,
      type: 'Inflow',
      customerId,
      amount,
      paymentMethod,
      referenceNumber,
    });

    // Update Customer profile fields
    customer.outstandingBalance = Number((customer.outstandingBalance - amount).toFixed(2));
    customer.lastPaymentDate = payDate;
    await customer.save();

    // Allocate payment amount across customer's open (unpaid or partially paid) receivables using FIFO
    let remainingPayment = amount;
    const openReceivables = await Receivable.find({
      customerId,
      status: { $in: ['Unpaid', 'Partially Paid'] },
    }).sort({ dueDate: 1 });

    for (const rec of openReceivables) {
      if (remainingPayment <= 0) break;

      const debt = rec.remainingAmount;
      if (remainingPayment >= debt) {
        remainingPayment = Number((remainingPayment - debt).toFixed(2));
        rec.paidAmount = Number((rec.paidAmount + debt).toFixed(2));
        rec.remainingAmount = 0;
        rec.status = 'Paid';
      } else {
        rec.paidAmount = Number((rec.paidAmount + remainingPayment).toFixed(2));
        rec.remainingAmount = Number((rec.remainingAmount - remainingPayment).toFixed(2));
        rec.status = 'Partially Paid';
        remainingPayment = 0;
      }
      await rec.save();
    }

    res.status(201).json({
      message: 'Payment recorded successfully',
      payment,
      newOutstandingBalance: customer.outstandingBalance,
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const updateReceivablePromisedDate = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { promisedDate } = req.body;

  try {
    const receivable = await Receivable.findById(id);
    if (!receivable) {
      res.status(404).json({ message: 'Receivable invoice not found' });
      return;
    }

    receivable.promisedDate = promisedDate ? new Date(promisedDate) : undefined;
    await receivable.save();

    res.json(receivable);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const updateReceivable = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { amountDue, paidAmount, dueDate, promisedDate } = req.body;

  try {
    const receivable = await Receivable.findById(id);
    if (!receivable) {
      res.status(404).json({ message: 'Receivable invoice not found' });
      return;
    }

    const oldSnapshot = {
      amountDue: receivable.amountDue,
      paidAmount: receivable.paidAmount,
      remainingAmount: receivable.remainingAmount,
      dueDate: receivable.dueDate,
      promisedDate: receivable.promisedDate,
      status: receivable.status
    };

    const oldAmountDue = receivable.amountDue;

    if (amountDue !== undefined && amountDue !== null) receivable.amountDue = Number(amountDue);
    if (paidAmount !== undefined && paidAmount !== null) receivable.paidAmount = Number(paidAmount);
    if (dueDate !== undefined && dueDate !== null) receivable.dueDate = new Date(dueDate);
    if (promisedDate !== undefined) receivable.promisedDate = promisedDate ? new Date(promisedDate) : undefined;

    // Recalculate remainingAmount and status
    receivable.remainingAmount = Number((receivable.amountDue - receivable.paidAmount).toFixed(2));
    if (receivable.remainingAmount <= 0) {
      receivable.status = 'Paid';
      receivable.remainingAmount = 0;
    } else if (receivable.paidAmount > 0) {
      receivable.status = 'Partially Paid';
    } else {
      receivable.status = 'Unpaid';
    }

    await receivable.save();

    // Create Audit Log
    await logAudit(
      req.user?.email || 'Admin',
      'Edit Receivable',
      oldSnapshot,
      {
        amountDue: receivable.amountDue,
        paidAmount: receivable.paidAmount,
        remainingAmount: receivable.remainingAmount,
        dueDate: receivable.dueDate,
        promisedDate: receivable.promisedDate,
        status: receivable.status
      }
    );

    // If amountDue changed, rebalance Customer aggregates and run FIFO
    const diff = receivable.amountDue - oldAmountDue;
    if (diff !== 0 && receivable.customerId) {
      const customer = await Customer.findById(receivable.customerId);
      if (customer) {
        customer.outstandingBalance = Number((customer.outstandingBalance + diff).toFixed(2));
        await customer.save();
        
        // Recalculate FIFO allocations
        await recalculateCustomerFIFO(receivable.customerId);
      }
    }

    res.json(receivable);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

const recalculateCustomerFIFO = async (customerId: any): Promise<void> => {
  // 1. Reset all receivables of this customer
  const receivables = await Receivable.find({ customerId });
  for (const r of receivables) {
    r.paidAmount = 0;
    r.remainingAmount = r.amountDue;
    r.status = 'Unpaid';
    await r.save();
  }

  // 2. Fetch all payments of this customer (Inflow) sorted by date ascending
  const payments = await Payment.find({ customerId, type: 'Inflow' }).sort({ date: 1 });

  // 3. For each payment, run FIFO allocation
  for (const pay of payments) {
    let remainingPayment = pay.amount;
    const openReceivables = await Receivable.find({
      customerId,
      status: { $in: ['Unpaid', 'Partially Paid'] },
    }).sort({ dueDate: 1 });

    for (const rec of openReceivables) {
      if (remainingPayment <= 0) break;
      const debt = rec.remainingAmount;
      if (remainingPayment >= debt) {
        remainingPayment = Number((remainingPayment - debt).toFixed(2));
        rec.paidAmount = Number((rec.paidAmount + debt).toFixed(2));
        rec.remainingAmount = 0;
        rec.status = 'Paid';
      } else {
        rec.paidAmount = Number((rec.paidAmount + remainingPayment).toFixed(2));
        rec.remainingAmount = Number((rec.remainingAmount - remainingPayment).toFixed(2));
        rec.status = 'Partially Paid';
        remainingPayment = 0;
      }
      await rec.save();
    }
  }
};

export const updateCustomerPayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
      'Edit Customer Payment',
      oldSnapshot,
      {
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        referenceNumber: payment.referenceNumber,
        date: payment.date
      }
    );

    // Adjust Customer's outstandingBalance
    if (payment.customerId) {
      const customer = await Customer.findById(payment.customerId);
      if (customer) {
        customer.outstandingBalance = Number((customer.outstandingBalance - diff).toFixed(2));
        await customer.save();
        
        // Recalculate FIFO allocations
        await recalculateCustomerFIFO(payment.customerId);
      }
    }

    res.json({ message: 'Payment updated successfully', payment });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const sendReceivableReminder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const receivable = await Receivable.findById(id);
    if (!receivable) {
      res.status(404).json({ message: 'Receivable invoice not found' });
      return;
    }

    if (receivable.remainingAmount <= 0) {
      res.status(400).json({ message: 'Receivable has no remaining dues' });
      return;
    }

    const message = `Dear ${receivable.customerName}, this is a reminder from PITAMBARA DOODH DAIRY. Your promised payment of ₹${receivable.remainingAmount} was due/expected on ${receivable.promisedDate ? new Date(receivable.promisedDate).toLocaleDateString('en-IN') : new Date(receivable.dueDate).toLocaleDateString('en-IN')}. Please arrange to clear this balance at your earliest convenience. Thank you!`;

    const result = await sendWhatsAppReminder(receivable.customerMobile || '', message);
    if (result.success) {
      res.json({ message: 'Reminder sent successfully', details: result.message || 'Sent via twilio' });
    } else {
      res.status(500).json({ message: 'Failed to send WhatsApp reminder', error: result.message });
    }
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
