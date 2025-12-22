import { z } from 'zod';

const monthInput = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Monat im Format JJJJ-MM (z. B. 2025-11).');

export const spaceShortcodeSchema = z.object({
  type: z.literal('space'),
});

export const chartShortcodeSchema = z.object({
  type: z.literal('chart_itmarket_all'),
  from: monthInput,
  to: monthInput,
  width: z.number().int().positive().default(960),
  height: z.number().int().positive().default(540),
  title: z.string().min(3),
  aggKey: z.string().optional(),
  jobsKey: z.string().optional(),
});

export const tableShortcodeSchema = z.discriminatedUnion('mode', [
  z.object({
    type: z.literal('itmarket_table'),
    mode: z.literal('range'),
    tableType: z.enum(['it_aggregate', 'it_jobs', 'infra_aggregate', 'infra_jobs', 'software_aggregate', 'software_jobs']),
    from: monthInput,
    to: monthInput,
  }),
  z.object({
    type: z.literal('itmarket_table'),
    mode: z.literal('single'),
    tableType: z.literal('compare'),
    month: monthInput,
  }),
]);

export const shortcodeSchema = z.discriminatedUnion('type', [
  spaceShortcodeSchema,
  chartShortcodeSchema,
  tableShortcodeSchema,
]);

export type Shortcode = z.infer<typeof shortcodeSchema>;
