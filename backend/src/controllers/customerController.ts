import { Response } from 'express';
import { Customer } from '../models/Customer';
import { MilkSale } from '../models/MilkSale';
import { Payment } from '../models/Payment';
import { Receivable } from '../models/Receivable';
import { Reminder } from '../models/Reminder';
import { AuthenticatedRequest } from '../middleware/auth';
import { sendWhatsAppNotification, sendSMSNotification, sendEmailNotification } from '../utils/notifications';

export const getCustomers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const customers = await Customer.find({}).sort({ name: 1 });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const getCustomerById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      res.status(404).json({ message: 'Customer not found' });
      return;
    }
    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const createCustomer = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { name, mobileNumber, address, dailyMilkRequirement, customerType } = req.body;
  try {
    const customerExists = await Customer.findOne({ mobileNumber });
    if (customerExists) {
      res.status(400).json({ message: 'Customer with this mobile number already exists' });
      return;
    }

    const customer = await Customer.create({
      name,
      mobileNumber,
      address,
      dailyMilkRequirement,
      customerType: customerType || 'Retail',
      outstandingBalance: 0,
    });

    res.status(201).json(customer);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const updateCustomer = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!customer) {
      res.status(404).json({ message: 'Customer not found' });
      return;
    }
    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const deleteCustomer = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      res.status(404).json({ message: 'Customer not found' });
      return;
    }
    await customer.deleteOne();
    res.json({ message: 'Customer removed successfully' });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const getCustomerLedger = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const customer = await Customer.findById(id);
    if (!customer) {
      res.status(404).json({ message: 'Customer not found' });
      return;
    }

    const sales = await MilkSale.find({ customerId: id }).sort({ saleDate: 1 });
    const payments = await Payment.find({ customerId: id, type: 'Inflow' }).sort({ date: 1 });

    const ledger: any[] = [];

    sales.forEach((s) => {
      ledger.push({
        id: s._id,
        date: s.saleDate,
        type: 'Sale',
        details: `${s.quantity}L sold (Fat: ${s.fatPercentage}%, SNF: ${s.snfPercentage}%)`,
        amount: s.totalAmount,
        direction: 'Debit', // We charged customer money
      });
    });

    payments.forEach((pay) => {
      ledger.push({
        id: pay._id,
        date: pay.date,
        type: 'Payment',
        details: `Received via ${pay.paymentMethod}${pay.referenceNumber ? ' (Ref: ' + pay.referenceNumber + ')' : ''}`,
        amount: pay.amount,
        direction: 'Credit', // Customer paid us money
      });
    });

    ledger.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = 0;
    const ledgerWithBalance = ledger.map((item) => {
      if (item.direction === 'Debit') {
        runningBalance += item.amount;
      } else {
        runningBalance -= item.amount;
      }
      return { ...item, runningBalance: Number(runningBalance.toFixed(2)) };
    });

    res.json({
      customer,
      ledger: ledgerWithBalance,
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const sendCustomerReminder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { reminderType } = req.body; // 'WhatsApp' | 'SMS' | 'Email'
  const type = reminderType || 'WhatsApp';

  try {
    const customer = await Customer.findById(id);
    if (!customer) {
      res.status(404).json({ message: 'Customer not found' });
      return;
    }

    if (customer.outstandingBalance <= 0) {
      res.status(400).json({ message: 'Customer has no outstanding balance' });
      return;
    }

    if (type === 'Email' && !customer.email) {
      res.status(400).json({ message: 'Customer does not have an email address configured' });
      return;
    }

    const oldestReceivable = await Receivable.findOne({
      customerId: id,
      status: { $in: ['Unpaid', 'Partially Paid'] },
    }).sort({ dueDate: 1 });
    const dueDate = oldestReceivable ? oldestReceivable.dueDate : new Date();

    const formattedDueDate = dueDate.toLocaleDateString('en-IN');
    const amount = customer.outstandingBalance;

    let message = `Dear ${customer.name},\n\nThis is a manual payment reminder from Pitambara Doodh Dairy.\n\nYour current outstanding balance is ₹${amount}. Please clear the payment at your earliest convenience.\n\nThank you.`;

    // Create a pending reminder log
    const reminderObj = await Reminder.create({
      customerId: customer._id,
      customerName: customer.name,
      mobile: customer.mobileNumber,
      amount,
      dueDate,
      reminderType: type,
      reminderStatus: 'Pending',
    });

    let result;
    if (type === 'WhatsApp') {
      result = await sendWhatsAppNotification(customer.mobileNumber, message);
    } else if (type === 'SMS') {
      result = await sendSMSNotification(customer.mobileNumber, message);
    } else {
      result = await sendEmailNotification(customer.email || '', 'Payment Reminder - Pitambara Doodh Dairy', message);
    }

    reminderObj.reminderStatus = result.success ? 'Sent' : 'Failed';
    reminderObj.sentAt = new Date();
    await reminderObj.save();

    if (result.success) {
      // Update customer reminder counts
      customer.lastReminderDate = new Date();
      customer.totalRemindersSent = (customer.totalRemindersSent || 0) + 1;
      await customer.save();

      res.json({ message: `${type} reminder sent successfully`, details: result.message || 'Sent' });
    } else {
      res.status(500).json({ message: `Failed to send ${type} reminder`, error: result.message });
    }
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const getCustomerReminders = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const reminders = await Reminder.find({ customerId: id }).sort({ createdAt: -1 });
    res.json(reminders);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
