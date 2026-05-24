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
  reorderTasks,
} from '../controllers/taskController';
import { protect, restrictTo } from '../middlewares/auth';
import { validateObjectId } from '../middlewares/validateObjectId';
import {
  validate,
  taskCommentValidator,
  taskTimeLogValidator,
  taskSubtasksValidator,
} from '../middlewares/validate';
import { uploadAttachment as attachmentUpload } from '../config/multer';

const router = Router();

router.use(protect);

router.route('/').get(getTasks).post(createTask);

// Bulk reorder — must come before '/:id' so 'reorder' isn't read as an id.
router.patch('/reorder', reorderTasks);

router
  .route('/:id')
  .all(validateObjectId('id'))
  .get(getTask)
  .patch(updateTask)
  .delete(restrictTo('admin', 'manager'), deleteTask);

// Attachments — uploads land in uploads/attachments/:id/ via multer.
router.post(
  '/:id/attachments',
  validateObjectId('id'),
  attachmentUpload.single('file'),
  uploadAttachment,
);
router.delete(
  '/:id/attachments/:attachmentId',
  validateObjectId('id', 'attachmentId'),
  deleteAttachment,
);

router.post(
  '/:id/comments',
  validateObjectId('id'),
  validate(taskCommentValidator),
  addComment,
);
router.patch(
  '/:id/comments/:commentId',
  validateObjectId('id', 'commentId'),
  validate(taskCommentValidator),
  editComment,
);
router.delete(
  '/:id/comments/:commentId',
  validateObjectId('id', 'commentId'),
  deleteComment,
);

router.post(
  '/:id/time-log',
  validateObjectId('id'),
  validate(taskTimeLogValidator),
  logTime,
);
router.patch(
  '/:id/subtasks',
  validateObjectId('id'),
  validate(taskSubtasksValidator),
  updateSubtasks,
);

export default router;
