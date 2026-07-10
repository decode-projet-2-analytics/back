const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'kbis');

if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (_req, _file, cb) => {
        cb(null, `${crypto.randomUUID()}.pdf`);
    },
});

function fileFilter(_req, file, cb) {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
        return;
    }

    cb(new Error('Seul le format PDF est accepté'));
}

const uploadKbis = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 },
}).single('kbis');

module.exports = { uploadKbis, UPLOAD_DIR };
