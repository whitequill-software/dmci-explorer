# Cloudflare Pages deployment

## Current deployment

The project `dmci-explorer` is deployed at https://dmci-explorer.pages.dev/ using **Direct Upload**. The source repository is https://github.com/whitequill-software/dmci-explorer. No custom domain was attached, and DNS was not changed. No paid resources were selected.

For updates, run `npm ci`, `npm test`, and `npm run build`; upload a ZIP of the contents of `dist` using **Create a new deployment** in the existing project, or use authenticated Wrangler. GitHub pushes alone do not update this deployment.

Cloudflare does not allow an existing Direct Upload project to switch to Git integration. To use native automatic GitHub builds later, create a separate Git-connected Pages project and verify it before any domain migration. An alternative is a GitHub Actions upload workflow with a narrowly scoped Cloudflare credential stored as a repository secret; none is configured now. See the [official Direct Upload guide](https://developers.cloudflare.com/pages/get-started/direct-upload/).

## Preferred: connect GitHub

1. Sign in to Cloudflare and choose **Workers & Pages → Create application → Pages → Connect to Git** (dashboard labels can vary).
2. Select `whitequill-software/dmci-explorer`. If Cloudflare needs GitHub installation access, the account owner must approve the requested repository access.
3. Project name: `dmci-explorer` (subject to name availability). Production branch: `main`.
4. Framework: React (Vite). Build command: `npm run build`. Build output: `dist`. Root directory: repository root.
5. Set `NODE_VERSION=24` if needed. No API keys or other environment variables are needed.
6. Deploy on the free plan. Record and verify the returned `pages.dev` URL. Do not assume a URL until Cloudflare confirms it.

## Alternative: direct upload

Build locally with `npm ci` and `npm run build`. Create a Pages direct-upload project, then upload the contents of `dist` or a ZIP whose root contains `index.html`. Direct Upload and Git-connected project setup have different workflows; choose Git integration initially for automatic future updates.

An owner authenticated with the official Wrangler CLI can also use:

```sh
npx wrangler pages project create dmci-explorer --production-branch main
npx wrangler pages deploy dist --project-name dmci-explorer --branch main
```

Keep authentication tokens outside the source and shell history. Browser sign-in is preferable when no CLI credential is configured.

## Verify every deployment

- Open the returned preview URL and confirm the brand, hero, and SVG artwork render.
- Test widths around 390 px and 1440 px; check for horizontal overflow and readable content.
- Test all section links, mobile menu and close behavior, home filters, and FAQ expansion.
- Fill the planner, download a brief, and verify the selected values are present. Confirm it does not claim to submit a lead.
- Check keyboard navigation and reduced-motion behavior; confirm no browser errors or missing assets.
- Check HTTP 200, appropriate headers, and successful production build output.

## Custom domain — approval required

**No live DNS changes are part of the initial preview deployment.**

After the owner approves the preview, inspect existing DNS, record exact values, and confirm apex/`www` behavior and rollback steps. Then add `dmciexplorer.com` through the Pages project's custom-domain flow. Follow Cloudflare's instructions for the actual zone and authoritative DNS provider; do not guess records or change nameservers prematurely. Preserve email/MX/TXT records and unrelated services. Allow TLS issuance, verify redirects and HTTPS, and update canonical URL, sitemap, and social metadata only after successful cutover.

## Official references

- https://developers.cloudflare.com/pages/framework-guides/deploy-a-react-site/
- https://developers.cloudflare.com/pages/get-started/direct-upload/
- https://developers.cloudflare.com/pages/configuration/custom-domains/
- https://vite.dev/guide/
- https://tailwindcss.com/docs/installation/using-vite
