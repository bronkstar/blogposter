# Sprint-Konzept: blogposter Sprint 01

- **Datum**: 2025-12-22
- **Autor**: Codex (Agent) & Bronkstar (Produkt)

## Ziel

Eine erste Web-App bereitstellen, mit der Bronkstar die vorhandenen IT-Arbeitsmarkt-Daten (Frontmatter, FAQ, Shortcodes, `docs/monthly.toml`) komfortabel erfasst und daraus eine fertige Markdown-Datei herunterladen kann.

## Weg / Leitplanken

- Frontend-only (React + Vite + TypeScript).
- Styling & UI-Komponenten via Tailwind CSS + shadcn/ui.
- Daten aus `docs/monthly.toml` lokal einlesen (kein Backend).
- Export erzeugt eine TOML-Frontmatter- + Markdown-Datei, angelehnt an `docs/0057-it-arbeitsmarkt-november-2025.md`.
- Automatisierte Tests: Unit (z. B. Vitest) und ein Playwright-Smoketest.
- Architektur so bauen, dass spätere Hosting-Optionen möglich bleiben.

## Akzeptanzkriterien

1. Formular deckt alle Pflichtfelder aus dem Beispielartikel ab (Frontmatter + Inhalte inkl. FAQ & Shortcodes).
2. Markdown-Export liefert eine Datei, die beim Vergleich mit dem Beispiel keine strukturellen Abweichungen hat.
3. Tests laufen (mind. 1 Unit-Test + 1 Playwright-Smoketest).
4. Tailwind + shadcn sind korrekt integriert (Theme, Tokens, Responsiveness).
5. README beschreibt Export-Flow kurz.

## Phasenplan (kleinschrittig)

1. **Projekt-Setup**: Vite + React + TS scaffolden, Tailwind & shadcn integrieren, Basis-Ordnerstruktur anlegen.
2. **Schema & Parser**: Frontmatter-Schema definieren, Parser/Serializer aufsetzen (inkl. monthly.toml Loader).
3. **Form-UX**: Formulare für Frontmatter/FAQ/Shortcodes bauen, Zustand zwischenspeichern.
4. **Preview & Export**: Live-Preview + Download-Funktion einbauen; Markdown-Serializer finalisieren.
5. **Tests & Docs**: Unit-/Playwright-Tests schreiben, README-Ergänzungen, Cleanup.

Zu jeder Phase entsteht ein Commit und eine Statusnotiz (siehe unten).

## Offene Fragen

| Nr. | Frage | Antwort | Datum |
| --- | ----- | ------- | ----- |
| 1 | Soll der Export Dateiname fest sein (z. B. aus slug)? | Ja, Dateiname aus `slug` ableiten (z. B. `slug.md`). | 2025-12-22 |
| 2 | Müssen wir bereits eine Upload-Option (z. B. Git push) bieten? | Nein, lokaler Download reicht. | 2025-12-22 |
| 3 | Wie pflegen wir monthly.toml aus der App heraus? | Wird später über Issue `docs/issues/001-monthly-toml-editor.md` umgesetzt (Export statt direktem Schreibzugriff). | 2025-12-22 |

## Statusnotizen

- *Phase 1 – Projekt-Setup*: ✅ erledigt am 2025-12-22 (Commit: `feat: setup frontend baseline`) – Vite/React/TS inkl. Tailwind & shadcn eingerichtet, Build läuft.
- *Phase 2 – Schema & Parser*: ✅ erledigt am 2025-12-22 (Commit: `feat: add schema and parser layer`) – Frontmatter/Shortcode/Monthly-Schema + Parser/Serializer vorhanden.
- *Phase 3 – Form-UX*: _offen_
- *Phase 4 – Preview & Export*: _offen_
- *Phase 5 – Tests & Docs*: _offen_
