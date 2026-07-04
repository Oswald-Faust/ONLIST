const fs = require('fs');
const path = require('path');

const sourceRoot = path.resolve(__dirname, '..', 'src');
const runtimeModule = path.join(sourceRoot, 'i18n', 'runtime');

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    return entry.isFile() && entry.name.endsWith('.js') ? [fullPath] : [];
  });
}

for (const file of walk(sourceRoot)) {
  if (file.includes(`${path.sep}i18n${path.sep}`)) continue;
  let source = fs.readFileSync(file, 'utf8');
  if (!/['"](?:fr-FR|en-GB)['"]/.test(source)) continue;
  source = source.replace(/['"](?:fr-FR|en-GB)['"]/g, 'getCurrentLocale()');
  let relative = path.relative(path.dirname(file), runtimeModule).replace(/\\/g, '/');
  if (!relative.startsWith('.')) relative = `./${relative}`;
  source = `import { getCurrentLocale } from '${relative}';\n${source}`;
  fs.writeFileSync(file, source);
}
