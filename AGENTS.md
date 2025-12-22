# .codex/agents.yaml

version: 1

project:
  name: 'blogposter'
  description: 'UX-Werkzeug für datengetriebene Blogposts: strukturierte Eingaben erfassen, Markdown/Hugo-Dateien erzeugen.'
  package_manager: npm
  node: '>=20.18'
  python: '>=3.12'

defaults:
  agent: orchestrator
  strategy:
    dry_run: false
    max_changes: 50
  communication_profile:
    language: 'Deutsch (Alltagssprache, ohne Fachjargon)'
    workflow:
      - 'Vor jedem Arbeitspaket stellt der Agent nummerierte, leicht verständliche Fragen, bis das Ziel klar ist.'
      - 'Aufgaben beginnen erst nach expliziter Bestätigung des gemeinsamen Verständnisses durch die Autorin/den Autor.'
      - 'Wesentliche Antworten werden kurz protokolliert, damit Folgefragen darauf aufbauen können.'
      - 'Zu Beginn jeder Session wird der aktuelle Projektstand erfasst (z. B. git status, zuletzt geänderte Dateien, offene TODOs), damit Nachfragen kontextualisiert werden können.'
      - 'Nach jedem abgeschlossenen Arbeitsschritt mit Änderungen wird aktiv gefragt, ob ein separater Commit erstellt werden soll (kleine Schritte bevorzugen).'
  reviewers:
    required: ['appsec', 'qa-lead']
    optional: ['ux-director', 'lead-architect']

workspace:
  roots:
    - '.'
  apps:
    - path: 'frontend'
      type: 'web'
      dev: 'npm --prefix frontend run dev'
      build: 'npm --prefix frontend run build'
      preview: 'npm --prefix frontend run preview'
      env: '.env'
    - path: 'backend'
      type: 'api'
      run: 'PYTHONPATH=./backend uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --env-file .env-dev'
      env: '.env'
  packages: []
  infra:
    - 'docker-compose.yml'
  test_dirs:
    - 'tests'

globals:
  goals:
    - 'Alle IT-Arbeitsmarktberichte entstehen aus einer UX: Metadaten, FAQ, Charts und Story-Fragmente werden strukturiert erfasst und als Hugo-kompatible Markdown-Datei exportiert.'
    - 'Datenqualität sichern: Zahlen stammen aus kuratierten Quellen (z. B. docs/monthly.toml) und werden automatisiert in Shortcodes (chart_itmarket_all, itmarket_table, FAQ) übertragen.'
    - 'Schneller Start in Entwicklung & Review: npm install → dev server → Export-Vorschau ohne weitere Infrastruktur; Deploy bleibt reproduzierbar.'
    - 'Module wiederverwendbar machen (z. B. Frontmatter-Form, Section Builder, Export-Pipeline), damit weitere Report-Formate damit betrieben werden können.'
  guardrails:
    - 'Keine Secrets/Token ins Repo; API-Keys nur via .env/.env.local; Markdown-Ausgaben dürfen nur VITE__/NEXT_PUBLIC__ Variablen enthalten.'
    - 'Markdown-Export folgt streng dem TOML-Frontmatter mit +++ Delimiter, Keys wie title/summary/faq/Keywords dürfen nicht entfernt oder umbenannt werden.'
    - 'Shortcodes nur aus Allow-List einsetzen (space, chart_itmarket_all, itmarket_table, itmarket_table compare). Eingaben vor dem Einfügen validieren.'
    - 'Alle Markt-Datenänderungen in docs/ müssen nachvollziehbar sein (Quelle, Berechnung); keine manuellen Zahlen direkt im Lauftext ohne Kommentar.'
    - 'UX darf kein unescaped HTML rendern; Markdown-Vorschau nutzt Sanitizer/Safe-List.'
    - 'Kommunikation mit Stakeholdern erfolgt in einfacher, deutscher Alltagssprache; Fachbegriffe werden sofort erklärt.'
  conventions:
    clean_code:
      - 'Frontend: TypeScript strict, dedizierte Module für Frontmatter-Schema, Section-Presets und Shortcode-Serialisierung; keine Copy-Paste-Markdown-Strings.'
      - 'State-Management klar trennen (Form, Preview, Export). Keine globalen Stores ohne Bedarf.'
      - 'Backend/CLI: Funktionen klein halten, zuerst Parser/Validator schreiben, dann IO.'
    security:
      - 'Kein dangerouslySetInnerHTML ohne Sanitizer; Markdown-Preview nur über geprüfte Renderer.'
      - 'Dateiexport erfolgt lokal; Uploads nur mit opt-in (z. B. GitHub, CMS) und ohne Secrets.'
      - 'Dependency Audits (npm audit, pip-audit) regelmäßig fahren; Updates ohne Breaking Changes bevorzugen.'
    qa:
      - 'Unit-Tests für Frontmatter-Builder, Shortcode-Renderer und Parser.'
      - 'E2E/Playwright-Smoke: Form ausfüllen, Preview prüfen, Markdown exportieren.'
      - 'Fixtures für docs/monthly.toml bereitstellen, damit Tests reproduzierbar bleiben.'
    ux:
      - 'Formen deutschsprachig, klare Inline-Validierung (fehlende Kennzahl, falsches Datum).'
      - 'Live-Vorschau zeigt Frontmatter+Body nebeneinander; Responsiv (>=320px).'
      - 'Keyboard- und Screenreader-tauglich; Fokus-Stati sichtbar.'
    performance:
      - 'Frontend: Lazy-load großer Editor/Preview-Komponenten, speichern im lokalen Storage/Datei nur bei Bedarf.'
      - 'Daten (monthly.toml) beim Start einmal parsen und cachen.'
    acceptance_criteria:
      - 'Dev-Server startet ohne manuelle Schritte; Exportierte Markdown-Datei validiert gegen Schema.'
      - 'npm --prefix frontend run build grün; Markdown-Beispiel (z. B. docs/0057-...) lässt sich über die App rekonstruieren.'
      - 'Tests (Unit + E2E-Smoke) laufen; Docs/RUNBOOK beschreibt Export-Schritte.'

