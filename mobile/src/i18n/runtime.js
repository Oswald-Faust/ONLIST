import { ENGLISH_LITERALS, ENGLISH_PATTERNS } from './literalTranslations';
import { ENGLISH_LITERAL_OVERRIDES } from './literalOverrides';

let currentLanguage = 'fr';

const compiledPatterns = ENGLISH_PATTERNS.map(({ source, translation }) => {
  const escaped = source
    .split(/(\{\{\d+\}\})/g)
    .map((part) => /^\{\{\d+\}\}$/.test(part)
      ? '(.*?)'
      : part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('');
  return { regex: new RegExp(`^${escaped}$`, 's'), translation };
});

export function setRuntimeLanguage(language) {
  currentLanguage = language;
}

export function getCurrentLocale() {
  return currentLanguage === 'en' ? 'en-US' : 'fr-FR';
}

export function translateLiteral(value, language = currentLanguage) {
  if (language !== 'en' || typeof value !== 'string' || !value.trim()) return value;

  const leading = value.match(/^\s*/)?.[0] || '';
  const trailing = value.match(/\s*$/)?.[0] || '';
  const source = value.trim();
  const exact = ENGLISH_LITERAL_OVERRIDES[source] || ENGLISH_LITERALS[source];
  if (exact) return `${leading}${exact}${trailing}`;

  for (const pattern of compiledPatterns) {
    const match = source.match(pattern.regex);
    if (!match) continue;
    const translated = pattern.translation.replace(/\{\{(\d+)\}\}/g, (_, index) => match[Number(index) + 1] || '');
    return `${leading}${translated}${trailing}`;
  }

  return value;
}

export function translateNode(node, language = currentLanguage) {
  if (typeof node === 'string') return translateLiteral(node, language);
  if (Array.isArray(node)) return node.map((child) => translateNode(child, language));
  return node;
}
