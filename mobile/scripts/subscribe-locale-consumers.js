const fs = require('fs');
const path = require('path');

const sourceRoot = path.resolve(__dirname, '..', 'src');
const languageContext = path.join(sourceRoot, 'context', 'LanguageContext');

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
  if (!source.includes('getCurrentLocale()') || source.includes('useLanguage();')) continue;

  let relative = path.relative(path.dirname(file), languageContext).replace(/\\/g, '/');
  if (!relative.startsWith('.')) relative = `./${relative}`;
  source = `import { useLanguage } from '${relative}';\n${source}`;

  const pattern = /export default function\s+\w+\s*\([^)]*\)\s*\{/;
  if (!pattern.test(source)) {
    throw new Error(`Unable to find default screen component in ${file}`);
  }
  source = source.replace(pattern, (match) => `${match}\n  useLanguage();`);
  fs.writeFileSync(file, source);
}
