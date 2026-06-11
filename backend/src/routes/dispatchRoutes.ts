import { Router } from 'express';
import { getDispatches, createDispatch, updateDispatch, deleteDispatch } from '../controllers/dispatchController';
import { protect, authorize } from '../middleware/auth';

const router = Router();

router.route('/')
  .get(protect, getDispatches)
  .post(protect, authorize('Admin', 'Manager', 'Staff'), createDispatch);

router.route('/:id')
  .put(protect, authorize('Admin', 'Manager'), updateDispatch)
  .delete(protect, authorize('Admin'), deleteDispatch);

export default router;
