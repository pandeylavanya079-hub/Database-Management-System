import { Schema, model } from 'mongoose';

const dailyMilkDistributionSchema = new Schema({
  date: {
    type: Date,
    required: [true, 'Distribution date is required'],
    default: Date.now,
  },
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Customer ID reference is required'],
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity distributed is required'],
    min: [0, 'Quantity cannot be negative'],
  },
  rate: {
    type: Number,
    required: [true, 'Rate is required'],
    min: [0, 'Rate cannot be negative'],
  },
  totalAmount: {
    type: Number,
    required: true,
  },
}, {
  timestamps: true,
});

dailyMilkDistributionSchema.pre('validate', function(next) {
  if (this.quantity && this.rate) {
    this.totalAmount = Number((this.quantity * this.rate).toFixed(2));
  }
  next();
});

dailyMilkDistributionSchema.index({ date: -1 });
dailyMilkDistributionSchema.index({ customerId: 1, date: -1 });

export const DailyMilkDistribution = model('DailyMilkDistribution', dailyMilkDistributionSchema);
export default DailyMilkDistribution;
