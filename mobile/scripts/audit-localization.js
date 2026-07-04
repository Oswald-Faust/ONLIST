const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourceRoot = path.join(root, 'src');

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    return entry.isFile() && entry.name.endsWith('.js') ? [fullPath] : [];
  });
}

async function main() {
  const extraction = JSON.parse(fs.readFileSync('/tmp/onlist-i18n-source.json', 'utf8'));
  const catalogSource = fs.readFileSync(path.join(sourceRoot, 'i18n', 'literalTranslations.js'), 'utf8')
    .replace(/export const /g, 'const ');
  const catalogModule = { exports: {} };
  Function('module', `${catalogSource}\nmodule.exports = { ENGLISH_LITERALS, ENGLISH_PATTERNS };`)(catalogModule);
  const { ENGLISH_LITERALS, ENGLISH_PATTERNS } = catalogModule.exports;
  const patternSources = new Set(ENGLISH_PATTERNS.map(({ source }) => source));
  const errors = [];

  const missingLiterals = extraction.literals.filter((source) => !(source in ENGLISH_LITERALS));
  const missingPatterns = extraction.patterns.filter((source) => !patternSources.has(source));
  if (missingLiterals.length) errors.push(`Missing literals: ${missingLiterals.join(' | ')}`);
  if (missingPatterns.length) errors.push(`Missing patterns: ${missingPatterns.join(' | ')}`);

  for (const file of walk(sourceRoot)) {
    const source = fs.readFileSync(file, 'utf8');
    if (!file.includes(`${path.sep}i18n${path.sep}`)) {
      if (/import\s*\{[^}]*\b(?:Text|TextInput|Alert)\b[^}]*\}\s*from\s*['"]react-native['"]/.test(source)) {
        errors.push(`Unmanaged React Native text API: ${path.relative(root, file)}`);
      }
      if (/['"](?:fr-FR|en-GB)['"]/.test(source)) {
        errors.push(`Hard-coded locale: ${path.relative(root, file)}`);
      }
      if (source.includes('getCurrentLocale()') && !source.includes('useLanguage();')) {
        errors.push(`Locale consumer is not reactive: ${path.relative(root, file)}`);
      }
      const pickerCount = (source.match(/<DateTimePicker\b/g) || []).length;
      const localizedPickerCount = (source.match(/locale=\{getCurrentLocale\(\)\}/g) || []).length;
      if (pickerCount !== localizedPickerCount) {
        errors.push(`Unlocalized date picker: ${path.relative(root, file)}`);
      }
    }
  }

  if (errors.length) {
    console.error(errors.join('\n'));
    process.exit(1);
  }

  console.log(`Localization audit passed: ${extraction.literals.length} literals, ${extraction.patterns.length} patterns.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
