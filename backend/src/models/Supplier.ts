import { Schema, model } from 'mongoose';
import { ISupplier } from '../types';

const supplierSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Supplier name is required'],
    trim: true,
  },
  village: {
    type: String,
    required: [true, 'Village is required'],
    trim: true,
  },
  mobileNumber: {
    type: String,
    required: [true, 'Mobile number is required'],
    unique: true,
    trim: true,
    match: [/^[0-9]{10}$/, 'Mobile number must be exactly 10 digits'],
  },
  totalMilkSupplied: {
    type: Number,
    default: 0,
    min: [0, 'Total milk supplied cannot be negative'],
  },
  totalAmountPayable: {
    type: Number,
    default: 0,
    min: [0, 'Total amount payable cannot be negative'],
  },
  outstandingAmount: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Index for village search and sorting outstanding
supplierSchema.index({ village: 1 });
supplierSchema.index({ outstandingAmount: -1 });

export const Supplier = model<ISupplier>('Supplier', supplierSchema);
export default Supplier;
