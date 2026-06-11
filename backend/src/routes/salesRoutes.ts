import { Router } from 'express';
import { getSales, createSale, updateSale, deleteSale } from '../controllers/salesController';
import { protect, authorize } from '../middleware/auth';

const router = Router();

router.route('/')
  .get(protect, getSales)
  .post(protect, authorize('Admin', 'Manager', 'Staff'), createSale);

router.route('/:id')
  .put(protect, authorize('Admin'), updateSale)
  .delete(protect, authorize('Admin'), deleteSale);

export default router;
