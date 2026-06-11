import { Router } from 'express';
import { registerUser, loginUser, getProfile, getUsers, toggleUserStatus } from '../controllers/authController';
import { protect, authorize } from '../middleware/auth';

const router = Router();

// Registration is open initially for first-user creation, then requires Admin role.
// See controller logic.
router.post('/register', registerUser);
router.post('/login', loginUser);

router.get('/me', protect, getProfile);
router.get('/users', protect, authorize('Admin'), getUsers);
router.patch('/users/:id/toggle', protect, authorize('Admin'), toggleUserStatus);

export default router;
