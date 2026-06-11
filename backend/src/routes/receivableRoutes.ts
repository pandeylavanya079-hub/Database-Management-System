import { Router } from 'express';
import { getReceivables, recordCustomerPayment, updateReceivablePromisedDate, updateReceivable, updateCustomerPayment, sendReceivableReminder } from '../controllers/receivablesController';
import { protect, authorize } from '../middleware/auth';

const router = Router();

router.get('/', protect, getReceivables);
router.post('/payments', protect, authorize('Admin', 'Manager'), recordCustomerPayment);
router.put('/:id/promised-date', protect, authorize('Admin', 'Manager'), updateReceivablePromisedDate);
router.put('/:id', protect, authorize('Admin'), updateReceivable);
router.put('/payments/:id', protect, authorize('Admin'), updateCustomerPayment);
router.post('/:id/remind', protect, authorize('Admin', 'Manager'), sendReceivableReminder);

export default router;