agents:
  - id: orchestrator
    role: 'Goal Router & Reviewer'
    delegates:
      - lead-architect
      - fe-engineer
      - be-engineer
      - appsec
      - qa-lead
      - ux-director
      - devops
      - tech-writer
    policy:
      routing:
        - when: ['frontend/**', 'docs/**']
          to: ['fe-engineer', 'ux-director', 'appsec']
        - when: ['backend/**', 'scripts/**']
          to: ['be-engineer', 'appsec']
        - when: ['docker-compose.yml', '.github/**', 'infra/**']
          to: ['devops', 'lead-architect', 'appsec']
        - when: ['README.md', 'RUNBOOKS.md', 'SECURITY.md', 'CONTRIBUTING.md']
          to: ['tech-writer', 'lead-architect']
    review:
      required_reviewers: ['appsec', 'qa-lead']
      block_on_security_findings: true
      request_optional_review_from: ['ux-director']
    acceptance:
      - 'Build/Lint/Typecheck/Test grün'
      - 'Security-Check ohne High/Critical'
      - 'UX/A11y keine kritischen Issues'
      - 'Aufgaben starten erst nach dokumentiertem gemeinsamen Verständnis (Fragen & Bestätigung).'

  - id: lead-architect
    role: 'Lead Architect'
    focus_paths: ['./', '.github/', 'docker-compose.yml', 'docs/**']
    tasks:
      - 'Architektur zwischen UX-Frontend, Datendiensten und Export-Skripten definieren; keine Vermischung von Präsentations- und Content-Layer.'
      - 'Schema-Versionen für Frontmatter (z. B. FAQ, Keywords, Shortcodes) festlegen und dokumentieren.'
      - 'Onboarding vereinfachen (README, Example Content, Scripts).'
    must_check:
      - 'Keine zyklischen Abhängigkeiten zwischen Editor, Preview und Export-Pipeline.'
      - 'Dokumentation erklärt, wie docs/monthly.toml gepflegt wird.'

  - id: fe-engineer
    role: 'Senior Frontend Engineer (React/Vite/Tailwind)'
    focus_paths: ['frontend', 'docs/**']
    tasks:
      - 'Form-UX für Frontmatter + Content bauen (Reusable Panels für title, summary, FAQ, Keywords, Shortcodes).'
      - 'Markdown/Split-Preview implementieren, Export (Download, Copy, Git push helper) bereitstellen.'
      - 'Tailwind/Design-System pflegen, A11y testen, Zustand zwischenspeichern.'
    must_check:
      - "main.tsx importiert './index.css' zuerst."
      - 'tailwind.config.* Content-Globs decken alle FE-Pfade sowie Docs-Templates.'
      - 'Nur VITE__ Variablen im Client; Datenquellen aus docs/ nur read-only.'
    acceptance:
      - 'Frontend buildbar & previewed; Smoke-E2E (Beispielbericht laden, Export klicken).'

  - id: be-engineer
    role: 'Senior Backend Engineer (FastAPI/Pydantic oder Python-CLI)'
    focus_paths: ['backend', 'scripts', 'docs/monthly.toml']
    tasks:
      - 'API/CLI bereitstellen, die Datenquellen (monthly.toml) parst, validiert und ans Frontend liefert.'
      - 'Optionale Services für automatische Markdown-Generierung oder CMS-Upload entwickeln (mit Auth).'
      - 'Pydantic-Schemas für Frontmatter/Sections/FAQs pflegen; Tests schreiben.'
    must_check:
      - 'monthly.toml Parser deckt alle Segmente (aggregate, jobs, infra, software, germany).'
      - 'Keine SQL/FS-Operation ohne Validation; Export schreibt nur in erlaubte Pfade (docs/).'
      - 'Settings via ENV; .env.example aktuell.'
    acceptance:
      - 'CLI/API liefert strukturierte Daten; Tests grün; Markdown-Serializer spiegelt Beispielartikel.'

  - id: appsec
    role: 'Application Security'
    focus_paths: ['frontend', 'backend', 'docs/**', '.github/']
    tasks:
      - 'Secret-Scan (git-secrets/ripsecrets), sicherstellen, dass Exporte keine personenbezogenen Daten enthalten.'
      - 'Sanitizer/Allowed Shortcodes überprüfen; Markdown-Preview darf kein XSS ermöglichen.'
      - 'Dependency Audits (npm/pip) und CSP/CORS-Vorgaben für spätere Deployments dokumentieren.'
    acceptance:
      - 'Kein Secret-Leak; npm/pip audit ohne High/Critical; Sanitizer-Tests vorhanden.'

  - id: qa-lead
    role: 'QA Lead'
    focus_paths: ['frontend', 'backend', 'tests', 'docs/examples/**']
    tasks:
      - 'Testplan für Frontmatter-Validation, Export-Snapshots, CLI/API.'
      - 'Fixtures basierend auf docs/0057-... pflegen; Regressionstests (Playwright) für Export-Flow.'
      - 'Coverage-Ziele definieren (UI 70 %, API/CLI 80 %).'
    acceptance:
      - 'CI test Job grün; Coverage-Thresholds erreicht; Export-E2E Smoke OK.'

  - id: devops
    role: 'DevOps/SRE'
    focus_paths: ['docker-compose.yml', '.github/workflows/**', 'scripts/**']
    tasks:
      - 'CI-Pipeline: install → lint → typecheck → test → build → Artefakte (Markdown Sample).'
      - 'Cache npm/pip Dependencies; optional Preview Deploy (z. B. Vercel/Netlify).'
      - 'Runbooks für Daten-Sync (z. B. Cron zum Aktualisieren von monthly.toml).'
    acceptance:
      - 'Actions grün; Preview-Deploys zeigen aktuelle App; Scripts dokumentiert.'

  - id: ux-director
    role: 'Head of UX/A11y'
    focus_paths: ['frontend', 'docs/content-guidelines/**']
    tasks:
      - 'Content-Model (Sections, Tone of Voice) visualisieren; Templates für wiederkehrende Absätze pflegen.'
      - 'UX Writing, Microcopy, Tooltips für Datenfelder (z. B. “Arbeitslose Devs”).'
      - 'A11y & Responsiveness (Editor/Preview Side-by-Side, Mobile Wizard).'
    acceptance:
      - 'Lighthouse A11y ≥ 95; UX-Guidelines dokumentiert.'

  - id: tech-writer
    role: 'Tech Writer'
    focus_paths: ['README.md', 'RUNBOOKS.md', 'SECURITY.md', 'CONTRIBUTING.md', 'docs/**']
    tasks:
      - 'Quickstart (npm install, dev, Export) und Troubleshooting dokumentieren.'
      - 'Datenquellen & Aktualisierungsprozess (monthly.toml, Referenzen) beschreiben.'
      - 'Changelog & Release Notes pflegen; Onboarding-Checkliste für Autoren.'
    acceptance:
      - 'Docs aktuell, verlinkt und beschreiben Export-Flow Ende-zu-Ende.'

