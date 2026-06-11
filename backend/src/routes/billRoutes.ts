import { Router } from 'express';
import { createBill, getBills, getBillById, updateBill, deleteBill, sendBillNotification } from '../controllers/billController';
import { protect, authorize } from '../middleware/auth';

const router = Router();

router.route('/')
  .post(protect, authorize('Admin', 'Manager'), createBill)
  .get(protect, getBills);

router.route('/:id')
  .get(protect, getBillById)
  .put(protect, authorize('Admin'), updateBill)
  .delete(protect, authorize('Admin'), deleteBill);

router.post('/:id/send', protect, authorize('Admin', 'Manager'), sendBillNotification);

export default router;
