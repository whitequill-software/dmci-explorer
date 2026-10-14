# DMCI Explorer

React, Vite and Tailwind CSS recreation of the eight screenshots in `dmci explorer.pptx`.

## Run

Node.js 20.19+ or 22.12+.

```sh
npm ci
npm run dev
npm test
npm run build
```

## Cloudflare Pages through GitHub

1. Create a GitHub repository and push this project folder, including `package-lock.json`. Do not commit `node_modules`, `dist`, credentials, or `.env` files.
2. In Cloudflare Pages, connect that repository. Framework preset: Vite. Build command: `npm run build`. Output directory: `dist`. Set `NODE_VERSION` to `22`.
3. Use the assigned Pages preview domain first. A live domain has not been modified by this work. Configure a custom domain only with owner authorization.

All assets and fonts are local. Hash navigation and article preview routes work on static hosting. `_headers` and `_redirects` are supplied. `.openai/hosting.json` is Sites hosting metadata; Cloudflare Pages does not require it.

## What works

- Responsive eight-section homepage, original supplied hero artwork and explorer mascot, sticky navigation and mobile menu.
- Location and bedroom filter controls. The five owner-requested projects are shown. Bedroom selections show an explicit unverified-inventory state because no bedroom inventory was supplied.
- Project detail dialogs, inquiry preselection, journal index, deep-linked article previews, keyboard-accessible dialogs and native focus trapping.
- Inquiry validation (name, 10–15-digit telephone, optional email format, consent). **No data is transmitted or persisted. The button says Validate Inquiry.** Valid input produces a clear “NOT sent or saved” status.

## Required before public launch

- Verify all five requested projects, their locations and descriptions. One Delta Terraces and The Cameron have no supplied location or specifications. No official inventory feed, prices, dates, unit specifications or available bedroom configurations were supplied.
- Supply original property photos, journal photos, full articles, original logo files, high-resolution hero artwork, floor plans, dimensions and 3D assets. The hero is cropped from slide 1; other screenshot placeholders are intentionally retained. No unrelated stock images or invented projects were added.
- Confirm brand usage permission, independent-marketer affiliation, interior styling eligibility and service terms. Reference claims are not independently verified.
- Provide verified phone, email, business address and approved privacy/service policies. The owner supplied https://www.facebook.com/dmciexplorer; Facebook links use this page and chat links use https://m.me/dmciexplorer. Confirm Messenger is enabled on the page. Placeholder phone/email from the deck are not actionable contacts.
- Connect inquiry delivery using a Cloudflare Pages Function/Worker or another approved server. Validate server-side, verify consent, apply rate limiting/spam protection, configure secrets, a real recipient or CRM, retention controls and error handling. Only after successful delivery/storage should the UI offer Send Inquiry and show a receipt. Do not expose API secrets in client code or enable a simulated success message.
- Viewing scheduling, CRM, email notifications, floor-plan gallery, layout viewer, comparison engine and 3D tours require integrations/content. These are explicitly marked as previews or pending.

No subscriptions purchased. No user live domain changed. Source repository: https://github.com/whitequill-software/dmci-explorer. Cloudflare preview: https://dmci-explorer.pages.dev/. The existing Cloudflare project uses Direct Upload; GitHub pushes do not trigger deployment.

## Instant preview

Open `DMCI-Explorer-Preview.html` supplied beside the source ZIP in Chrome or Edge. Everything needed to render it is embedded; only Facebook/Messenger navigation needs an internet connection. If an older preview is already open, close it and open the updated file. The preview includes hover effects; system reduced-motion settings intentionally suppress movement.

To regenerate the single-file preview after changing the source, run `npm run build`, then `python scripts/export-preview.py`.

## This revision

All five requested projects; reusable Header, PropertyCard, ArticleCard and visual components; responsive navigation with current-section indicators; original mascot image without mobile cropping; restrained card lifts, icon motion, button feedback and entry animation; reduced-motion support; public Facebook/Messenger configuration; a privacy/integration notice above the inquiry fields. Future tool cards are individually labeled as previews. Fonts are limited to the required Latin subset to reduce download size.

See INTEGRATIONS.md for the future server boundary and LAUNCH-CHECKLIST.md for the remaining owner-provided information. The existing Cloudflare Pages Direct Upload project is used for this release. Future releases require building and uploading `dist` again. To enable native Git-triggered builds, create a separate Git-connected Pages project; never change the custom domain without owner approval.
