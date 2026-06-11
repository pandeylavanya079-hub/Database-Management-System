import { Router } from 'express';
import { getTrucks, getTruckById, createTruck, updateTruck, deleteTruck, getTruckHistory } from '../controllers/truckController';
import { protect, authorize } from '../middleware/auth';

const router = Router();

router.route('/')
  .get(protect, getTrucks)
  .post(protect, authorize('Admin', 'Manager'), createTruck);

router.route('/:id')
  .get(protect, getTruckById)
  .put(protect, authorize('Admin', 'Manager'), updateTruck)
  .delete(protect, authorize('Admin'), deleteTruck);

router.get('/:id/history', protect, getTruckHistory);

export default router;
