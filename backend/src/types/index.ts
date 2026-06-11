import { Document } from 'mongoose';

export interface IUser extends Document {
  _id: any;
  name: string;
  email: string;
  password?: string;
  role: 'Admin' | 'Manager' | 'Staff';
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  comparePassword(password: string): Promise<boolean>;
}

export interface ISupplier extends Document {
  _id: any;
  name: string;
  village: string;
  mobileNumber: string;
  totalMilkSupplied: number;
  totalAmountPayable: number;
  outstandingAmount: number;
}

export interface ICustomer extends Document {
  _id: any;
  name: string;
  mobileNumber: string;
  address: string;
  dailyMilkRequirement: number;
  customerType: 'Retail' | 'Wholesale';
  outstandingBalance: number;
  lastPaymentDate?: Date;
  email?: string;
  lastReminderDate?: Date;
  totalRemindersSent?: number;
}
