import { Schema, model } from 'mongoose';

const payableSchema = new Schema({
  supplierId: {
    type: Schema.Types.ObjectId,
    ref: 'Supplier',
    required: [true, 'Supplier ID is required'],
  },
  supplierName: {
    type: String,
    required: true,
  },
  amountPayable: {
    type: Number,
    required: [true, 'Amount payable is required'],
    min: [0, 'Amount payable cannot be negative'],
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
}, {
  timestamps: true,
});

payableSchema.pre('validate', function(next) {
  if (this.amountPayable !== undefined && this.paidAmount !== undefined) {
    this.remainingAmount = Number((this.amountPayable - this.paidAmount).toFixed(2));
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

payableSchema.index({ supplierId: 1 });
payableSchema.index({ status: 1 });
payableSchema.index({ dueDate: 1 });

export const Payable = model('Payable', payableSchema);
export default Payable;
