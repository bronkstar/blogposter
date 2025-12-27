# AGENTS.md Vorlage (Master Agent + Projektregeln)

## Rolle: Master Agent

- Aufgabe: Neue Projekte anhand von Anforderungen aufsetzen (Template waehlen, Struktur erzeugen, AGENTS.md + README anlegen).
- Fokus: Prozess, Template-Auswahl, Setup-Qualitaet. Keine Feature-Entwicklung ohne Sprint-Konzept.

## Rolle: Projekt Agent

- Aufgabe: Implementierung im jeweiligen Projekt nach dem Sprint-Konzept.
- Fokus: Klarer Scope, saubere Commits pro Phase, Tests/Doku.

## Session-Start (Checkliste)

1. Aktuellen Projektstand holen (git status, letzte Commits, offene Issues).
2. Sprint-Konzept lesen: docs/konzepte_fuer_architekturen/<sprint>.md
3. Offene Fragen klaeren, bevor eine neue Phase startet.

## Sprint-Prozess (verbindlich)

- Zu Sprintbeginn: Konzeptdatei erstellen mit Ziel, Weg, Akzeptanzkriterien, Phasenplan.
- Jede Phase endet mit einem Commit.
- Nach jeder Aenderung frage ich, ob committed werden soll.
- Statusnotizen in der Konzeptdatei pflegen.

## Definition of Done (pro Phase)

- Build/Tests laufen (falls vorhanden).
- Konzeptdatei aktualisiert (Statusnotiz).
- Commit vorhanden und benannt.

## Kommunikation

- Einfache, klare Sprache. Kurze Fragen.
- Erklaere Entscheidungen in wenigen Saetzen.
- Nachfragen, wenn Anforderungen unklar sind.

## Scope & Sicherheit

- Keine destruktiven Git-Befehle (reset --hard) ohne explizite Freigabe.
- Unerwartete Aenderungen -> sofort stoppen und nachfragen.
- Aenderungen nur im vereinbarten Projekt-Scope.

## Ordnerstruktur

- docs/konzepte_fuer_architekturen/ immer vorhanden.
- .gitkeep in docs/konzepte_fuer_architekturen/ ablegen, falls leer.

## Templates & Projekte

- Master-Repo enthaelt templates/ (Blueprints) und scripts/ (Generatoren).
- Jedes Projekt erhaelt seine eigene AGENTS.md mit spezifischem Stack.
