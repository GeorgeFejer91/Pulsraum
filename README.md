# Pulsraum

Offene Biosensorik für Gesundheit und kreative Medien zur Stressregulation.

Eine deutschsprachige Projektseite mit vier Bereichen: Projekt, Anwendungen, Team und Mitmachen. Die geplanten Browseranwendungen sollen Herz- und Atemsignale von Smartphone und Polar H10 lokal verarbeiten. Diese Seite ist eine Projektvorstellung, kein Messgerät und kein Nachweis klinischer Validierung.

Website: https://pulsraum.eu/

## Lokal ansehen

Die fertigen statischen Dateien sind eingecheckt. Zum Anzeigen reicht `python -m http.server 8080`. Zum Aktualisieren der lokal bereitgestellten Textmessung: `npm ci --ignore-scripts`, dann `npm run build`. `npm run check` prüft die Syntax des kleinen Website-Moduls. Pretext 1.0.0 ist fest gepinnt; dessen Lizenz steht in `assets/pretext/LICENSE`.

Nach jeder Repository-Änderung und nach jeder Veröffentlichung die gerenderte Website auf Desktop und Smartphone prüfen. Die vollständigen Prüfschritte stehen in [for-ai/VERIFICATION.md](./for-ai/VERIFICATION.md).

GitHub Actions prüft das gerenderte Veröffentlichungsartefakt in Chromium und WebKit. GitHub Pages veröffentlicht dieses Artefakt nach bestandener Prüfung auf `main`. Die eigene Domain ist in den GitHub-Pages-Einstellungen hinterlegt. Die Stammdomain nutzt die GitHub-Pages-A-Records und `www` verweist per CNAME auf `GeorgeFejer91.github.io`.

AI-agent project context starts at [`for-ai/README.md`](./for-ai/README.md).

Repository: https://github.com/GeorgeFejer91/Pulsraum
Visibility at initialization: public
