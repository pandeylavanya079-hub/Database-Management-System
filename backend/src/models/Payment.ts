import { Schema, model } from 'mongoose';

const paymentSchema = new Schema({
  date: {
    type: Date,
    required: [true, 'Payment date is required'],
    default: Date.now,
  },
  type: {
    type: String,
    enum: ['Inflow', 'Outflow'],
    required: [true, 'Payment type (Inflow/Outflow) is required'],
  },
  supplierId: {
    type: Schema.Types.ObjectId,
    ref: 'Supplier',
    required: function(this: any) { return this.type === 'Outflow'; }
  },
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
    required: function(this: any) { return this.type === 'Inflow'; }
  },
  amount: {
    type: Number,
    required: [true, 'Payment amount is required'],
    min: [0.01, 'Payment amount must be greater than zero'],
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Bank Transfer', 'UPI'],
    required: [true, 'Payment method is required'],
  },
  referenceNumber: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

paymentSchema.index({ date: -1 });
paymentSchema.index({ supplierId: 1 });
paymentSchema.index({ customerId: 1 });

export const Payment = model('Payment', paymentSchema);
export default Payment;
