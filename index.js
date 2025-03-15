import fs from 'node:fs';
import path from 'node:path';

export default {
  bundle: {
    directory: 'modules',
    modules: getBundleModuleNames()
  },
  i18n: {
    bodonkeyExternalPublishing: {
      browser: true
    }
  },
  init(self) {
    console.log('👋 from the external publishing extension');
  }
};

function getBundleModuleNames() {
  const source = path.join(path.dirname(new URL(import.meta.url).pathname), './modules/@bodonkey');
  return fs.readdirSync(source, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => `@bodonkey/${dirent.name}`);
};