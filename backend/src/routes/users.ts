import { Router } from 'express';
import {
  listUsers,
  getUser,
  updateUser,
  deleteUser,
  uploadUserAvatar,
  getUserStats,
} from '../controllers/userController';
import { protect, restrictTo } from '../middlewares/auth';
import { uploadAvatar } from '../config/multer';

const router = Router();

router.use(protect);

router.get('/', listUsers);
router.get('/:id', getUser);
router.patch('/:id', updateUser);
router.delete('/:id', restrictTo('admin'), deleteUser);
router.post('/:id/avatar', uploadAvatar.single('avatar'), uploadUserAvatar);
router.get('/:id/stats', getUserStats);

export default router;
