/**
 * File management endpoints
 *
 * GET  /api/files/:filename  – metadata for a specific output file
 * GET  /api/files            – list all output files (admin only via API key)
 * DELETE /api/files/:filename – delete a specific output file immediately
 */

const express = require('express');
const path    = require('path');
const fs      = require('fs');
const router  = express.Router();

const OUTPUT_DIR = path.join(__dirname, '../outputs');

function resolveOutput(filename) {
  // Prevent path traversal
  const safe = path.basename(filename);
  return path.join(OUTPUT_DIR, safe);
}

function fileMeta(filename) {
  const fp   = resolveOutput(filename);
  const stat = fs.statSync(fp);
  const expiresAt = new Date(stat.mtimeMs + 3 * 60 * 60 * 1000);
  return {
    filename,
    size: stat.size,
    sizeHuman: formatBytes(stat.size),
    createdAt: stat.mtime,
    expiresAt,
    ttlSeconds: Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)),
  };
}

function formatBytes(bytes) {
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1024 ** 2)  return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
}

// Lightweight API key guard for admin-only routes
function adminOnly(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!key || key !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }
  next();
}

// GET /api/files/:filename – metadata
router.get('/:filename', (req, res) => {
  try {
    const meta = fileMeta(req.params.filename);
    res.json(meta);
  } catch {
    res.status(404).json({ error: 'File not found.' });
  }
});

// GET /api/files – list all (admin only)
router.get('/', adminOnly, (_req, res) => {
  fs.readdir(OUTPUT_DIR, (err, files) => {
    if (err) return res.status(500).json({ error: 'Could not list files.' });
    const result = files
      .filter(f => !f.startsWith('.'))
      .map(f => {
        try { return fileMeta(f); } catch { return null; }
      })
      .filter(Boolean);
    res.json({ files: result, total: result.length });
  });
});

// DELETE /api/files/:filename – immediate deletion
router.delete('/:filename', (req, res) => {
  const fp = resolveOutput(req.params.filename);
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'File not found.' });
  fs.unlink(fp, err => {
    if (err) return res.status(500).json({ error: 'Failed to delete file.' });
    res.json({ success: true, message: 'File deleted.' });
  });
});

module.exports = router;
