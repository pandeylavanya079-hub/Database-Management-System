import { Schema, model } from 'mongoose';

const dailyMilkCollectionSchema = new Schema({
  date: {
    type: Date,
    required: [true, 'Collection date is required'],
    default: Date.now,
  },
  supplierId: {
    type: Schema.Types.ObjectId,
    ref: 'Supplier',
    required: [true, 'Supplier ID reference is required'],
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative'],
  },
  fat: {
    type: Number,
    required: [true, 'Fat is required'],
    min: [0, 'Fat cannot be negative'],
  },
  snf: {
    type: Number,
    required: [true, 'SNF is required'],
    min: [0, 'SNF cannot be negative'],
  },
  rate: {
    type: Number,
    required: [true, 'Rate per liter is required'],
    min: [0, 'Rate cannot be negative'],
  },
  totalAmount: {
    type: Number,
    required: true,
  },
}, {
  timestamps: true,
});

dailyMilkCollectionSchema.pre('validate', function(next) {
  if (this.quantity && this.rate) {
    this.totalAmount = Number((this.quantity * this.rate).toFixed(2));
  }
  next();
});

dailyMilkCollectionSchema.index({ date: -1 });
dailyMilkCollectionSchema.index({ supplierId: 1, date: -1 });

export const DailyMilkCollection = model('DailyMilkCollection', dailyMilkCollectionSchema);
export default DailyMilkCollection;
