import type { ChangeEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import monthlyTomlSource from '../../docs/monthly.toml?raw';
import { serializeFrontmatter } from './lib/parsers/frontmatter';
import { parseMonthlyToml, serializeMonthlyDataset } from './lib/parsers/monthly';
import {
  frontmatterSchema,
  writerFrontmatterDefaults,
  writerBodyDefaults,
  type WriterMode,
  type FaqEntry,
  type Frontmatter,
} from './lib/schemas/frontmatter';
import type { Shortcode } from './lib/schemas/shortcodes';
import { shortcodeSchema } from './lib/schemas/shortcodes';
import type { MonthlyDataset } from './lib/schemas/monthly';

const MODE_STORAGE_KEY = 'blogposter.writer-mode.v1';
const PREV_GERMANY_STORAGE_KEY = 'blogposter.it-market.prev-germany.v1';
const STORAGE_KEYS: Record<
  WriterMode,
  { frontmatter: string; shortcodes: string; body: string }
> = {
  'it-market': {
    frontmatter: 'blogposter.it-market.frontmatter.v1',
    shortcodes: 'blogposter.it-market.shortcodes.v1',
    body: 'blogposter.it-market.body.v1',
  },
  blog: {
    frontmatter: 'blogposter.blog.frontmatter.v1',
    shortcodes: 'blogposter.blog.shortcodes.v1',
    body: 'blogposter.blog.body.v1',
  },
};
const MONTHLY_ENTRY_STORAGE_KEY = 'blogposter.it-market.monthly-entry.v1';

const monthlyDataset = parseMonthlyToml(monthlyTomlSource);

const writerModeConfig: Record<WriterMode, { label: string; description: string }> = {
  'it-market': {
    label: 'IT-Arbeitsmarkt-Writer',
    description:
      'Optimiert für monatliche IT-Arbeitsmarktberichte inkl. Monatsdaten, Shortcodes und TOML-Export.',
  },
  blog: {
    label: 'Blogpost-Writer',
    description:
      'Reduzierte Ansicht für thematische Blogartikel ohne Monatsdaten – Fokus auf Storytelling & Body.',
  },
};

const DISCOVER_OPTIONS = {
  publisherNames: ['Die Tech Recruiter GmbH'],
  publisherUrls: ['https://dietechrecruiter.de'],
  publisherLogoUrls: ['https://dietechrecruiter.de/Bilder/Logos/dtr2.png'],
  canonicalBaseUrls: ['https://dietechrecruiter.de'],
  languages: ['de-DE'],
};

type MonthlyCategoryNumbers = {
  unemployed?: number;
  seeking?: number;
  jobs?: number;
  it_jobs?: number;
};

type MonthlyEntry = {
  month: string;
  label: string;
  itAggregate: MonthlyCategoryNumbers;
  itJobs: { it_jobs?: number };
  germany: MonthlyCategoryNumbers;
  infraAggregate: MonthlyCategoryNumbers;
  infraJobs: { it_jobs?: number };
  softwareAggregate: MonthlyCategoryNumbers;
  softwareJobs: { it_jobs?: number };
};

type PrevGermanyEntry = {
  month: string;
  label: string;
  unemployed?: number;
  seeking?: number;
  jobs?: number;
};

const createDefaultShortcode = (type: Shortcode['type']): Shortcode => {
  if (type === 'space') {
    return { type };
  }
  if (type === 'chart_itmarket_all') {
    return {
      type,
      from: '2024-04',
      to: '2025-11',
      width: 960,
      height: 540,
      title: 'Entwicklung IT Arbeitsmarkt Deutschland',
    };
  }
  return {
    type: 'itmarket_table',
    mode: 'range',
    tableType: 'it_aggregate',
    from: '2024-04',
    to: '2025-11',
  };
};

const cloneFrontmatterTemplate = (mode: WriterMode): Frontmatter =>
  JSON.parse(JSON.stringify(writerFrontmatterDefaults[mode])) as Frontmatter;

const loadModeFromStorage = (): WriterMode => {
  if (typeof window === 'undefined') return 'it-market';
  const raw = window.localStorage.getItem(MODE_STORAGE_KEY);
  return raw === 'blog' ? 'blog' : 'it-market';
};

const loadFrontmatterFromStorage = (mode: WriterMode): Frontmatter => {
  if (typeof window === 'undefined') return cloneFrontmatterTemplate(mode);
  const raw = window.localStorage.getItem(STORAGE_KEYS[mode].frontmatter);
  if (!raw) return cloneFrontmatterTemplate(mode);
  try {
    const parsed = JSON.parse(raw);
    return frontmatterSchema.parse(parsed);
  } catch {
    return cloneFrontmatterTemplate(mode);
  }
};

const loadShortcodesFromStorage = (mode: WriterMode): Shortcode[] => {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(STORAGE_KEYS[mode].shortcodes);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        const result = shortcodeSchema.safeParse(item);
        return result.success ? result.data : null;
      })
      .filter((item): item is Shortcode => item !== null);
  } catch {
    return [];
  }
};

const loadBodyFromStorage = (mode: WriterMode): string => {
  if (typeof window === 'undefined') return writerBodyDefaults[mode];
  return window.localStorage.getItem(STORAGE_KEYS[mode].body) ?? writerBodyDefaults[mode];
};

const deriveMonthlyDefaults = (): MonthlyEntry => {
  const latestMonth = monthlyDataset.it_aggregate[0];
  return {
    month: latestMonth?.month ?? '2025-11',
    label: latestMonth?.label ?? 'November 2025',
    itAggregate: {
      unemployed: latestMonth?.unemployed,
      seeking: latestMonth?.seeking,
    },
    itJobs: {
      it_jobs: monthlyDataset.it_jobs[0]?.it_jobs,
    },
    germany: {
      unemployed: monthlyDataset.germany[0]?.unemployed,
      seeking: monthlyDataset.germany[0]?.seeking,
      jobs: monthlyDataset.germany[0]?.jobs,
    },
    infraAggregate: {
      unemployed: monthlyDataset.infra_aggregate[0]?.unemployed,
      seeking: monthlyDataset.infra_aggregate[0]?.seeking,
    },
    infraJobs: {
      it_jobs: monthlyDataset.infra_jobs[0]?.it_jobs,
    },
    softwareAggregate: {
      unemployed: monthlyDataset.software_aggregate[0]?.unemployed,
      seeking: monthlyDataset.software_aggregate[0]?.seeking,
    },
    softwareJobs: {
      it_jobs: monthlyDataset.software_jobs[0]?.it_jobs,
    },
  };
};

const getPrevYearMonth = (month: string) => {
  const [year, part] = month.split('-');
  if (!year || !part) return '';
  const prevYear = Number(year) - 1;
  if (!Number.isFinite(prevYear)) return '';
  return `${prevYear}-${part}`;
};

const derivePrevGermanyDefaults = (currentMonth: string, currentLabel: string): PrevGermanyEntry => {
  const prevMonth = getPrevYearMonth(currentMonth);
  const [year, part] = (prevMonth || currentMonth).split('-');
  const label = year && part ? `${part}/${year.slice(-2)}` : currentLabel;
  return {
    month: prevMonth || currentMonth,
    label,
    unemployed: undefined,
    seeking: undefined,
    jobs: undefined,
  };
};

const monthlyDefaultsPreset = deriveMonthlyDefaults();
const prevGermanyDefaultsPreset = derivePrevGermanyDefaults(
  monthlyDefaultsPreset.month,
  monthlyDefaultsPreset.label,
);

const loadMonthlyEntryFromStorage = (): MonthlyEntry => {
  if (typeof window === 'undefined') return monthlyDefaultsPreset;
  const raw = window.localStorage.getItem(MONTHLY_ENTRY_STORAGE_KEY);
  if (!raw) return monthlyDefaultsPreset;
  try {
    const parsed: MonthlyEntry = JSON.parse(raw);
    return parsed;
  } catch {
    return deriveMonthlyDefaults();
  }
};

const loadPrevGermanyFromStorage = (): PrevGermanyEntry => {
  if (typeof window === 'undefined') return prevGermanyDefaultsPreset;
  const raw = window.localStorage.getItem(PREV_GERMANY_STORAGE_KEY);
  if (!raw) return prevGermanyDefaultsPreset;
  try {
    const parsed: PrevGermanyEntry = JSON.parse(raw);
    return parsed;
  } catch {
    return prevGermanyDefaultsPreset;
  }
};

const listToInput = (value: string[]) => value.join(', ');
const inputToList = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const deriveTimeRequired = (lesedauer: string) => {
  const normalized = lesedauer.toLowerCase();
  const match = normalized.match(/(\d+)/);
  if (!match) return '';
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) return '';
  if (normalized.includes('stunde')) return `PT${value}H`;
  return `PT${value}M`;
};

