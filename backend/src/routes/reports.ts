import { Router } from 'express';
import {
  getSummaryReport,
  getProjectReport,
  getUserReport,
} from '../controllers/reportController';
import { protect, restrictTo } from '../middlewares/auth';
import { validateObjectId } from '../middlewares/validateObjectId';

const router = Router();

router.use(protect, restrictTo('admin', 'manager'));

router.get('/summary', getSummaryReport);
router.get('/project/:projectId', validateObjectId('projectId'), getProjectReport);
router.get('/user/:userId', validateObjectId('userId'), getUserReport);

export default router;
