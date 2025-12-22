# Issue: Zweiter Writer für thematische Blogposts

- **Titel**: Blogposter um einen zweiten Writer erweitern (Themen-Posts vs. IT-Arbeitsmarkt)
- **Beschreibung**: Die aktuelle UI ist als Standard-Oberfläche für IT-Arbeitsmarktberichte ausgelegt (Frontmatter + Monatsdaten + Shortcodes). Ergänzend wünschen wir einen zweiten Writer-Modus innerhalb derselben App, der sich auf „normale“ thematische Blogposts konzentriert. Dieser Modus benötigt angepasste Felder (z. B. kein monthly.toml, andere Defaulttexte, evtl. schlankere Shortcode-Liste) und soll parallel zur bestehenden Arbeitsmarkt-Ansicht existieren.
- **Use Case**: Autor entscheidet am Start, ob der Artikel ein IT-Arbeitsmarktbericht oder ein thematischer Blogpost ist. Bei Auswahl „Blogpost“ öffnet sich die neue UI mit passenden Defaults, sodass auch nicht-programmierende Nutzer schnell Inhalte erstellen können.
- **Akzeptanzkriterien**:
  1. Mode-Switch oder Auswahl auf der Startseite („Arbeitsmarktbericht“ vs. „Themen-Blogpost“) ohne Reload.
  2. Für „Blogpost“ stehen reduzierte/angepasste Felder bereit (z. B. Titel, Slug, Kategorien, Key Visual, Body, optionale FAQ), keine Monatsdaten.
  3. Export (Download + Copy) funktioniert in beiden Modi und erzeugt jeweils passende Frontmatter/Markdown-Strukturen.
  4. README/How-To enthält eine kurze Erklärung, wann welcher Writer genutzt wird.
  5. Tests (mindestens 1 Unit + 1 E2E) stellen sicher, dass beide Writer rendern und exportieren.
- **Priorität / Planung**: Nach Abschluss von Sprint 01 (Phase 5) einplanen; Aufwand vermutlich eigener Sprint, da UI + Tests + Docs angepasst werden müssen.
