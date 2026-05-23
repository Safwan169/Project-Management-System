import { Router } from 'express';
import {
  createTask,
  getTasks,
  getTask,
  updateTask,
  deleteTask,
  uploadAttachment,
  deleteAttachment,
  addComment,
  editComment,
  deleteComment,
  logTime,
  updateSubtasks,
} from '../controllers/taskController';
import { protect, restrictTo } from '../middlewares/auth';
import { uploadAttachment as attachmentUpload } from '../config/multer';

const router = Router();

router.use(protect);

router.route('/').get(getTasks).post(createTask);

router
  .route('/:id')
  .get(getTask)
  .patch(updateTask)
  .delete(restrictTo('admin', 'manager'), deleteTask);

// Attachments — uploads land in uploads/attachments/:id/ via multer.
router.post('/:id/attachments', attachmentUpload.single('file'), uploadAttachment);
router.delete('/:id/attachments/:attachmentId', deleteAttachment);

router.post('/:id/comments', addComment);
router.patch('/:id/comments/:commentId', editComment);
router.delete('/:id/comments/:commentId', deleteComment);

// Time tracking + subtasks batch edits.
router.post('/:id/time-log', logTime);
router.patch('/:id/subtasks', updateSubtasks);

export default router;
