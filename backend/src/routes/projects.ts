import { Router } from 'express';
import {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  uploadThumbnail,
  getProjectStats,
  addMember,
  removeMember,
} from '../controllers/projectController';
import { protect, restrictTo } from '../middlewares/auth';
import { uploadThumbnail as thumbnailUpload } from '../config/multer';

const router = Router();

// Every project route requires a valid session.
router.use(protect);

router
  .route('/')
  .get(getProjects)
  .post(restrictTo('admin', 'manager'), createProject);

router
  .route('/:id')
  .get(getProject)
  .patch(updateProject) // finer-grained check (project manager) is in the controller
  .delete(restrictTo('admin'), deleteProject);

router.post('/:id/thumbnail', thumbnailUpload.single('thumbnail'), uploadThumbnail);
router.get('/:id/stats', getProjectStats);

router.post('/:id/members', restrictTo('admin', 'manager'), addMember);
router.delete('/:id/members/:userId', restrictTo('admin', 'manager'), removeMember);

export default router;
