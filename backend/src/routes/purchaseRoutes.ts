import { Router } from 'express';
import { getPurchases, createPurchase, updatePurchase, deletePurchase, getPurchaseSummary } from '../controllers/purchaseController';
import { protect, authorize } from '../middleware/auth';

const router = Router();

router.get('/summary', protect, getPurchaseSummary);

router.route('/')
  .get(protect, getPurchases)
  .post(protect, authorize('Admin', 'Manager', 'Staff'), createPurchase);

router.route('/:id')
  .put(protect, authorize('Admin'), updatePurchase)
  .delete(protect, authorize('Admin'), deletePurchase);

export default router;
