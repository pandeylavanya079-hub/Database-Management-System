import { Router } from 'express';
import { getSuppliers, getSupplierById, createSupplier, updateSupplier, deleteSupplier, getSupplierLedger } from '../controllers/supplierController';
import { protect, authorize } from '../middleware/auth';

const router = Router();

router.route('/')
  .get(protect, getSuppliers)
  .post(protect, authorize('Admin', 'Manager'), createSupplier);

router.route('/:id')
  .get(protect, getSupplierById)
  .put(protect, authorize('Admin', 'Manager'), updateSupplier)
  .delete(protect, authorize('Admin'), deleteSupplier);

router.get('/:id/ledger', protect, getSupplierLedger);

export default router;
