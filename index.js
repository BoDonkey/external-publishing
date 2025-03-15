const fs = require('node:fs');
const path = require('node:path');

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
  const source = path.join(__dirname, './modules');
  return fs.readdirSync(source, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
};