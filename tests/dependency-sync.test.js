const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
    shouldInstallDependencies,
    writeDependencyMarker,
} = require('../lib/dependency-sync');

function createProject({ dependencies = {} } = {}) {
    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'decode-deps-'));
    fs.writeFileSync(
        path.join(projectRoot, 'package.json'),
        JSON.stringify({ dependencies }, null, 2)
    );
    fs.writeFileSync(
        path.join(projectRoot, 'package-lock.json'),
        JSON.stringify({ lockfileVersion: 3, packages: {} }, null, 2)
    );
    fs.mkdirSync(path.join(projectRoot, 'node_modules'), { recursive: true });
    return projectRoot;
}

test('shouldInstallDependencies asks for install when a declared dependency is missing', () => {
    const projectRoot = createProject({ dependencies: { multer: '^2.2.0' } });

    assert.deepEqual(shouldInstallDependencies(projectRoot), {
        install: true,
        reason: 'multer missing',
    });
});

test('shouldInstallDependencies asks for install when package files changed', () => {
    const projectRoot = createProject();
    writeDependencyMarker(projectRoot);

    fs.writeFileSync(
        path.join(projectRoot, 'package-lock.json'),
        JSON.stringify({ lockfileVersion: 3, packages: { changed: true } }, null, 2)
    );

    assert.deepEqual(shouldInstallDependencies(projectRoot), {
        install: true,
        reason: 'package manifest changed',
    });
});

test('shouldInstallDependencies accepts an installed dependency set with current marker', () => {
    const projectRoot = createProject();
    writeDependencyMarker(projectRoot);

    assert.deepEqual(shouldInstallDependencies(projectRoot), {
        install: false,
        reason: 'dependencies up to date',
    });
});
