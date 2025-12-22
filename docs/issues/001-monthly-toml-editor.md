# Issue: monthly.toml Editor im Frontend

- **Titel**: Monatsdaten direkt in der App erfassen und als TOML exportieren
- **Beschreibung**: Aktuell können wir `docs/monthly.toml` nur lesen. Ziel ist eine UI, mit der neue Monatswerte eingegeben, validiert und anschließend als TOML-Datei exportiert werden können (zum manuellen Austausch im Repo oder später automatischem Commit).
- **Use Case**: Autor trägt die aktuellen IT-Arbeitsmarkt-Zahlen ein, klickt auf „TOML aktualisieren“, bekommt die neue Datei als Download und ersetzt damit `docs/monthly.toml`.
- **Akzeptanzkriterien**:
  1. Formular für alle Segmente (`it_aggregate`, `it_jobs`, `germany`, `infra_aggregate`, `infra_jobs`, `software_aggregate`, `software_jobs`).
  2. Clientseitige Validierung (Pflichtfelder, Zahlen, Monate).
  3. Export liefert formatierte TOML-Textdatei, die kompatibel zum bestehenden Schema ist.
  4. Schritt-für-Schritt-Guide im README.
- **Nach Phase**: Kann nach Phase 4 (Preview & Export) geplant werden, sobald Schema & Form stehen.
