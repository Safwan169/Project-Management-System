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
import { validateObjectId } from '../middlewares/validateObjectId';
import { uploadAvatar } from '../config/multer';

const router = Router();

router.use(protect);

router.get('/', listUsers);
router.get('/:id', validateObjectId('id'), getUser);
router.patch('/:id', validateObjectId('id'), updateUser);
router.delete('/:id', validateObjectId('id'), restrictTo('admin'), deleteUser);
router.post(
  '/:id/avatar',
  validateObjectId('id'),
  uploadAvatar.single('avatar'),
  uploadUserAvatar,
);
router.get('/:id/stats', validateObjectId('id'), getUserStats);

export default router;
