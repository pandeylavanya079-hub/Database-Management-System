import { Schema, model } from 'mongoose';

const milkSaleSchema = new Schema({
  saleDate: {
    type: Date,
    required: [true, 'Sale date is required'],
    default: Date.now,
  },
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Customer ID reference is required'],
  },
  customerName: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity sold is required'],
    min: [0.1, 'Quantity must be at least 0.1 liters'],
  },
  fatPercentage: {
    type: Number,
    required: [true, 'Fat percentage is required'],
    min: [0, 'Fat percentage cannot be negative'],
  },
  snfPercentage: {
    type: Number,
    required: [true, 'SNF percentage is required'],
    min: [0, 'SNF percentage cannot be negative'],
  },
  ratePerLiter: {
    type: Number,
    required: [true, 'Rate per liter is required'],
    min: [0, 'Rate per liter cannot be negative'],
  },
  totalAmount: {
    type: Number,
    required: true,
    min: [0, 'Total amount cannot be negative'],
  },
  paymentStatus: {
    type: String,
    enum: ['Paid', 'Unpaid', 'Partially Paid'],
    default: 'Unpaid',
  },
}, {
  timestamps: true,
});

milkSaleSchema.pre('validate', function(next) {
  if (this.quantity && this.ratePerLiter) {
    this.totalAmount = Number((this.quantity * this.ratePerLiter).toFixed(2));
  }
  next();
});

milkSaleSchema.index({ saleDate: -1 });
milkSaleSchema.index({ customerId: 1, saleDate: -1 });

export const MilkSale = model('MilkSale', milkSaleSchema);
export default MilkSale;
