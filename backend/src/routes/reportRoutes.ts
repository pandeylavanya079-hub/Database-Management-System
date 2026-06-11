import { Router } from 'express';
import { getProfitLossReport, getSavedReports, getOutstandingReport, getOverdueReport, getRemindersReport } from '../controllers/reportController';
import { protect, authorize } from '../middleware/auth';

const router = Router();

// Reports are restricted to Admin role
router.use(protect, authorize('Admin'));

router.get('/pnl', getProfitLossReport);
router.get('/saved', getSavedReports);
router.get('/outstanding', getOutstandingReport);
router.get('/overdue', getOverdueReport);
router.get('/reminders', getRemindersReport);

export default router;
