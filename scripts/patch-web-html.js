#!/usr/bin/env node
// Post-build patch for the static HTML that `expo export -p web` generates.
//
// `web.output: "single"` in app.json gives us a minimal SPA shell whose <head>
// we don't otherwise control (the +html.tsx pattern only works for "static"
// output). iOS Safari needs viewport-fit=cover on the viewport meta tag for
// env(safe-area-inset-*) to be non-zero, so the bottom tab bar can clear the
// iOS Home Indicator. We bake that — plus a few PWA meta tags — into the
// shipped HTML here, after Expo finishes its export.

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'dist', 'index.html');

if (!fs.existsSync(HTML_PATH)) {
  console.error(`patch-web-html: ${HTML_PATH} not found — run \`expo export -p web\` first.`);
  process.exit(1);
}

let html = fs.readFileSync(HTML_PATH, 'utf8');

// 1. Replace the viewport meta — add viewport-fit=cover.
html = html.replace(
  /<meta name="viewport"[^>]*\/?>/i,
  '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"/>',
);

// 2. Add PWA / iOS standalone meta tags after the viewport (idempotent).
const extra = [
  '<meta name="apple-mobile-web-app-capable" content="yes"/>',
  '<meta name="apple-mobile-web-app-status-bar-style" content="default"/>',
  '<meta name="theme-color" content="#FAF7F2"/>',
];
for (const tag of extra) {
  const tagName = tag.match(/name="([^"]+)"/)[1];
  if (!html.includes(`name="${tagName}"`)) {
    html = html.replace('</head>', `  ${tag}\n  </head>`);
  }
}

// 3. Ensure <html> has dir="rtl" and lang="he" so the SPA loads RTL before JS.
html = html.replace(/<html\b([^>]*)>/i, (match, attrs) => {
  let next = attrs;
  if (!/\blang=/.test(next)) next += ' lang="he"';
  if (!/\bdir=/.test(next)) next += ' dir="rtl"';
  return `<html${next}>`;
});

// 4. Inject a stylesheet that uses the dynamic-viewport unit (100dvh) for the
//    app shell. iOS Safari's `env(safe-area-inset-bottom)` accounts only for
//    the Home Indicator — NOT the floating bottom toolbar. Using 100vh leaves
//    the page rendering UNDER the toolbar, hiding the bottom tab bar's labels.
//    100dvh shrinks the page when the toolbar is shown, so the tab bar always
//    sits visibly above whatever browser chrome is currently rendered.
const styleTag = `
    <style>
      html, body { height: 100dvh; overflow: hidden; margin: 0; }
      body > div[id="root"] { height: 100dvh; }
    </style>`;
if (!html.includes('height: 100dvh')) {
  html = html.replace('</head>', `${styleTag}\n  </head>`);
}

fs.writeFileSync(HTML_PATH, html);
console.log('patch-web-html: dist/index.html patched (viewport-fit=cover + PWA meta + RTL + 100dvh).');
