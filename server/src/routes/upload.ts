import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create videos directory if it doesn't exist
const videosDir = path.resolve(__dirname, '../../data/videos');
fs.mkdir(videosDir, { recursive: true }).catch(console.error);

// Configure multer for video file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await fs.mkdir(videosDir, { recursive: true });
    cb(null, videosDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    cb(null, `${baseName}-${uniqueSuffix}${ext}`);
  }
});

// File filter to accept video files
const fileFilter = (req: express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept common video formats including iPhone formats
  const allowedMimes = [
    'video/mp4',
    'video/quicktime', // .mov files from iPhone
    'video/x-msvideo', // .avi
    'video/x-matroska', // .mkv
    'video/webm',
    'video/3gpp', // .3gp
    'video/x-m4v', // .m4v
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only video files are allowed.'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max file size
  },
  fileFilter: fileFilter,
});

// POST /api/upload/video - Upload video file
router.post('/video', upload.single('video'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }

    // Return the path relative to API base (without /api prefix since client adds it)
    const videoUrl = `/videos/${req.file.filename}`;
    
    res.json({
      success: true,
      videoUrl: videoUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
    });
  } catch (error: any) {
    console.error('Error uploading video:', error);
    res.status(500).json({ error: 'Failed to upload video', message: error.message });
  }
});

export default router;

