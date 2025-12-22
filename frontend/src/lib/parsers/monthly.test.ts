import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseMonthlyToml, serializeMonthlyDataset } from './monthly';

const monthlyFixturePath = fileURLToPath(
  new URL('../../../../docs/monthly.toml', import.meta.url),
);
const monthlyFixture = readFileSync(monthlyFixturePath, 'utf-8');

describe('monthly parser', () => {
  it('parses existing monthly dataset with all categories', () => {
    const dataset = parseMonthlyToml(monthlyFixture);

    expect(dataset.it_aggregate.length).toBeGreaterThan(0);
    expect(dataset.it_jobs.length).toBeGreaterThan(0);
    expect(dataset.germany.length).toBeGreaterThan(0);
    expect(dataset.software_jobs.length).toBeGreaterThan(0);

    const latest = dataset.it_aggregate[0];
    expect(latest).toHaveProperty('month');
    expect(latest).toHaveProperty('label');
  });

  it('serializes back to TOML text', () => {
    const dataset = parseMonthlyToml(monthlyFixture);
    const serialized = serializeMonthlyDataset(dataset);

    expect(serialized).toContain('[[it_aggregate]]');
    expect(serialized).toContain('[[software_jobs]]');
  });
});
