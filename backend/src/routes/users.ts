import { Router } from 'express';
import { listUsers } from '../controllers/userController';
import { protect } from '../middlewares/auth';

const router = Router();

router.use(protect);
router.get('/', listUsers);

export default router;
