const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourceRoot = path.join(root, 'src');
const localizedModule = path.join(sourceRoot, 'i18n', 'LocalizedReactNative');
const localizedNames = ['Text', 'TextInput', 'Alert'];

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    return entry.isFile() && entry.name.endsWith('.js') ? [fullPath] : [];
  });
}

for (const file of walk(sourceRoot)) {
  if (file === `${localizedModule}.js`) continue;
  let source = fs.readFileSync(file, 'utf8');
  const imported = new Set();

  source = source.replace(/import\s*\{([\s\S]*?)\}\s*from\s*['"]react-native['"];?/g, (statement, specifiers) => {
    const parts = specifiers.split(',').map((part) => part.trim()).filter(Boolean);
    const kept = parts.filter((part) => {
      const importedName = part.split(/\s+as\s+/)[0];
      if (localizedNames.includes(importedName)) {
        imported.add(importedName);
        return false;
      }
      return true;
    });
    if (!kept.length) return '';
    return `import {\n  ${kept.join(', ')}\n} from 'react-native';`;
  });

  if (!imported.size) continue;
  let relative = path.relative(path.dirname(file), localizedModule).replace(/\\/g, '/');
  if (!relative.startsWith('.')) relative = `./${relative}`;
  const localizedImport = `import { ${[...imported].join(', ')} } from '${relative}';\n`;
  source = localizedImport + source;
  fs.writeFileSync(file, source);
}
