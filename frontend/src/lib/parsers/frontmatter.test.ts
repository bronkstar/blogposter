import { describe, expect, it } from 'vitest';
import {
  FRONTMATTER_DELIMITER,
  parseFrontmatterBlock,
  serializeFrontmatter,
} from './frontmatter';
import { defaultFrontmatter } from '../schemas/frontmatter';

describe('frontmatter parser', () => {
  it('serializes frontmatter with TOML delimiters', () => {
    const serialized = serializeFrontmatter(defaultFrontmatter);

    expect(serialized.startsWith(`${FRONTMATTER_DELIMITER}\n`)).toBe(true);
    expect(serialized.endsWith(`${FRONTMATTER_DELIMITER}`)).toBe(true);
    expect(serialized).toContain('title = "IT-Arbeitsmarkt November 2025 - Wo bleibt der Herbst der Reformen?"');
    expect(serialized).toContain('slug = "/it-arbeitsmarkt-november-2025"');
  });

  it('round-trips frontmatter without losing data', () => {
    const serialized = serializeFrontmatter(defaultFrontmatter);
    const parsed = parseFrontmatterBlock(serialized);

    expect(parsed).toEqual(defaultFrontmatter);
  });
});
