const fs = require('fs');
const path = require('path');

const { UPLOAD_DIR } = require('./kbis-upload');

const KBIS_DOCUMENT_PATTERN =
    /^\/uploads\/kbis\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.pdf$/i;

function parseKbisDocument(kbisDocument) {
    if (typeof kbisDocument !== 'string') return null;

    const match = kbisDocument.match(KBIS_DOCUMENT_PATTERN);
    if (!match) return null;

    return `${match[1]}.pdf`;
}

function getKbisFilePath(kbisDocument) {
    const filename = parseKbisDocument(kbisDocument);
    if (!filename) return null;

    const safeName = path.basename(filename);
    const absolute = path.resolve(UPLOAD_DIR, safeName);
    const uploadRoot = path.resolve(UPLOAD_DIR);

    if (!absolute.startsWith(`${uploadRoot}${path.sep}`)) return null;

    return absolute;
}

function kbisFileExists(kbisDocument) {
    const filePath = getKbisFilePath(kbisDocument);
    if (!filePath) return false;

    return fs.existsSync(filePath);
}

async function isKbisDocumentAvailable(kbisDocument, User) {
    if (!kbisFileExists(kbisDocument)) return false;

    const existing = await User.findOne({ where: { kbisDocument } });
    return !existing;
}

module.exports = {
    KBIS_DOCUMENT_PATTERN,
    parseKbisDocument,
    getKbisFilePath,
    kbisFileExists,
    isKbisDocumentAvailable,
};
