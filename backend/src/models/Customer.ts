import { Schema, model } from 'mongoose';
import { ICustomer } from '../types';

const customerSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true,
  },
  mobileNumber: {
    type: String,
    required: [true, 'Mobile number is required'],
    unique: true,
    trim: true,
    match: [/^[0-9]{10}$/, 'Mobile number must be exactly 10 digits'],
  },
  email: {
    type: String,
    trim: true,
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true,
  },
  dailyMilkRequirement: {
    type: Number,
    required: [true, 'Daily milk requirement is required'],
    min: [0, 'Daily milk requirement cannot be negative'],
  },
  customerType: {
    type: String,
    enum: ['Retail', 'Wholesale'],
    default: 'Retail',
  },
  outstandingBalance: {
    type: Number,
    default: 0,
  },
  lastPaymentDate: {
    type: Date,
  },
  lastReminderDate: {
    type: Date,
  },
  totalRemindersSent: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

customerSchema.index({ customerType: 1 });
customerSchema.index({ outstandingBalance: -1 });

export const Customer = model<ICustomer>('Customer', customerSchema);
export default Customer;
