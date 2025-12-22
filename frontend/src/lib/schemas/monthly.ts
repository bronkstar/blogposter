import { z } from 'zod';

const monthString = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Monat im Format JJJJ-MM angeben.');

const labelString = z.string().min(2);

const aggregateEntrySchema = z.object({
  month: monthString,
  label: labelString,
  unemployed: z.number().int(),
  seeking: z.number().int(),
});

const jobsEntrySchema = z.object({
  month: monthString,
  label: labelString,
  it_jobs: z.number().int(),
});

const germanyEntrySchema = z.object({
  month: monthString,
  label: labelString,
  unemployed: z.number().int(),
  seeking: z.number().int(),
  jobs: z.number().int(),
});

export const monthlyDatasetSchema = z.object({
  it_aggregate: z.array(aggregateEntrySchema).default([]),
  it_jobs: z.array(jobsEntrySchema).default([]),
  germany: z.array(germanyEntrySchema).default([]),
  infra_aggregate: z.array(aggregateEntrySchema).default([]),
  infra_jobs: z.array(jobsEntrySchema).default([]),
  software_aggregate: z.array(aggregateEntrySchema).default([]),
  software_jobs: z.array(jobsEntrySchema).default([]),
});

export type MonthlyDataset = z.infer<typeof monthlyDatasetSchema>;
export type AggregateEntry = z.infer<typeof aggregateEntrySchema>;
export type JobsEntry = z.infer<typeof jobsEntrySchema>;
export type GermanyEntry = z.infer<typeof germanyEntrySchema>;
