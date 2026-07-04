const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const root = path.resolve(__dirname, '..');
const sourceRoot = path.join(root, 'src');
const backendRoot = path.resolve(root, '..', 'backend');
const outputFile = path.join(sourceRoot, 'i18n', 'literalTranslations.js');
const literals = new Set();
const patterns = new Set();

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory() && entry.name === 'node_modules') return [];
    if (entry.isDirectory()) return walk(fullPath);
    return entry.isFile() && entry.name.endsWith('.js') ? [fullPath] : [];
  });
}

function isCandidate(value) {
  const text = value.trim();
  if (text.length < 2 || !/[A-Za-zÀ-ÿ]/.test(text)) return false;
  if (/^(https?:|mailto:|tel:|rgba?\(|#[0-9a-f]{3,8}$)/i.test(text)) return false;
  if (/^[\w./@-]+\.(js|png|jpg|jpeg|svg|mp4|com|club)$/i.test(text)) return false;
  if (/^[a-z]+-[a-z-]+$/i.test(text) && !text.includes(' ')) return false;
  return true;
}

function addLiteral(value) {
  const text = value.includes('\n\n') ? value.trim() : value.replace(/\s+/g, ' ').trim();
  if (isCandidate(text)) literals.add(text);
}

function expressionPattern(node, state) {
  if (!node) return '';
  if (node.type === 'StringLiteral') return node.value;
  if (node.type === 'NumericLiteral') return String(node.value);
  if (node.type === 'BinaryExpression' && node.operator === '+') {
    return expressionPattern(node.left, state) + expressionPattern(node.right, state);
  }
  if (node.type === 'TemplateLiteral') {
    return node.quasis.map((quasi, index) => {
      const expression = index < node.expressions.length
        ? expressionPattern(node.expressions[index], state)
        : '';
      return `${quasi.value.cooked || ''}${expression}`;
    }).join('');
  }
  return `{{${state.index++}}}`;
}

for (const file of [...walk(sourceRoot), ...walk(backendRoot)]) {
  if (file.includes(`${path.sep}i18n${path.sep}`) || file.endsWith(`${path.sep}LanguageContext.js`)) continue;
  const ast = parser.parse(fs.readFileSync(file, 'utf8'), {
    sourceType: 'module',
    plugins: ['jsx'],
  });

  traverse(ast, {
    StringLiteral(nodePath) {
      if (nodePath.parentPath.isImportDeclaration() || nodePath.parentPath.isExportNamedDeclaration()) return;
      if (nodePath.parentPath.isObjectProperty() && nodePath.key === 'key') return;
      addLiteral(nodePath.node.value);
    },
    JSXText(nodePath) {
      addLiteral(nodePath.node.value);
    },
    TemplateLiteral(nodePath) {
      if (nodePath.node.expressions.length === 0) {
        addLiteral(nodePath.node.quasis[0]?.value.cooked || '');
        return;
      }
      const source = nodePath.node.quasis
        .map((quasi, index) => `${quasi.value.cooked || ''}${index < nodePath.node.expressions.length ? `{{${index}}}` : ''}`)
        .join('')
        .replace(/\s+/g, ' ')
        .trim();
      if (isCandidate(source)) patterns.add(source);
    },
    BinaryExpression(nodePath) {
      if (nodePath.node.operator !== '+' || nodePath.parentPath.isBinaryExpression({ operator: '+' })) return;
      const containsText = nodePath.toString().match(/['"`][^'"`]*[A-Za-zÀ-ÿ][^'"`]*['"`]/);
      if (!containsText) return;
      const source = expressionPattern(nodePath.node, { index: 0 }).replace(/\s+/g, ' ').trim();
      if (isCandidate(source) && source.includes('{{')) patterns.add(source);
    },
  });
}

async function translateChunk(text) {
  const response = await fetch('https://translate.googleapis.com/translate_a/single', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: new URLSearchParams({ client: 'gtx', sl: 'fr', tl: 'en', dt: 't', q: text }).toString(),
  });
  if (!response.ok) throw new Error(`Translation request failed: ${response.status}`);
  const data = await response.json();
  return data[0].map((part) => part[0]).join('');
}

async function translate(text) {
  if (text.length <= 2500) return translateChunk(text);
  const paragraphs = text.split(/(\n\n+)/);
  const translated = [];
  let chunk = '';
  for (const paragraph of paragraphs) {
    if (chunk && chunk.length + paragraph.length > 2500) {
      translated.push(await translateChunk(chunk));
      chunk = '';
    }
    chunk += paragraph;
  }
  if (chunk) translated.push(await translateChunk(chunk));
  return translated.join('');
}

function protectVariables(text) {
  const variables = [];
  const protectedText = text.replace(/\{\{(\d+)\}\}/g, (_, index) => {
    const token = `ZXQVAR${index}QXZ`;
    variables.push({ token, marker: `{{${index}}}` });
    return token;
  });
  return { protectedText, variables };
}

async function mapConcurrent(items, concurrency, mapper) {
  const output = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      let attempts = 0;
      while (attempts < 3) {
        try {
          output[index] = await mapper(items[index], index);
          break;
        } catch (error) {
          attempts += 1;
          if (attempts === 3) throw error;
          await new Promise((resolve) => setTimeout(resolve, attempts * 750));
        }
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return output;
}

async function main() {
  const literalList = [...literals].sort((a, b) => a.localeCompare(b, 'fr'));
  const patternList = [...patterns].sort((a, b) => a.localeCompare(b, 'fr'));
  if (process.argv.includes('--extract')) {
    const extractionFile = '/tmp/onlist-i18n-source.json';
    fs.writeFileSync(extractionFile, JSON.stringify({ literals: literalList, patterns: patternList }, null, 2));
    console.log(`Wrote ${extractionFile}`);
    return;
  }
  console.log(`Translating ${literalList.length} literals and ${patternList.length} patterns...`);

  const translatedLiterals = await mapConcurrent(literalList, 6, async (source, index) => {
    if ((index + 1) % 100 === 0) console.log(`Literals: ${index + 1}/${literalList.length}`);
    return [source, await translate(source)];
  });

  const translatedPatterns = await mapConcurrent(patternList, 4, async (source) => {
    const { protectedText, variables } = protectVariables(source);
    let translation = await translate(protectedText);
    for (const { token, marker } of variables) {
      translation = translation.replace(new RegExp(token, 'gi'), marker);
    }
    return { source, translation };
  });

  const literalObject = Object.fromEntries(translatedLiterals);
  const contents = `// Generated from the visible source strings by scripts/generate-literal-translations.js.\n` +
    `export const ENGLISH_LITERALS = ${JSON.stringify(literalObject, null, 2)};\n\n` +
    `export const ENGLISH_PATTERNS = ${JSON.stringify(translatedPatterns, null, 2)};\n`;
  fs.writeFileSync(outputFile, contents);
  console.log(`Wrote ${outputFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
