# Levi Vo Portfolio

A static portfolio using HTML, CSS, and vanilla JavaScript. The interactive 3D orbit is rendered with the Canvas API. No Node dependencies or build step are required.

## Run locally

From this folder, run:

```sh
python3 -m http.server 4173 --directory dist
```

Then open http://localhost:4173. You can also open dist/index.html directly.

## Edit

- dist/index.html: content, sections, profile and project links
- dist/style.css: typography, colors, layouts, responsive styles
- dist/app.js: 3D orbit, pointer interaction, motion controls
- dist/Levi_resume.pdf: downloadable resume

The project illustrations are interface concepts. Fonts load from Google Fonts, with local sans-serif fallbacks. Motion respects the system reduced-motion preference.