const formatPreviewDate = (isoDate: string) => {
  if (!isoDate) return '';
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString('de-DE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const toAbsoluteUrl = (url: string, baseUrl: string) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('//')) return `https:${url}`;
  const trimmedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${trimmedBase}${url.startsWith('/') ? '' : '/'}${url}`;
};

const absolutizeHtmlUrls = (html: string, baseUrl: string) =>
  html
    .replace(/(src|href)=\"\/(.*?)\"/g, (_match, attr, path) => `${attr}="${toAbsoluteUrl(`/${path}`, baseUrl)}"`)
    .replace(/(src|href)=\'\/(.*?)\'/g, (_match, attr, path) => `${attr}="${toAbsoluteUrl(`/${path}`, baseUrl)}"`);

const formatNumber = (value: number) => new Intl.NumberFormat('de-DE').format(value);
const formatPercent = (value: number) => {
  const formatted = Math.abs(value).toFixed(1).replace('.', ',');
  return `${value >= 0 ? '+' : '-'}${formatted} %`;
};

const decodeHtmlEntities = (value: string) =>
  value
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

const encodeHtmlAttribute = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const parseQuotedArray = (value: string) => {
  const items: string[] = [];
  const regex = /"([^"]+)"/g;
  let match;
  while ((match = regex.exec(value))) {
    items.push(match[1]);
  }
  return items;
};

const columnKeyFromLabel = (label: string) => {
  const digits = label.replace(/\D/g, '');
  if (!digits) return '';
  return `v_${digits}`;
};

const formatTablePercent = (value: number) => {
  const formatted = Math.abs(value).toFixed(2).replace('.', ',');
  return `${value < 0 ? '-' : ''}${formatted} %`;
};

const buildTablePanelHtml = (
  title: string,
  columns: string[],
  rows: Array<Record<string, string | number>>,
  footer: string,
) => {
  const colA = columns[1] ?? '';
  const colB = columns[2] ?? '';
  const keyA = columnKeyFromLabel(colA);
  const keyB = columnKeyFromLabel(colB);
  const body = rows
    .map((row) => {
      const index = row.index ?? '';
      const status = row.status ?? '';
      const current = keyA ? row[keyA] : '';
      const previous = keyB ? row[keyB] : '';
      const abs = row.abs ?? '';
      const pct = typeof row.pct === 'number' ? formatTablePercent(row.pct) : row.pct ?? '';
      return `
        <tr>
          <td>${index}. ${status}</td>
          <td>${typeof current === 'number' ? formatNumber(current) : current}</td>
          <td>${typeof previous === 'number' ? formatNumber(previous) : previous}</td>
          <td>${typeof abs === 'number' ? formatNumber(abs) : abs}</td>
          <td>${pct}</td>
        </tr>
      `;
    })
    .join('');
  const header = columns
    .map((col) => `<th>${col}</th>`)
    .join('');
  return `
    <div class="table-panel">
      <h3 class="table-panel-title">${title}</h3>
      <table class="preview-table">
        <thead><tr>${header}</tr></thead>
        <tbody>${body}</tbody>
      </table>
      ${footer ? `<p class="table-panel-footer">${footer}</p>` : ''}
    </div>
  `;
};

const extractTablePanelBlocks = (markdown: string) => {
  const lines = markdown.split('\n');
  const output: string[] = [];
  const panels: string[] = [];
  const parseKeyValueLine = (value: string) => {
    const match = value.trim().match(/^([a-zA-Z0-9_]+)\s*=\s*(.+)$/);
    if (!match) return null;
    const key = match[1];
    const raw = match[2].trim();
    if (raw.startsWith('"') && raw.endsWith('"')) {
      return { key, value: raw.slice(1, -1) };
    }
    const num = Number(raw);
    return { key, value: Number.isFinite(num) ? num : raw };
  };
  const isBlockLine = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return true;
    if (trimmed.startsWith('[')) return true;
    if (trimmed.includes('=')) return true;
    return false;
  };

  const parseBlock = (start: number) => {
    let title = '';
    let footer = '';
    let columns: string[] = [];
    const rows: Array<Record<string, string | number>> = [];
    let currentRow: Record<string, string | number> | null = null;
    let hasTablePanel = false;
    let i = start;

    for (; i < lines.length; i += 1) {
      const rawLine = lines[i];
      const cleaned = rawLine.trim();
      if (i > start && !isBlockLine(rawLine)) break;
      if (!cleaned) continue;

      if (cleaned.startsWith('[chart]')) {
        if (cleaned.includes('table_panel')) hasTablePanel = true;
        continue;
      }
      if (cleaned.startsWith('type')) {
        const kv = parseKeyValueLine(cleaned);
        if (kv?.key === 'type' && String(kv.value) === 'table_panel') {
          hasTablePanel = true;
        }
        continue;
      }
      if (cleaned.startsWith('[table]') || cleaned.startsWith('columns')) {
        const match = cleaned.match(/columns\s*=\s*\[(.*)\]/);
        if (match?.[1]) {
          columns = parseQuotedArray(match[1]);
        }
        continue;
      }
      if (cleaned.startsWith('[[table.rows]]')) {
        if (currentRow) rows.push(currentRow);
        currentRow = {};
        continue;
      }

      const kv = parseKeyValueLine(cleaned);
      if (!kv) continue;
      if (kv.key === 'title') {
        title = String(kv.value);
      } else if (kv.key === 'footer') {
        footer = String(kv.value);
      } else if (kv.key === 'columns' && typeof kv.value === 'string') {
        columns = parseQuotedArray(kv.value);
      } else if (currentRow) {
        currentRow[kv.key] = kv.value;
      }
    }

    if (currentRow) rows.push(currentRow);
    if (!hasTablePanel) return { handled: false, endIndex: start };
    if (columns.length === 0) {
      columns = ['Status', 'Aktuell', 'Vorjahr', 'Absolut', '%'];
    }
    const tableHtml = buildTablePanelHtml(title, columns, rows, footer);
    return { handled: true, endIndex: i, html: tableHtml };
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (line.startsWith('[chart]')) {
      const parsed = parseBlock(i);
      if (parsed.handled) {
        const token = `TABLE_PANEL_BLOCK_${panels.length}`;
        panels.push(parsed.html ?? '');
        output.push(token);
        i = parsed.endIndex;
        continue;
      }
    }
    output.push(lines[i]);
    i += 1;
  }

  return { markdown: output.join('\n'), panels };
};

const parseShortcodeAttributes = (input: string) => {
  const attrs: Record<string, string> = {};
  const decoded = decodeHtmlEntities(input);
  const regex = /([a-zA-Z0-9_]+)\s*=\s*"([^"]*)"/g;
  let match;
  while ((match = regex.exec(decoded))) {
    attrs[match[1]] = match[2];
  }
  return attrs;
};

const filterMonthlyRange = <T extends { month: string }>(entries: T[], from?: string, to?: string, last?: number) => {
  let filtered = [...entries].sort((a, b) => a.month.localeCompare(b.month));
  if (from && to) {
    filtered = filtered.filter((entry) => entry.month >= from && entry.month <= to);
  } else if (last && last > 0) {
    filtered = filtered.slice(-last);
  }
  return filtered;
};

const buildChartEmbed = (
  dataset: MonthlyDataset,
  attrs: Record<string, string>,
  _index: number,
) => {
  const aggKey = attrs.aggKey || 'it_aggregate';
  const jobsKey = attrs.jobsKey || 'it_jobs';
  const from = attrs.from;
  const to = attrs.to;
  const last = attrs.last ? Number(attrs.last) : undefined;
  const width = attrs.width ? Number(attrs.width) : 960;
  const height = attrs.height ? Number(attrs.height) : 540;
  const aggSource = ((dataset as Record<string, unknown>)[aggKey] as any[]) ?? [];
  const jobSource = ((dataset as Record<string, unknown>)[jobsKey] as any[]) ?? [];
  const aggSeries = filterMonthlyRange(aggSource, from, to, last);
  const jobSeries = filterMonthlyRange(jobSource, from, to, last);
  const jobsMap = new Map(jobSeries.map((entry) => [entry.month, entry.it_jobs]));
  const combinedSeries = aggSeries.map((entry) => ({
    ...entry,
    it_jobs: jobsMap.get(entry.month) ?? 0,
  }));
  const dataJson = encodeHtmlAttribute(
    JSON.stringify({
      aggregate: aggSeries,
      jobs: jobSeries,
      all: combinedSeries,
    }),
  );
  const cid = `preview-${_index}`;
  return `
    <div class="itmarket-chart preview-chart" data-cid="${cid}" data-width="${width}" data-height="${height}" data-range="all" data-animation="disabled" data-type="all" data-json="${dataJson}">
      <svg id="modernChart-${cid}" viewBox="0 0 ${width} ${height}" role="img" class="w-full drop-shadow-lg"></svg>
      <div class="tooltip" id="tooltip-${cid}"></div>
      <div class="legend" id="legend-${cid}"></div>
    </div>
  `;
};

const buildTableEmbed = (dataset: MonthlyDataset, attrs: Record<string, string>) => {
  const type = attrs.type || 'it_aggregate';
  const from = attrs.from;
  const to = attrs.to;
  const last = attrs.last ? Number(attrs.last) : undefined;
  if (type === 'compare') {
    const month = attrs.month;
    if (!month) return '<div class="shortcode-placeholder">Tabelle: Monat fehlt</div>';
    const prevMonth = getPrevYearMonth(month);
    const aggNow = dataset.it_aggregate.find((entry) => entry.month === month);
    const aggPrev = dataset.it_aggregate.find((entry) => entry.month === prevMonth);
    const jobsNow = dataset.it_jobs.find((entry) => entry.month === month);
    const jobsPrev = dataset.it_jobs.find((entry) => entry.month === prevMonth);
    const gerNow = dataset.germany.find((entry) => entry.month === month);
    const gerPrev = dataset.germany.find((entry) => entry.month === prevMonth);
    const hdrNow = gerNow?.label ?? formatMonthLabel(month);
    const hdrPrev = gerPrev?.label ?? formatMonthLabel(prevMonth);
    const rows = [
      {
        label: 'Arbeitsuchende - IT',
        current: aggNow?.seeking ?? 0,
        previous: aggPrev?.seeking ?? 0,
      },
      {
        label: 'Arbeitslose - IT',
        current: aggNow?.unemployed ?? 0,
        previous: aggPrev?.unemployed ?? 0,
      },
      {
        label: 'IT JOBS',
        current: jobsNow?.it_jobs ?? 0,
        previous: jobsPrev?.it_jobs ?? 0,
      },
      {
        label: 'Arbeitsuchende - Deutschland',
        current: gerNow?.seeking ?? 0,
        previous: gerPrev?.seeking ?? 0,
      },
      {
        label: 'Arbeitslose - Deutschland',
        current: gerNow?.unemployed ?? 0,
        previous: gerPrev?.unemployed ?? 0,
      },
      {
        label: 'JOBS - Deutschland',
        current: gerNow?.jobs ?? 0,
        previous: gerPrev?.jobs ?? 0,
      },
    ];
    return `
      <table class="preview-table">
        <thead>
          <tr>
            <th></th>
            <th>${hdrNow}</th>
            <th>${hdrPrev}</th>
            <th>Absolut</th>
            <th>%</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map((row) => {
              const abs = row.current - row.previous;
              const pct = row.previous === 0 ? 0 : (abs / row.previous) * 100;
              return `
                <tr>
                  <td>${row.label}</td>
                  <td>${formatNumber(row.current)}</td>
                  <td>${formatNumber(row.previous)}</td>
                  <td>${formatNumber(abs)}</td>
                  <td>${formatPercent(pct)}</td>
                </tr>
              `;
            })
            .join('')}
        </tbody>
      </table>
    `;
  }

  const head = type === 'it_jobs'
    ? '<tr><th>Monat</th><th>gemeldete IT-Jobs</th></tr>'
    : '<tr><th>Monat</th><th>Anzahl Arbeitslose</th><th>Anzahl Arbeitssuchende</th><th>gesamt</th></tr>';
  const rows = type === 'it_jobs'
    ? filterMonthlyRange(
        dataset.it_jobs as { month: string; label: string; it_jobs: number }[],
        from,
        to,
        last,
      )
        .sort((a, b) => b.month.localeCompare(a.month))
        .map(
          (entry) => `
            <tr>
              <td>${entry.label}</td>
              <td>${formatNumber(entry.it_jobs)}</td>
            </tr>
          `,
        )
        .join('')
    : filterMonthlyRange(
        dataset.it_aggregate as { month: string; label: string; unemployed: number; seeking: number }[],
        from,
        to,
        last,
      )
        .sort((a, b) => b.month.localeCompare(a.month))
        .map((entry) => {
          const total = entry.unemployed + entry.seeking;
          return `
            <tr>
              <td>${entry.label}</td>
              <td>${formatNumber(entry.unemployed)}</td>
              <td>${formatNumber(entry.seeking)}</td>
              <td>${formatNumber(total)}</td>
            </tr>
          `;
        })
        .join('');
  return `
    <table class="preview-table">
      <thead>${head}</thead>
      <tbody>${rows}</tbody>
    </table>
  `;
};

const renderShortcodes = (input: string, dataset: MonthlyDataset) => {
  let chartIndex = 0;
  return input.replace(/\{\{\s*(?:<|&lt;)\s*([a-zA-Z0-9_]+)([\s\S]*?)(?:>|&gt;)\s*\}\}/g, (_match, name, rawAttrs) => {
    const attrs = parseShortcodeAttributes(rawAttrs ?? '');
    if (name === 'space') {
      return '<div class="shortcode-space"></div>';
    }
    if (name === 'chart_itmarket_all') {
      return buildChartEmbed(dataset, attrs, chartIndex++);
    }
    if (name === 'itmarket_table') {
      return buildTableEmbed(dataset, attrs);
    }
    const safe = `${name}${rawAttrs || ''}`.replace(/\s+/g, ' ').trim();
    return `<div class="shortcode-placeholder">Shortcode: ${safe}</div>`;
  });
};

const formatAuthorName = (value: string) => {
  if (!value) return '';
  if (value.includes('-')) {
    return value
      .split('-')
      .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1)}` : ''))
      .join(' ');
  }
  return value;
};