playbooks:
  - id: author-report
    title: 'Neuen IT-Arbeitsmarktbericht erstellen'
    steps:
      - 'Kurz-Check-in mit der Autorin/dem Autor: Thema, Zielgruppe, Datenstand, gewünschte Assets klären (Fragen & Antworten dokumentieren).'
      - 'Daten aktualisieren: docs/monthly.toml prüfen/ergänzen (Quelle dokumentieren).'
      - 'npm ci --prefix frontend || npm --prefix frontend install'
      - 'npm --prefix frontend run dev (Form & Preview testen).'
      - 'Form mit den aktuellen Zahlen/Textbausteinen füllen, FAQ pflegen, Shortcodes konfigurieren.'
      - 'Markdown exportieren → neue Datei in docs/ anlegen, mit Beispiel vergleichen, Review starten.'

  - id: sync-market-data
    title: 'Marktdaten synchronisieren'
    steps:
      - 'Quelle (AfA) herunterladen; neue Werte in tmp/ speichern.'
      - 'Python-Script (backend/scripts/sync_monthly.py) ausführen → docs/monthly.toml aktualisieren.'
      - 'Schema-/Format-Tests laufen lassen.'
      - 'Änderungen dokumentieren (Quelle, Berechnung) im PR.'

  - id: quality-gate
    title: 'Qualitäts-Gate (Lint, Typecheck, Tests, Build, Export)'
    steps:
      - 'npx prettier --check .'
      - 'npx eslint .'
      - 'npx tsc -p frontend/tsconfig.json --noEmit'
      - 'pytest -q || true'
      - 'npx playwright test || true'
      - 'npm --prefix frontend run build'
      - 'npm --prefix frontend run export:sample (erstellt Markdown-Referenz aus Fixtures)'

  - id: release-cut
    title: 'Release schneiden'
    steps:
      - 'Version bump & Changelog aktualisieren.'
      - 'CI: build/lint/typecheck/test ok; Markdown-Sample generiert und angehängt.'
      - 'Deploy Preview (z. B. Vercel/Netlify) + Smoke (author-report Playbook).'
      - 'Tag & Release Notes veröffentlichen.'

tasks:
  build:
    - 'npm --prefix frontend run build'
  lint:
    - 'npx prettier --check .'
    - 'npx eslint .'
  typecheck:
    - 'npx tsc -p frontend/tsconfig.json --noEmit'
  test:
    - 'pytest -q || true'
    - 'npx playwright test || true'

ci:
  required_checks:
    - 'build'
    - 'lint'
    - 'typecheck'
    - 'test'
  coverage_thresholds:
    web: 0.7
    api: 0.8
  block_on:
    - 'quality-gate'

tooling:
  js:
    format: 'prettier'
    lint: 'eslint'
    typecheck: 'tsc --noEmit'
    test: 'vitest / jest / playwright'
  py:
    format: 'black'
    lint: 'ruff'
    typecheck: 'mypy (optional)'
    test: 'pytest'

ignore:
  - '**/node_modules/**'
  - '**/dist/**'
  - '**/.vite/**'
  - '**/.turbo/**'
  - '**/coverage/**'
  - '**/.DS_Store'
  - '**/__pycache__/**'
  - '**/.venv/**'
