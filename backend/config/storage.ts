import path from 'path';
import fs from 'fs';
import multer from 'multer';

// Define storage paths relative to project root
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const STORAGE_ROOT = path.join(PROJECT_ROOT, 'storage');
const MEDIA_DIR = path.join(STORAGE_ROOT, 'media');
const UPLOADS_DIR = path.join(MEDIA_DIR, 'uploads');

// Ensure storage directories exist
const createStorageDirectories = () => {
  [STORAGE_ROOT, MEDIA_DIR, UPLOADS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  });
};

// Create .gitkeep to preserve empty directories
const preserveDirectories = () => {
  [STORAGE_ROOT, MEDIA_DIR, UPLOADS_DIR].forEach(dir => {
    const gitkeepFile = path.join(dir, '.gitkeep');
    if (!fs.existsSync(gitkeepFile)) {
      fs.writeFileSync(gitkeepFile, '');
      console.log(`Created .gitkeep in: ${dir}`);
    }
  });
};

// Generate a unique filename that's URL-safe
const generateUniqueFilename = (originalFilename: string): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const ext = path.extname(originalFilename).toLowerCase();
  return `${timestamp}-${random}${ext}`;
};

// Initialize storage
export const initializeStorage = () => {
  createStorageDirectories();
  preserveDirectories();
  console.log('✅ Storage initialized at:', STORAGE_ROOT);
  return {
    STORAGE_ROOT,
    MEDIA_DIR,
    UPLOADS_DIR
  };
};

// Ensure uploads directory exists
function ensureUploadsDirectory() {
  const uploadPath = getUploadPath();
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
    console.log('Created uploads directory at:', uploadPath);
  }
}

// Get the absolute path to the uploads directory
export function getUploadPath(): string {
  // src is in backend/config, so .. goes to backend root
  return path.join(__dirname, '..', 'uploads');
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureUploadsDirectory();
    cb(null, getUploadPath());
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// Create multer instance with configuration
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG and GIF are allowed.'));
    }
  }
});

// Get public URL for uploaded file - use relative path for nginx proxy
export function getPublicUrl(filename: string | undefined): string | undefined {
  if (!filename) return undefined;
  return `/uploads/${filename}`;
}

// Call this when the server starts
ensureUploadsDirectory();

// Export the generateUniqueFilename function
export { generateUniqueFilename }; 