const buildPreviewHtml = (
  frontmatter: Frontmatter,
  body: string,
  monthlyEntry: MonthlyEntry,
  prevGermanyEntry: PrevGermanyEntry,
) => {
  const baseUrl = frontmatter.canonicalBaseUrl || 'https://dietechrecruiter.de';
  const heroImage = toAbsoluteUrl(frontmatter.image, baseUrl);
  const authorName = formatAuthorName(frontmatter.author);
  const authorPhoto = frontmatter.authorUrl.includes('bj%C3%B6rn-richter')
    ? toAbsoluteUrl('/Bilder/DTR/br.webp', baseUrl)
    : '';
  const updatedDataset = buildUpdatedMonthlyDataset(monthlyDataset, monthlyEntry, prevGermanyEntry);
  const tablePanelExtraction = extractTablePanelBlocks(body);
  const rawHtml = marked.parse(tablePanelExtraction.markdown, { async: false });
  let htmlWithPanels = rawHtml;
  tablePanelExtraction.panels.forEach((panel, index) => {
    const token = `TABLE_PANEL_BLOCK_${index}`;
    const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const codeBlockRegex = new RegExp(`<pre><code>\\s*${escapedToken}\\s*</code></pre>`, 'g');
    htmlWithPanels = htmlWithPanels.replace(codeBlockRegex, panel);
    htmlWithPanels = htmlWithPanels.replace(new RegExp(escapedToken, 'g'), panel);
  });
  const htmlWithShortcodes = renderShortcodes(htmlWithPanels, updatedDataset);
  const sanitizedWithShortcodes = DOMPurify.sanitize(htmlWithShortcodes, {
    USE_PROFILES: { html: true, svg: true, svgFilters: true },
    ADD_ATTR: ['class', 'id', 'data-cid', 'data-width', 'data-height', 'data-range', 'data-animation', 'data-type', 'data-json'],
    ALLOW_DATA_ATTR: true,
    ADD_TAGS: ['div', 'svg'],
  });
  const contentHtml = absolutizeHtmlUrls(sanitizedWithShortcodes, baseUrl);
  const tagSpans = frontmatter.tags
    .map((tag) => `<span class="tag-primary mt-2">${tag}</span>`)
    .join('');
  const categorySpans = frontmatter.categories
    .map((category) => `<span class="tag-secondary mt-2">${category}</span>`)
    .join('');
  return `<!doctype html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link href="/cw-style.css" rel="stylesheet" />
    <style>
      body { background: #0f1116; }
      .shortcode-placeholder {
        border: 1px dashed #3b4252;
        color: #e5e9f0;
        background: rgba(15, 17, 22, 0.65);
        padding: 16px;
        margin: 16px 0;
        font-size: 0.95rem;
      }
      .shortcode-space { height: 24px; }
      .preview-table {
        width: 100%;
        border-collapse: collapse;
        margin: 24px 0;
        font-size: 0.95rem;
      }
      .preview-table th,
      .preview-table td {
        border-bottom: 1px solid rgba(148, 163, 184, 0.35);
        padding: 10px 12px;
        text-align: left;
      }
      .preview-table thead {
        background: rgba(15, 23, 42, 0.85);
        color: #e2e8f0;
      }
      .preview-table tbody tr:nth-child(odd) {
        background: rgba(15, 23, 42, 0.35);
      }
      .preview-chart {
        margin: 32px 0;
        border-radius: 20px;
        border: 1px solid rgba(148, 163, 184, 0.25);
        background: rgba(15, 23, 42, 0.45);
        padding: 20px;
      }
      .chart-footnote {
        text-align: center;
        color: #aab0bf;
        margin-top: 12px;
        font-size: 0.85rem;
      }
      .table-panel {
        margin: 32px 0;
        padding: 24px;
        border-radius: 16px;
        background: #111318;
        border: 1px solid #2a2f3a;
        color: #e8eaf0;
      }
      .table-panel-title {
        text-align: center;
        font-weight: 600;
        margin-bottom: 16px;
      }
      .table-panel-footer {
        text-align: center;
        color: #aab0bf;
        margin-top: 12px;
        font-size: 0.85rem;
      }
    </style>
  </head>
  <body>
    <section
      class="single-post-section bg-cover bg-no-repeat bg-center relative bg-skin-fill-dark"
      style="background-image: url('${toAbsoluteUrl('/Bilder/Startseite/grainbg4.svg', baseUrl)}')"
    >
      <div class="flex flex-col-reverse xl:flex-row">
        <div class="container flex items-center xl:ml-16 lg:py-8">
          <div class="xl:max-w-4xl mx-auto py-8 p-1 xl:pt-8">
            <span class="text-sm font-bold text-center sm:text-left text-gray-400">
              ${formatPreviewDate(frontmatter.date)}
            </span>
            <h1 class="pt-0 pb-0 text-3xl md:text-4xl font-bold text-skin-basedark">
              ${frontmatter.title}
            </h1>
            <div class="flex flex-wrap gap-x-3 items-center text-xs tracking-wider font-semibold mt-2">
              ${tagSpans}${categorySpans}
            </div>
            <p class="pt-5 text-lg text-skin-muteddark leading-snug">
              ${frontmatter.summary}
            </p>
            <div class="flex justify-between items-center pt-4 lg:pt-8 md:pt-12">
              <div class="flex items-center gap-3">
                ${authorPhoto ? `<img src="${authorPhoto}" class="w-14 h-14 object-cover rounded-full" alt="${authorName}" />` : ''}
                <div class="text-sm md:text-base">
                  <p class="text-gray-400">Autor</p>
                  <p class="text-skin-basedark tracking-wide">${authorName}</p>
                </div>
              </div>
              <div class="hidden xl:flex items-center">
                <div class="text-sm md:text-base">
                  <p class="text-gray-400">Lesedauer</p>
                  <p class="text-skin-basedark tracking-wide">${frontmatter.lesedauer}</p>
                </div>
              </div>
              <div class="flex flex-col gap-2">
                <span class="text-gray-400 px-1.5 text-sm md:text-base">Teile diesen Post</span>
                <div class="flex items-center">
                  <img src="${toAbsoluteUrl('/Bilder/Startseite/SocialSVG/in.png', baseUrl)}" class="w-6 h-6 mx-2" alt="LinkedIn icon" />
                  <img src="${toAbsoluteUrl('/Bilder/Startseite/SocialSVG/xing.png', baseUrl)}" class="w-6 h-6 mx-2" alt="Xing icon" />
                  <img src="${toAbsoluteUrl('/Bilder/Startseite/SocialSVG/mail.png', baseUrl)}" class="w-6 h-6 mx-2" alt="Email icon" />
                  <img src="${toAbsoluteUrl('/Bilder/Startseite/SocialSVG/copy.png', baseUrl)}" class="w-6 h-6 mx-2" alt="Copy icon" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div>
          <img
            src="${heroImage}"
            alt="${frontmatter.imageAlt}"
            class="w-full max-h-96 xl:max-h-none xl:h-full object-cover"
            width="1440"
            height="900"
          />
        </div>
      </div>
    </section>
    <section class="single-post-section bg-skin-fill dark:bg-skin-fill-dark-blog" style="list-style-type: disc">
      <div class="flex flex-col lg:flex-row justify-center gap-8 mx-auto">
        <div class="pt-5 md:pt-8 p-3 px-5 max-w-5xl leading-7 lg:text-lg lg:leading-8 lg:tracking-wide text-smoke-900 dark:text-smoke-200">
          ${contentHtml}
        </div>
      </div>
    </section>
    <script src="/itmarket-charts.js"></script>
  </body>
</html>`;
};

const upsertByMonth = <T extends { month: string }>(entries: T[], next: T) => {
  const filtered = entries.filter((entry) => entry.month !== next.month);
  return [next, ...filtered].sort((a, b) => b.month.localeCompare(a.month));
};

const buildUpdatedMonthlyDataset = (
  dataset: MonthlyDataset,
  entry: MonthlyEntry,
  prevGermany?: PrevGermanyEntry,
): MonthlyDataset => {
  const updated: MonthlyDataset = {
    it_aggregate: upsertByMonth(dataset.it_aggregate, {
      month: entry.month,
      label: entry.label,
      unemployed: entry.itAggregate.unemployed ?? 0,
      seeking: entry.itAggregate.seeking ?? 0,
    }),
    it_jobs: upsertByMonth(dataset.it_jobs, {
      month: entry.month,
      label: entry.label,
      it_jobs: entry.itJobs.it_jobs ?? 0,
    }),
    germany: upsertByMonth(dataset.germany, {
      month: entry.month,
      label: entry.label,
      unemployed: entry.germany.unemployed ?? 0,
      seeking: entry.germany.seeking ?? 0,
      jobs: entry.germany.jobs ?? 0,
    }),
    infra_aggregate: upsertByMonth(dataset.infra_aggregate, {
      month: entry.month,
      label: entry.label,
      unemployed: entry.infraAggregate.unemployed ?? 0,
      seeking: entry.infraAggregate.seeking ?? 0,
    }),
    infra_jobs: upsertByMonth(dataset.infra_jobs, {
      month: entry.month,
      label: entry.label,
      it_jobs: entry.infraJobs.it_jobs ?? 0,
    }),
    software_aggregate: upsertByMonth(dataset.software_aggregate, {
      month: entry.month,
      label: entry.label,
      unemployed: entry.softwareAggregate.unemployed ?? 0,
      seeking: entry.softwareAggregate.seeking ?? 0,
    }),
    software_jobs: upsertByMonth(dataset.software_jobs, {
      month: entry.month,
      label: entry.label,
      it_jobs: entry.softwareJobs.it_jobs ?? 0,
    }),
  };
  if (prevGermany?.month) {
    updated.germany = upsertByMonth(updated.germany, {
      month: prevGermany.month,
      label: prevGermany.label,
      unemployed: prevGermany.unemployed ?? 0,
      seeking: prevGermany.seeking ?? 0,
      jobs: prevGermany.jobs ?? 0,
    });
  }
  return updated;
};

const monthKey = (month: string) => {
  const [year, part] = month.split('-');
  if (!year || !part) return '';
  return `${part}${year.slice(-2)}`;
};

const formatMonthLabel = (month: string) => {
  const [year, part] = month.split('-');
  if (!year || !part) return '';
  return `${part}/${year.slice(-2)}`;
};

const formatTimestamp = (value: Date) => {
  const pad = (num: number) => String(num).padStart(2, '0');
  return `${value.getFullYear()}${pad(value.getMonth() + 1)}${pad(value.getDate())}-${pad(value.getHours())}${pad(value.getMinutes())}`;
};

