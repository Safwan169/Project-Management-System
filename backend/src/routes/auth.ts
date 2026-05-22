import { Router } from 'express';
import { register, login, getMe, updatePassword } from '../controllers/authController';
import { protect, optionalAuth } from '../middlewares/auth';
import {
  validate,
  registerValidator,
  loginValidator,
  updatePasswordValidator,
} from '../middlewares/validate';

const router = Router();

// optionalAuth: anonymous callers register as 'member'; an authenticated
// admin may also set role to admin/manager.
router.post('/register', optionalAuth, validate(registerValidator), register);
router.post('/login', validate(loginValidator), login);

router.get('/me', protect, getMe);
router.patch('/update-password', protect, validate(updatePasswordValidator), updatePassword);

export default router;
