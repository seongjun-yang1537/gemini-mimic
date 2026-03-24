const fs = require('fs/promises');
const path = require('path');
const { execSync } = require('child_process');

function resolveCommitHash() {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

async function syncBuildHash() {
  const commitHash = resolveCommitHash();
  const configFilePath = path.join(__dirname, '..', 'public', 'config.js');
  const configFileContent = [
    'window.APP_CONFIG = Object.freeze({',
    `  commitHash: '${commitHash}'`,
    '});',
    ''
  ].join('\n');
  await fs.writeFile(configFilePath, configFileContent, 'utf8');
}

syncBuildHash().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
