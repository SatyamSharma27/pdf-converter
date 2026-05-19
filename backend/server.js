/**
 * PDF Converter – Backend Server
 * Stack: Node.js + Express
 * Conversion engines: LibreOffice, ImageMagick, pdftk, Ghostscript, pikepdf (Python)
 *
 * Start: node server.js
 * Default port: 3000
 */

const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const rateLimit = require('express-rate-limit');
const path    = require('path');
const fs      = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Ensure required directories exist ───────────────────────────────────────
['uploads', 'outputs'].forEach(dir => {
  const p = path.join(__dirname, dir);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

// ─── Security Middleware ──────────────────────────────────────────────────────
app.use(helmet());

// CORS – allow the frontend origin (update in production)
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || '*',
  methods: ['GET', 'POST', 'DELETE'],
   allowedHeaders: ["Content-Type"]
}));

// Body parsing (JSON for non-file endpoints)
app.use(express.json());

// Global rate limiter – 100 requests / 15 min per IP
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
}));

// Stricter rate limit for conversion endpoint
const convertLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute window
  max: 10,               // 10 conversions / minute / IP
  message: { error: 'Conversion rate limit reached. Please wait a moment.' },
});

// ─── Routes ──────────────────────────────────────────────────────────────────
const convertRouter = require('./routes/convert');
const toolsRouter   = require('./routes/tools');
const filesRouter   = require('./routes/files');

app.use('/api/convert', convertLimiter, convertRouter);
app.use('/api/tools',   toolsRouter);
app.use('/api/files',   filesRouter);

// Serve converted files for download
app.use('/outputs', express.static(path.join(__dirname, 'outputs')));

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.message);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
});

// ─── Auto-cleanup: delete files older than 3 hours ───────────────────────────
const THREE_HOURS = 3 * 60 * 60 * 1000;

function cleanOldFiles() {
  ['uploads', 'outputs'].forEach(dir => {
    const folder = path.join(__dirname, dir);
    fs.readdir(folder, (err, files) => {
      if (err) return;
      const now = Date.now();
      files.forEach(file => {
        const fp = path.join(folder, file);
        fs.stat(fp, (err, stat) => {
          if (!err && now - stat.mtimeMs > THREE_HOURS) {
            fs.unlink(fp, () => {});
          }
        });
      });
    });
  });
}

setInterval(cleanOldFiles, 30 * 60 * 1000); // run every 30 minutes
cleanOldFiles();                              // also run at startup

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ PDF Converter backend running on http://localhost:${PORT}`);
});