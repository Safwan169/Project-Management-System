import { Request } from 'express';
import fs from 'fs';
import path from 'path';
import multer, { FileFilterCallback, StorageEngine } from 'multer';

const UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads');
const THUMBNAIL_DIR = path.join(UPLOAD_ROOT, 'thumbnails');
const ATTACHMENT_DIR = path.join(UPLOAD_ROOT, 'attachments');

const IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ATTACHMENT_MIME = [...IMAGE_MIME, 'application/pdf'];

// Make sure the target folders exist before multer writes to them.
for (const dir of [THUMBNAIL_DIR, ATTACHMENT_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}

// Builds a disk storage engine for a fixed destination, with a unique,
// extension-preserving filename so concurrent uploads never collide.
function diskStorageFor(destination: string): StorageEngine {
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, destination),
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${path.extname(file.originalname).toLowerCase()}`);
    },
  });
}

// Rejects any file whose mimetype isn't in the allowed list.
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
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

export const uploadAttachment = multer({
  storage: diskStorageFor(ATTACHMENT_DIR),
  fileFilter: mimeFilter(ATTACHMENT_MIME),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});
