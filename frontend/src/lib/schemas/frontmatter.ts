import { z } from 'zod';

const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

export const faqEntrySchema = z.object({
  question: z.string().min(1, 'Frage darf nicht leer sein.'),
  answer: z.string().min(1, 'Antwort darf nicht leer sein.'),
});

export type FaqEntry = z.infer<typeof faqEntrySchema>;

const slugSchema = z
  .string()
  .min(2, 'Slug benötigt mindestens zwei Zeichen.')
  .refine(
    (value) => value.startsWith('/'),
    'Slug muss mit einem führenden Slash beginnen (z. B. /it-arbeitsmarkt).',
  );

export const frontmatterSchema = z.object({
  title: z.string().min(3, 'Titel benötigt mindestens drei Zeichen.'),
  description: z.string().min(10, 'Beschreibung benötigt mindestens zehn Zeichen.'),
  date: z
    .string()
    .regex(isoDateRegex, 'Datum muss ISO-8601 entsprechen, z. B. 2025-12-02T09:00:00+02:00'),
  draft: z.boolean(),
  image: z.string().min(1, 'Bildpfad ist erforderlich.'),
  imageAlt: z.string().min(3, 'Alt-Text benötigt mindestens drei Zeichen.'),
  slug: slugSchema,
  author: z.string().min(2, 'Autor benötigt mindestens zwei Zeichen.'),
  categories: z.array(z.string().min(1)).nonempty('Mindestens eine Kategorie wählen.'),
  tags: z.array(z.string().min(1)).nonempty('Mindestens ein Tag wählen.'),
  jobSnippedTag: z.string().min(1, 'jobSnippedTag darf nicht leer sein.'),
  lesedauer: z.string().min(1, 'Lesedauer darf nicht leer sein.'),
  zielgruppe: z.array(z.string().min(1)).nonempty('Mindestens eine Zielgruppe angeben.'),
  Keywords: z.array(z.string().min(1)).nonempty('Mindestens ein Keyword angeben.'),
  summary: z.string().min(10, 'Summary benötigt mindestens zehn Zeichen.'),
  faq: z.array(faqEntrySchema),
});

export type Frontmatter = z.infer<typeof frontmatterSchema>;

export const defaultFrontmatter = (): Frontmatter => ({
  title: '',
  description: '',
  date: new Date().toISOString(),
  draft: false,
  image: '',
  imageAlt: '',
  slug: '/',
  author: '',
  categories: [],
  tags: [],
  jobSnippedTag: '',
  lesedauer: '',
  zielgruppe: [],
  Keywords: [],
  summary: '',
  faq: [],
});

export const validateFrontmatter = (value: unknown) => frontmatterSchema.safeParse(value);
