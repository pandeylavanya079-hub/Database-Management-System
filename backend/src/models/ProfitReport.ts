import { Schema, model } from 'mongoose';

const profitReportSchema = new Schema({
  startDate: {
    type: Date,
    required: [true, 'Start date is required'],
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required'],
  },
  revenue: {
    type: Number,
    required: true,
  },
  purchaseCost: {
    type: Number,
    required: true,
  },
  expenses: {
    type: Number,
    required: true,
  },
  grossProfit: {
    type: Number,
    required: true,
  },
  netProfit: {
    type: Number,
    required: true,
  },
  generatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

profitReportSchema.index({ startDate: -1, endDate: -1 });

export const ProfitReport = model('ProfitReport', profitReportSchema);
export default ProfitReport;
