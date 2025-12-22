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

> Tipp: Die Befehle werden aktuell nur im Ordner `frontend` benötigt. Ein Backend gibt es noch nicht.

## Worum geht es?

Blogposter ist eine kleine Web-App, mit der strukturierte IT-Arbeitsmarktberichte (Frontmatter + Markdown inkl. FAQ und Shortcodes) erstellt werden sollen. Phase 1 liefert das technische Fundament: React + Vite + TypeScript, Tailwind CSS und shadcn/ui sind eingerichtet, aber die eigentliche Eingabemaske folgt in späteren Phasen.

## Daten & Dateien

- `docs/0057-it-arbeitsmarkt-november-2025.md`: Beispielartikel, den wir nachbauen.
- `docs/monthly.toml`: Zahlenbasis (Arbeitslose, Jobs usw.), wird später von der App eingelesen.
- `docs/konzepte_fuer_architekturen/YYYYMMDD-*.md`: Sprint-Konzepte (Ziel, Phasenplan, Status).

## Sprint- & Konzeptprozess

1. **Sprint starten** → neue Konzeptdatei unter `docs/konzepte_fuer_architekturen/` anlegen (Vorlage siehe `20251222-blogposter-sprint-01.md`).
2. **Offene Fragen sammeln** → im Konzept festhalten, bevor Phase 1 beginnt.
3. **Phasenplan** → Jede Phase endet mit einem eigenen Commit + Statusnotiz im Konzept.
4. **Nach jedem Arbeitsschritt** → kurz prüfen, ob ein eigener Commit nötig ist (lieber viele kleine Schritte).

## Status Phase 1 (heute)

- ✅ Vite/React/TS + Tailwind + shadcn eingerichtet.
- ✅ Dev-Server und `npm run build` laufen.
- ⏳ Formular, Parser, Export, Tests folgen in Phase 2+.

## Häufige Fragen (Stand jetzt)

- **Wo kommen meine Texte hin?** – Noch nicht implementiert; aktuell nur Grundgerüst.
- **Wie exportiere ich Markdown?** – Diese Funktion entsteht erst nach Phase 3/4.
- **Was tun bei Fehlern?** – Terminal-Ausgabe kopieren und mir schicken; wir debuggen gemeinsam Schritt für Schritt.

## Nächste Schritte

1. Phase 2 (Schema & Parser) nach Konzept starten.
2. Form-UX aufbauen (Phase 3).
3. Export & Tests ergänzen.