const downloadTextFile = (filename: string, content: string) => {
  const blob = new Blob([content], { type: 'text/plain' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
};

const writeTextFile = async (
  root: FileSystemDirectoryHandle,
  pathSegments: string[],
  filename: string,
  content: string,
) => {
  let current = root;
  for (const segment of pathSegments) {
    current = await current.getDirectoryHandle(segment, { create: true });
  }
  const fileHandle = await current.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
};

const sanitizeFileName = (slug: string) => {
  const name = slug.replace(/^\//, '');
  return name.length === 0 ? 'entwurf' : name;
};

const formatShortcode = (shortcode: Shortcode): string => {
  switch (shortcode.type) {
    case 'space':
      return '{{< space >}}';
    case 'chart_itmarket_all': {
      const attrs = [
        `from="${shortcode.from}"`,
        `to="${shortcode.to}"`,
        `width="${shortcode.width}"`,
        `height="${shortcode.height}"`,
        `title="${shortcode.title}"`,
      ];
      if (shortcode.aggKey) attrs.push(`aggKey="${shortcode.aggKey}"`);
      if (shortcode.jobsKey) attrs.push(`jobsKey="${shortcode.jobsKey}"`);
      return `{{< chart_itmarket_all ${attrs.join(' ')} >}}`;
    }
    case 'itmarket_table': {
      if (shortcode.mode === 'single') {
        return `{{< itmarket_table type="compare" month="${shortcode.month}" >}}`;
      }
      return `{{< itmarket_table type="${shortcode.tableType}" from="${shortcode.from}" to="${shortcode.to}" >}}`;
    }
    default:
      return '';
  }
};

const formatBodyWithSpaces = (input: string) => {
  const normalized = input.replace(/\r\n/g, '\n').trim();
  if (!normalized) return '';
  const blocks = normalized
    .split(/\n\s*\n+/)
    .map((block) => block.trim())
    .filter(Boolean);
  if (blocks.length <= 1) return normalized;
  return blocks.join('\n\n{{< space >}}\n\n');
};

  const latestAggregate = monthlyDataset.it_aggregate.at(0);
  const latestJobs = monthlyDataset.it_jobs.at(0);
  const chartFromMonth = '2024-04';

const serializeMonthlyEntry = (entry: MonthlyEntry) => {
  const lines: string[] = [];
  const push = (text: string) => lines.push(text);

  push('[[it_aggregate]]');
  push(`month = "${entry.month}"`);
  push(`label = "${entry.label}"`);
  push(`unemployed = ${entry.itAggregate.unemployed ?? 0}`);
  push(`seeking = ${entry.itAggregate.seeking ?? 0}`);
  push('');

  push('[[it_jobs]]');
  push(`month = "${entry.month}"`);
  push(`label = "${entry.label}"`);
  push(`it_jobs = ${entry.itJobs.it_jobs ?? 0}`);
  push('');

  push('[[germany]]');
  push(`month = "${entry.month}"`);
  push(`label = "${entry.month.split('-')[1]}/${entry.month.slice(2, 4)}"`);
  push(`unemployed = ${entry.germany.unemployed ?? 0}`);
  push(`seeking = ${entry.germany.seeking ?? 0}`);
  push(`jobs = ${entry.germany.jobs ?? 0}`);
  push('');

  push('[[infra_aggregate]]');
  push(`month = "${entry.month}"`);
  push(`label = "${entry.label}"`);
  push(`unemployed = ${entry.infraAggregate.unemployed ?? 0}`);
  push(`seeking = ${entry.infraAggregate.seeking ?? 0}`);
  push('');

  push('[[infra_jobs]]');
  push(`month = "${entry.month}"`);
  push(`label = "${entry.label}"`);
  push(`it_jobs = ${entry.infraJobs.it_jobs ?? 0}`);
  push('');

  push('[[software_aggregate]]');
  push(`month = "${entry.month}"`);
  push(`label = "${entry.label}"`);
  push(`unemployed = ${entry.softwareAggregate.unemployed ?? 0}`);
  push(`seeking = ${entry.softwareAggregate.seeking ?? 0}`);
  push('');

  push('[[software_jobs]]');
  push(`month = "${entry.month}"`);
  push(`label = "${entry.label}"`);
  push(`it_jobs = ${entry.softwareJobs.it_jobs ?? 0}`);

  return lines.join('\n');
};

function App() {
  const initialModeRef = useRef<WriterMode | null>(null);
  if (!initialModeRef.current) {
    initialModeRef.current = loadModeFromStorage();
  }
  const initialMode = initialModeRef.current as WriterMode;

  const [mode, setMode] = useState<WriterMode>(initialMode);
  const [frontmatter, setFrontmatter] = useState<Frontmatter>(() =>
    loadFrontmatterFromStorage(initialMode),
  );
  const [shortcodes, setShortcodes] = useState<Shortcode[]>(() =>
    loadShortcodesFromStorage(initialMode),
  );
  const [body, setBody] = useState<string>(() => loadBodyFromStorage(initialMode));
  const [monthlyEntry, setMonthlyEntry] = useState<MonthlyEntry>(monthlyDefaultsPreset);
  const lastAutoDateModifiedRef = useRef<string | null>(null);
  const [repoHandle, setRepoHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [repoMessage, setRepoMessage] = useState<string | null>(null);
  const [prevGermanyEntry, setPrevGermanyEntry] = useState<PrevGermanyEntry>(() =>
    loadPrevGermanyFromStorage(),
  );
  const lastAutoPrevGermanyRef = useRef<string | null>(null);

  useEffect(() => {
    setFrontmatter(loadFrontmatterFromStorage(mode));
    setShortcodes(loadShortcodesFromStorage(mode));
    setBody(loadBodyFromStorage(mode));
  }, [mode]);

  useEffect(() => {
    setMonthlyEntry(loadMonthlyEntryFromStorage());
  }, []);

  useEffect(() => {
    setPrevGermanyEntry(loadPrevGermanyFromStorage());
  }, []);

  useEffect(() => {
    if (!frontmatter.date) return;
    setFrontmatter((prev) => {
      if (prev.dateModified && prev.dateModified !== lastAutoDateModifiedRef.current) return prev;
      if (prev.dateModified === prev.date) return prev;
      lastAutoDateModifiedRef.current = prev.date;
      return { ...prev, dateModified: prev.date };
    });
  }, [frontmatter.date]);

  useEffect(() => {
    const derived = deriveTimeRequired(frontmatter.lesedauer);
    setFrontmatter((prev) => {
      if (prev.timeRequired === derived) return prev;
      return { ...prev, timeRequired: derived };
    });
  }, [frontmatter.lesedauer]);

  useEffect(() => {
    const nextDefaults = derivePrevGermanyDefaults(monthlyEntry.month, monthlyEntry.label);
    setPrevGermanyEntry((prev) => {
      if (prev.month && prev.month !== lastAutoPrevGermanyRef.current) return prev;
      lastAutoPrevGermanyRef.current = nextDefaults.month;
      return {
        ...prev,
        month: nextDefaults.month,
        label: nextDefaults.label,
      };
    });
  }, [monthlyEntry.month, monthlyEntry.label]);

  const connectRepo = async () => {
    if (!('showDirectoryPicker' in window)) {
      setRepoMessage('Datei-Zugriff wird vom Browser nicht unterstützt.');
      return;
    }
    try {
      const handle = await (window as Window & { showDirectoryPicker: () => Promise<FileSystemDirectoryHandle> })
        .showDirectoryPicker();
      setRepoHandle(handle);
      setRepoMessage(`Repo verbunden: ${handle.name}`);
    } catch {
      setRepoMessage('Verbindung abgebrochen.');
    }
  };

  const handleSaveMonthlyToml = async () => {
    const updatedDataset = buildUpdatedMonthlyDataset(monthlyDataset, monthlyEntry, prevGermanyEntry);
    const content = serializeMonthlyDataset(updatedDataset);
    const backupName = `${formatTimestamp(new Date())}-monthly.toml`;

    if (!repoHandle) {
      downloadTextFile('monthly.toml', content);
      downloadTextFile(backupName, content);
      setRepoMessage('Repo nicht verbunden. Dateien wurden heruntergeladen.');
      return;
    }

    try {
      await writeTextFile(repoHandle, ['docs'], 'monthly.toml', content);
      await writeTextFile(repoHandle, ['docs', 'monthly.backups'], backupName, content);
      setRepoMessage('monthly.toml gespeichert + Backup erstellt.');
    } catch (error) {
      console.error('Speichern fehlgeschlagen', error);
      setRepoMessage('Speichern fehlgeschlagen. Bitte erneut versuchen.');
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(MODE_STORAGE_KEY, mode);
  }, [mode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEYS[mode].frontmatter, JSON.stringify(frontmatter));
  }, [frontmatter, mode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEYS[mode].shortcodes, JSON.stringify(shortcodes));
  }, [shortcodes, mode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEYS[mode].body, body);
  }, [body, mode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(MONTHLY_ENTRY_STORAGE_KEY, JSON.stringify(monthlyEntry));
  }, [monthlyEntry]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(PREV_GERMANY_STORAGE_KEY, JSON.stringify(prevGermanyEntry));
  }, [prevGermanyEntry]);

  const frontmatterValidation = useMemo(
    () => frontmatterSchema.safeParse(frontmatter),
    [frontmatter],
  );

  const frontmatterFieldErrors = useMemo(() => {
    if (frontmatterValidation.success) return {};
    return frontmatterValidation.error.flatten().fieldErrors;
  }, [frontmatterValidation]);

  const shortcodesValidation = shortcodes.map((entry) => shortcodeSchema.safeParse(entry));
  const hasValidShortcodes = shortcodesValidation.every((entry) => entry.success);
  const serializedFrontmatter = useMemo(() => serializeFrontmatter(frontmatter), [frontmatter]);
  const markdownPreview = useMemo(
    () => `${serializedFrontmatter}\n\n${body}`.trim(),
    [serializedFrontmatter, body],
  );
  const previewHtml = useMemo(
    () => buildPreviewHtml(frontmatter, body, monthlyEntry, prevGermanyEntry),
    [frontmatter, body, monthlyEntry, prevGermanyEntry],
  );
  const canExport = frontmatterValidation.success && hasValidShortcodes;
  const mainEntityOfPage = useMemo(() => {
    const base = frontmatter.canonicalBaseUrl.trim();
    if (!base || !frontmatter.slug) return '';
    const cleanedBase = base.endsWith('/') ? base.slice(0, -1) : base;
    const cleanedSlug = frontmatter.slug.startsWith('/') ? frontmatter.slug : `/${frontmatter.slug}`;
    return `${cleanedBase}${cleanedSlug}`;
  }, [frontmatter.canonicalBaseUrl, frontmatter.slug]);
  const chartShortcodes = useMemo(() => {
    const to = monthlyEntry.month;
    return {
      overall: `{{< chart_itmarket_all from="${chartFromMonth}" to="${to}" width="960" height="540" title="Entwicklung IT Arbeitsmarkt Deutschland" >}}`,
      infra: `{{< chart_itmarket_all aggKey="infra_aggregate" jobsKey="infra_jobs" from="${chartFromMonth}" to="${to}" width="960" height="540" title="Entwicklung IT-Arbeitsmarkt - IT Infrastruktur" >}}`,
      software: `{{< chart_itmarket_all aggKey="software_aggregate" jobsKey="software_jobs" from="${chartFromMonth}" to="${to}" width="960" height="540" title="Entwicklung IT-Arbeitsmarkt - Software Entwicklung" >}}`,
    };
  }, [monthlyEntry.month]);
  const comparisonTableSnippet = useMemo(() => {
    const updatedDataset = buildUpdatedMonthlyDataset(monthlyDataset, monthlyEntry, prevGermanyEntry);
    const currentMonth = monthlyEntry.month;
    const previousMonth = getPrevYearMonth(currentMonth);
    if (!currentMonth || !previousMonth) return '';

    const currentLabel = formatMonthLabel(currentMonth);
    const previousLabel = formatMonthLabel(previousMonth);
    const currentKey = monthKey(currentMonth);
    const previousKey = monthKey(previousMonth);
    if (!currentKey || !previousKey) return '';

    const prevItAggregate = updatedDataset.it_aggregate.find((entry) => entry.month === previousMonth);
    const prevItJobs = updatedDataset.it_jobs.find((entry) => entry.month === previousMonth);
    const prevGermany = updatedDataset.germany.find((entry) => entry.month === previousMonth);

    const rows = [
      {
        index: 1,
        status: 'Deutschland Arbeitslos',
        current: monthlyEntry.germany.unemployed ?? 0,
        previous: prevGermany?.unemployed ?? 0,
      },
      {
        index: 2,
        status: 'Deutschland Arbeitssuchend',
        current: monthlyEntry.germany.seeking ?? 0,
        previous: prevGermany?.seeking ?? 0,
      },
      {
        index: 3,
        status: 'Deutschland Jobs',
        current: monthlyEntry.germany.jobs ?? 0,
        previous: prevGermany?.jobs ?? 0,
      },
      {
        index: 4,
        status: 'IT Arbeitssuchend',
        current: monthlyEntry.itAggregate.seeking ?? 0,
        previous: prevItAggregate?.seeking ?? 0,
      },
      {
        index: 5,
        status: 'IT Arbeitslos',
        current: monthlyEntry.itAggregate.unemployed ?? 0,
        previous: prevItAggregate?.unemployed ?? 0,
      },
      {
        index: 6,
        status: 'IT Jobs',
        current: monthlyEntry.itJobs.it_jobs ?? 0,
        previous: prevItJobs?.it_jobs ?? 0,
      },
    ];

    const rowLines = rows
      .map((row) => {
        const abs = row.current - row.previous;
        const pct = row.previous === 0 ? 0 : Number(((abs / row.previous) * 100).toFixed(2));
        return [
          '[[table.rows]]',
          `index = ${row.index}`,
          `status = "${row.status}"`,
          `v_${currentKey} = ${row.current}`,
          `v_${previousKey} = ${row.previous}`,
          `abs = ${abs}`,
          `pct = ${pct}`,
          '',
        ].join('\n');
      })
      .join('\n');

    return [
      '[chart]',
      'type = "table_panel"',
      `title = "IT Arbeitsmarkt vs. Deutschland Arbeitsmarkt gesamt - ${monthlyEntry.label}"`,
      'subtitle = ""',
      'footer = "Daten der Agentur für Arbeit - Berechnung und Darstellung durch Die Tech Recruiter GmbH"',
      '',
      '[theme]',
      'mode = "dark"',
      'panel_background = "#111318"',
      'table_header_background = "#1A1D24"',
      'table_row_background = "#111318"',
      'gridline_color = "#2A2F3A"',
      'text_color = "#E8EAF0"',
      'muted_text_color = "#AAB0BF"',
      '',
      '[layout]',
      'title_align = "center"',
      'footer_align = "center"',
      'padding_px = 24',
      'border_radius_px = 10',
      '',
      '[table]',
      `columns = ["Status", "${currentLabel}", "${previousLabel}", "Absolut", "%"]`,
      'align = ["left", "right", "right", "right", "right"]',
      '',
      '[format]',
      'thousands_separator = "."',
      'decimal_separator = ","',
      'percent_decimals = 2',
      'show_percent_sign = true',
      'negative_sign = "-"',
      '',
      rowLines.trim(),
    ].join('\n');
  }, [monthlyEntry, prevGermanyEntry]);

  const handleFrontmatterChange =
    (field: keyof Frontmatter) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = event.target.type === 'checkbox'
        ? (event.target as HTMLInputElement).checked
        : event.target.value;
      setFrontmatter((prev) => ({
        ...prev,
        [field]: value,
      }));
    };

  const handleArrayFieldChange =
    (field: 'categories' | 'tags' | 'zielgruppe' | 'Keywords' | 'authorSameAs') =>
      (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFrontmatter((prev) => ({
          ...prev,
          [field]: inputToList(event.target.value),
        }));
      };

  const updateFaqEntry = (index: number, patch: Partial<FaqEntry>) => {
    setFrontmatter((prev) => {
      const copy = [...prev.faq];
      copy[index] = { ...copy[index], ...patch };
      return { ...prev, faq: copy };
    });
  };

  const addFaqEntry = () => {
    setFrontmatter((prev) => ({
      ...prev,
      faq: [...prev.faq, { question: '', answer: '' }],
    }));
  };

  const removeFaqEntry = (index: number) => {
    setFrontmatter((prev) => ({
      ...prev,
      faq: prev.faq.filter((_, idx) => idx !== index),
    }));
  };

  const addShortcode = (type: Shortcode['type']) => {
    setShortcodes((prev) => [...prev, createDefaultShortcode(type)]);
  };

  const updateShortcode = (index: number, nextValue: Shortcode) => {
    setShortcodes((prev) => prev.map((item, idx) => (idx === index ? nextValue : item)));
  };

  const removeShortcode = (index: number) => {
    setShortcodes((prev) => prev.filter((_, idx) => idx !== index));
  };

  const insertShortcodeIntoBody = (shortcode: Shortcode) => {
    const template = formatShortcode(shortcode);
    setBody((prev) => (prev ? `${prev.trim()}\n\n${template}\n` : `${template}\n`));
  };

  const handleDownload = () => {
    const filename = `${sanitizeFileName(frontmatter.slug)}.md`;
    const blob = new Blob([markdownPreview], { type: 'text/markdown' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdownPreview);
      alert('Markdown kopiert.');
    } catch (error) {
      console.error('Kopieren fehlgeschlagen', error);
      alert('Konnte nicht kopieren. Bitte manuell kopieren.');
    }
  };

  const handleMonthlyField =
    <K extends keyof MonthlyEntry>(field: K) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setMonthlyEntry((prev) => ({
        ...prev,
        [field]: value,
      }));
    };

  const handleMonthlyNumbers =
    (
      bucket:
        | 'itAggregate'
        | 'itJobs'
        | 'germany'
        | 'infraAggregate'
        | 'infraJobs'
        | 'softwareAggregate'
        | 'softwareJobs',
      key: keyof MonthlyCategoryNumbers,
    ) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const digitsOnly = event.target.value.replace(/\D/g, '');
      const numeric = digitsOnly.length > 0 ? Number(digitsOnly) : undefined;
      setMonthlyEntry((prev) => ({
        ...prev,
        [bucket]: {
          ...prev[bucket],
          [key]: numeric,
        },
      }));
    };

  const handlePrevGermanyField =
    (field: 'month' | 'label') =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setPrevGermanyEntry((prev) => ({
        ...prev,
        [field]: value,
      }));
    };

  const handlePrevGermanyNumbers =
    (field: 'unemployed' | 'seeking' | 'jobs') =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const digitsOnly = event.target.value.replace(/\D/g, '');
      const numeric = digitsOnly.length > 0 ? Number(digitsOnly) : undefined;
      setPrevGermanyEntry((prev) => ({
        ...prev,
        [field]: numeric,
      }));
    };

  const monthlySnippet = useMemo(
    () => serializeMonthlyEntry(monthlyEntry),
    [monthlyEntry],
  );

  const currentFrontmatterTemplate = writerFrontmatterDefaults[mode];
  const currentBodyTemplate = writerBodyDefaults[mode];

  const FieldBadge = ({ isDefault }: { isDefault: boolean }) => (
    <span className={`text-xs font-semibold ${isDefault ? 'text-muted-foreground' : 'text-emerald-600'}`}>
      {isDefault ? 'Standard' : 'Neu'}
    </span>
  );

  const renderLabel = (text: string, isDefault: boolean) => (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium">{text}</span>
      <FieldBadge isDefault={isDefault} />
    </div>
  );

  const isFrontmatterFieldDefault = (field: keyof Frontmatter) => {
    const initial = currentFrontmatterTemplate[field];
    const current = frontmatter[field];
    if (Array.isArray(initial) && Array.isArray(current)) {
      return JSON.stringify(initial) === JSON.stringify(current);
    }
    if (typeof initial === 'object' && initial !== null) {
      return JSON.stringify(initial) === JSON.stringify(current);
    }
    return initial === current;
  };

  const isFrontmatterOverallDefault = useMemo(
    () => JSON.stringify(frontmatter) === JSON.stringify(currentFrontmatterTemplate),
    [frontmatter, currentFrontmatterTemplate],
  );
  const isBodyDefault = useMemo(
    () => body.trim() === currentBodyTemplate.trim(),
    [body, currentBodyTemplate],
  );
  const areShortcodesDefault = useMemo(
    () => shortcodes.length === 0,
    [shortcodes],
  );
  const areMonthlyDefault = useMemo(
    () => JSON.stringify(monthlyEntry) === JSON.stringify(monthlyDefaultsPreset),
    [monthlyEntry],
  );

  const isMonthlyTextDefault = (field: 'month' | 'label') =>
    monthlyEntry[field] === monthlyDefaultsPreset[field];

  const isMonthlyNumberDefault = (
    bucket:
      | 'itAggregate'
      | 'itJobs'
      | 'germany'
      | 'infraAggregate'
      | 'infraJobs'
      | 'softwareAggregate'
      | 'softwareJobs',
    key: keyof MonthlyCategoryNumbers | 'it_jobs',
  ) => {
    const baseBucket = monthlyDefaultsPreset[bucket] as MonthlyCategoryNumbers & { it_jobs?: number };
    const currentBucket = monthlyEntry[bucket] as MonthlyCategoryNumbers & { it_jobs?: number };
    return (currentBucket[key] ?? null) === (baseBucket[key] ?? null);
  };

  const isPrevGermanyDefault = (field: keyof PrevGermanyEntry) =>
    (prevGermanyEntry[field] ?? null) === (prevGermanyDefaultsPreset[field] ?? null);

  return (
    <main className="mx-auto max-w-6xl space-y-10 px-4 py-10">
      <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-sm uppercase tracking-wider text-muted-foreground">Writer auswählen</p>
            <h2 className="text-2xl font-semibold text-foreground">Was möchtest du schreiben?</h2>
            <p className="text-sm text-muted-foreground">{writerModeConfig[mode].description}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {(Object.keys(writerModeConfig) as WriterMode[]).map((option) => {
              const isActive = option === mode;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setMode(option)}
                  aria-pressed={isActive}
                  className={`rounded-md border px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? 'border-primary bg-primary text-primary-foreground shadow'
                      : 'border-input bg-background text-foreground hover:border-primary/60'
                  }`}
                >
                  {writerModeConfig[option].label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <header className="space-y-4">
        <div>
          <p className="text-sm uppercase tracking-wider text-muted-foreground">Sprint 01</p>
          <h1 className="text-3xl font-semibold text-foreground">
            Blogposter – Formulareingabe ({writerModeConfig[mode].label})
          </h1>
          <p className="text-base text-muted-foreground">
            Metadaten, Body-Text, FAQ und Shortcodes auf einen Blick. Alles wird geprüft und lokal gespeichert.
          </p>
        </div>
        <ul className="flex flex-wrap gap-6 text-sm">
          <li className={isFrontmatterOverallDefault ? 'text-muted-foreground' : 'text-emerald-700'}>
            {isFrontmatterOverallDefault ? '⚠️ Metadaten noch Beispiel' : '✅ Metadaten angepasst'}
          </li>
          <li className={isBodyDefault ? 'text-muted-foreground' : 'text-emerald-700'}>
            {isBodyDefault ? '⚠️ Body noch Beispiel' : '✅ Body angepasst'}
          </li>
          <li className={areShortcodesDefault ? 'text-muted-foreground' : 'text-emerald-700'}>
            {areShortcodesDefault ? '⚠️ Shortcodes noch Beispiel' : '✅ Shortcodes angepasst'}
          </li>
          {mode === 'it-market' && (
            <li className={areMonthlyDefault ? 'text-muted-foreground' : 'text-emerald-700'}>
              {areMonthlyDefault ? '⚠️ Monatsdaten noch Beispiel' : '✅ Monatsdaten angepasst'}
            </li>
          )}
        </ul>
      </header>

      <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">Metadaten</h2>
          <FieldBadge isDefault={isFrontmatterOverallDefault} />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            {renderLabel('Titel', isFrontmatterFieldDefault('title'))}
            <input
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={frontmatter.title}
              onChange={handleFrontmatterChange('title')}
              placeholder="IT-Arbeitsmarkt November 2025"
            />
            {frontmatterFieldErrors.title && <p className="text-sm text-destructive">{frontmatterFieldErrors.title[0]}</p>}
          </div>
          <div className="flex flex-col gap-1">
            {renderLabel('Slug', isFrontmatterFieldDefault('slug'))}
            <input
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={frontmatter.slug}
              onChange={handleFrontmatterChange('slug')}
              placeholder="/it-arbeitsmarkt-november-2025"
            />
            {frontmatterFieldErrors.slug && <p className="text-sm text-destructive">{frontmatterFieldErrors.slug[0]}</p>}
          </div>
        </div>

        <div className="mt-4 grid gap-4">
          <div className="flex flex-col gap-1">
            {renderLabel('Beschreibung', isFrontmatterFieldDefault('description'))}
            <textarea
              className="min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={frontmatter.description}
              onChange={handleFrontmatterChange('description')}
            />
            {frontmatterFieldErrors.description && <p className="text-sm text-destructive">{frontmatterFieldErrors.description[0]}</p>}
          </div>
          <div className="flex flex-col gap-1">
            {renderLabel('Summary', isFrontmatterFieldDefault('summary'))}
            <textarea
              className="min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={frontmatter.summary}
              onChange={handleFrontmatterChange('summary')}
            />
            {frontmatterFieldErrors.summary && <p className="text-sm text-destructive">{frontmatterFieldErrors.summary[0]}</p>}
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            {renderLabel('Datum (ISO)', isFrontmatterFieldDefault('date'))}
            <input
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={frontmatter.date}
              onChange={handleFrontmatterChange('date')}
              placeholder="2025-12-02T09:00:00+02:00"
            />
            {frontmatterFieldErrors.date && <p className="text-sm text-destructive">{frontmatterFieldErrors.date[0]}</p>}
          </div>
          <div className="flex flex-col gap-1">
            {renderLabel('Autor', isFrontmatterFieldDefault('author'))}
            <input
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={frontmatter.author}
              onChange={handleFrontmatterChange('author')}
            />
            {frontmatterFieldErrors.author && <p className="text-sm text-destructive">{frontmatterFieldErrors.author[0]}</p>}
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            {renderLabel('Bildpfad', isFrontmatterFieldDefault('image'))}
            <input
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={frontmatter.image}
              onChange={handleFrontmatterChange('image')}
              placeholder="/Bilder/..."
            />
            {frontmatterFieldErrors.image && <p className="text-sm text-destructive">{frontmatterFieldErrors.image[0]}</p>}
          </div>
          <div className="flex flex-col gap-1">
            {renderLabel('Bild Alt-Text', isFrontmatterFieldDefault('imageAlt'))}
            <input
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={frontmatter.imageAlt}
              onChange={handleFrontmatterChange('imageAlt')}
            />
            {frontmatterFieldErrors.imageAlt && <p className="text-sm text-destructive">{frontmatterFieldErrors.imageAlt[0]}</p>}
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            {renderLabel('Draft aktivieren', isFrontmatterFieldDefault('draft'))}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="rounded border border-input" checked={frontmatter.draft} onChange={handleFrontmatterChange('draft')} />
              <span>Aktiv</span>
            </label>
          </div>
          <div className="flex flex-col gap-1">
            {renderLabel('jobSnippedTag', isFrontmatterFieldDefault('jobSnippedTag'))}
            <input
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={frontmatter.jobSnippedTag}
              onChange={handleFrontmatterChange('jobSnippedTag')}
            />
            {frontmatterFieldErrors.jobSnippedTag && <p className="text-sm text-destructive">{frontmatterFieldErrors.jobSnippedTag[0]}</p>}
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            {renderLabel('Lesedauer', isFrontmatterFieldDefault('lesedauer'))}
            <input
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={frontmatter.lesedauer}
              onChange={handleFrontmatterChange('lesedauer')}
            />
            {frontmatterFieldErrors.lesedauer && <p className="text-sm text-destructive">{frontmatterFieldErrors.lesedauer[0]}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Dateiname (aus Slug)</label>
            <input className="rounded-md border border-dashed bg-muted px-3 py-2 text-sm" value={`${sanitizeFileName(frontmatter.slug)}.md`} disabled />
          </div>
        </div>

        <div className="mt-6 border-t border-border pt-6">
          <div>
            <h3 className="text-lg font-semibold">Google Discover (Schema.org)</h3>
            <p className="text-sm text-muted-foreground">
              Diese Felder helfen, die Artikel automatisch als Article/BlogPosting zu kennzeichnen.
            </p>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              {renderLabel('dateModified (Google Discover)', isFrontmatterFieldDefault('dateModified'))}
              <input
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={frontmatter.dateModified}
                onChange={handleFrontmatterChange('dateModified')}
                placeholder="2025-12-02T12:30:00+01:00"
              />
              {frontmatterFieldErrors.dateModified && <p className="text-sm text-destructive">{frontmatterFieldErrors.dateModified[0]}</p>}
            </div>
            <div className="flex flex-col gap-1">
              {renderLabel('timeRequired (Google Discover)', isFrontmatterFieldDefault('timeRequired'))}
              <input
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={frontmatter.timeRequired}
                onChange={handleFrontmatterChange('timeRequired')}
                placeholder="PT6M"
              />
              {frontmatterFieldErrors.timeRequired && <p className="text-sm text-destructive">{frontmatterFieldErrors.timeRequired[0]}</p>}
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              {renderLabel('inLanguage (Google Discover)', isFrontmatterFieldDefault('inLanguage'))}
              <select
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={frontmatter.inLanguage}
                onChange={handleFrontmatterChange('inLanguage')}
              >
                <option value="">Bitte wählen</option>
                {DISCOVER_OPTIONS.languages.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {frontmatterFieldErrors.inLanguage && <p className="text-sm text-destructive">{frontmatterFieldErrors.inLanguage[0]}</p>}
            </div>
            <div className="flex flex-col gap-1">
              {renderLabel('Canonical Base URL (Google Discover)', isFrontmatterFieldDefault('canonicalBaseUrl'))}
              <select
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={frontmatter.canonicalBaseUrl}
                onChange={handleFrontmatterChange('canonicalBaseUrl')}
              >
                <option value="">Bitte wählen</option>
                {DISCOVER_OPTIONS.canonicalBaseUrls.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {frontmatterFieldErrors.canonicalBaseUrl && <p className="text-sm text-destructive">{frontmatterFieldErrors.canonicalBaseUrl[0]}</p>}
            </div>
          </div>

          <div className="mt-4 grid gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">mainEntityOfPage (aus Canonical + Slug)</label>
              <input className="rounded-md border border-dashed bg-muted px-3 py-2 text-sm" value={mainEntityOfPage} disabled />
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              {renderLabel('Author URL (Google Discover)', isFrontmatterFieldDefault('authorUrl'))}
              <input
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={frontmatter.authorUrl}
                onChange={handleFrontmatterChange('authorUrl')}
                placeholder="https://dietechrecruiter.de/autor/..."
              />
              {frontmatterFieldErrors.authorUrl && <p className="text-sm text-destructive">{frontmatterFieldErrors.authorUrl[0]}</p>}
            </div>
            <div className="flex flex-col gap-1">
              {renderLabel('Author Job Title (Google Discover)', isFrontmatterFieldDefault('authorJobTitle'))}
              <input
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={frontmatter.authorJobTitle}
                onChange={handleFrontmatterChange('authorJobTitle')}
                placeholder="Geschäftsführer & IT-Personalberater"
              />
              {frontmatterFieldErrors.authorJobTitle && <p className="text-sm text-destructive">{frontmatterFieldErrors.authorJobTitle[0]}</p>}
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              {renderLabel('Author WorksFor (Google Discover)', isFrontmatterFieldDefault('authorWorksFor'))}
              <input
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={frontmatter.authorWorksFor}
                onChange={handleFrontmatterChange('authorWorksFor')}
                placeholder="Die Tech Recruiter GmbH"
              />
              {frontmatterFieldErrors.authorWorksFor && <p className="text-sm text-destructive">{frontmatterFieldErrors.authorWorksFor[0]}</p>}
            </div>
            <div className="flex flex-col gap-1">
              {renderLabel('Author SameAs (Google Discover, kommagetrennt)', isFrontmatterFieldDefault('authorSameAs'))}
              <input
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={listToInput(frontmatter.authorSameAs)}
                onChange={handleArrayFieldChange('authorSameAs')}
                placeholder="https://www.linkedin.com/in/..."
              />
              {frontmatterFieldErrors.authorSameAs && <p className="text-sm text-destructive">{frontmatterFieldErrors.authorSameAs[0]}</p>}
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              {renderLabel('Publisher Name (Google Discover)', isFrontmatterFieldDefault('publisherName'))}
              <select
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={frontmatter.publisherName}
                onChange={handleFrontmatterChange('publisherName')}
              >
                <option value="">Bitte wählen</option>
                {DISCOVER_OPTIONS.publisherNames.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {frontmatterFieldErrors.publisherName && <p className="text-sm text-destructive">{frontmatterFieldErrors.publisherName[0]}</p>}
            </div>
            <div className="flex flex-col gap-1">
              {renderLabel('Publisher URL (Google Discover)', isFrontmatterFieldDefault('publisherUrl'))}
              <select
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={frontmatter.publisherUrl}
                onChange={handleFrontmatterChange('publisherUrl')}
              >
                <option value="">Bitte wählen</option>
                {DISCOVER_OPTIONS.publisherUrls.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {frontmatterFieldErrors.publisherUrl && <p className="text-sm text-destructive">{frontmatterFieldErrors.publisherUrl[0]}</p>}
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              {renderLabel('Publisher Logo URL (Google Discover)', isFrontmatterFieldDefault('publisherLogoUrl'))}
              <select
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={frontmatter.publisherLogoUrl}
                onChange={handleFrontmatterChange('publisherLogoUrl')}
              >
                <option value="">Bitte wählen</option>
                {DISCOVER_OPTIONS.publisherLogoUrls.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {frontmatterFieldErrors.publisherLogoUrl && <p className="text-sm text-destructive">{frontmatterFieldErrors.publisherLogoUrl[0]}</p>}
            </div>
            <div className="flex flex-col gap-1">
              {renderLabel('Publisher Logo Breite (Google Discover)', isFrontmatterFieldDefault('publisherLogoWidth'))}
              <input
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                inputMode="numeric"
                value={frontmatter.publisherLogoWidth}
                onChange={handleFrontmatterChange('publisherLogoWidth')}
                placeholder="512"
              />
              {frontmatterFieldErrors.publisherLogoWidth && <p className="text-sm text-destructive">{frontmatterFieldErrors.publisherLogoWidth[0]}</p>}
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              {renderLabel('Publisher Logo Höhe (Google Discover)', isFrontmatterFieldDefault('publisherLogoHeight'))}
              <input
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                inputMode="numeric"
                value={frontmatter.publisherLogoHeight}
                onChange={handleFrontmatterChange('publisherLogoHeight')}
                placeholder="512"
              />
              {frontmatterFieldErrors.publisherLogoHeight && <p className="text-sm text-destructive">{frontmatterFieldErrors.publisherLogoHeight[0]}</p>}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {(['categories', 'tags', 'zielgruppe', 'Keywords'] as const).map((field) => (
            <div key={field} className="flex flex-col gap-1">
              {renderLabel(
                `${field === 'Keywords' ? 'Keywords' : field.charAt(0).toUpperCase() + field.slice(1)} (kommagetrennt)`,
                isFrontmatterFieldDefault(field),
              )}
              <input
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={listToInput(frontmatter[field])}
                onChange={handleArrayFieldChange(field)}
              />
              {frontmatterFieldErrors[field] && <p className="text-sm text-destructive">{frontmatterFieldErrors[field]?.[0]}</p>}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Body (Markdown inkl. Shortcodes)</h2>
            <p className="text-sm text-muted-foreground">Hier entsteht der Artikeltext. Shortcodes lassen sich unten per Klick einfügen.</p>
          </div>
          <FieldBadge isDefault={isBodyDefault} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            className="rounded-md border border-input px-3 py-2 text-sm"
            type="button"
            onClick={() => setBody((prev) => formatBodyWithSpaces(prev))}
          >
            {'Body formatieren ({{< space >}})'}
          </button>
        </div>
        <textarea
          className="mt-4 min-h-[280px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Gliederung, Text und Shortcodes einfügen..."
        />
      </section>

      <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">FAQ</h2>
            <p className="text-sm text-muted-foreground">Fragen & Antworten ergänzen.</p>
          </div>
          <button className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground" type="button" onClick={addFaqEntry}>
            Frage hinzufügen
          </button>
        </div>
        <div className="mt-4 space-y-4">
          {frontmatter.faq.length === 0 && <p className="text-sm text-muted-foreground">Noch keine Fragen vorhanden.</p>}
          {frontmatter.faq.map((entry, index) => {
            const questionError = entry.question.trim().length === 0 ? 'Bitte Frage ergänzen.' : undefined;
            const answerError = entry.answer.trim().length === 0 ? 'Bitte Antwort ergänzen.' : undefined;
            return (
              <div key={index} className="rounded-md border border-dashed border-border p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">FAQ #{index + 1}</p>
                  <button className="text-sm text-destructive hover:underline" type="button" onClick={() => removeFaqEntry(index)}>
                    Entfernen
                  </button>
                </div>
                <div className="mt-3 grid gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Frage</label>
                    <input className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={entry.question} onChange={(event) => updateFaqEntry(index, { question: event.target.value })} />
                    {questionError && <p className="text-sm text-destructive">{questionError}</p>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Antwort</label>
                    <textarea className="min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm" value={entry.answer} onChange={(event) => updateFaqEntry(index, { answer: event.target.value })} />
                    {answerError && <p className="text-sm text-destructive">{answerError}</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Shortcodes</h2>
            <p className="text-sm text-muted-foreground">Space, Charts und Tabellen konfigurieren – per Klick in den Body übernehmen.</p>
          </div>
          <FieldBadge isDefault={areShortcodesDefault} />
          <div className="flex flex-wrap gap-2">
            <button className="rounded-md border border-input px-3 py-2 text-sm" type="button" onClick={() => addShortcode('space')}>
              Space
            </button>
            <button className="rounded-md border border-input px-3 py-2 text-sm" type="button" onClick={() => addShortcode('chart_itmarket_all')}>
              Chart
            </button>
            <button className="rounded-md border border-input px-3 py-2 text-sm" type="button" onClick={() => addShortcode('itmarket_table')}>
              Tabelle
            </button>
          </div>
        </div>
        <div className="mt-4 space-y-4">
          {shortcodes.length === 0 && <p className="text-sm text-muted-foreground">Noch keine Shortcodes hinzugefügt.</p>}
          {shortcodes.map((shortcode, index) => {
            const validation = shortcodesValidation[index];
            const shortcodeText = formatShortcode(shortcode);
            return (
              <div key={index} className="space-y-3 rounded-md border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium" htmlFor={`shortcode-type-${index}`}>
                      Typ
                    </label>
                    <select
                      id={`shortcode-type-${index}`}
                      className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={shortcode.type}
                      onChange={(event) => updateShortcode(index, createDefaultShortcode(event.target.value as Shortcode['type']))}
                    >
                      <option value="space">space</option>
                      <option value="chart_itmarket_all">chart_itmarket_all</option>
                      <option value="itmarket_table">itmarket_table</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button className="text-sm text-muted-foreground hover:underline" type="button" onClick={() => insertShortcodeIntoBody(shortcode)}>
                      In Body einfügen
                    </button>
                    <button className="text-sm text-destructive hover:underline" type="button" onClick={() => removeShortcode(index)}>
                      Entfernen
                    </button>
                  </div>
                </div>

                {shortcode.type === 'chart_itmarket_all' && (
                  <div className="grid gap-3 md:grid-cols-2">
                    {[
                      { label: 'Von (YYYY-MM)', field: 'from' },
                      { label: 'Bis (YYYY-MM)', field: 'to' },
                    ].map(({ label, field }) => (
                      <div key={field} className="flex flex-col gap-1">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">{label}</label>
                        <input
                          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={shortcode[field as 'from' | 'to']}
                          onChange={(event) => updateShortcode(index, { ...shortcode, [field]: event.target.value })}
                        />
                      </div>
                    ))}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold uppercase text-muted-foreground">Breite (px)</label>
                      <input
                        type="number"
                        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={shortcode.width}
                        onChange={(event) => updateShortcode(index, { ...shortcode, width: Number(event.target.value) })}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold uppercase text-muted-foreground">Höhe (px)</label>
                      <input
                        type="number"
                        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={shortcode.height}
                        onChange={(event) => updateShortcode(index, { ...shortcode, height: Number(event.target.value) })}
                      />
                    </div>
                    <div className="md:col-span-2 flex flex-col gap-1">
                      <label className="text-xs font-semibold uppercase text-muted-foreground">Titel</label>
                      <input
                        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={shortcode.title}
                        onChange={(event) => updateShortcode(index, { ...shortcode, title: event.target.value })}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold uppercase text-muted-foreground">aggKey</label>
                      <input
                        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={shortcode.aggKey ?? ''}
                        onChange={(event) => updateShortcode(index, { ...shortcode, aggKey: event.target.value || undefined })}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold uppercase text-muted-foreground">jobsKey</label>
                      <input
                        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={shortcode.jobsKey ?? ''}
                        onChange={(event) => updateShortcode(index, { ...shortcode, jobsKey: event.target.value || undefined })}
                      />
                    </div>
                  </div>
                )}

                {shortcode.type === 'itmarket_table' && (
                  <div className="space-y-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold uppercase text-muted-foreground">Modus</label>
                      <select
                        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={shortcode.mode}
                        onChange={(event) => {
                          const mode = event.target.value as 'range' | 'single';
                          if (mode === 'single') {
                            updateShortcode(index, {
                              type: 'itmarket_table',
                              mode: 'single',
                              tableType: 'compare',
                              month: shortcode.mode === 'single' ? shortcode.month : '2025-11',
                            });
                          } else {
                            updateShortcode(index, {
                              type: 'itmarket_table',
                              mode: 'range',
                              tableType: shortcode.mode === 'range' ? shortcode.tableType : 'it_aggregate',
                              from: shortcode.mode === 'range' ? shortcode.from : '2024-04',
                              to: shortcode.mode === 'range' ? shortcode.to : '2025-11',
                            });
                          }
                        }}
                      >
                        <option value="range">Bereich</option>
                        <option value="single">Single (compare)</option>
                      </select>
                    </div>
                    {shortcode.mode === 'range' ? (
                      <>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-semibold uppercase text-muted-foreground">Tabelle</label>
                          <select
                            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={shortcode.tableType}
                            onChange={(event) => updateShortcode(index, { ...shortcode, tableType: event.target.value as typeof shortcode.tableType })}
                          >
                            <option value="it_aggregate">it_aggregate</option>
                            <option value="it_jobs">it_jobs</option>
                            <option value="infra_aggregate">infra_aggregate</option>
                            <option value="infra_jobs">infra_jobs</option>
                            <option value="software_aggregate">software_aggregate</option>
                            <option value="software_jobs">software_jobs</option>
                          </select>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          {['from', 'to'].map((field) => (
                            <div key={field} className="flex flex-col gap-1">
                              <label className="text-xs font-semibold uppercase text-muted-foreground">{field === 'from' ? 'Von' : 'Bis'} (YYYY-MM)</label>
                              <input
                                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={shortcode[field as 'from' | 'to']}
                                onChange={(event) => updateShortcode(index, { ...shortcode, [field]: event.target.value })}
                              />
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">Monat (YYYY-MM)</label>
                        <input
                          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={shortcode.month}
                          onChange={(event) => updateShortcode(index, { ...shortcode, month: event.target.value })}
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className="rounded-md bg-muted px-3 py-2 text-sm font-mono">
                  {shortcodeText}
                </div>

                {!validation.success && (
                  <p className="text-sm text-destructive">
                    Bitte Felder prüfen – {validation.error.issues[0]?.message}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {mode === 'it-market' && (
        <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Monthly TOML Vorschau</h2>
          <p className="text-sm text-muted-foreground">Nur Lesen – Daten stammen aus docs/monthly.toml.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-md border border-border bg-background p-4">
              <p className="text-sm font-semibold">Letzter IT-Aggregat Monat</p>
              {latestAggregate ? (
                <ul className="mt-2 text-sm text-muted-foreground">
                  <li>Monat: {latestAggregate.label}</li>
                  <li>Arbeitslos: {latestAggregate.unemployed.toLocaleString('de-DE')}</li>
                  <li>Suchend: {latestAggregate.seeking.toLocaleString('de-DE')}</li>
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Keine Daten</p>
              )}
            </div>
            <div className="rounded-md border border-border bg-background p-4">
              <p className="text-sm font-semibold">Letzte IT-Jobs</p>
              {latestJobs ? (
                <ul className="mt-2 text-sm text-muted-foreground">
                  <li>Monat: {latestJobs.label}</li>
                  <li>Neue IT-Jobs: {latestJobs.it_jobs.toLocaleString('de-DE')}</li>
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Keine Daten</p>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Preview & Export</h2>
            <p className="text-sm text-muted-foreground">Frontmatter + Body prüfen, dann kopieren oder herunterladen.</p>
          </div>
          <div className="flex gap-2">
            <button className="rounded-md border border-input px-3 py-2 text-sm" type="button" onClick={handleCopy} disabled={!canExport}>
              Kopieren
            </button>
            <button className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50" type="button" onClick={handleDownload} disabled={!canExport}>
              Download (.md)
            </button>
          </div>
        </div>
        {!canExport && (
          <p className="mt-2 text-sm text-destructive">Export erst möglich, wenn Metadaten + Shortcodes gültig sind.</p>
        )}
        <iframe
          className="mt-4 h-[720px] w-full rounded-md border border-border bg-background"
          srcDoc={previewHtml || '<p>Noch kein Inhalt.</p>'}
          title="Blog Preview"
        />
      </section>

      {mode === 'it-market' && (
        <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Monatsdaten (TOML)</h2>
            <p className="text-sm text-muted-foreground">
              Monat eintragen, Zahlen ergänzen, dann in monatly.toml übernehmen.
            </p>
          </div>
          <FieldBadge isDefault={areMonthlyDefault} />
          <div className="flex gap-2">
            <button
              className="rounded-md border border-input px-3 py-2 text-sm"
              type="button"
              onClick={() => navigator.clipboard.writeText(monthlySnippet)}
            >
              TOML kopieren
            </button>
            <button
              className="rounded-md border border-input px-3 py-2 text-sm"
              type="button"
              onClick={connectRepo}
            >
              Repo verbinden
            </button>
            <button
              className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
              type="button"
              onClick={handleSaveMonthlyToml}
            >
              monthly.toml speichern
            </button>
          </div>
        </div>
        {repoMessage && (
          <p className="mt-2 text-sm text-muted-foreground">
            {repoMessage}
          </p>
        )}
        <div className="mt-4 rounded-md border border-dashed border-border p-4">
          <h3 className="text-sm font-semibold">Chart-Shortcodes (Copy)</h3>
          <p className="text-sm text-muted-foreground">
            Zeitraum automatisch bis zum aktuellen Monat.
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div className="rounded-md border border-border bg-background p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">IT Arbeitsmarkt gesamt</p>
                <button
                  className="rounded-md border border-input px-2 py-1 text-xs"
                  type="button"
                  onClick={() => navigator.clipboard.writeText(chartShortcodes.overall)}
                >
                  Copy
                </button>
              </div>
              <pre className="mt-2 whitespace-pre-wrap text-xs">{chartShortcodes.overall}</pre>
            </div>
            <div className="rounded-md border border-border bg-background p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">IT Infrastruktur</p>
                <button
                  className="rounded-md border border-input px-2 py-1 text-xs"
                  type="button"
                  onClick={() => navigator.clipboard.writeText(chartShortcodes.infra)}
                >
                  Copy
                </button>
              </div>
              <pre className="mt-2 whitespace-pre-wrap text-xs">{chartShortcodes.infra}</pre>
            </div>
            <div className="rounded-md border border-border bg-background p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Softwareentwicklung</p>
                <button
                  className="rounded-md border border-input px-2 py-1 text-xs"
                  type="button"
                  onClick={() => navigator.clipboard.writeText(chartShortcodes.software)}
                >
                  Copy
                </button>
              </div>
              <pre className="mt-2 whitespace-pre-wrap text-xs">{chartShortcodes.software}</pre>
            </div>
          </div>
        </div>
        <div className="mt-4 rounded-md border border-dashed border-border p-4">
          <h3 className="text-sm font-semibold">12-Monats-Vergleich (Copy)</h3>
          <p className="text-sm text-muted-foreground">
            Daten aus aktuellem Monat und dem gleichen Monat im Vorjahr.
          </p>
          <div className="mt-3 rounded-md border border-border bg-background p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Tabelle: IT vs. Deutschland</p>
              <button
                className="rounded-md border border-input px-2 py-1 text-xs"
                type="button"
                onClick={() => navigator.clipboard.writeText(comparisonTableSnippet)}
                disabled={!comparisonTableSnippet}
              >
                Copy
              </button>
            </div>
            <pre className="mt-2 whitespace-pre-wrap text-xs">
              {comparisonTableSnippet || 'Kein Vorjahresmonat gefunden.'}
            </pre>
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            {renderLabel('Monat (YYYY-MM)', isMonthlyTextDefault('month'))}
            <input
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={monthlyEntry.month}
              onChange={handleMonthlyField('month')}
            />
          </div>
          <div className="flex flex-col gap-1">
            {renderLabel('Label (z. B. Dezember 2025)', isMonthlyTextDefault('label'))}
            <input
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={monthlyEntry.label}
              onChange={handleMonthlyField('label')}
            />
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-md border border-dashed border-border p-4">
            <h3 className="text-sm font-semibold">IT Aggregate</h3>
            <div className="mt-2 grid gap-2">
              {renderLabel('Arbeitslos', isMonthlyNumberDefault('itAggregate', 'unemployed'))}
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={monthlyEntry.itAggregate.unemployed ?? ''}
                onChange={handleMonthlyNumbers('itAggregate', 'unemployed')}
              />
              {renderLabel('Suchend', isMonthlyNumberDefault('itAggregate', 'seeking'))}
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={monthlyEntry.itAggregate.seeking ?? ''}
                onChange={handleMonthlyNumbers('itAggregate', 'seeking')}
              />
            </div>
          </div>
          <div className="rounded-md border border-dashed border-border p-4">
            <h3 className="text-sm font-semibold">IT Jobs (gesamt)</h3>
            {renderLabel('Neue IT Jobs', isMonthlyNumberDefault('itJobs', 'it_jobs'))}
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={monthlyEntry.itJobs.it_jobs ?? ''}
              onChange={handleMonthlyNumbers('itJobs', 'it_jobs')}
            />
          </div>
          <div className="rounded-md border border-dashed border-border p-4">
            <h3 className="text-sm font-semibold">Deutschland gesamt</h3>
            {(['unemployed', 'seeking', 'jobs'] as const).map((field) => (
              <div key={field} className="mt-2">
                {renderLabel(
                  field === 'unemployed'
                    ? 'Arbeitslose'
                    : field === 'seeking'
                    ? 'Suchend'
                    : 'Jobs',
                  isMonthlyNumberDefault('germany', field),
                )}
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={monthlyEntry.germany[field] ?? ''}
                  onChange={handleMonthlyNumbers('germany', field)}
                />
              </div>
            ))}
          </div>
          <div className="rounded-md border border-dashed border-border p-4">
            <h3 className="text-sm font-semibold">IT Infrastruktur</h3>
            {renderLabel('Arbeitslos', isMonthlyNumberDefault('infraAggregate', 'unemployed'))}
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={monthlyEntry.infraAggregate.unemployed ?? ''}
              onChange={handleMonthlyNumbers('infraAggregate', 'unemployed')}
            />
            {renderLabel('Suchend', isMonthlyNumberDefault('infraAggregate', 'seeking'))}
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={monthlyEntry.infraAggregate.seeking ?? ''}
              onChange={handleMonthlyNumbers('infraAggregate', 'seeking')}
            />
            {renderLabel('Neue Jobs', isMonthlyNumberDefault('infraJobs', 'it_jobs'))}
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={monthlyEntry.infraJobs.it_jobs ?? ''}
              onChange={handleMonthlyNumbers('infraJobs', 'it_jobs')}
            />
          </div>
          <div className="rounded-md border border-dashed border-border p-4">
            <h3 className="text-sm font-semibold">Softwareentwicklung</h3>
            {renderLabel('Arbeitslos', isMonthlyNumberDefault('softwareAggregate', 'unemployed'))}
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={monthlyEntry.softwareAggregate.unemployed ?? ''}
              onChange={handleMonthlyNumbers('softwareAggregate', 'unemployed')}
            />
            {renderLabel('Suchend', isMonthlyNumberDefault('softwareAggregate', 'seeking'))}
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={monthlyEntry.softwareAggregate.seeking ?? ''}
              onChange={handleMonthlyNumbers('softwareAggregate', 'seeking')}
            />
            {renderLabel('Neue Jobs', isMonthlyNumberDefault('softwareJobs', 'it_jobs'))}
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={monthlyEntry.softwareJobs.it_jobs ?? ''}
              onChange={handleMonthlyNumbers('softwareJobs', 'it_jobs')}
            />
          </div>
        </div>
        <div className="mt-6 rounded-md border border-dashed border-border p-4">
          <h3 className="text-sm font-semibold">Deutschland gesamt (Vorjahresmonat)</h3>
          <p className="text-sm text-muted-foreground">
            Nur bis Dezember 2026 nötig, danach ist der 12-Monats-Datensatz komplett.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              {renderLabel('Monat (YYYY-MM)', isPrevGermanyDefault('month'))}
              <input
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={prevGermanyEntry.month}
                onChange={handlePrevGermanyField('month')}
              />
            </div>
            <div className="flex flex-col gap-1">
              {renderLabel('Label (z. B. 12/24)', isPrevGermanyDefault('label'))}
              <input
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={prevGermanyEntry.label}
                onChange={handlePrevGermanyField('label')}
              />
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="flex flex-col gap-1">
              {renderLabel('Arbeitslose', isPrevGermanyDefault('unemployed'))}
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={prevGermanyEntry.unemployed ?? ''}
                onChange={handlePrevGermanyNumbers('unemployed')}
              />
            </div>
            <div className="flex flex-col gap-1">
              {renderLabel('Arbeitssuchende', isPrevGermanyDefault('seeking'))}
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={prevGermanyEntry.seeking ?? ''}
                onChange={handlePrevGermanyNumbers('seeking')}
              />
            </div>
            <div className="flex flex-col gap-1">
              {renderLabel('Jobs', isPrevGermanyDefault('jobs'))}
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={prevGermanyEntry.jobs ?? ''}
                onChange={handlePrevGermanyNumbers('jobs')}
              />
            </div>
          </div>
        </div>
        <pre className="mt-4 max-h-[320px] overflow-auto rounded-md border border-border bg-background p-4 text-sm">
          {monthlySnippet}
        </pre>
        </section>
      )}
    </main>
  );
}

export default App;
