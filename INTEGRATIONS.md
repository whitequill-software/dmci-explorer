# Integrations

## Inquiry → HubSpot (implemented, disabled until configured)

The React inquiry form now submits same-origin JSON to `functions/api/inquiries.js` at `/api/inquiries`. The server validates every field, requires explicit versioned consent and server-verified Turnstile, and creates or updates HubSpot contacts using the September 2026 Contacts API. Only a confirmed CRM write produces success; errors preserve the draft. Authentication is stored in Cloudflare secrets, never frontend variables.

See [HUBSPOT_SETUP.md](./HUBSPOT_SETUP.md) for exact test-account setup, required contact properties, Preview secrets/variables, approval gate, testing and operational limitations. Inquiry consent does not authorize marketing subscriptions. Owner approval of final consent, privacy terms, controller contact and retention is still required before enabling collection. No production deployment is included.

## Remaining integrations

## OpenAI inquiry assistant (implemented, Preview configuration pending)

`/api/chat` and `/api/messenger` share `server/chat/engine.js`. Website messages use same-origin JSON, an HTTP-only session cookie and per-message Turnstile verification. Messenger verifies Meta's raw-body HMAC, queues signed events, and processes them in the separate preview consumer Worker. D1 isolates session context, leases, deduplicated event results and usage quotas. OpenAI Responses API performs structured extraction with evidence; deterministic replies avoid invented pricing, inventory and bookings. Clients review their details before the server writes to HubSpot. Floor and budget are also available in the original inquiry form.

The agent has no generic CRM tool, contact-ID selection or authority to infer consent. Unknown preferences do not clear existing CRM values. Human requests and Page replies pause AI replies. Both channels and CRM delivery are disabled by default. See [CHAT_SETUP.md](./CHAT_SETUP.md) for all remaining Preview resources, secrets, approval requirements, Meta connection steps, retention limits and tests. No agent is deployed or live as part of this change.

The homepage stays a static React application on Cloudflare Pages. Add server features only when an approved service is ready.

## Current separation

- `src/components.jsx`: reusable header, brand, icon, image placeholder, property card and journal card.
- `src/data.js`: supplied projects, article previews, inventory filtering and browser validation. `location: null` means unknown, never an inferred location.
- `src/config.js`: public Facebook and Messenger destinations only. `.env.example` documents overrides. The Facebook page was supplied by the owner; the Messenger URL uses its page username. Account-side Messenger settings must be checked before public launch.
- `src/main.jsx`: page composition, inquiry draft state, same-origin submission and dialogs. No persistent browser personal data.
- `src/style.css` and `src/motion.css`: visual system, responsive layout and reduced-motion-aware animations.

## Server boundary

When connecting leads, put a same-origin `/api/inquiries` Pages Function or Worker between the browser and CRM. Validate inputs and consent again on the server, apply abuse protection, and return success only after confirmed acceptance. Handle failures without losing the current draft. Store keys with Cloudflare secrets; never use `VITE_` for secrets.

Keep separate server adapters for Google Sheets/HubSpot, Gemini, lead qualification, follow-up, scheduling and computation generation. Share a validated inquiry payload: name, phone, optional email, project identifier, bedroom preference, message and explicit consent. Final consent version, lawful processing terms and retention policy require owner approval before enabling collection. Do not add unaudited CRM calls directly in React.

Messenger links open the owner's chat channel. The prepared AI assistant requires the Meta webhook/server configuration in CHAT_SETUP.md; no Meta access token belongs in the frontend. Site-visit scheduling needs a confirmed scheduling provider and availability source. Floor plans, comparisons, 3D views and computations need approved project data/assets before becoming live tools. Future project pages can consume the same project records/cards, with stable identifiers and a router added when needed.

Other future services remain disconnected; no scheduling or live AI delivery is simulated.
