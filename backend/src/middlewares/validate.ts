import { Request, Response, NextFunction } from 'express';
import { body, validationResult, ValidationChain } from 'express-validator';

// Runs the validation chains, then responds 422 with field errors if any failed.
export const validate =
  (chains: ValidationChain[]) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await Promise.all(chains.map((chain) => chain.run(req)));

    const result = validationResult(req);
    if (result.isEmpty()) {
      return next();
    }

    // Group messages by field: { email: ["..."], password: ["..."] }.
    const errors: Record<string, string[]> = {};
    for (const err of result.array()) {
      const field = err.type === 'field' ? err.path : '_';
      (errors[field] ??= []).push(err.msg);
    }

    res.status(422).json({ message: 'Validation failed', errors });
  };

export const registerValidator: ValidationChain[] = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password')
    .isString()
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('role')
    .optional()
    .isIn(['admin', 'manager', 'member'])
    .withMessage('Role must be admin, manager, or member'),
];

export const loginValidator: ValidationChain[] = [
  body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').isString().notEmpty().withMessage('Password is required'),
];

export const updatePasswordValidator: ValidationChain[] = [
  body('currentPassword').isString().notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isString()
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters'),
];

export const taskCommentValidator: ValidationChain[] = [
  body('text').trim().notEmpty().withMessage('Comment text is required'),
  body('parentComment')
    .optional()
    .isMongoId()
    .withMessage('Parent comment must be a valid id'),
];

export const taskTimeLogValidator: ValidationChain[] = [
  body('hours')
    .isFloat({ min: 0.01 })
    .withMessage('Hours must be greater than 0'),
  body('date').optional().isISO8601().withMessage('Date must be valid'),
  body('note').optional().isString().trim(),
];

export const taskSubtasksValidator: ValidationChain[] = [
  body('add').optional().isArray(),
  body('add.*.title').optional().trim().notEmpty().withMessage('Subtask title is required'),
  body('toggle').optional().isArray(),
  body('toggle.*.id').optional().isMongoId(),
  body('toggle.*.completed').optional().isBoolean(),
  body('remove').optional().isArray(),
  body('remove.*').optional().isMongoId(),
];
