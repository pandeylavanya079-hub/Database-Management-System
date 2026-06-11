import { Schema, model } from 'mongoose';

const receivableSchema = new Schema({
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Customer ID is required'],
  },
  customerName: {
    type: String,
    required: true,
  },
  customerMobile: {
    type: String,
  },
  amountDue: {
    type: Number,
    required: [true, 'Amount due is required'],
    min: [0, 'Amount due cannot be negative'],
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required'],
  },
  paidAmount: {
    type: Number,
    default: 0,
    min: [0, 'Paid amount cannot be negative'],
  },
  remainingAmount: {
    type: Number,
    required: true,
    min: [0, 'Remaining amount cannot be negative'],
  },
  status: {
    type: String,
    enum: ['Unpaid', 'Partially Paid', 'Paid'],
    default: 'Unpaid',
  },
  promisedDate: {
    type: Date,
  },
}, {
  timestamps: true,
});

receivableSchema.pre('validate', function(next) {
  if (this.amountDue !== undefined && this.paidAmount !== undefined) {
    this.remainingAmount = Number((this.amountDue - this.paidAmount).toFixed(2));
    if (this.remainingAmount <= 0) {
      this.status = 'Paid';
    } else if (this.paidAmount > 0) {
      this.status = 'Partially Paid';
    } else {
      this.status = 'Unpaid';
    }
  }
  next();
});

receivableSchema.index({ customerId: 1 });
receivableSchema.index({ status: 1 });
receivableSchema.index({ dueDate: 1 });

export const Receivable = model('Receivable', receivableSchema);
export default Receivable;
