import json
import re
from pathlib import Path

import argostranslate.translate

SOURCE = Path('/tmp/onlist-i18n-source.json')
OUTPUT = Path(__file__).resolve().parents[1] / 'src' / 'i18n' / 'literalTranslations.js'


def translate(text):
    return argostranslate.translate.translate(text, 'fr', 'en')


def translate_pattern(source):
    variables = []

    def protect(match):
        token = f'ZXQVAR{match.group(1)}QXZ'
        variables.append((token, match.group(0)))
        return token

    protected = re.sub(r'\{\{(\d+)\}\}', protect, source)
    translated = translate(protected)
    for token, marker in variables:
        translated = re.sub(re.escape(token), marker, translated, flags=re.IGNORECASE)
    return translated


def main():
    data = json.loads(SOURCE.read_text())
    translated_literals = {}
    for index, source in enumerate(data['literals'], start=1):
        translated_literals[source] = translate(source)
        if index % 100 == 0:
            print(f'Literals: {index}/{len(data["literals"])}', flush=True)

    translated_patterns = []
    for source in data['patterns']:
        translated_patterns.append({
            'source': source,
            'translation': translate_pattern(source),
        })

    contents = (
        '// Generated from visible source strings by the localization scripts.\n'
        f'export const ENGLISH_LITERALS = {json.dumps(translated_literals, ensure_ascii=False, indent=2)};\n\n'
        f'export const ENGLISH_PATTERNS = {json.dumps(translated_patterns, ensure_ascii=False, indent=2)};\n'
    )
    OUTPUT.write_text(contents)
    print(f'Wrote {OUTPUT}', flush=True)


if __name__ == '__main__':
    main()
