/**
 * Conversion engine
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// ✅ LibreOffice Path (Mac)
const libreofficePath =
  "/Applications/LibreOffice.app/Contents/MacOS/soffice";

// ─────────────────────────────────────────────────────────────
// Helper Function
// ─────────────────────────────────────────────────────────────
function run(cmd, args, opts = {}) {

  return new Promise((resolve, reject) => {

    console.log("\n🚀 RUNNING COMMAND:");
    console.log(cmd, args.join(" "));

    const proc = spawn(cmd, args, {
      ...opts,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', d => {
      stdout += d.toString();
    });

    proc.stderr.on('data', d => {
      stderr += d.toString();
    });

    proc.on('close', code => {

      console.log("EXIT CODE:", code);

      if (stdout) {
        console.log("STDOUT:", stdout);
      }

      if (stderr) {
        console.log("STDERR:", stderr);
      }

      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(
          new Error(
            `${cmd} exited ${code}\n${stderr}`
          )
        );
      }

    });

    proc.on('error', err => {
      console.log("SPAWN ERROR:", err);
      reject(err);
    });

  });

}

// ─────────────────────────────────────────────────────────────
// Rename LibreOffice Output
// ─────────────────────────────────────────────────────────────
async function moveLibreOfficeOutput(inputPath, outputPath) {

  const stem = path.basename(
    inputPath,
    path.extname(inputPath)
  );

  const generatedFile = path.join(
    path.dirname(outputPath),
    `${stem}.pdf`
  );

  console.log("EXPECTED GENERATED FILE:", generatedFile);

  if (fs.existsSync(generatedFile)) {

    console.log("✅ Generated file found");

    if (generatedFile !== outputPath) {

      fs.renameSync(generatedFile, outputPath);

      console.log("✅ File renamed to:", outputPath);

    }

  } else {

    console.log("❌ Generated file NOT FOUND");

    throw new Error(
      "LibreOffice did not generate output PDF"
    );

  }

}

// ─────────────────────────────────────────────────────────────
// Convert TO PDF
// ─────────────────────────────────────────────────────────────
async function convertToPDF(inputPath, outputPath, sourceExt) {

  console.log("\n========== CONVERT TO PDF ==========");
  console.log("INPUT:", inputPath);
  console.log("OUTPUT:", outputPath);
  console.log("SOURCE EXT:", sourceExt);

  const imageExts = [
    'jpg',
    'jpeg',
    'png',
    'gif',
    'bmp',
    'webp',
    'tiff'
  ];

  // ─── Image → PDF ──────────────────────────────────────────
  if (imageExts.includes(sourceExt)) {

    console.log("🖼️ IMAGE TO PDF");

    await run('sips', [
      '-s',
      'format',
      'pdf',
      inputPath,
      '--out',
      outputPath
    ]);

    return;

  }

  // ─── Office → PDF ─────────────────────────────────────────
  console.log("📄 OFFICE TO PDF USING LIBREOFFICE");

  await run(libreofficePath, [
    '--headless',
    '--convert-to',
    'pdf',
    '--outdir',
    path.dirname(outputPath),
    inputPath
  ]);

  console.log("✅ LibreOffice conversion completed");

  await moveLibreOfficeOutput(
    inputPath,
    outputPath
  );

  console.log("✅ FINAL PDF READY");

}

// ─────────────────────────────────────────────────────────────
// Convert FROM PDF
// ─────────────────────────────────────────────────────────────
async function convertFromPDF(
  inputPath,
  outputPath,
  targetFormat
) {

  console.log("\n========== CONVERT FROM PDF ==========");
  console.log("TARGET:", targetFormat);

  switch (targetFormat) {

    case 'doc':
    case 'docx':

      await run(libreofficePath, [
        '--headless',
        '--infilter=writer_pdf_import',
        '--convert-to',
        'docx',
        '--outdir',
        path.dirname(outputPath),
        inputPath
      ]);

      break;

    case 'xlsx':

      await run(libreofficePath, [
        '--headless',
        '--infilter=calc_pdf_import',
        '--convert-to',
        'xlsx',
        '--outdir',
        path.dirname(outputPath),
        inputPath
      ]);

      break;

    case 'pptx':

      await run(libreofficePath, [
        '--headless',
        '--infilter=impress_pdf_import',
        '--convert-to',
        'pptx',
        '--outdir',
        path.dirname(outputPath),
        inputPath
      ]);

      break;

    case 'jpg':
    case 'jpeg':

      await run('sips', [
        '-s',
        'format',
        'jpeg',
        inputPath,
        '--out',
        outputPath
      ]);

      break;

    case 'png':

      await run('sips', [
        '-s',
        'format',
        'png',
        inputPath,
        '--out',
        outputPath
      ]);

      break;

    default:

      throw new Error(
        `Unsupported format: ${targetFormat}`
      );

  }

}

// ─────────────────────────────────────────────────────────────
// Merge PDFs
// ─────────────────────────────────────────────────────────────
async function mergePDFs(inputPaths, outputPath) {

  await run('pdfunite', [
    ...inputPaths,
    outputPath
  ]);

}

// ─────────────────────────────────────────────────────────────
// Split PDF
// ─────────────────────────────────────────────────────────────
async function splitPDF(inputPath, outputDir) {

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  await run('pdfseparate', [
    inputPath,
    path.join(outputDir, 'page-%d.pdf')
  ]);

}

// ─────────────────────────────────────────────────────────────
// Compress PDF
// ─────────────────────────────────────────────────────────────
async function compressPDF(
  inputPath,
  outputPath
) {

  await run('gs', [
    '-sDEVICE=pdfwrite',
    '-dCompatibilityLevel=1.4',
    '-dPDFSETTINGS=/ebook',
    '-dNOPAUSE',
    '-dQUIET',
    '-dBATCH',
    `-sOutputFile=${outputPath}`,
    inputPath
  ]);

}

// ─────────────────────────────────────────────────────────────
// Rotate PDF
// ─────────────────────────────────────────────────────────────
async function rotatePDF(
  inputPath,
  outputPath
) {

  await run('pdftk', [
    inputPath,
    'cat',
    '1-endright',
    'output',
    outputPath
  ]);

}

// ─────────────────────────────────────────────────────────────
// Delete Pages
// ─────────────────────────────────────────────────────────────
async function deletePages() {

  throw new Error(
    'Delete pages feature not implemented yet'
  );

}

// ─────────────────────────────────────────────────────────────
// Protect PDF
// ─────────────────────────────────────────────────────────────
async function protectPDF(
  inputPath,
  outputPath,
  password
) {

  await run('pdftk', [
    inputPath,
    'output',
    outputPath,
    'user_pw',
    password
  ]);

}

// ─────────────────────────────────────────────────────────────
// Unlock PDF
// ─────────────────────────────────────────────────────────────
async function unlockPDF(
  inputPath,
  outputPath,
  password
) {

  await run('pdftk', [
    inputPath,
    'input_pw',
    password,
    'output',
    outputPath
  ]);

}

// ─────────────────────────────────────────────────────────────
// Extract Images
// ─────────────────────────────────────────────────────────────
async function extractImages(
  inputPath,
  outputDir
) {

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  await run('pdfimages', [
    '-all',
    inputPath,
    path.join(outputDir, 'image')
  ]);

}

module.exports = {
  convertToPDF,
  convertFromPDF,
  mergePDFs,
  splitPDF,
  compressPDF,
  rotatePDF,
  deletePages,
  protectPDF,
  unlockPDF,
  extractImages
};