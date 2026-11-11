# Aayush Gupta research portfolio — updated web explorer

This folder is the **complete website**, including the research pages, microscopy images, protocols, posters, PDFs, and the updated web explorer.

## Upload to GitHub Pages

Upload/replace the **contents** of this folder in your GitHub Pages repository (the same directory where `index.html` currently lives). Keep the filenames and image/PDF files together. Commit the changes. Do not upload the containing `aayush-website/` directory as a nested folder unless your published site is configured to serve from there.

Files changed:
- `index.html`, `research.html`, and `protocols.html`: each now loads `browser.css`.
- `browser.js`: replaces the former iframe-history implementation with a clean in-page explorer and explicit same-tab navigation.
- `browser.css`: styles the explorer to match the website's existing color tokens, including mobile and dark mode.

Files not otherwise changed: the original research material, PDFs, images, content, and primary site layout.

## How it works

1. Scroll to the footer on any of the three pages and click the discreet globe button.
2. Search Google or enter a website name, e.g. `wikipedia.org`.
3. If the website permits being displayed inside another page, it can load inside the explorer panel.
4. For sites that block embedding (including many social media sites), click **Open full site in this tab**. It navigates the existing tab. It never intentionally creates a second browser tab or popup.
5. Use your browser's **Back** command to return to the portfolio.

The explorer home also has shortcuts for PubMed, Wikipedia, Google, Instagram, TikTok, X, Reddit, and YouTube.

## Technical limitations

There is no way to make all social media pages run inside a static GitHub Pages website by changing the search engine. Many use `X-Frame-Options` or Content Security Policy `frame-ancestors` to disallow iframes. The iframe attempt may show a blank page or a browser error. The same-tab button is the practical workaround. Login, cookies, and interactive content may not work in embedded mode.

The explorer's Back/Forward buttons track addresses typed or clicked **in the explorer controls**, not third-party links clicked inside an iframe. The normal browser Back button works for a same-tab full-site navigation.

No site content is proxied or altered, and this change adds no API keys, analytics, or third-party packages.
