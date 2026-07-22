import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import manifest from './audio-manifest.json';
import { allItems } from './index';
import type { SyllableItem } from './types';

const M = manifest as Record<string, { file: string; text: string }>;
const audioDir = join(process.cwd(), 'public', 'audio');

describe('audio coverage', () => {
  // Phase 2 acceptance: fail if any content item lacks a real MP3.
  it('every content item has a manifest entry and an existing MP3', () => {
    const missing: string[] = [];
    for (const item of allItems()) {
      const entry = M[item.id];
      if (!entry) {
        missing.push(`${item.id}: no manifest entry`);
        continue;
      }
      if (!existsSync(join(audioDir, entry.file))) missing.push(`${item.id}: file ${entry.file} missing`);
    }
    expect(missing, `\n${missing.join('\n')}`).toEqual([]);
  });

  it('manifest spoken text equals spokenForm ?? display', () => {
    for (const item of allItems()) {
      const s = item as SyllableItem;
      const expected = s.spokenForm ?? item.display;
      expect(M[item.id]?.text, item.id).toBe(expected);
    }
  });
});
