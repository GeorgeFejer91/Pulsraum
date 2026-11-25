# Pulsraum

Offene Biosensorik für Gesundheit und kreative Medien zur Stressregulation.

Eine deutschsprachige Projektseite mit vier Bereichen: Projekt, Anwendungen, Team und Mitmachen. Die geplanten Browseranwendungen sollen Herz- und Atemsignale von Smartphone und Polar H10 lokal verarbeiten. Diese Seite ist eine Projektvorstellung, kein Messgerät und kein Nachweis klinischer Validierung.

Website: https://pulsraum.eu/

## Lokal ansehen

Die fertigen statischen Dateien sind eingecheckt. Zum Anzeigen reicht `python -m http.server 8080`. Zum Aktualisieren der lokal bereitgestellten Textmessung: `npm ci --ignore-scripts`, dann `npm run build`. `npm run check` prüft die Syntax des kleinen Website-Moduls. Pretext 1.0.0 ist fest gepinnt; dessen Lizenz steht in `assets/pretext/LICENSE`.

GitHub Pages veröffentlicht `main` aus dem Repository-Stamm. `CNAME` enthält die eigene Domain. Für die Stammdomain werden beim Domainanbieter entweder ein ALIAS zu `GeorgeFejer91.github.io` oder die vier offiziellen GitHub-Pages-A-Records eingerichtet. `www` erhält einen CNAME zu `GeorgeFejer91.github.io`. Private Bewerbungsunterlagen gehören nicht in dieses öffentliche Repository.

AI-agent project context starts at [`for-ai/README.md`](./for-ai/README.md).

Repository: https://github.com/GeorgeFejer91/Pulsraum
Visibility at initialization: public
