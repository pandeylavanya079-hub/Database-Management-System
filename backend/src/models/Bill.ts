import { Schema, model, Document } from 'mongoose';

export interface IBillItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface IBill extends Document {
  billNumber: string;
  customerId: any;
  customerName: string;
  customerMobile: string;
  billDate: Date;
  dueDate: Date;
  items: IBillItem[];
  subtotal: number;
  discount: number;
  tax: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'Paid' | 'Unpaid' | 'Partially Paid';
  businessName: string;
  businessAddress: string;
  businessPhone: string;
}

const billItemSchema = new Schema({
  description: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: [0.01, 'Quantity must be positive'],
  },
  rate: {
    type: Number,
    required: true,
    min: [0, 'Rate cannot be negative'],
  },
  amount: {
    type: Number,
    required: true,
  }
});

const billSchema = new Schema({
  billNumber: {
    type: String,
    required: true,
    unique: true,
  },
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
  },
  customerName: {
    type: String,
    required: true,
  },
  customerMobile: {
    type: String,
    required: true,
  },
  billDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  dueDate: {
    type: Date,
    required: true,
  },
  items: [billItemSchema],
  subtotal: {
    type: Number,
    required: true,
    default: 0,
  },
  discount: {
    type: Number,
    required: true,
    default: 0,
  },
  tax: {
    type: Number,
    required: true,
    default: 0,
  },
  totalAmount: {
    type: Number,
    required: true,
    default: 0,
  },
  paidAmount: {
    type: Number,
    required: true,
    default: 0,
  },
  remainingAmount: {
    type: Number,
    required: true,
    default: 0,
  },
  status: {
    type: String,
    enum: ['Paid', 'Unpaid', 'Partially Paid'],
    default: 'Unpaid',
  },
  businessName: {
    type: String,
    required: true,
    default: 'Pitambara Doodh Dairy',
  },
  businessAddress: {
    type: String,
    required: true,
    default: 'Devpura, Jaitpur Kala, District Agra, Pincode 283114',
  },
  businessPhone: {
    type: String,
    required: true,
    default: 'Vandana Purohit - 7668459330, Deelip Purohit - 7817873319',
  }
}, {
  timestamps: true,
});

// Calculate totals pre-validation
billSchema.pre('validate', function(next) {
  if (this.items && this.items.length > 0) {
    // 1. Calculate amount for each item
    this.items.forEach(item => {
      item.amount = Number((item.quantity * item.rate).toFixed(2));
    });

    // 2. Sum subtotal
    this.subtotal = Number(this.items.reduce((sum, item) => sum + item.amount, 0).toFixed(2));
  }

  // 3. Calculate totalAmount
  this.totalAmount = Number((this.subtotal + this.tax - this.discount).toFixed(2));
  if (this.totalAmount < 0) this.totalAmount = 0;

  // 4. Calculate remainingAmount
  this.remainingAmount = Number((this.totalAmount - this.paidAmount).toFixed(2));
  if (this.remainingAmount < 0) this.remainingAmount = 0;

  // 5. Update Status
  if (this.remainingAmount <= 0) {
    this.status = 'Paid';
  } else if (this.paidAmount > 0) {
    this.status = 'Partially Paid';
  } else {
    this.status = 'Unpaid';
  }

  next();
});
billSchema.index({ customerId: 1 });
billSchema.index({ billDate: -1 });

export const Bill = model<IBill>('Bill', billSchema);
export default Bill;
