# Inquiry integration setup and verification

No production deployment, DNS change, CRM configuration change, or real CRM write is part of this pull request. Configure and test a **preview environment and test HubSpot account** first. Do not enable collection until the owner has approved the consent text in `src/inquiry.js`, privacy policy, controller contact and retention/deletion process. Update the visible privacy dialog with the approved policy before public collection; if consent wording changes, bump `CONSENT_VERSION` and configure the matching approved version.

## 1. Prepare HubSpot

As a HubSpot super admin or user with Developer tools access, open **Development → Keys → Service keys → Create service key**. On the Legacy Apps unavailable screen, the **Create a service key** button opens this flow directly. Name it `DMCI Explorer inquiries`. Click **Add new scope**, select only `crm.objects.contacts.read` and `crm.objects.contacts.write`, then **Update → Create** and confirm. Open the key's details and choose **Show → Copy**. This service key uses Bearer authentication with the current September 2026 Contacts API; store it in the existing `HUBSPOT_ACCESS_TOKEN` Cloudflare secret. No backend code change is needed. Do not paste it into GitHub, this document, chat, browser code, a `VITE_` variable, or a command argument. Legacy private app tokens remain an alternative only for accounts that still offer them; this account's screenshot confirms that legacy apps are unavailable.

In **Settings → Properties**, choose **Contact properties → Create property**. Create the following with these exact internal names. A group called `DMCI Explorer` is convenient. The integration intentionally does not require schema-write permissions or create properties at request time.

| Internal name | HubSpot field type | Purpose |
| --- | --- | --- |
| `dmci_phone_identity` | Single-line text; **require unique values** | Concurrent phone-only submission deduplication. This must be a unique property, not merely ordinary text. |
| `dmci_project` | Single-line text | Selected project name (existing form identifier) |
| `dmci_bedroom` | Single-line text | Bedroom preference |
| `dmci_floor` | Single-line text | Low floor, High floor, or No preference |
| `dmci_budget` | Single-line text | Client-stated amount/range, currency and total-price/monthly basis |
| `dmci_message` | Multi-line text | Latest inquiry message |
| `dmci_consent` | Single checkbox (boolean) | Explicit inquiry processing consent |
| `dmci_consent_version` | Single-line text | Exact version of displayed consent |
| `dmci_consent_text` | Multi-line text | Exact displayed consent text |
| `dmci_consent_at` | Single-line text | Server-generated ISO 8601 UTC timestamp |
| `dmci_source` | Single-line text | `DMCI Explorer website` |

Standard `firstname`, `lastname`, `phone`, and optional `email` are also written. Do not configure automatic marketing subscriptions based on `dmci_consent`: it covers inquiry handling only. Existing marketing preferences and lifecycle stage are untouched.

The ten DMCI fields other than `dmci_phone_identity` have now been created in HubSpot account 247694509 through the connected plugin, with the user's approval. The message and consent-text fields were created as string/text properties; multiline display is optional. The plugin cannot provision the unique-values setting: `dmci_phone_identity` still needs separate creation with uniqueness enabled. See [CHAT_SETUP.md](./CHAT_SETUP.md) for the new OpenAI website/Messenger assistant. An MCP connection in this chat does not grant the deployed server a HubSpot token.

## 2. Configure Cloudflare Pages Preview only

1. In Cloudflare, open **Turnstile → Add widget**. Use Managed mode and add the exact preview hostname you will test. Copy its public site key and secret key. Use a separate widget for public production later. Domain management and DNS changes are unnecessary.
2. Open **Workers & Pages → the existing DMCI Explorer Pages project → Settings → Variables and Secrets**, and select **Preview**. Do not choose Production.
3. Add `HUBSPOT_ACCESS_TOKEN` with type **Secret**; paste the service key from step 1. Add `TURNSTILE_SECRET_KEY` with type **Secret**; paste the widget secret. Save. Neither value belongs in build-time browser configuration.
4. Add the public variable `VITE_TURNSTILE_SITE_KEY` with the matching widget's site key. It is expected to appear in the browser bundle.
5. After owner approval of the policy and consent, add `APPROVED_CONSENT_VERSION=2026-10-15` and `INQUIRIES_ENABLED=true` as Preview variables. Until then, leave `INQUIRIES_ENABLED=false`; the endpoint returns HTTP 503 and writes nothing.
6. This repository documents the existing `dmci-explorer` Pages project as **Direct Upload**, so pushing this PR does not install the endpoint. `functions/api/inquiries.js` must remain in the repository root's `functions` tree (beside `src`, not inside `dist`). A static dashboard drag-and-drop upload of `dist` alone does not install Functions. Do not try to switch the existing project to Git integration or move its domains.
7. Only when ready to test, set the public site key in local `.env.local`, build locally, and use Wrangler from the repository root to upload a **preview branch**, as shown below. The `--branch feature/hubspot-inquiries` argument is essential: confirm the existing project's production branch is `main` before running. Wrangler uploads both assets and Functions. New variables/secrets take effect on a new deployment; rebuilding is required for a changed `VITE_` site key. These commands are provided for later preview testing and have not been executed:

```sh
npx wrangler login
npm ci
npm run build
npx wrangler pages deploy dist --project-name dmci-explorer --branch feature/hubspot-inquiries
```

Use the returned preview hostname in the Turnstile widget's allowlist. Rebuild with the widget's public site key if needed. Do not use `--branch main`. This guide does not authorize a production deployment. If the owner later uses a separate Git-integrated project, its build command is `npm run build`, output directory `dist`, root this repository, and Git builds bundle Functions automatically.

