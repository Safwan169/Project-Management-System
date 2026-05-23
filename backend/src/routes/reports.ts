import { Router } from 'express';
import {
  getSummaryReport,
  getProjectReport,
  getUserReport,
} from '../controllers/reportController';
import { protect, restrictTo } from '../middlewares/auth';

const router = Router();

router.use(protect, restrictTo('admin', 'manager'));

router.get('/summary', getSummaryReport);
router.get('/project/:projectId', getProjectReport);
router.get('/user/:userId', getUserReport);

export default router;
