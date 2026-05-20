/**
 * POST /api/convert
 *
 * Body (multipart/form-data):
 *   file     – the file to convert
 *   target   – target format string, e.g. "pdf", "docx", "jpg"
 *   tool     – optional tool override, e.g. "compress", "merge", "protect"
 *   password – optional, used when tool === "protect"
 *   quality  – optional, "low" | "medium" | "high" for compress
 *
 * Response (JSON):
 *   { jobId, downloadUrl, filename, size }
 */

const express  = require('express');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const { v4: uuidv4 } = require('uuid');

const {
  convertToPDF,
  convertFromPDF,
  mergePDFs,
  splitPDF,
  compressPDF,
  protectPDF,
  unlockPDF,
  rotatePDF,
  extractImages,
  deletePages,
} = require('../scripts/converters');

const router = express.Router();

// ─── Multer setup ─────────────────────────────────────────────────────────────
const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/tiff',
  'image/webp',
  'application/epub+zip',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.oasis.opendocument.presentation',
  'image/vnd.dwg',                    // AutoCAD DWG (mime may vary)
  'application/acad',
]);

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_MB || '50') * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (_req, file, cb) => {
    const unique = `${uuidv4()}${path.extname(file.originalname).toLowerCase()}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    // Accept by mimetype OR by extension (some browsers send wrong mime)
    const allowedExt = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|jpg|jpeg|png|gif|tiff|webp|epub|odt|ods|odp|dwg|dxf)$/i;
    if (ALLOWED_MIME.has(file.mimetype) || allowedExt.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

// Multi-file upload for merge
const uploadMultiple = multer({ storage, limits: { fileSize: MAX_FILE_SIZE } })
  .array('files', 20);

// ─── Helpers ──────────────────────────────────────────────────────────────────
function buildDownloadUrl(req, filename) {
  const base = process.env.BASE_URL || `https://${req.get('host')}`;
  return `${base}/download/${filename}`;
}

function getOutputFilename(inputName, targetExt) {
  const stem = path.basename(inputName, path.extname(inputName));
  return `${stem}_converted_${uuidv4().slice(0, 8)}.${targetExt}`;
}

// ─── Single-file conversion endpoint ─────────────────────────────────────────
router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    const { target, tool, password, quality, pages } = req.body;
    const inputPath  = req.file.path;
    const outputDir  = path.join(__dirname, '../outputs');

    let outputPath;
    let outputFilename;

    // Route to correct converter based on 'tool' or 'target'
    switch (tool) {
      case 'compress': {
        outputFilename = getOutputFilename(req.file.originalname, 'pdf');
        outputPath = path.join(outputDir, outputFilename);
        await compressPDF(inputPath, outputPath, quality || 'medium');
        break;
      }
      case 'protect': {
        if (!password) return res.status(400).json({ error: 'Password is required for protect.' });
        outputFilename = getOutputFilename(req.file.originalname, 'pdf');
        outputPath = path.join(outputDir, outputFilename);
        await protectPDF(inputPath, outputPath, password);
        break;
      }
      case 'unlock': {
        if (!password) return res.status(400).json({ error: 'Password is required to unlock PDF.' });
        outputFilename = getOutputFilename(req.file.originalname, 'pdf');
        outputPath = path.join(outputDir, outputFilename);
        await unlockPDF(inputPath, outputPath, password);
        break;
      }
      case 'rotate': {
        const angle = parseInt(req.body.angle || '90');
        outputFilename = getOutputFilename(req.file.originalname, 'pdf');
        outputPath = path.join(outputDir, outputFilename);
        await rotatePDF(inputPath, outputPath, angle);
        break;
      }
      case 'split': {
        // Returns a zip of pages; outputPath is a .zip
        outputFilename = getOutputFilename(req.file.originalname, 'zip');
        outputPath = path.join(outputDir, outputFilename);
        await splitPDF(inputPath, outputPath);
        break;
      }
      case 'extract_images': {
        outputFilename = getOutputFilename(req.file.originalname, 'zip');
        outputPath = path.join(outputDir, outputFilename);
        await extractImages(inputPath, outputPath);
        break;
      }
      case 'delete_pages': {
        if (!pages) return res.status(400).json({ error: 'pages parameter required (e.g. "1,3,5-7").' });
        outputFilename = getOutputFilename(req.file.originalname, 'pdf');
        outputPath = path.join(outputDir, outputFilename);
        await deletePages(inputPath, outputPath, pages);
        break;
      }
      default: {
        // Standard format conversion
        if (!target) return res.status(400).json({ error: 'target format is required.' });

        const ext = path.extname(req.file.originalname).slice(1).toLowerCase();
        outputFilename = getOutputFilename(req.file.originalname, target);
        outputPath = path.join(outputDir, outputFilename);

        if (target === 'pdf') {
          await convertToPDF(inputPath, outputPath, ext);
        } else {
          await convertFromPDF(inputPath, outputPath, target);
        }
      }
    }

    // Gather output file info
    const stat = fs.statSync(outputPath);

    res.json({
      success: true,
      jobId: uuidv4(),
      filename: outputFilename,
      downloadUrl: buildDownloadUrl(req, outputFilename),
      size: stat.size,
      sizeHuman: formatBytes(stat.size),
    });
    
  } catch (err) {
    next(err);
  }
});

// ─── Merge endpoint (multiple files) ─────────────────────────────────────────
router.post('/merge', (req, res, next) => {
  uploadMultiple(req, res, async (err) => {
    if (err) return next(err);
    try {
      if (!req.files || req.files.length < 2)
        return res.status(400).json({ error: 'At least 2 PDF files are required for merging.' });

      const inputPaths   = req.files.map(f => f.path);
      const outputFilename = `merged_${uuidv4().slice(0, 8)}.pdf`;
      const outputPath   = path.join(__dirname, '../outputs', outputFilename);

      await mergePDFs(inputPaths, outputPath);

      const stat = fs.statSync(outputPath);
      res.json({
        success: true,
        filename: outputFilename,
        downloadUrl: buildDownloadUrl(req, outputFilename),
        size: stat.size,
        sizeHuman: formatBytes(stat.size),
      });
    } catch (err) {
      next(err);
    }
  });
});

// ─── Utility ──────────────────────────────────────────────────────────────────
function formatBytes(bytes) {
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1024 ** 2)  return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
}

module.exports = router;
