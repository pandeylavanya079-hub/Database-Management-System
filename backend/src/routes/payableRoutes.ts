import { Router } from 'express';
import { getPayables, recordSupplierPayment, updateSupplierPayment, updatePayable } from '../controllers/payablesController';
import { protect, authorize } from '../middleware/auth';

const router = Router();

router.get('/', protect, getPayables);
router.post('/payments', protect, authorize('Admin', 'Manager'), recordSupplierPayment);
router.put('/payments/:id', protect, authorize('Admin'), updateSupplierPayment);
router.put('/:id', protect, authorize('Admin'), updatePayable);

export default router;
