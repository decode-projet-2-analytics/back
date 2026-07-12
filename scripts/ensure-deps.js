const { spawnSync } = require('node:child_process');
const path = require('node:path');

const {
    shouldInstallDependencies,
    writeDependencyMarker,
} = require('../lib/dependency-sync');

const projectRoot = path.resolve(__dirname, '..');
const status = shouldInstallDependencies(projectRoot);

if (!status.install) {
    console.log(`Dependencies OK (${status.reason})`);
    process.exit(0);
}

console.log(`Installing dependencies (${status.reason})`);
const result = spawnSync('npm', ['install'], {
    cwd: projectRoot,
    stdio: 'inherit',
});

if (result.status !== 0) {
    process.exit(result.status ?? 1);
}

writeDependencyMarker(projectRoot);
