import { parse as parseToml, stringify } from 'toml';
import { frontmatterSchema } from '../schemas/frontmatter';
import type { Frontmatter } from '../schemas/frontmatter';

export const FRONTMATTER_DELIMITER = '+++';

export function parseFrontmatterBlock(block: string): Frontmatter {
  const trimmed = block.trim();
  const withoutDelimiters = trimmed
    .replace(new RegExp(`^${FRONTMATTER_DELIMITER}`), '')
    .replace(new RegExp(`${FRONTMATTER_DELIMITER}$`), '')
    .trim();
  const parsed = parseToml(withoutDelimiters);
  return frontmatterSchema.parse(parsed);
}

export function serializeFrontmatter(frontmatter: Frontmatter): string {
  const tomlPayload = stringify(frontmatter).trim();
  return `${FRONTMATTER_DELIMITER}\n${tomlPayload}\n\n${FRONTMATTER_DELIMITER}`;
}

export const validateFrontmatterBlock = (block: string) => {
  try {
    const parsed = parseFrontmatterBlock(block);
    return { success: true as const, data: parsed };
  } catch (error) {
    return { success: false as const, error };
  }
};
