# Pulsraum

Offene Biosensorik für Gesundheit und kreative Medien zur Stressregulation.

Eine deutschsprachige Projektseite mit vier Bereichen: Projekt, Anwendungen, Team und Mitmachen. Die geplanten Browseranwendungen sollen Herz- und Atemsignale von Smartphone und Polar H10 lokal verarbeiten. Diese Seite ist eine Projektvorstellung, kein Messgerät und kein Nachweis klinischer Validierung.

Website: https://pulsraum.eu/

## Lokal ansehen

Die fertigen statischen Dateien sind eingecheckt. Zum Anzeigen reicht `python -m http.server 8080`. Zum Aktualisieren der lokal bereitgestellten Textmessung: `npm ci --ignore-scripts`, dann `npm run build`. `npm run check` prüft die Syntax des kleinen Website-Moduls. Pretext 1.0.0 ist fest gepinnt; dessen Lizenz steht in `assets/pretext/LICENSE`.

GitHub Pages veröffentlicht `main` aus dem Repository-Stamm. `CNAME` enthält die eigene Domain. Die vier A-Records für die Stammdomain und der `www`-CNAME werden beim Domainanbieter eingerichtet. Private Bewerbungsunterlagen gehören nicht in dieses öffentliche Repository.

Eine deutschsprachige Projektseite fuer offene Biosensorik und selbstbestimmtes Biofeedback mit lokaler Datenverarbeitung.

This repository was initialized on 2026-11-25. Product structure is
intentionally not scaffolded until the first real deliverable selects it.

AI-agent project context starts at [`for-ai/README.md`](./for-ai/README.md).

Repository: https://github.com/GeorgeFejer91/Pulsraum
Visibility at initialization: public
