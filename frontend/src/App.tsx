import type { ChangeEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import monthlyTomlSource from '../../docs/monthly.toml?raw';
import { serializeFrontmatter } from './lib/parsers/frontmatter';
import { parseMonthlyToml } from './lib/parsers/monthly';
import {
  defaultFrontmatter,
  frontmatterSchema,
  type FaqEntry,
  type Frontmatter,
} from './lib/schemas/frontmatter';
import type { Shortcode } from './lib/schemas/shortcodes';
import { shortcodeSchema } from './lib/schemas/shortcodes';

const FRONTMATTER_STORAGE_KEY = 'blogposter.frontmatter.v1';
const SHORTCODES_STORAGE_KEY = 'blogposter.shortcodes.v1';
const BODY_STORAGE_KEY = 'blogposter.body.v1';

const monthlyDataset = parseMonthlyToml(monthlyTomlSource);

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

const loadFrontmatterFromStorage = (): Frontmatter => {
  if (typeof window === 'undefined') return defaultFrontmatter();
  const raw = window.localStorage.getItem(FRONTMATTER_STORAGE_KEY);
  if (!raw) return defaultFrontmatter();
  try {
    const parsed = JSON.parse(raw);
    return frontmatterSchema.parse(parsed);
  } catch {
    return defaultFrontmatter();
  }
};

const loadShortcodesFromStorage = (): Shortcode[] => {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(SHORTCODES_STORAGE_KEY);
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

const loadBodyFromStorage = (): string => {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(BODY_STORAGE_KEY) ?? '';
};

const listToInput = (value: string[]) => value.join(', ');
const inputToList = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

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

const latestAggregate = monthlyDataset.it_aggregate.at(0);
const latestJobs = monthlyDataset.it_jobs.at(0);

function App() {
  const [frontmatter, setFrontmatter] = useState<Frontmatter>(loadFrontmatterFromStorage);
  const [shortcodes, setShortcodes] = useState<Shortcode[]>(loadShortcodesFromStorage);
  const [body, setBody] = useState<string>(loadBodyFromStorage);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(FRONTMATTER_STORAGE_KEY, JSON.stringify(frontmatter));
  }, [frontmatter]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SHORTCODES_STORAGE_KEY, JSON.stringify(shortcodes));
  }, [shortcodes]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(BODY_STORAGE_KEY, body);
  }, [body]);

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
  const canExport = frontmatterValidation.success && hasValidShortcodes;

  const handleFrontmatterChange =
    (field: keyof Frontmatter) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.type === 'checkbox'
        ? (event.target as HTMLInputElement).checked
        : event.target.value;
      setFrontmatter((prev) => ({
        ...prev,
        [field]: value,
      }));
    };

  const handleArrayFieldChange =
    (field: 'categories' | 'tags' | 'zielgruppe' | 'Keywords') =>
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

  return (
    <main className="mx-auto max-w-6xl space-y-10 px-4 py-10">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-wider text-muted-foreground">Sprint 01</p>
        <h1 className="text-3xl font-semibold text-foreground">Blogposter – Formulareingabe</h1>
        <p className="text-base text-muted-foreground">
          Metadaten, Body-Text, FAQ und Shortcodes auf einen Blick. Alles wird geprüft und lokal gespeichert.
        </p>
      </header>

      <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Metadaten</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Titel</label>
            <input
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={frontmatter.title}
              onChange={handleFrontmatterChange('title')}
              placeholder="IT-Arbeitsmarkt November 2025"
            />
            {frontmatterFieldErrors.title && <p className="text-sm text-destructive">{frontmatterFieldErrors.title[0]}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Slug</label>
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
            <label className="text-sm font-medium">Beschreibung</label>
            <textarea
              className="min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={frontmatter.description}
              onChange={handleFrontmatterChange('description')}
            />
            {frontmatterFieldErrors.description && <p className="text-sm text-destructive">{frontmatterFieldErrors.description[0]}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Summary</label>
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
            <label className="text-sm font-medium">Datum (ISO)</label>
            <input
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={frontmatter.date}
              onChange={handleFrontmatterChange('date')}
              placeholder="2025-12-02T09:00:00+02:00"
            />
            {frontmatterFieldErrors.date && <p className="text-sm text-destructive">{frontmatterFieldErrors.date[0]}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Autor</label>
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
            <label className="text-sm font-medium">Bildpfad</label>
            <input
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={frontmatter.image}
              onChange={handleFrontmatterChange('image')}
              placeholder="/Bilder/..."
            />
            {frontmatterFieldErrors.image && <p className="text-sm text-destructive">{frontmatterFieldErrors.image[0]}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Bild Alt-Text</label>
            <input
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={frontmatter.imageAlt}
              onChange={handleFrontmatterChange('imageAlt')}
            />
            {frontmatterFieldErrors.imageAlt && <p className="text-sm text-destructive">{frontmatterFieldErrors.imageAlt[0]}</p>}
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" className="rounded border border-input" checked={frontmatter.draft} onChange={handleFrontmatterChange('draft')} />
            Draft aktivieren
          </label>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">jobSnippedTag</label>
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
            <label className="text-sm font-medium">Lesedauer</label>
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

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {(['categories', 'tags', 'zielgruppe', 'Keywords'] as const).map((field) => (
            <div key={field} className="flex flex-col gap-1">
              <label className="text-sm font-medium">
                {field === 'Keywords' ? 'Keywords' : field.charAt(0).toUpperCase() + field.slice(1)} (kommagetrennt)
              </label>
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
          <span className="text-sm text-muted-foreground">{body.length} Zeichen</span>
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
        <pre className="mt-4 max-h-[420px] overflow-auto rounded-md border border-border bg-background p-4 text-sm">
          {markdownPreview || 'Noch kein Inhalt.'}
        </pre>
      </section>
    </main>
  );
}

export default App;
