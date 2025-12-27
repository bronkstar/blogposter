# Issue: Master-Agent Setup für neue Projekte

- **Titel**: Blueprint & Generator für neue App-Projekte mit individuellen Technologien
- **Beschreibung**: Neben blogposter benötigen wir einen “Master Agent”, der als zentrales Repo (z. B. `Codex_Master`) dient. Dort sollen Templates für verschiedene Stacks liegen und ein Skript die passende Projektstruktur erzeugen (inkl. AGENTS.md, README, Basiscode). Ziel: Mit einem Kommando eine neue App inkl. Rollen/Technologien starten.
- **Use Case**: Produkt/Tech möchte spontan eine neue App mit anderen Anforderungen (z. B. Next.js + Supabase) starten. Statt alles manuell einzurichten, erzeugt der Master Agent eine fertige Grundstruktur, die dann im jeweiligen Projekt weiterentwickelt wird.
- **Akzeptanzkriterien**:
  1. Master-Repo besitzt klare Struktur (`templates/`, `scripts/`, `projects/`, globales `AGENTS.md`).
  2. Mindestens ein Template (z. B. React + Tailwind) liegt vorbereitet vor, inkl. austauschbarer Platzhalter (`{{PROJECT_NAME}}` etc.).
  3. Generator-Skript (`./scripts/create-project`) kopiert Template, ersetzt Platzhalter, legt Projektordner an und initialisiert Repo-Struktur.
  4. README dokumentiert alle Schritte (Template wählen, Projekt generieren, lokale Agent-Regeln nutzen).
  5. Optional: Erweiterungsideen (z. B. Template-Übersicht oder CLI-Parameter für unterschiedliche Tech-Stacks) im Issue notiert.
- **Nächste Schritte**: Repo `https://github.com/bronkstar/Codex_Master.git` vorbereiten; dort Master-Agent aufsetzen und erste Templates einchecken. Sobald Schreibrechte geklärt sind, Umsetzung starten.
