import cron from 'node-cron';
import Receivable from '../models/Receivable';
import Customer from '../models/Customer';
import Reminder from '../models/Reminder';
import { sendWhatsAppNotification, sendSMSNotification, sendEmailNotification } from './notifications';

// Helper to normalize date to start of day
const startOfDay = (d: Date): Date => {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
};

// Main function to run the reminder checks
export const runReminderJob = async (): Promise<void> => {
  console.log('[SCHEDULER] Running payment reminder verification job...');
  try {
    const today = startOfDay(new Date());

    // Find all open receivables
    const openReceivables = await Receivable.find({
      status: { $in: ['Unpaid', 'Partially Paid'] },
    });

    for (const rec of openReceivables) {
      if (rec.remainingAmount <= 0) continue;

      const customer = await Customer.findById(rec.customerId);
      if (!customer) continue;

      const recDueDate = startOfDay(rec.dueDate);
      const diffTime = today.getTime() - recDueDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      let shouldTrigger = false;
      let templateType: 1 | 2 = 1;

      if (diffDays === -3) {
        // 3 days before due date
        shouldTrigger = true;
        templateType = 1;
      } else if (diffDays === 0) {
        // On due date
        shouldTrigger = true;
        templateType = 1;
      } else if (diffDays === 3) {
        // 3 days after due date
        shouldTrigger = true;
        templateType = 2;
      } else if (diffDays > 3 && (diffDays - 3) % 7 === 0) {
        // Weekly until payment is received
        shouldTrigger = true;
        templateType = 2;
      }

      if (shouldTrigger) {
        const formattedDueDate = recDueDate.toLocaleDateString('en-IN');
        const amount = rec.remainingAmount;
        
        let message = '';
        if (templateType === 1) {
          message = `Dear ${customer.name},\n\nThis is a reminder from Pitambara Doodh Dairy.\n\nYour outstanding amount is ₹${amount}.\n\nPlease clear the payment by ${formattedDueDate}.\n\nThank you.`;
        } else {
          message = `Dear ${customer.name},\n\nYour dairy payment of ₹${amount} is overdue.\n\nKindly make the payment at the earliest.\n\nPitambara Doodh Dairy`;
        }

        console.log(`[SCHEDULER] Triggering reminders for Customer: ${customer.name}, Amount: ${amount}`);

        // 1. Send WhatsApp Reminder
        await sendAndRecordReminder(customer, rec, 'WhatsApp', message);

        // 2. Send SMS Reminder
        await sendAndRecordReminder(customer, rec, 'SMS', message);

        // 3. Send Email Reminder (if customer email exists)
        if (customer.email) {
          await sendAndRecordReminder(customer, rec, 'Email', message);
        }

        // Update customer reminder counts
        customer.lastReminderDate = new Date();
        customer.totalRemindersSent = (customer.totalRemindersSent || 0) + (customer.email ? 3 : 2);
        await customer.save();
      }
    }
    console.log('[SCHEDULER] Payment reminder job completed successfully.');
  } catch (error: any) {
    console.error(`[SCHEDULER ERROR] Failed in running reminder job: ${error.message}`);
  }
};

// Helper to send a specific reminder and save to database
export const sendAndRecordReminder = async (
  customer: any,
  receivable: any,
  type: 'WhatsApp' | 'SMS' | 'Email',
  body: string
): Promise<void> => {
  // Create pending reminder log
  const reminderObj = await Reminder.create({
    customerId: customer._id,
    customerName: customer.name,
    mobile: customer.mobileNumber,
    amount: receivable.remainingAmount,
    dueDate: receivable.dueDate,
    reminderType: type,
    reminderStatus: 'Pending',
  });

  let result;
  if (type === 'WhatsApp') {
    result = await sendWhatsAppNotification(customer.mobileNumber, body);
  } else if (type === 'SMS') {
    result = await sendSMSNotification(customer.mobileNumber, body);
  } else {
    result = await sendEmailNotification(customer.email || '', 'Payment Reminder - Pitambara Doodh Dairy', body);
  }

  reminderObj.reminderStatus = result.success ? 'Sent' : 'Failed';
  reminderObj.sentAt = new Date();
  await reminderObj.save();
};

// Initialize the scheduler
export const initScheduler = (): void => {
  // Run everyday at midnight: '0 0 * * *'
  cron.schedule('0 0 * * *', () => {
    runReminderJob();
  });
  console.log('[SCHEDULER] Daily payment reminder cron job initialized.');
};
