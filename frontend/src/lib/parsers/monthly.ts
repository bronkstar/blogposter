import { parse as parseToml, stringify } from 'toml';
import { monthlyDatasetSchema } from '../schemas/monthly';
import type { MonthlyDataset } from '../schemas/monthly';

export function parseMonthlyToml(content: string): MonthlyDataset {
  const parsed = parseToml(content);
  return monthlyDatasetSchema.parse(parsed);
}

export function serializeMonthlyDataset(dataset: MonthlyDataset): string {
  return stringify(dataset);
}
