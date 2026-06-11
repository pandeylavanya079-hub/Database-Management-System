import { Router } from 'express';
import { getExpenses, createExpense, updateExpense, deleteExpense, getExpenseAnalysis } from '../controllers/expenseController';
import { protect, authorize } from '../middleware/auth';

const router = Router();

// Financial details - Admin Only
router.use(protect, authorize('Admin'));

router.get('/analysis', getExpenseAnalysis);

router.route('/')
  .get(getExpenses)
  .post(createExpense);

router.route('/:id')
  .put(updateExpense)
  .delete(deleteExpense);

export default router;
