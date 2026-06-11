import { Schema, model } from 'mongoose';

const milkPurchaseSchema = new Schema({
  purchaseDate: {
    type: Date,
    required: [true, 'Purchase date is required'],
    default: Date.now,
  },
  supplierId: {
    type: Schema.Types.ObjectId,
    ref: 'Supplier',
    required: [true, 'Supplier ID reference is required'],
  },
  supplierName: {
    type: String,
    required: true,
  },
  village: {
    type: String,
    required: true,
  },
  mobileNumber: {
    type: String,
    required: true,
  },
  milkType: {
    type: String,
    enum: ['Cow', 'Buffalo', 'Mixed'],
    required: [true, 'Milk type is required'],
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0.1, 'Quantity must be at least 0.1 liters'],
  },
  fatPercentage: {
    type: Number,
    required: [true, 'Fat percentage is required'],
    min: [0, 'Fat percentage cannot be negative'],
    max: [100, 'Fat percentage cannot exceed 100'],
  },
  snfPercentage: {
    type: Number,
    required: [true, 'SNF percentage is required'],
    min: [0, 'SNF percentage cannot be negative'],
    max: [100, 'SNF percentage cannot exceed 100'],
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
  notes: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

// Calculate totalAmount automatically before saving if not supplied
milkPurchaseSchema.pre('validate', function(next) {
  if (this.quantity && this.ratePerLiter) {
    this.totalAmount = Number((this.quantity * this.ratePerLiter).toFixed(2));
  }
  next();
});

// Indexes for analytical filters
milkPurchaseSchema.index({ purchaseDate: -1 });
milkPurchaseSchema.index({ supplierId: 1, purchaseDate: -1 });
milkPurchaseSchema.index({ village: 1 });

export const MilkPurchase = model('MilkPurchase', milkPurchaseSchema);
export default MilkPurchase;
