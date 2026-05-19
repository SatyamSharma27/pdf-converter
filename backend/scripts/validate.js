/**
 * Input validation middleware
 * Applied before conversion routes to validate request parameters.
 */

const VALID_TARGETS = new Set([
  'pdf', 'pdfa',
  'docx', 'doc',
  'xlsx', 'xls',
  'pptx', 'ppt',
  'jpg', 'jpeg',
  'png',
  'odt', 'ods', 'odp',
]);

const VALID_TOOLS = new Set([
  'compress', 'protect', 'unlock', 'rotate',
  'split', 'merge', 'extract_images', 'delete_pages',
  'flatten', 'repair', 'redact',
]);

const VALID_QUALITY = new Set(['low', 'medium', 'high']);

function validateConvert(req, res, next) {
  const { target, tool, quality, angle, password } = req.body;

  // Must supply either target or tool
  if (!target && !tool) {
    return res.status(400).json({
      error: 'Provide either a target format (e.g. "pdf") or a tool name (e.g. "compress").',
    });
  }

  if (target && !VALID_TARGETS.has(target.toLowerCase())) {
    return res.status(400).json({
      error: `Invalid target format: "${target}". Allowed: ${[...VALID_TARGETS].join(', ')}`,
    });
  }

  if (tool && !VALID_TOOLS.has(tool.toLowerCase())) {
    return res.status(400).json({
      error: `Unknown tool: "${tool}". Allowed: ${[...VALID_TOOLS].join(', ')}`,
    });
  }

  if (quality && !VALID_QUALITY.has(quality.toLowerCase())) {
    return res.status(400).json({
      error: `Invalid quality value: "${quality}". Use low, medium, or high.`,
    });
  }

  if (angle !== undefined) {
    const a = parseInt(angle);
    if (![0, 90, 180, 270].includes(a)) {
      return res.status(400).json({ error: 'angle must be 0, 90, 180, or 270.' });
    }
  }

  if ((tool === 'protect' || tool === 'unlock') && !password) {
    return res.status(400).json({ error: `password is required for tool "${tool}".` });
  }

  next();
}

module.exports = { validateConvert };