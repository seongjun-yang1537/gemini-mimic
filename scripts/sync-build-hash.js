const fs = require('fs');
const fsPromises = require('fs/promises');
const path = require('path');

function resolveCommitHash() {
  const cwdRootPath = process.cwd();
  const repositoryRootPath = fs.existsSync(path.join(cwdRootPath, '.git')) ? cwdRootPath : path.join(__dirname, '..');
  const gitDirectoryPath = path.join(repositoryRootPath, '.git');

  try {
    const headFileContent = fs.readFileSync(path.join(gitDirectoryPath, 'HEAD'), 'utf8').trim();
    if (!headFileContent) {
      return 'unknown';
    }
    if (!headFileContent.startsWith('ref:')) {
      return headFileContent.slice(0, 7);
    }

    const refPath = headFileContent.replace(/^ref:\s*/, '');
    const refFilePath = path.join(gitDirectoryPath, ...refPath.split('/'));
    const refFileContent = fs.readFileSync(refFilePath, 'utf8').trim();
    return refFileContent ? refFileContent.slice(0, 7) : 'unknown';
  } catch {
    return 'unknown';
  }
}

async function syncBuildHash() {
  const cwdRootPath = process.cwd();
  const repositoryRootPath = fs.existsSync(path.join(cwdRootPath, 'client')) ? cwdRootPath : path.join(__dirname, '..');
  const commitHash = resolveCommitHash();
  const configFileContent = [
    'window.APP_CONFIG = Object.freeze({',
    `  commitHash: '${commitHash}'`,
    '});',
    ''
  ].join('\n');
  const configFilePathList = [
    path.join(repositoryRootPath, 'public', 'config.js'),
    path.join(repositoryRootPath, 'client', 'public', 'config.js')
  ];
  await Promise.all(configFilePathList.map((configFilePath) => fsPromises.writeFile(configFilePath, configFileContent, 'utf8')));
}

syncBuildHash().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
