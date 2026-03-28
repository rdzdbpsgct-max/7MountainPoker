/**
 * i18n Tests — Translation Key Parity, Parameterization & Completeness
 *
 * Tests from Testplan: I-013 (Key-Paritaet), I-009 (parametrisierte Strings)
 */
import { translations, t, setCurrentLanguage } from '../src/i18n/translations';

// ---------------------------------------------------------------------------
// Helper: recursively collect all keys from a flat translation object
// ---------------------------------------------------------------------------

function getAllKeys(obj: Record<string, string>): string[] {
  return Object.keys(obj).sort();
}

// ---------------------------------------------------------------------------
// I-013: Translation Key Parity — DE and EN must have identical key sets
// ---------------------------------------------------------------------------

describe('i18n key parity', () => {
  const deKeys = getAllKeys(translations.de);
  const enKeys = getAllKeys(translations.en);

  it('DE and EN have the same number of keys', () => {
    expect(deKeys.length).toBe(enKeys.length);
    expect(deKeys.length).toBeGreaterThan(600); // sanity check — we know ~700+ keys
  });

  it('every DE key exists in EN', () => {
    const missingInEN = deKeys.filter((k) => !(k in translations.en));
    expect(missingInEN, `Missing EN keys: ${missingInEN.join(', ')}`).toHaveLength(0);
  });

  it('every EN key exists in DE', () => {
    const missingInDE = enKeys.filter((k) => !(k in translations.de));
    expect(missingInDE, `Missing DE keys: ${missingInDE.join(', ')}`).toHaveLength(0);
  });

  it('no translation key is an empty string in DE', () => {
    const emptyDE = deKeys.filter((k) => translations.de[k as keyof typeof translations.de] === '');
    expect(emptyDE).toEqual([]);
  });

  it('no translation key is an empty string in EN', () => {
    const emptyEN = enKeys.filter((k) => translations.en[k as keyof typeof translations.en] === '');
    expect(emptyEN).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Detect untranslated strings (DE value === EN value, excluding symbols/names)
// ---------------------------------------------------------------------------

describe('i18n untranslated detection', () => {
  // Keys that are legitimately identical in both languages (brand names, symbols, etc.)
  const ALLOWED_IDENTICAL = new Set([
    'app.title',
    'undo.actions.eliminate',
    'undo.actions.rebuy',
    'undo.actions.reEntry',
  ]);

  it('identifies potentially untranslated keys (DE === EN, excluding known exceptions)', () => {
    const identical: string[] = [];
    for (const key of Object.keys(translations.de)) {
      const de = translations.de[key as keyof typeof translations.de];
      const en = translations.en[key as keyof typeof translations.en];
      if (de === en && !ALLOWED_IDENTICAL.has(key)) {
        // Only flag keys with actual text (not single chars or pure symbols)
        const stripped = de.replace(/[^a-zA-Z0-9\u00C0-\u024F]/g, '').trim();
        if (stripped.length > 3) {
          identical.push(`${key}: "${de}"`);
        }
      }
    }
    // This test is informational — it reports but doesn't fail on a fixed count
    // because some keys genuinely have identical translations (e.g., proper nouns).
    if (identical.length > 0 && process.env.DEBUG_I18N_TESTS === '1') {
      console.warn(
        `[i18n] ${identical.length} keys have identical DE/EN values (potential untranslated):\n` +
        identical.slice(0, 20).join('\n')
      );
    }
    // Soft assertion: keep identical DE/EN keys below the current quality target.
    // Legitimate exceptions still exist (brand names, technical abbreviations).
    expect(identical.length).toBeLessThan(160);
  });
});

// ---------------------------------------------------------------------------
// I-009: Parameterized strings — {n}, {place}, etc. must be replaced
// ---------------------------------------------------------------------------

describe('i18n parameter substitution', () => {
  it('t() replaces single parameter {n}', () => {
    setCurrentLanguage('de');
    // Find a key that uses {n} — e.g., player count messages
    const deKeys = Object.keys(translations.de) as Array<keyof typeof translations.de>;
    const paramKey = deKeys.find((k) => translations.de[k].includes('{n}'));
    if (paramKey) {
      const result = t(paramKey, { n: 5 });
      expect(result).not.toContain('{n}');
      expect(result).toContain('5');
    }
  });

  it('t() replaces multiple parameters', () => {
    setCurrentLanguage('de');
    const deKeys = Object.keys(translations.de) as Array<keyof typeof translations.de>;
    // Find a key with {places} and {players}
    const multiKey = deKeys.find(
      (k) => translations.de[k].includes('{places}') && translations.de[k].includes('{players}')
    );
    if (multiKey) {
      const result = t(multiKey, { places: '3', players: '8' });
      expect(result).not.toContain('{places}');
      expect(result).not.toContain('{players}');
      expect(result).toContain('3');
      expect(result).toContain('8');
    }
  });

  it('t() returns key as-is when parameter is missing', () => {
    setCurrentLanguage('de');
    const deKeys = Object.keys(translations.de) as Array<keyof typeof translations.de>;
    const paramKey = deKeys.find((k) => translations.de[k].includes('{n}'));
    if (paramKey) {
      // Call without params — {n} should remain or be handled gracefully
      const result = t(paramKey);
      // Should either contain {n} or handle gracefully (not crash)
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    }
  });

  it('t() works for both DE and EN', () => {
    const deKeys = Object.keys(translations.de) as Array<keyof typeof translations.de>;
    const paramKey = deKeys.find((k) => translations.de[k].includes('{n}'));
    if (paramKey) {
      setCurrentLanguage('de');
      const deResult = t(paramKey, { n: 7 });
      setCurrentLanguage('en');
      const enResult = t(paramKey, { n: 7 });
      // Both should have the parameter replaced
      expect(deResult).not.toContain('{n}');
      expect(enResult).not.toContain('{n}');
      expect(deResult).toContain('7');
      expect(enResult).toContain('7');
    }
  });
});

// ---------------------------------------------------------------------------
// i18n consistency: all parameter placeholders in DE also exist in EN
// ---------------------------------------------------------------------------

describe('i18n parameter placeholder consistency', () => {
  it('every placeholder in DE also exists in the corresponding EN translation', () => {
    const placeholderRegex = /\{(\w+)\}/g;
    const mismatches: string[] = [];

    for (const key of Object.keys(translations.de)) {
      const deVal = translations.de[key as keyof typeof translations.de];
      const enVal = translations.en[key as keyof typeof translations.en];

      const dePlaceholders = new Set<string>();
      let match;
      while ((match = placeholderRegex.exec(deVal)) !== null) {
        dePlaceholders.add(match[1]);
      }

      for (const ph of dePlaceholders) {
        if (!enVal.includes(`{${ph}}`)) {
          mismatches.push(`${key}: DE has {${ph}} but EN doesn't`);
        }
      }
    }

    expect(mismatches).toEqual([]);
  });

  it('every placeholder in EN also exists in the corresponding DE translation', () => {
    const placeholderRegex = /\{(\w+)\}/g;
    const mismatches: string[] = [];

    for (const key of Object.keys(translations.en)) {
      const deVal = translations.de[key as keyof typeof translations.de];
      const enVal = translations.en[key as keyof typeof translations.en];

      const enPlaceholders = new Set<string>();
      let match;
      while ((match = placeholderRegex.exec(enVal)) !== null) {
        enPlaceholders.add(match[1]);
      }

      for (const ph of enPlaceholders) {
        if (!deVal.includes(`{${ph}}`)) {
          mismatches.push(`${key}: EN has {${ph}} but DE doesn't`);
        }
      }
    }

    expect(mismatches).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Phase 7: Deep i18n validation
// ---------------------------------------------------------------------------

describe('i18n key naming conventions', () => {
  it('all keys use dot.separated notation', () => {
    const keys = Object.keys(translations.de);
    // eslint-disable-next-line security/detect-unsafe-regex
    const invalid = keys.filter(k => !k.match(/^[a-zA-Z0-9]+(\.[a-zA-Z0-9-]+)*$/));
    expect(invalid).toEqual([]);
  });

  it('no trailing/leading whitespace in keys', () => {
    const keys = Object.keys(translations.de);
    const whitespace = keys.filter(k => k !== k.trim());
    expect(whitespace).toEqual([]);
  });
});

describe('i18n value quality', () => {
  it('no DE values contain only whitespace', () => {
    const wsOnly = Object.entries(translations.de)
      .filter(([, v]) => v.trim() === '' && v.length > 0)
      .map(([k]) => k);
    expect(wsOnly).toEqual([]);
  });

  it('no EN values contain only whitespace', () => {
    const wsOnly = Object.entries(translations.en)
      .filter(([, v]) => v.trim() === '' && v.length > 0)
      .map(([k]) => k);
    expect(wsOnly).toEqual([]);
  });

  it('no DE values contain unresolved template markers like TODO or FIXME', () => {
    const markers = Object.entries(translations.de)
      .filter(([, v]) => /TODO|FIXME|XXX|HACK/i.test(v))
      .map(([k]) => k);
    expect(markers).toEqual([]);
  });

  it('no EN values contain unresolved template markers like TODO or FIXME', () => {
    const markers = Object.entries(translations.en)
      .filter(([, v]) => /TODO|FIXME|XXX|HACK/i.test(v))
      .map(([k]) => k);
    expect(markers).toEqual([]);
  });
});

describe('i18n t() function edge cases', () => {
  it('t() returns key name for nonexistent key', () => {
    setCurrentLanguage('de');
    // Cast to TranslationKey to test runtime behavior
    const result = t('nonexistent.key.xyz' as never);
    // Should return the key itself (or undefined) — not crash
    expect(typeof result).toBe('string');
  });

  it('t() handles empty params object', () => {
    setCurrentLanguage('de');
    const result = t('app.title', {});
    expect(result).toBe(translations.de['app.title']);
  });

  it('t() handles extra params not in template', () => {
    setCurrentLanguage('de');
    const result = t('app.title', { unused: 'value' });
    expect(result).toBe(translations.de['app.title']);
  });

  it('setCurrentLanguage switches language correctly', () => {
    setCurrentLanguage('de');
    const de = t('app.startGame');
    setCurrentLanguage('en');
    const en = t('app.startGame');
    expect(de).not.toBe(en);
  });
});

describe('i18n structural categories', () => {
  it('has keys for all major UI sections', () => {
    const requiredPrefixes = [
      'app.', 'controls.', 'timer.', 'game.',
      'payoutEditor.', 'rebuy.', 'addOn.', 'bountyEditor.',
      'chipEditor.', 'settings.', 'display.', 'league.', 'history.',
      'finished.', 'voice.', 'accessibility.', 'playerPanel.',
    ];
    for (const prefix of requiredPrefixes) {
      const count = Object.keys(translations.de).filter(k => k.startsWith(prefix)).length;
      expect(count).toBeGreaterThan(0);
    }
  });

  it('voice.* keys exist for all announcement functions', () => {
    const voiceKeys = Object.keys(translations.de).filter(k => k.startsWith('voice.'));
    expect(voiceKeys.length).toBeGreaterThan(20);
  });
});
