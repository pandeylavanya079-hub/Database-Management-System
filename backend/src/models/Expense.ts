import { Schema, model } from 'mongoose';

const expenseSchema = new Schema({
  date: {
    type: Date,
    required: [true, 'Expense date is required'],
    default: Date.now,
  },
  expenseType: {
    type: String,
    enum: ['Fuel', 'Salary', 'Transport', 'Maintenance', 'Electricity', 'Miscellaneous'],
    required: [true, 'Expense type is required'],
  },
  amount: {
    type: Number,
    required: [true, 'Expense amount is required'],
    min: [0.01, 'Amount must be greater than zero'],
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
  },
}, {
  timestamps: true,
});

expenseSchema.index({ date: -1 });
expenseSchema.index({ expenseType: 1 });

export const Expense = model('Expense', expenseSchema);
export default Expense;
