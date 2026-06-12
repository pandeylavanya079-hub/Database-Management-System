import { Response } from 'express';
import { Bill } from '../models/Bill';
import { Customer } from '../models/Customer';
import { Receivable } from '../models/Receivable';
import { AuditLog } from '../models/AuditLog';
import { AuthenticatedRequest } from '../middleware/auth';
import { sendWhatsAppNotification, sendSMSNotification } from '../utils/notifications';

import mongoose from 'mongoose';

// Create a new bill
export const createBill = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const {
    customerId,
    billDate,
    dueDate,
    items,
    discount,
    tax,
    paidAmount,
    businessName,
    businessAddress,
    businessPhone
  } = req.body;

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

    // Generate unique serial bill number (PND-YYYY-XXXX)
    const count = await Bill.countDocuments();
    const currentYear = new Date(billDate || Date.now()).getFullYear();
    const billNumber = `PND-${currentYear}-${String(count + 1).padStart(4, '0')}`;

    const bill = new Bill({
      billNumber,
      customerId: customer._id,
      customerName: customer.name,
      customerMobile: customer.mobileNumber,
      billDate: billDate || new Date(),
      dueDate,
      items,
      discount: discount || 0,
      tax: tax || 0,
      paidAmount: paidAmount || 0,
      businessName: businessName || 'Pitambara Doodh Dairy',
      businessAddress: businessAddress || 'Devpura, Jaitpur Kala, District Agra, Pincode 283114',
      businessPhone: businessPhone || 'Vandana Purohit - 7668459330, Deelip Purohit - 7817873319'
    });

    await bill.save();

    // Cascade 1: Increase customer outstanding balance by remaining bill amount
    customer.outstandingBalance = Number((customer.outstandingBalance + bill.remainingAmount).toFixed(2));
    await customer.save();

    // Cascade 2: Create a corresponding Receivable entry if remainingAmount > 0
    if (bill.remainingAmount > 0) {
      await Receivable.create({
        customerId: customer._id,
        customerName: customer.name,
        customerMobile: customer.mobileNumber,
        amountDue: bill.totalAmount,
        paidAmount: bill.paidAmount,
        remainingAmount: bill.remainingAmount,
        dueDate: bill.dueDate,
        status: bill.status
      });
    }

    res.status(201).json(bill);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// Get all bills
export const getBills = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { customerId, status } = req.query;
    const filter: any = {};

    if (customerId) filter.customerId = customerId;
    if (status) filter.status = status;

    const bills = await Bill.find(filter).sort({ billDate: -1 });
    res.json(bills);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// Get single bill by ID
export const getBillById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) {
      res.status(404).json({ message: 'Invoice bill not found' });
      return;
    }
    res.json(bill);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// Update a bill (Admin only)
