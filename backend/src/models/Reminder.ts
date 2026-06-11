import { Schema, model, Document } from 'mongoose';

export interface IReminder extends Document {
  customerId: Schema.Types.ObjectId;
  customerName: string;
  mobile: string;
  amount: number;
  dueDate: Date;
  reminderType: 'WhatsApp' | 'SMS' | 'Email';
  reminderStatus: 'Sent' | 'Failed' | 'Pending';
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const reminderSchema = new Schema<IReminder>({
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Customer ID is required'],
  },
  customerName: {
    type: String,
    required: [true, 'Customer name is required'],
  },
  mobile: {
    type: String,
    required: [true, 'Mobile number is required'],
  },
  amount: {
    type: Number,
    required: [true, 'Outstanding amount is required'],
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required'],
  },
  reminderType: {
    type: String,
    enum: ['WhatsApp', 'SMS', 'Email'],
    required: [true, 'Reminder type is required'],
  },
  reminderStatus: {
    type: String,
    enum: ['Sent', 'Failed', 'Pending'],
    default: 'Pending',
    required: [true, 'Reminder status is required'],
  },
  sentAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

reminderSchema.index({ dueDate: 1 });
reminderSchema.index({ customerId: 1 });
reminderSchema.index({ reminderStatus: 1 });

export const Reminder = model<IReminder>('Reminder', reminderSchema);
export default Reminder;
