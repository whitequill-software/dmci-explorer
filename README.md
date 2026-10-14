# DMCI Explorer

An independently owned, responsive React + Vite + Tailwind CSS website for **DMCI Explorer — DMCI Homes for Families**. No Base44 SDK, account, backend, or subscription is required.

Live preview: https://dmci-explorer.pages.dev/

Source: https://github.com/whitequill-software/dmci-explorer

The preview is hosted as a Cloudflare Pages Direct Upload project. GitHub automatic deployment is not enabled. Updates require a fresh build and direct upload (or authenticated Wrangler deployment). The custom domain and DNS remain unchanged.

## Migration status

The reference at https://dmci-nest-guide.base44.app displayed **“DMCI Explorer isn't available yet”** on 14 October 2026. Its original pages, design, assets, mascot, and backend features could not be inspected. This is a **provisional implementation based on the supplied brand brief**, not a verified recreation. The explorer, neighborhood, and conceptual floor plans are original SVG artwork. Replace them with authorized original assets when available. See [inspection report](docs/INSPECTION.md) and [feature status](docs/FEATURES.md).

## Local setup

Install Node.js 22.12 or newer (Node 24 works), then:

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. To check the production build:

```sh
npm test
npm run build
npm run preview
```

Use `npm run format` to format the source before committing. The Vite configuration preserves symlink paths to support the local Windows sandbox without changing the production output.

## Structure

```text
src/
  App.jsx                      Page sections, navigation, filters, FAQ, planner
  main.jsx                     React entry point
  styles.css                   Responsive design and Tailwind import
  planner.js                   Portable home brief export
  components/Illustrations.jsx Original SVG mascot and illustrations
  data/content.js              Editable home guides and FAQ content
public/
  favicon.svg                  Original compass mark
  _headers                     Cloudflare security and cache headers
  robots.txt                   Crawler policy
docs/                          Inspection, deployment, feature status
tests/                         Brief export checks
```

## Deploy

Cloudflare Pages configuration: framework **React (Vite)**, build command **npm run build**, output directory **dist**, production branch **main**. Use Node 24. See [deployment guide](docs/DEPLOYMENT.md). Only publish the generated `dist` files for direct upload; never upload `node_modules`, credentials, or your entire workspace. GitHub-connected deployment is preferred for automatic updates.

## Maintenance

1. Create a branch before larger edits; update copy in `src/data/content.js` and sections in `src/App.jsx`.
2. Run tests, build, and review desktop and narrow mobile layouts, menu, filters, FAQ, and downloaded brief.
3. Commit and push to GitHub. With Cloudflare Git integration, review the preview deployment before merging to `main`.
4. Update packages intentionally and commit `package-lock.json`. Run `npm audit` and review each proposed upgrade before applying it.
5. Keep original licensed artwork and property data provenance documented. Never present illustrative plans as actual layouts.
6. For rollback, redeploy a previous successful deployment in Cloudflare Pages or revert the relevant commit.

## Privacy and credentials

No visitor analytics, storage cookies, lead submission, or external services are configured. The planner uses React state in memory and creates a local text download. It does **not** save or send inquiries. No contact destination was supplied, so no email, phone number, Messenger account, or fake success state has been invented. Hosting access logs remain subject to Cloudflare's policies.

Never place API keys in React code or `VITE_*` variables: those values are public in the browser. Future integrations requiring secrets must use server-side functions and environment secrets. `.env*`, `.wrangler/`, dependency folders, and build output are ignored by Git.

## Future expansion

Keep verified listings in a dedicated data module or CMS adapter; add routing for project detail pages. Use lazy-loaded model viewers for licensed GLB assets. Put pricing rules in a versioned pure computation module. Add authenticated server-side endpoints for CRM delivery, rate limiting, spam protection, explicit privacy consent, and verified delivery before activating inquiries. AI and Messenger services require their own account configuration and privacy review. Interior styling eligibility and terms must be approved before publication.

## Costs and ownership

This source has no subscription requirement. The initial static website is intended for Cloudflare Pages' free plan, subject to its current limits. No paid resources, Base44 purchases, or domain/DNS changes are authorized or needed for the preview deployment. Domain registration renewal is separate from hosting. Future AI, CRM, email delivery, media storage, and 3D assets may add costs; review alternatives before enabling them.
