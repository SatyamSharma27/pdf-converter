/**
 * GET /api/tools
 * Returns the full list of tools matching the frontend tools array.
 * Clients can filter by ?cat=to|from|edit|security
 */

const express = require('express');
const router  = express.Router();

const TOOLS = [
  // ── Convert TO PDF ──────────────────────────────────────────────────────────
  {
    name: 'Word to PDF',
    desc: 'Convert .doc & .docx files to PDF',
    emoji: '📝',
    cat: 'to',
    endpoint: '/api/convert',
    params: { target: 'pdf' },
    accepts: ['.doc', '.docx'],
  },
  {
    name: 'Excel to PDF',
    desc: 'Turn spreadsheets into PDFs',
    emoji: '📊',
    cat: 'to',
    endpoint: '/api/convert',
    params: { target: 'pdf' },
    accepts: ['.xls', '.xlsx'],
  },
  {
    name: 'PPT to PDF',
    desc: 'Convert presentations to PDF',
    emoji: '📑',
    cat: 'to',
    endpoint: '/api/convert',
    params: { target: 'pdf' },
    accepts: ['.ppt', '.pptx'],
  },
  {
    name: 'JPG to PDF',
    desc: 'Images to PDF in one click',
    emoji: '🖼️',
    cat: 'to',
    endpoint: '/api/convert',
    params: { target: 'pdf' },
    accepts: ['.jpg', '.jpeg', '.png', '.gif', '.tiff', '.webp'],
  },
  {
    name: 'AutoCAD to PDF',
    desc: 'DWG/DXF files to PDF',
    emoji: '📐',
    cat: 'to',
    endpoint: '/api/convert',
    params: { target: 'pdf' },
    accepts: ['.dwg', '.dxf'],
  },
  {
    name: 'eBook to PDF',
    desc: 'EPUB and MOBI to PDF',
    emoji: '📚',
    cat: 'to',
    endpoint: '/api/convert',
    params: { target: 'pdf' },
    accepts: ['.epub'],
  },
  {
    name: 'OpenOffice to PDF',
    desc: 'ODT, ODS, ODP to PDF',
    emoji: '🗂️',
    cat: 'to',
    endpoint: '/api/convert',
    params: { target: 'pdf' },
    accepts: ['.odt', '.ods', '.odp'],
  },
  {
    name: 'iWork to PDF',
    desc: 'Pages, Numbers, Keynote to PDF',
    emoji: '🍎',
    cat: 'to',
    endpoint: '/api/convert',
    params: { target: 'pdf' },
    accepts: ['.pages', '.numbers', '.key'],
  },

  // ── Convert FROM PDF ─────────────────────────────────────────────────────────
  {
    name: 'PDF to Word',
    desc: 'Extract editable text from PDF',
    emoji: '📄',
    cat: 'from',
    endpoint: '/api/convert',
    params: { target: 'docx' },
    accepts: ['.pdf'],
  },
  {
    name: 'PDF to Excel',
    desc: 'Tables from PDF to spreadsheet',
    emoji: '🔢',
    cat: 'from',
    endpoint: '/api/convert',
    params: { target: 'xlsx' },
    accepts: ['.pdf'],
  },
  {
    name: 'PDF to PPT',
    desc: 'PDF slides to PowerPoint',
    emoji: '🎞️',
    cat: 'from',
    endpoint: '/api/convert',
    params: { target: 'pptx' },
    accepts: ['.pdf'],
  },
  {
    name: 'PDF to JPG',
    desc: 'Export PDF pages as images',
    emoji: '🌄',
    cat: 'from',
    endpoint: '/api/convert',
    params: { target: 'jpg' },
    accepts: ['.pdf'],
  },
  {
    name: 'PDF to PNG',
    desc: 'High-quality PNG from PDF',
    emoji: '🖼️',
    cat: 'from',
    endpoint: '/api/convert',
    params: { target: 'png' },
    accepts: ['.pdf'],
  },
  {
    name: 'Extract Images',
    desc: 'Pull all images from a PDF',
    emoji: '📸',
    cat: 'from',
    endpoint: '/api/convert',
    params: { tool: 'extract_images' },
    accepts: ['.pdf'],
  },
  {
    name: 'PDF to PDF/A',
    desc: 'Archive-compliant PDF format',
    emoji: '🗃️',
    cat: 'from',
    endpoint: '/api/convert',
    params: { target: 'pdfa' },
    accepts: ['.pdf'],
  },

  // ── Edit PDF ─────────────────────────────────────────────────────────────────
  {
    name: 'Merge PDF',
    desc: 'Combine multiple PDFs into one',
    emoji: '🔗',
    cat: 'edit',
    endpoint: '/api/convert/merge',
    params: {},
    accepts: ['.pdf'],
    multiFile: true,
  },
  {
    name: 'Split PDF',
    desc: 'Break a PDF into separate pages',
    emoji: '✂️',
    cat: 'edit',
    endpoint: '/api/convert',
    params: { tool: 'split' },
    accepts: ['.pdf'],
  },
  {
    name: 'Compress PDF',
    desc: 'Reduce PDF file size',
    emoji: '🗜️',
    cat: 'edit',
    endpoint: '/api/convert',
    params: { tool: 'compress', quality: 'medium' },
    accepts: ['.pdf'],
  },
  {
    name: 'Rotate PDF',
    desc: 'Rotate pages to any angle',
    emoji: '🔄',
    cat: 'edit',
    endpoint: '/api/convert',
    params: { tool: 'rotate', angle: '90' },
    accepts: ['.pdf'],
  },
  {
    name: 'Delete Pages',
    desc: 'Remove unwanted PDF pages',
    emoji: '🗑️',
    cat: 'edit',
    endpoint: '/api/convert',
    params: { tool: 'delete_pages' },
    accepts: ['.pdf'],
  },
  {
    name: 'Flatten PDF',
    desc: 'Merge form fields into PDF',
    emoji: '📋',
    cat: 'edit',
    endpoint: '/api/convert',
    params: { tool: 'flatten' },
    accepts: ['.pdf'],
  },
  {
    name: 'Repair PDF',
    desc: 'Fix corrupted PDF files',
    emoji: '🔧',
    cat: 'edit',
    endpoint: '/api/convert',
    params: { tool: 'repair' },
    accepts: ['.pdf'],
  },

  // ── Security ─────────────────────────────────────────────────────────────────
  {
    name: 'Protect PDF',
    desc: 'Add password to your PDF',
    emoji: '🔐',
    cat: 'security',
    endpoint: '/api/convert',
    params: { tool: 'protect' },
    accepts: ['.pdf'],
    requiresPassword: true,
  },
  {
    name: 'Unlock PDF',
    desc: 'Remove PDF password',
    emoji: '🔓',
    cat: 'security',
    endpoint: '/api/convert',
    params: { tool: 'unlock' },
    accepts: ['.pdf'],
    requiresPassword: true,
  },
  {
    name: 'Redact PDF',
    desc: 'Permanently hide sensitive info',
    emoji: '⬛',
    cat: 'security',
    endpoint: '/api/convert',
    params: { tool: 'redact' },
    accepts: ['.pdf'],
  },
];

// GET /api/tools
router.get('/', (req, res) => {
  const { cat } = req.query;
  const results = cat ? TOOLS.filter(t => t.cat === cat) : TOOLS;
  res.json({ tools: results, total: results.length });
});

// GET /api/tools/:name – single tool info
router.get('/:name', (req, res) => {
  const tool = TOOLS.find(
    t => t.name.toLowerCase().replace(/\s+/g, '-') === req.params.name.toLowerCase()
  );
  if (!tool) return res.status(404).json({ error: 'Tool not found.' });
  res.json(tool);
});

module.exports = router;
