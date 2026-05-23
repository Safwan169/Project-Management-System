import { Request } from 'express';
import fs from 'fs';
import path from 'path';
import multer, { FileFilterCallback, StorageEngine } from 'multer';

export const UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads');
const THUMBNAIL_DIR = path.join(UPLOAD_ROOT, 'thumbnails');
export const ATTACHMENT_DIR = path.join(UPLOAD_ROOT, 'attachments');

const IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ATTACHMENT_MIME = [...IMAGE_MIME, 'application/pdf'];

for (const dir of [THUMBNAIL_DIR, ATTACHMENT_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}

function diskStorageFor(destination: string): StorageEngine {
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, destination),
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${path.extname(file.originalname).toLowerCase()}`);
    },
  });
}

function mimeFilter(allowed: string[]) {
  return (_req: Request, file: Express.Multer.File, cb: FileFilterCallback): void => {
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  };
}

export const uploadThumbnail = multer({
  storage: diskStorageFor(THUMBNAIL_DIR),
  fileFilter: mimeFilter(IMAGE_MIME),
  limits: { fileSize: 2 * 1024 * 1024 },
});

// Attachment destination is per-task: uploads/attachments/:taskId/
const taskAttachmentStorage: StorageEngine = multer.diskStorage({
  destination: (req, _file, cb) => {
    const raw = req.params.id;
    const taskId = Array.isArray(raw) ? raw[0] : raw;
    if (!taskId) return cb(new Error('Missing task id for upload destination'), '');
    const dir = path.join(ATTACHMENT_DIR, taskId);
    fs.mkdir(dir, { recursive: true }, (err) => cb(err, dir));
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname).toLowerCase()}`);
  },
});

export const uploadAttachment = multer({
  storage: taskAttachmentStorage,
  fileFilter: mimeFilter(ATTACHMENT_MIME),
  limits: { fileSize: 10 * 1024 * 1024 },
});
