const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const MARKER_FILE = path.join('node_modules', '.decode-dependencies.hash');

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function hashDependencyFiles(projectRoot) {
    const hash = crypto.createHash('sha256');
    for (const filename of ['package.json', 'package-lock.json']) {
        const filePath = path.join(projectRoot, filename);
        if (fs.existsSync(filePath)) {
            hash.update(filename);
            hash.update('\0');
            hash.update(fs.readFileSync(filePath));
            hash.update('\0');
        }
    }
    return hash.digest('hex');
}

function getRuntimeDependencyNames(projectRoot) {
    const manifest = readJson(path.join(projectRoot, 'package.json'));
    return Object.keys({
        ...(manifest.dependencies ?? {}),
        ...(manifest.devDependencies ?? {}),
    });
}

function hasInstalledDependency(projectRoot, dependencyName) {
    try {
        require.resolve(dependencyName, { paths: [projectRoot] });
        return true;
    } catch {
        return false;
    }
}

function shouldInstallDependencies(projectRoot) {
    const nodeModulesPath = path.join(projectRoot, 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
        return { install: true, reason: 'node_modules missing' };
    }

    const missingDependency = getRuntimeDependencyNames(projectRoot)
        .find((dependencyName) => !hasInstalledDependency(projectRoot, dependencyName));

    if (missingDependency) {
        return { install: true, reason: `${missingDependency} missing` };
    }

    const markerPath = path.join(projectRoot, MARKER_FILE);
    const expectedHash = hashDependencyFiles(projectRoot);
    const currentHash = fs.existsSync(markerPath)
        ? fs.readFileSync(markerPath, 'utf8').trim()
        : '';

    if (currentHash !== expectedHash) {
        return { install: true, reason: 'package manifest changed' };
    }

    return { install: false, reason: 'dependencies up to date' };
}

function writeDependencyMarker(projectRoot) {
    const markerPath = path.join(projectRoot, MARKER_FILE);
    fs.mkdirSync(path.dirname(markerPath), { recursive: true });
    fs.writeFileSync(markerPath, `${hashDependencyFiles(projectRoot)}\n`);
}

module.exports = {
    MARKER_FILE,
    hashDependencyFiles,
    shouldInstallDependencies,
    writeDependencyMarker,
};
