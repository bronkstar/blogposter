import { parse as parseToml } from '@iarna/toml';
import { frontmatterSchema } from '../schemas/frontmatter';
import type { Frontmatter } from '../schemas/frontmatter';

export const FRONTMATTER_DELIMITER = '+++';

export function parseFrontmatterBlock(block: string): Frontmatter {
  const trimmed = block.trim();
  const escapedDelimiter = FRONTMATTER_DELIMITER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const withoutDelimiters = trimmed
    .replace(new RegExp(`^${escapedDelimiter}`), '')
    .replace(new RegExp(`${escapedDelimiter}$`), '')
    .trim();
  const parsed = parseToml(withoutDelimiters);
  return frontmatterSchema.parse(parsed);
}

export function serializeFrontmatter(frontmatter: Frontmatter): string {
  const tomlPayload = serializeFrontmatterToml(frontmatter);
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

const escapeTomlString = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

const normalizeSingleLine = (value: string) =>
  value.replace(/\s+/g, ' ').trim();

const formatString = (value: string) => `"${escapeTomlString(value)}"`;

const formatStringArray = (values: string[]) =>
  `[${values.map((entry) => formatString(entry)).join(', ')}]`;

const formatFaqInline = (faq: Frontmatter['faq']) => {
  if (faq.length === 0) return '[]';
  const lines = faq.map((entry) => {
    const question = formatString(normalizeSingleLine(entry.question));
    const answer = formatString(normalizeSingleLine(entry.answer));
    return `  { question = ${question}, answer = ${answer}}`;
  });
  return `[\n${lines.join(',\n\n')}\n]`;
};

const serializeFrontmatterToml = (frontmatter: Frontmatter) => {
  const lines: string[] = [];
  const push = (line: string) => lines.push(line);

  push(`title = ${formatString(frontmatter.title)}`);
  push(`description = ${formatString(frontmatter.description)}`);
  push('');
  push(`date = ${formatString(frontmatter.date)}`);
  if (frontmatter.dateModified) {
    push(`dateModified = ${formatString(frontmatter.dateModified)}`);
  }
  push('draft = ' + String(frontmatter.draft));
  push('');
  push(`image = ${formatString(frontmatter.image)}`);
  push(`imageAlt = ${formatString(frontmatter.imageAlt)}`);
  push('');
  push(`slug = ${formatString(frontmatter.slug)}`);
  push('');
  push(`author = ${formatString(frontmatter.author)}`);
  push(`categories = ${formatStringArray(frontmatter.categories)}`);
  push(`tags = ${formatStringArray(frontmatter.tags)}`);
  push('');
  push(`jobSnippedTag = ${formatString(frontmatter.jobSnippedTag)}`);
  push('');
  push(`lesedauer = ${formatString(frontmatter.lesedauer)}`);
  push(`zielgruppe = ${formatStringArray(frontmatter.zielgruppe)}`);
  push('');
  push(`Keywords = ${formatStringArray(frontmatter.Keywords)}`);
  push('');
  push(`summary = ${formatString(normalizeSingleLine(frontmatter.summary))}`);
  push('');
  push(`faq = ${formatFaqInline(frontmatter.faq)}`);

  return lines.join('\n').trim();
};
