import { type ChangeEvent, useEffect, useMemo, useState } from 'react';
import './App.css';
import {
  defaultFrontmatter,
  frontmatterSchema,
  type FaqEntry,
  type Frontmatter,
} from './lib/schemas/frontmatter';
import { parseMonthlyToml } from './lib/parsers/monthly';
import monthlyTomlSource from '../../docs/monthly.toml?raw';
import type { Shortcode } from './lib/schemas/shortcodes';
import { shortcodeSchema } from './lib/schemas/shortcodes';

const FRONTMATTER_STORAGE_KEY = 'blogposter.frontmatter.v1';
const SHORTCODES_STORAGE_KEY = 'blogposter.shortcodes.v1';

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
      aggKey: undefined,
      jobsKey: undefined,
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
      .map((entry) => {
        const result = shortcodeSchema.safeParse(entry);
        if (result.success) return result.data;
        return null;
      })
      .filter((entry): entry is Shortcode => entry !== null);
  } catch {
    return [];
  }
};

const listToInput = (value: string[]) => value.join(', ');
const inputToList = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

function App() {
  const [frontmatter, setFrontmatter] = useState<Frontmatter>(loadFrontmatterFromStorage);
  const [shortcodes, setShortcodes] = useState<Shortcode[]>(loadShortcodesFromStorage);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(FRONTMATTER_STORAGE_KEY, JSON.stringify(frontmatter));
  }, [frontmatter]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SHORTCODES_STORAGE_KEY, JSON.stringify(shortcodes));
  }, [shortcodes]);

  const frontmatterValidation = useMemo(
    () => frontmatterSchema.safeParse(frontmatter),
    [frontmatter],
  );

  const frontmatterFieldErrors = useMemo(() => {
    if (frontmatterValidation.success) return {};
    return frontmatterValidation.error.flatten().fieldErrors;
  }, [frontmatterValidation]);

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
    setFrontmatter((prev) => {
      const copy = prev.faq.filter((_, idx) => idx !== index);
      return { ...prev, faq: copy };
    });
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

  const shortcodesValidation = shortcodes.map((entry) => shortcodeSchema.safeParse(entry));

  const latestAggregate = monthlyDataset.it_aggregate.at(0);
  const latestJobs = monthlyDataset.it_jobs.at(0);

  return (
    <main className="mx-auto max-w-5xl space-y-10 px-4 py-10">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-wider text-muted-foreground">Sprint 01</p>
        <h1 className="text-3xl font-semibold text-foreground">Blogposter – Formulareingabe</h1>
        <p className="text-base text-muted-foreground">
          Metadaten, FAQ und Shortcodes auf einen Blick. Alle Eingaben werden lokal gespeichert und
          sofort validiert.
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
            {frontmatterFieldErrors.title && (
              <p className="text-sm text-red-600">{frontmatterFieldErrors.title[0]}</p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Slug</label>
            <input
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={frontmatter.slug}
              onChange={handleFrontmatterChange('slug')}
              placeholder="/it-arbeitsmarkt-november-2025"
            />
            {frontmatterFieldErrors.slug && (
              <p className="text-sm text-red-600">{frontmatterFieldErrors.slug[0]}</p>
            )}
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
            {frontmatterFieldErrors.description && (
              <p className="text-sm text-red-600">{frontmatterFieldErrors.description[0]}</p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Summary</label>
            <textarea
              className="min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={frontmatter.summary}
              onChange={handleFrontmatterChange('summary')}
            />
            {frontmatterFieldErrors.summary && (
              <p className="text-sm text-red-600">{frontmatterFieldErrors.summary[0]}</p>
            )}
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
            {frontmatterFieldErrors.date && (
              <p className="text-sm text-red-600">{frontmatterFieldErrors.date[0]}</p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Autor</label>
            <input
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={frontmatter.author}
              onChange={handleFrontmatterChange('author')}
            />
            {frontmatterFieldErrors.author && (
              <p className="text-sm text-red-600">{frontmatterFieldErrors.author[0]}</p>
            )}
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
            {frontmatterFieldErrors.image && (
              <p className="text-sm text-red-600">{frontmatterFieldErrors.image[0]}</p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Bild Alt-Text</label>
            <input
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={frontmatter.imageAlt}
              onChange={handleFrontmatterChange('imageAlt')}
            />
            {frontmatterFieldErrors.imageAlt && (
              <p className="text-sm text-red-600">{frontmatterFieldErrors.imageAlt[0]}</p>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              className="rounded border border-input"
              checked={frontmatter.draft}
              onChange={handleFrontmatterChange('draft')}
            />
            Draft aktivieren
          </label>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">jobSnippedTag</label>
            <input
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={frontmatter.jobSnippedTag}
              onChange={handleFrontmatterChange('jobSnippedTag')}
            />
            {frontmatterFieldErrors.jobSnippedTag && (
              <p className="text-sm text-red-600">{frontmatterFieldErrors.jobSnippedTag[0]}</p>
            )}
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
            {frontmatterFieldErrors.lesedauer && (
              <p className="text-sm text-red-600">{frontmatterFieldErrors.lesedauer[0]}</p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Slug-basierter Dateiname</label>
            <input
              className="rounded-md border border-input bg-muted px-3 py-2 text-sm"
              value={`${frontmatter.slug.replace(/^\//, '') || 'unbenannt'}.md`}
              disabled
            />
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {(['categories', 'tags', 'zielgruppe', 'Keywords'] as const).map((field) => (
            <div key={field} className="flex flex-col gap-1">
              <label className="text-sm font-medium">
                {field === 'Keywords' ? 'Keywords' : field.charAt(0).toUpperCase() + field.slice(1)}
              </label>
              <input
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={listToInput(frontmatter[field])}
                onChange={handleArrayFieldChange(field)}
                placeholder="Kommagetrennt"
              />
              {frontmatterFieldErrors[field] && (
                <p className="text-sm text-red-600">{frontmatterFieldErrors[field]?.[0]}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">FAQ</h2>
            <p className="text-sm text-muted-foreground">Fragen & Antworten ergänzen.</p>
          </div>
          <button
            className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
            onClick={addFaqEntry}
            type="button"
          >
            Frage hinzufügen
          </button>
        </div>
        <div className="mt-4 space-y-4">
          {frontmatter.faq.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Noch keine Fragen vorhanden.
            </p>
          )}
          {frontmatter.faq.map((entry, index) => {
            const questionError =
              entry.question.trim().length === 0 ? 'Bitte Frage ausfüllen.' : undefined;
            const answerError =
              entry.answer.trim().length === 0 ? 'Bitte Antwort ausfüllen.' : undefined;
            return (
              <div key={index} className="rounded-md border border-dashed border-border p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">FAQ #{index + 1}</p>
                  <button
                    className="text-sm text-red-600 hover:underline"
                    onClick={() => removeFaqEntry(index)}
                    type="button"
                  >
                    Entfernen
                  </button>
                </div>
                <div className="mt-3 grid gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Frage</label>
                    <input
                      className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={entry.question}
                      onChange={(event) => updateFaqEntry(index, { question: event.target.value })}
                    />
                    {questionError && <p className="text-sm text-red-600">{questionError}</p>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Antwort</label>
                    <textarea
                      className="min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={entry.answer}
                      onChange={(event) => updateFaqEntry(index, { answer: event.target.value })}
                    />
                    {answerError && <p className="text-sm text-red-600">{answerError}</p>}
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
            <p className="text-sm text-muted-foreground">
              Unterstützt: space, chart_itmarket_all, itmarket_table.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              className="rounded-md border border-input px-3 py-2 text-sm"
              onClick={() => addShortcode('space')}
              type="button"
            >
              Space
            </button>
            <button
              className="rounded-md border border-input px-3 py-2 text-sm"
              onClick={() => addShortcode('chart_itmarket_all')}
              type="button"
            >
              Chart
            </button>
            <button
              className="rounded-md border border-input px-3 py-2 text-sm"
              onClick={() => addShortcode('itmarket_table')}
              type="button"
            >
              Tabelle
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          {shortcodes.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Noch keine Shortcodes hinzugefügt.
            </p>
          )}

          {shortcodes.map((shortcode, index) => {
            const validation = shortcodesValidation[index];

            return (
              <div key={index} className="space-y-3 rounded-md border border-border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium" htmlFor={`shortcode-type-${index}`}>
                      Typ
                    </label>
                    <select
                      id={`shortcode-type-${index}`}
                      className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={shortcode.type}
                      onChange={(event) =>
                        updateShortcode(index, createDefaultShortcode(event.target.value as Shortcode['type']))
                      }
                    >
                      <option value="space">space</option>
                      <option value="chart_itmarket_all">chart_itmarket_all</option>
                      <option value="itmarket_table">itmarket_table</option>
                    </select>
                  </div>
                  <button
                    className="text-sm text-red-600 hover:underline"
                    onClick={() => removeShortcode(index)}
                    type="button"
                  >
                    Entfernen
                  </button>
                </div>

                {shortcode.type === 'chart_itmarket_all' && (
                  <div className="grid gap-3 md:grid-cols-2">
                    {[
                      { label: 'Von (YYYY-MM)', field: 'from' },
                      { label: 'Bis (YYYY-MM)', field: 'to' },
                    ].map(({ label, field }) => (
                      <div key={field} className="flex flex-col gap-1">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">
                          {label}
                        </label>
                        <input
                          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={shortcode[field as 'from' | 'to']}
                          onChange={(event) =>
                            updateShortcode(index, {
                              ...shortcode,
                              [field]: event.target.value,
                            })
                          }
                        />
                      </div>
                    ))}

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold uppercase text-muted-foreground">
                        Breite (px)
                      </label>
                      <input
                        type="number"
                        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={shortcode.width}
                        onChange={(event) =>
                          updateShortcode(index, {
                            ...shortcode,
                            width: Number(event.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold uppercase text-muted-foreground">
                        Höhe (px)
                      </label>
                      <input
                        type="number"
                        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={shortcode.height}
                        onChange={(event) =>
                          updateShortcode(index, {
                            ...shortcode,
                            height: Number(event.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="md:col-span-2 flex flex-col gap-1">
                      <label className="text-xs font-semibold uppercase text-muted-foreground">
                        Titel
                      </label>
                      <input
                        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={shortcode.title}
                        onChange={(event) =>
                          updateShortcode(index, {
                            ...shortcode,
                            title: event.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold uppercase text-muted-foreground">aggKey</label>
                      <input
                        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={shortcode.aggKey ?? ''}
                        onChange={(event) =>
                          updateShortcode(index, {
                            ...shortcode,
                            aggKey: event.target.value || undefined,
                          })
                        }
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold uppercase text-muted-foreground">jobsKey</label>
                      <input
                        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={shortcode.jobsKey ?? ''}
                        onChange={(event) =>
                          updateShortcode(index, {
                            ...shortcode,
                            jobsKey: event.target.value || undefined,
                          })
                        }
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
                          const nextMode = event.target.value as 'range' | 'single';
                          if (nextMode === 'range') {
                            updateShortcode(index, {
                              type: 'itmarket_table',
                              mode: 'range',
                              tableType:
                                shortcode.mode === 'range' ? shortcode.tableType : 'it_aggregate',
                              from: shortcode.mode === 'range' ? shortcode.from : '2024-04',
                              to: shortcode.mode === 'range' ? shortcode.to : '2025-11',
                            });
                          } else {
                            updateShortcode(index, {
                              type: 'itmarket_table',
                              mode: 'single',
                              tableType: 'compare',
                              month: shortcode.mode === 'single' ? shortcode.month : '2025-11',
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
                          <label className="text-xs font-semibold uppercase text-muted-foreground">
                            Tabelle
                          </label>
                          <select
                            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={shortcode.tableType}
                            onChange={(event) =>
                              updateShortcode(index, {
                                ...shortcode,
                                tableType: event.target.value as typeof shortcode.tableType,
                              })
                            }
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
                              <label className="text-xs font-semibold uppercase text-muted-foreground">
                                {field === 'from' ? 'Von' : 'Bis'} (YYYY-MM)
                              </label>
                              <input
                                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={shortcode[field as 'from' | 'to']}
                                onChange={(event) =>
                                  updateShortcode(index, {
                                    ...shortcode,
                                    [field]: event.target.value,
                                  })
                                }
                              />
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">
                          Monat (YYYY-MM)
                        </label>
                        <input
                          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={shortcode.month}
                          onChange={(event) =>
                            updateShortcode(index, {
                              ...shortcode,
                              month: event.target.value,
                            })
                          }
                        />
                      </div>
                    )}
                  </div>
                )}

                {!validation.success && (
                  <p className="text-sm text-red-600">
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
        <p className="text-sm text-muted-foreground">
          Nur Lesen – Angaben stammen aus <code>docs/monthly.toml</code>.
        </p>
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
    </main>
  );
}

export default App;
