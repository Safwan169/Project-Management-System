import { Router } from 'express';
import {
  createSprint,
  getSprints,
  getSprint,
  updateSprint,
  deleteSprint,
  reorderSprints,
} from '../controllers/sprintController';
import { protect, restrictTo } from '../middlewares/auth';

// mergeParams: true so :projectId from the parent project router is visible.
const router = Router({ mergeParams: true });

router.use(protect);

router
  .route('/')
  .get(getSprints)
  .post(createSprint); // finer permission check (project manager) is in the controller

// Reorder is declared before /:sprintId so "reorder" isn't read as an id.
router.patch('/reorder', reorderSprints);

router
  .route('/:sprintId')
  .get(getSprint)
  .patch(updateSprint)
  .delete(restrictTo('admin'), deleteSprint);

export default router;