export const updateBill = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || req.user.role !== 'Admin') {
    res.status(403).json({ message: 'Access denied. Only Admins can modify bills.' });
    return;
  }

  const { id } = req.params;
  const { items, discount, tax, paidAmount, dueDate } = req.body;

  try {
    const bill = await Bill.findById(id);
    if (!bill) {
      res.status(404).json({ message: 'Bill not found' });
      return;
    }

    const customer = await Customer.findById(bill.customerId);
    if (!customer) {
      res.status(404).json({ message: 'Customer linked to this bill not found' });
      return;
    }

    const oldTotal = bill.totalAmount;
    const oldRemaining = bill.remainingAmount;
    const oldPaid = bill.paidAmount;

    // Snapshot values for Audit Logging
    const originalValues = {
      items: JSON.parse(JSON.stringify(bill.items)),
      discount: bill.discount,
      tax: bill.tax,
      paidAmount: bill.paidAmount,
      totalAmount: bill.totalAmount,
      remainingAmount: bill.remainingAmount
    };

    // Update fields
    if (items) bill.items = items;
    if (discount !== undefined) bill.discount = discount;
    if (tax !== undefined) bill.tax = tax;
    if (paidAmount !== undefined) bill.paidAmount = paidAmount;
    if (dueDate) bill.dueDate = dueDate;

    // Save triggers pre('validate') recalculations
    await bill.save();

    // Cascade 1: Recalculate customer outstanding balance
    const remainingDiff = bill.remainingAmount - oldRemaining;
    customer.outstandingBalance = Number((customer.outstandingBalance + remainingDiff).toFixed(2));
    await customer.save();

    // Cascade 2: Update associated Receivable
    const receivable = await Receivable.findOne({
      customerId: bill.customerId,
      dueDate: bill.dueDate // Find by matching due date and customer ID
    });

    if (receivable) {
      receivable.amountDue = bill.totalAmount;
      receivable.paidAmount = bill.paidAmount;
      receivable.remainingAmount = bill.remainingAmount;
      await receivable.save();
    }

    // Cascade 3: Write Audit Log
    await AuditLog.create({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      module: 'Billing',
      recordId: bill._id,
      action: 'Edit',
      originalValues,
      newValues: {
        items: bill.items,
        discount: bill.discount,
        tax: bill.tax,
        paidAmount: bill.paidAmount,
        totalAmount: bill.totalAmount,
        remainingAmount: bill.remainingAmount
      }
    });

    res.json(bill);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// Delete a bill (Admin only)
export const deleteBill = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || req.user.role !== 'Admin') {
    res.status(403).json({ message: 'Access denied. Only Admins can delete bills.' });
    return;
  }

  const { id } = req.params;

  try {
    const bill = await Bill.findById(id);
    if (!bill) {
      res.status(404).json({ message: 'Bill not found' });
      return;
    }

    const customer = await Customer.findById(bill.customerId);
    if (customer) {
      // Revert outstanding balance
      customer.outstandingBalance = Number((customer.outstandingBalance - bill.remainingAmount).toFixed(2));
      await customer.save();
    }

    // Delete linked Receivable
    await Receivable.deleteOne({
      customerId: bill.customerId,
      dueDate: bill.dueDate
    });

    // Write Audit Log
    await AuditLog.create({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      module: 'Billing',
      recordId: bill._id,
      action: 'Delete',
      originalValues: bill
    });

    await Bill.findByIdAndDelete(id);
    res.json({ message: 'Bill invoice deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// Send Bill via WhatsApp/SMS
export const sendBillNotification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { type } = req.body; // 'WhatsApp' | 'SMS'

  try {
    const bill = await Bill.findById(id);
    if (!bill) {
      res.status(404).json({ message: 'Bill not found' });
      return;
    }

    const formattedDate = new Date(bill.billDate).toLocaleDateString('en-IN');
    const formattedDueDate = new Date(bill.dueDate).toLocaleDateString('en-IN');

    // Build the message
    const message = `Dear ${bill.customerName},\n\nYour invoice ${bill.billNumber} from ${bill.businessName} has been generated.\n\nDate: ${formattedDate}\nTotal Amount: ₹${bill.totalAmount}\nRemaining Balance: ₹${bill.remainingAmount}\nDue Date: ${formattedDueDate}\n\nThank you for choosing ${bill.businessName}!`;

    let result;
    if (type === 'WhatsApp') {
      result = await sendWhatsAppNotification(bill.customerMobile, message);
    } else {
      result = await sendSMSNotification(bill.customerMobile, message);
    }

    if (result.success) {
      // Update customer reminder tracking metadata
      const customer = await Customer.findById(bill.customerId);
      if (customer) {
        customer.lastReminderDate = new Date();
        customer.totalRemindersSent = (customer.totalRemindersSent || 0) + 1;
        await customer.save();
      }

      res.json({ message: `Bill sent successfully via ${type}`, details: result.message });
    } else {
      res.status(500).json({ message: `Failed to dispatch ${type} notification`, error: result.message });
    }
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