If branch pushes automatically generate Pages previews, the PR may trigger a preview build. Missing secrets or approval variables always leave this endpoint closed. Keep Production collection disabled until separately authorized.

## 3. Run automated checks locally

Requires Node.js 22 or newer and npm:

```sh
npm ci
npm test
npm run build
npx wrangler pages functions build functions --outdir .wrangler/functions-build
```

Tests use fake tokens and mocked upstream responses; they send no real CRM requests. Server tests cover validation, body limits, strict consent, origin checks, verification failures, contact matching, create conflicts, HubSpot errors/rate limits/timeouts and non-confirmed responses. React tests cover loading, duplicate clicks, failure draft retention, confirmed success, and Turnstile expiry/reset.

For local **real end-to-end** testing, create `.env.local` from `.env.example` and set only the public `VITE_TURNSTILE_SITE_KEY`. Create `.dev.vars` from `.dev.vars.example` and put the test-account HubSpot token and real widget secret there. Allow `localhost` in that widget. Set the two activation variables only after approval. Both local files are ignored by Git. Build, then run:

```sh
npm run build
npx wrangler pages dev dist --port 8788
```

Open `http://localhost:8788/#contact`. `npm run dev` alone serves Vite and does not run Pages Functions. Cloudflare's dummy always-pass Turnstile keys do not provide the production hostname/action guarantees this endpoint requires; use mocked tests above or a real widget on localhost for end-to-end testing. Do not weaken verification for testing.

## 4. Verify preview behavior

1. Open the preview URL and complete the form with controlled test details, a unique test email, a listed project, bedroom preference and message. Consent must start unchecked. Without consent, the form must refuse submission and there must be no CRM write.
2. Give consent, complete Turnstile and send. The button shows `Sending…` and repeat submissions are blocked. In browser Network, confirm a same-origin POST to `/api/inquiries` returns 200 with `ok: true`. Only then should the form show success and clear details and consent.
3. In HubSpot Contacts, verify the email, normalized phone, preferences, message, source and all consent fields. The timestamp must be server time and the text/version must match the page. No marketing opt-in should be created.
4. Submit again with the same email and a new message. Confirm the same contact is updated and there is no new contact. Repeat without email using a controlled, unique phone; verify `dmci_phone_identity` and repeat with spaced/unspaced local and `+63` forms of the same Philippine mobile number.
5. In a separate Preview configuration/build, use an invalid HubSpot token or set `INQUIRIES_ENABLED=false`. Confirm a failure message, no success message, and draft/consent retention. Restore Preview configuration and rebuild before further tests. For network failure, switch the browser offline after the security check and submit, then restore connectivity. Complete a fresh security check before retrying.
6. Replay a consumed Turnstile token or send JSON with `consent: false`, an unknown project, oversized message, missing token, or a different Origin. Expect a non-2xx response and no HubSpot write. Never include real tokens in saved screenshots, reports, test fixtures or source control.

## Behavior and operational limits

- Email is trimmed/lowercased and matched directly; phone-only inquiries use the unique `dmci_phone_identity` property, with exact normalized `phone` search for older contacts. Search is eventually consistent. Ambiguous matches fail rather than choosing a person. Shared phone numbers, older differently formatted phones, and inquiries that switch between having/no email can still need manual review; this is not a general CRM merge engine. A phone match never replaces an existing email. The unique property must be provisioned correctly for race protection.
- Latest inquiry/consent fields update on the contact. HubSpot property history can show earlier values subject to the account's retention/features; this is not an immutable per-inquiry ledger. Design a separate inquiry store if permanent per-submission history is required.
- Turnstile is mandatory, verified server-side with the exact request hostname and `inquiry` action. Tokens expire and are single-use. A honeypot, 16 KiB streamed body limit, field bounds, strict same-origin JSON checks and no CORS allowance add protection. Add a Cloudflare WAF rate-limit rule for POST `/api/inquiries` if supported by the account; tune its IP threshold for shared networks. There is no misleading in-memory rate limiter or claim that Turnstile prevents every abuse attempt.
- Each upstream request has a 7-second timeout; the browser waits up to 30 seconds. A timeout may happen after HubSpot accepted the write, so the message says delivery could not be confirmed. Retrying usually updates the same contact. No automatic CRM write retries, local PII persistence, request-body logs or upstream error bodies are used.
- `405` means wrong method; `403` wrong/missing Origin; `415` wrong content type; `400` invalid inquiry/security check; `413` oversized body; `503` disabled/missing configuration or HubSpot busy (`Retry-After: 60`); `502` unconfirmed upstream delivery. Responses are JSON with `Cache-Control: no-store`. Inspect redacted status codes in Pages/HubSpot logs; never enable request-body/token logging.
- Rotate the HubSpot service key in **Development → Keys → Service keys → your key → Rotate**, replace the Cloudflare **Preview Secret**, and rebuild the preview. For an existing legacy private app token, use its Auth tab instead. To stop collection, set `INQUIRIES_ENABLED=false` and rebuild. Production setup/rollout requires separate authorization.

## Official references (checked October 15, 2026)

- [Current Contacts API](https://developers.hubspot.com/docs/api-reference/latest/crm/objects/contacts/guide)
- [Service key creation, scopes and Bearer authentication](https://developers.hubspot.com/docs/apps/developer-platform/build-apps/authentication/account-service-keys)
- [Pages bindings and secrets](https://developers.cloudflare.com/pages/functions/bindings/)
- [Turnstile server-side validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
