# Nepal Bird ID — Ecology update

This update is designed for the existing root-level Nepal_Bird repository and Cloudflare Pages deployment.

## Update your existing checkout

Copy the contents of this ZIP's `web` folder into your local website folder (the one containing package.json). Merge folders and replace matching files. Keep your existing `.git` directory. Do not put a second `web` folder inside your root-level repository. Model weights, class mapping, browser preprocessing and prediction logic are unchanged.

Run:

```bash
npm ci
npm run dev
```

Review locally, then push:

```bash
git add .
git commit -m "Add ecology learning and improve the bird guide"
git push origin main
```

Cloudflare settings remain: root directory blank, build command `npm run build`, output `dist`.

## Added

- Birds & ecology section: ecological roles, indicator science, taxonomy and ornithology, observation habits, conservation actions and six resources.
- Interactive ecological-role buttons and in-page topic links.
- Field-guide photos beside each species, loaded only near the viewport with four concurrent requests. Reference photographs use the existing Wikimedia lookup and retain source/licence attribution. This is an external search, not a curated photo catalogue; image correctness needs editorial review. Failed requests provide a reference-image search link.
- Purpose story with project artwork, project principles and existing contributor details.
- Rasuwa flood solidarity section linking to Nepal's official Prime Minister Disaster Relief Fund portal and official appeal. No payments are processed by this app. The fund is nationwide, not a Rasuwa-specific earmarked fund.

## Sources and editorial review

Reviewed 9 October 2026. Links are external; no partnership is implied.

- Ecological functions: https://www.birdlife.org/news/2019/01/04/why-we-need-birds-far-more-than-they-need-us/
- Bird indicators: https://www.birdlife.org/state-of-the-worlds-birds/
- Conservation in Nepal: https://birdlifenepal.org/
- Taxonomy: https://www.worldbirdnames.org/new/
- Ornithology: https://www.birds.cornell.edu/home/
- Citizen science: https://ebird.org/
- Current assessments: https://www.iucnredlist.org/
- Flood appeal: https://www.opmcm.gov.np/content/592/a-heartfelt-appeal-to-all-to-provide/
- Government-confirmed donation portal: https://my.nepalembassy.gov.np/content/82/online-financial-support-to-prime-minister-s-disaster/
- Donations: https://pmdrf.nchl.com.np/

Historical species status fields through 2022 were retained, not updated to current IUCN assessments. The model supports 85 species, returns uncalibrated scores, and cannot reliably reject non-bird images. Grad-CAM remains excluded as requested.

## Verification

Production build passed. Browser checks verified all six routes at 320/390/768/1440 px without page overflow, ecological role switching, topic navigation, taxonomy disclosure, guide search and notebook persistence. A controlled image-response fixture verified photo rendering and attribution; this does not establish live image availability. Production upload returned the expected reference top-three ranking, recovered from an interrupted model download, and cleared stale results after a crop change. Physical phone inference performance remains to be tested.

Screenshots in `docs`: ecology and purpose desktop/mobile previews. Older screenshots represent the earlier release.


## Branding and reading update — 9 October 2026

- Wider layout: at 1920 px, the main hero is 1776 px wide (72 px side padding). Desktop hero body copy is 19 px, mobile 16 px. Article text is generally 16–18 px; attribution text remains smaller.
- New vector bird mark in forest green, sage and ivory. Header and footer share the mark. A transparent SVG wordmark is included at public/assets/nepal-bird-logo.svg.
- SVG favicon, 16/32/48 px ICO, 32 px PNG and 180 px Apple touch icon.
- Exact 1200 × 630 PNG link-preview artwork at public/assets/nepal-bird-social-v2.png.
- Open Graph and Twitter large-image metadata. Cloudflare supplies CF_PAGES_URL during builds, and the new postbuild script uses it to set an absolute image URL. When you connect your purchased domain, set SITE_URL to the complete https URL in your Cloudflare build environment. This is optional for your current pages.dev deployment.
- The build command is still npm run build. It now runs Vite and the social-metadata script.
- Responsive checks passed at 320/390/768/1440/1920 px. Brand assets loaded, no horizontal document overflow or JavaScript page errors. The Open Graph and Twitter image URL generation was verified with a controlled deployment URL. Live social-platform unfurling remains to be checked after you deploy.

Use the current screenshots named docs/brand-home-*.png. Earlier screenshots show older layouts. Artwork generation is vector/HTML based; regenerate with node scripts/render-brand.mjs when a Playwright browser is installed. ICO files are already provided; regeneration is not required to deploy.
