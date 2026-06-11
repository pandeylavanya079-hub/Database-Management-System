import { Router } from 'express';
import { getCustomers, getCustomerById, createCustomer, updateCustomer, deleteCustomer, getCustomerLedger, sendCustomerReminder, getCustomerReminders } from '../controllers/customerController';
import { protect, authorize } from '../middleware/auth';

const router = Router();

router.route('/')
  .get(protect, getCustomers)
  .post(protect, authorize('Admin', 'Manager'), createCustomer);

router.route('/:id')
  .get(protect, getCustomerById)
  .put(protect, authorize('Admin', 'Manager'), updateCustomer)
  .delete(protect, authorize('Admin'), deleteCustomer);

router.get('/:id/ledger', protect, getCustomerLedger);
router.get('/:id/reminders', protect, getCustomerReminders);
router.post('/:id/remind', protect, authorize('Admin', 'Manager'), sendCustomerReminder);

export default router;
