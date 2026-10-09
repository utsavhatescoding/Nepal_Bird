# Nepal Bird ID — Mobile and tablet update

## Deploy this complete project

Extract Nepal_Bird_Mobile_Update.tar.gz. Open Terminal in the extracted Nepal_Bird_Mobile_Update folder (the folder with package.json).

```bash
npm ci
npm run build
npx wrangler deploy --assets ./dist --name nepal-bird --compatibility-date 2026-10-09
```

If Wrangler asks you to sign in, run `npx wrangler login`, then repeat the deployment command.

To update your existing GitHub checkout instead, merge the contents of this folder into the existing project folder, replace matching files and keep its .git directory. Then run the commands above in that project folder. A GitHub push alone does not update a manually deployed Cloudflare Worker.

## Mobile changes

- Five fixed bottom tabs with consistent vector icons and active states. Tap the logo to return home.
- Compact sticky header at phone and tablet widths, with safe-area padding for phone home indicators.
- Phone home artwork separated from copy, with a clear full-width identification button.
- Responsive reading sizes, shorter section spacing, consistent rounded cards and aligned arrows.
- Full-width upload and camera controls, filters and actions with comfortable touch targets.
- Tablet columns adjusted for identification, ecology lessons, donation information and species cards.
- Species dialogs with a 44px close control and scrollable content. Toasts sit above navigation.

The new navigation applies through 1024px. Desktop navigation and composition are retained.

## Verification

Production build passed. All six routes checked at 320, 390, 600, 640, 768, 820, 1024, 1100 and 1440px without document overflow. Bottom navigation targets exceed 44px. Active route state, guide search, species dialog, saving a field note, notebook navigation and ecology role switching passed without JavaScript page errors. Phone and tablet screenshots reviewed. These checks use browser emulation; physical-device camera and inference performance were not benchmarked by this layout update.
