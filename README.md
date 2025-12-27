# Blogposter – Kurz-Anleitung

## Schnellstart (Reihenfolge)

1. **Repo klonen (falls nötig)**
   ```bash
   git clone https://github.com/bronkstar/blogposter.git
   cd blogposter
   ```
   Wenn das Repo schon lokal liegt: `git pull`, um den aktuellen Stand zu holen.
2. **Frontend installieren**
   ```bash
   npm --prefix frontend install
   ```
3. **Entwicklungsserver starten**
   ```bash
   npm --prefix frontend run dev
   ```
   Browser: `http://localhost:5173`.
   - Oben links wählst du den Writer: Standard = „IT-Arbeitsmarkt-Writer“, alternativ „Blogpost-Writer“ für thematische Artikel.
4. **Sprint-Konzept prüfen**
   - Datei `docs/konzepte_fuer_architekturen/20251222-blogposter-sprint-01.md` lesen.
   - Offene Fragen + nächste Phase checken.
5. **Phase starten**
   - Mit mir kurz abstimmen, welche Phase dran ist (z. B. Schema & Parser).
   - Danach Schritt für Schritt umsetzen & nach jedem Teilcommit fragen.

## Wichtigste Befehle (Nachschlagewerk)

1. **Einmalig installieren**
   ```bash
   cd frontend
   npm install
   ```
2. **Entwicklungsserver starten**
   ```bash
   npm --prefix frontend run dev
   ```
   Danach im Browser `http://localhost:5173` öffnen.
3. **Produktions-Build testen**
   ```bash
   npm --prefix frontend run build
   ```
4. **Unit-Tests (Vitest) ausführen**
   ```bash
   npm --prefix frontend run test
   ```
5. **Unit-Tests live beobachten**
   ```bash
   npm --prefix frontend run test:watch
   ```
6. **End-to-End-Test (Playwright)**
   ```bash
   npm --prefix frontend run test:e2e
   ```
   _Nur beim ersten Mal_: `npx --prefix frontend playwright install` (lädt den Browser für Playwright).

> Tipp: Die Befehle werden aktuell nur im Ordner `frontend` benötigt. Ein Backend gibt es noch nicht.

## Worum geht es?

Blogposter ist eine kleine Web-App, mit der strukturierte IT-Arbeitsmarktberichte (Frontmatter + Markdown inkl. FAQ und Shortcodes) erstellt werden sollen. Phase 1 liefert das technische Fundament: React + Vite + TypeScript, Tailwind CSS und shadcn/ui sind eingerichtet, aber die eigentliche Eingabemaske folgt in späteren Phasen.

## Writer-Modi in der App

- **IT-Arbeitsmarkt-Writer (Standard)**: Enthält Monatsdaten-Formular, TOML-Vorschau, Shortcodes für Tabellen/Charts und alle Pflichtfelder des Beispieldokuments `docs/0057-…`. Jede Sektion zeigt an, ob noch Standardwerte aktiv sind („Standard“) oder schon angepasst („Neu“).
- **Blogpost-Writer**: Reduzierte Oberfläche für thematische Beiträge ohne Monatsdaten. Fokus auf Metadaten, Body, FAQ und optionale Shortcodes. Beide Writer speichern ihre Eingaben getrennt im Browser.

## Daten & Dateien

- `docs/0057-it-arbeitsmarkt-november-2025.md`: Beispielartikel, den wir nachbauen.
- `docs/monthly.toml`: Zahlenbasis (Arbeitslose, Jobs usw.), wird später von der App eingelesen.
- `docs/konzepte_fuer_architekturen/YYYYMMDD-*.md`: Sprint-Konzepte (Ziel, Phasenplan, Status).

## Sprint- & Konzeptprozess

1. **Sprint starten** → neue Konzeptdatei unter `docs/konzepte_fuer_architekturen/` anlegen (Vorlage siehe `20251222-blogposter-sprint-01.md`).
2. **Offene Fragen sammeln** → im Konzept festhalten, bevor Phase 1 beginnt.
3. **Phasenplan** → Jede Phase endet mit einem eigenen Commit + Statusnotiz im Konzept.
4. **Nach jedem Arbeitsschritt** → kurz prüfen, ob ein eigener Commit nötig ist (lieber viele kleine Schritte).

## Status Sprint 01 (Stand heute)

- ✅ Phase 1: Setup (Vite/React/Tailwind/shadcn) + Build.
- ✅ Phase 2: Schema & Parser (Frontmatter und monthly.toml).
- ✅ Phase 3: Form-UX (Metadaten, FAQ, Shortcodes, Local Storage).
- ✅ Phase 4: Preview & Export inkl. Monatsdaten-Formular und Standard/Neu-Indikatoren.
- 🔄 Phase 5: Tests & Docs (Vitest + Playwright + README-Update).

## Tests & Qualitätssicherung

- **Unit-Tests (Vitest)** decken Parser & Serializer ab (`frontmatter` und `monthly`), sodass Export/Import nicht unbemerkt kaputtgeht. Kommando: `npm --prefix frontend run test`.
- **Playwright-Smoke-Test** startet den Dev-Server automatisch, prüft beide Writer-Modi (IT-Arbeitsmarkt & Blogpost) und kontrolliert, ob Standarddaten sichtbar sind. Kommando: `npm --prefix frontend run test:e2e` (vorher einmal `npx --prefix frontend playwright install` ausführen).
- **Empfehlung vor jedem Commit**: `npm --prefix frontend run test && npm --prefix frontend run build`. Im CI können dieselben Befehle genutzt werden.

## Häufige Fragen (Stand jetzt)

- **Wo kommen meine Texte hin?** – Noch nicht implementiert; aktuell nur Grundgerüst.
- **Wie exportiere ich Markdown?** – Diese Funktion entsteht erst nach Phase 3/4.
- **Was tun bei Fehlern?** – Terminal-Ausgabe kopieren und mir schicken; wir debuggen gemeinsam Schritt für Schritt.

## Nächste Schritte

1. Phase 5 abschließen (Tests + Dokumentation finalisieren).
2. Phase 6 (falls geplant) definieren – z. B. Deployment/Hosting oder Erweiterungen für monthly.toml.
