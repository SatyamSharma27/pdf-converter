# PDF Converter – Backend

Node.js/Express REST API powering the PDF Converter frontend.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Web server | Node.js 18+ · Express 4 |
| File upload | Multer (disk storage) |
| Office → PDF | LibreOffice (headless) |
| Image → PDF | img2pdf (Python) |
| PDF → Image | ImageMagick |
| Merge/Split/Rotate | pdftk |
| Compress / PDF-A | Ghostscript |
| Protect/Unlock | pdftk · pikepdf (Python) |
| Extract images | pikepdf (Python) |
| Security | Helmet · CORS · Rate-limiter |

---

## System Requirements

```bash
# Ubuntu / Debian
sudo apt update
sudo apt install -y \
  libreoffice \
  pdftk \
  ghostscript \
  imagemagick \
  python3-pip

pip3 install pikepdf img2pdf
```

> **ImageMagick policy:** If `convert` refuses to process PDFs, edit  
> `/etc/ImageMagick-6/policy.xml` and change `<policy domain="coder" rights="none" pattern="PDF"/>` → `rights="read|write"`.

---

## Setup

```bash
# 1. Install Node dependencies
npm install

# 2. Copy and edit the environment file
cp .env.example .env

# 3. Start the server
npm start           # production
npm run dev         # development (nodemon auto-reload)
```

Server starts at `http://localhost:3000` by default.

---

## Project Structure

```
pdf-converter-backend/
├── server.js                 # Entry point, middleware, cleanup scheduler
├── package.json
├── .env.example
├── routes/
│   ├── convert.js            # POST /api/convert   POST /api/convert/merge
│   ├── tools.js              # GET  /api/tools
│   └── files.js              # GET/DELETE /api/files/:filename
├── scripts/
│   └── converters.js         # All conversion logic (LibreOffice, GS, pdftk…)
├── middleware/
│   └── validate.js           # Request validation
├── uploads/                  # Temporary upload storage
└── outputs/                  # Converted files (auto-deleted after 3h)
```

---

## API Reference

### `POST /api/convert`

Upload and convert a single file.

**Content-Type:** `multipart/form-data`

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | File | ✅ | The file to convert |
| `target` | string | ✅ (or `tool`) | Output format: `pdf`, `docx`, `xlsx`, `pptx`, `jpg`, `png`, `pdfa` |
| `tool` | string | ✅ (or `target`) | Special operation: `compress`, `protect`, `unlock`, `rotate`, `split`, `extract_images`, `delete_pages` |
| `password` | string | for protect/unlock | Password for PDF encryption |
| `quality` | string | for compress | `low` · `medium` · `high` (default: `medium`) |
| `angle` | number | for rotate | `90`, `180`, `270` (default: `90`) |
| `pages` | string | for delete_pages | Page range, e.g. `"1,3,5-7"` |

**Response:**
```json
{
  "success": true,
  "jobId": "uuid",
  "filename": "document_converted_abc12345.pdf",
  "downloadUrl": "http://localhost:3000/outputs/document_converted_abc12345.pdf",
  "size": 204800,
  "sizeHuman": "200 KB"
}
```

---

### `POST /api/convert/merge`

Merge multiple PDFs into one.

**Content-Type:** `multipart/form-data`

| Field | Type | Required | Description |
|---|---|---|---|
| `files` | File[] | ✅ | 2–20 PDF files to merge (field name must be `files`) |

---

### `GET /api/tools`

Returns the full list of supported tools.

**Query params:** `?cat=to|from|edit|security`

---

### `GET /api/files/:filename`

Returns metadata (size, TTL, expiry time) for a converted file.

### `DELETE /api/files/:filename`

Immediately delete a converted file from the server.

### `GET /api/files` *(admin only)*

List all output files. Requires `x-api-key` header matching `ADMIN_API_KEY`.

---

## Frontend Integration

Replace the `simulateConvert()` function in your HTML with a real fetch:

```javascript
async function convertFile(file, target) {
  const form = new FormData();
  form.append('file', file);
  form.append('target', target);       // e.g. 'pdf'

  const res  = await fetch('http://localhost:3000/api/convert', {
    method: 'POST',
    body: form,
  });
  const data = await res.json();

  if (data.success) {
    window.location.href = data.downloadUrl; // trigger download
  }
}
```

---

## Security Notes

- All uploads are validated by MIME type **and** file extension.
- Files are stored under UUIDs, not original filenames (prevents enumeration).
- Output files are auto-deleted after **3 hours**; users can delete immediately via the API.
- Rate limiting: 100 req/15min globally; 10 conversions/min per IP.
- `ADMIN_API_KEY` must be a long random string in production.
- Set `FRONTEND_ORIGIN` to your exact domain in production (not `*`).
