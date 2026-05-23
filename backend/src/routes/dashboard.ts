import { Router } from 'express';
import { getDashboard } from '../controllers/dashboardController';
import { protect } from '../middlewares/auth';

const router = Router();

router.use(protect);
router.get('/', getDashboard);

export default router;
