# OpenAI inquiry assistant: website and Messenger Preview setup

## Current status

The code is prepared and tested with fake upstream responses. It has not been deployed, no live client messages have been sent, and no real OpenAI calls have been made in development. The owner reported saving `OPENAI_API_KEY` in the existing Cloudflare Pages **Preview** secrets; this has not been independently verified. It is not present in source control or this workspace.

The original inquiry PR was merged into `main`. This follow-up adds two optional form fields and an AI-assisted inquiry collector. It is intentionally limited to collecting preferences and directing unverified pricing/availability/scheduling questions to a human. It is not trained on official project documents or enabled to quote prices, book viewings, promise availability or give financial advice.

The ten approved DMCI properties, including `dmci_floor` and `dmci_budget`, exist in HubSpot account **247694509**. `dmci_phone_identity` still must be created with **unique values required**, as described in [HUBSPOT_SETUP.md](./HUBSPOT_SETUP.md). That is essential for phone-only submissions. Do not create an ordinary, non-unique substitute.

## Architecture

```text
Website React panel -> Pages /api/chat -> D1 session + OpenAI extraction -> client review -> HubSpot
Messenger -> signed Pages /api/messenger -> Cloudflare Queue -> preview consumer Worker
                                               -> same D1/agent logic -> Messenger reply
                                               -> client SAVE -> HubSpot
```

The Pages app and consumer must use the **same Preview D1 database** and the same `CHAT_IP_SALT`. The salt hashes IP addresses and Page-scoped identities for operational keys; it is not a model parameter. OpenAI never receives cookie IDs, internal session IDs, Page-scoped IDs, HubSpot tokens or arbitrary CRM data. It does receive consented chat content, which can include names, phone numbers and budgets.

The server generates all replies from reviewed templates. OpenAI extracts facts and classifies the inquiry using a strict JSON schema. Each extracted value must have a supporting quote in the current client message, pass server validation, and appear in the client review before a CRM write. Quotes are a reliability check, not proof that an LLM always understands the client's intent correctly. Human/client review remains required.

## First owner action: prepare the HubSpot server token

1. Open HubSpot **Development → Keys → Service keys → Create service key**, or click **Create a service key** on the screen that says legacy apps are unavailable. Name it `DMCI Explorer inquiries`. This account does not offer legacy apps.
2. Click **Add new scope**, select only `crm.objects.contacts.read` and `crm.objects.contacts.write`, then **Update → Create** and confirm. Schema writes are not required at runtime.
3. Open the service key's details, choose **Show → Copy**, and paste the key directly into Cloudflare **Workers & Pages → dmci-explorer → Settings → Variables and Secrets → Preview**.
4. Save it as encrypted Secret `HUBSPOT_ACCESS_TOKEN`. Do not send the token in chat. The HubSpot plugin's login is separate from this runtime token.

## Website Preview resources and configuration

Do not change Production or DNS. Prepare these resources only after reviewing applicable Cloudflare plan limits/costs. No resources or purchases were made by this code change.

1. Create a D1 database named `dmci-chat-preview` in Cloudflare **Storage & databases → D1**. Apply `migrations/0001_chat.sql` once using its SQL console. Alternatively an authorized operator can use the commands below. Use a separate database for any later production deployment.
2. In the existing Pages project's **Settings → Bindings**, select the **Preview** environment and add D1 binding `CHAT_DB` to that database. Keep it separate from Production.
3. Add encrypted Preview secrets:

| Secret | Value source |
| --- | --- |
| `OPENAI_API_KEY` | Already reported saved by owner; ensure the key can create Responses and access the configured model |
| `HUBSPOT_ACCESS_TOKEN` | Dedicated HubSpot service key above; the existing Bearer-auth code accepts it |
| `TURNSTILE_SECRET_KEY` | Real Turnstile widget secret; allow the exact preview hostname |
| `CHAT_IP_SALT` | Cryptographically random value, at least 32 random bytes; save in a password manager for configuring the consumer later |

4. Add these **Preview variables**, initially keeping all enable switches `false`:

| Variable | Value after owner approval and readiness |
| --- | --- |
| `CHAT_ENABLED` | `true` |
| `WEBSITE_CHAT_ENABLED` | `true` |
| `MESSENGER_CHAT_ENABLED` | `false` until Meta is ready |
| `APPROVED_CHAT_CONSENT_VERSION` | `2026-10-15-chat-v1` |
| `OPENAI_CHAT_MODEL` | `gpt-5.4-mini` |
| `CHAT_DAILY_AI_CALL_LIMIT` | `100` initially; counts AI calls shared across both channels, not conversations |
| `INQUIRIES_ENABLED` | `true` only when the owner approves CRM collection |
| `APPROVED_CONSENT_VERSION` | `2026-10-15` for the ordinary inquiry form |
| `VITE_CHAT_ENABLED` | `true` to include the chat launcher in the browser build |
| `VITE_TURNSTILE_SITE_KEY` | Matching public widget site key |

The updated chat consent names OpenAI and the chat-context retention period. The owner must approve its exact wording, update the site's privacy policy/controller contact/retention process, and review it before setting the approved version. Approval of the earlier form wording does not automatically approve this new chat wording.

5. Build a **Preview-only** deployment. The existing project is Direct Upload, so saving a secret or merging a GitHub PR does not run the new code. From the repository root, set the two public `VITE_` values in ignored `.env.local`, then an authorized operator can run:

```sh
npm ci
npm test
npm run build
npx wrangler pages deploy dist --project-name dmci-explorer --branch feature/openai-inquiry-chat
```

Confirm the project's production branch is `main` before any upload, and never substitute `--branch main`. This command is documented for later approved Preview testing and has not been executed. Static dashboard drag-and-drop of `dist` alone cannot install these Functions. A deployment is needed after secret/binding changes; public `VITE_` changes also require rebuilding.

For local tests with real services, copy `.dev.vars.example` to ignored `.dev.vars`, fill server-only secrets locally, and configure local D1 binding `CHAT_DB` using a local Wrangler config. Apply the migration to local D1 before `wrangler pages dev`. `npm run dev` alone does not run server functions. Automated tests require none of these secrets and use SQLite plus mocked upstream services.

## Messenger Preview resources and connection

Finish website Preview testing first. A Meta administrator must perform Facebook login, business verification, permission review and token creation personally. No passwords, 2FA codes or tokens should be sent in chat.

1. In [Meta for Developers](https://developers.facebook.com/apps/), create or select the app for the **DMCI Explorer Facebook Page**. Configure Messenger for that Page. Use app-role test accounts in Development mode first. General-public access can require App Review/Advanced Access for `pages_messaging` and related Page subscription permissions; follow the current requirements shown in the app dashboard rather than buying or changing anything automatically.
2. Record the exact **numeric Page ID**, **App ID**, and the supported **Graph API version shown in the app**. The website's `m.me/dmciexplorer` username is not a numeric Page ID. No Graph version is guessed by deployment code.
3. Generate a Page access token for that Page with the required messaging access. Find the app secret in Meta's app settings. Generate a separate random webhook verification token.
4. Add these encrypted secrets to **Pages Preview**:
   - `META_APP_SECRET`: authenticates raw webhook payloads.
   - `META_VERIFY_TOKEN`: validates Meta's subscription challenge.
5. Add Pages Preview variables `META_PAGE_ID`, `META_APP_ID` and `META_GRAPH_VERSION` using the actual values. Set `MESSENGER_CHAT_ENABLED=false` until the queue and consumer are ready. OpenAI calls do not run inside the webhook.
6. Create two Cloudflare queues, `dmci-chat-preview` and `dmci-chat-preview-failed`, with **86,400-second message retention** on each. Add Pages **Preview** queue producer binding `CHAT_QUEUE` to `dmci-chat-preview`. An authorized operator can use:

```sh
npx wrangler queues create dmci-chat-preview --message-retention-period-secs 86400
npx wrangler queues create dmci-chat-preview-failed --message-retention-period-secs 86400
```

These create resources and are not run by tests or this change. Check the account's available Queue plan/limits before executing.

7. Configure the separate consumer using `workers/wrangler.preview.jsonc`: replace the D1 placeholder with the **same Preview database ID**, fill non-secret Page/App/version variables, and keep switches disabled while preparing it. The worker has no public route and no production config. Apply the database migration before running it. Configure these Worker secrets via the dashboard or interactive `wrangler secret put` prompts:

```sh
npx wrangler secret put OPENAI_API_KEY --config workers/wrangler.preview.jsonc
npx wrangler secret put HUBSPOT_ACCESS_TOKEN --config workers/wrangler.preview.jsonc
npx wrangler secret put META_PAGE_ACCESS_TOKEN --config workers/wrangler.preview.jsonc
npx wrangler secret put CHAT_IP_SALT --config workers/wrangler.preview.jsonc
```

Enter secret values only at the prompts. Pages secrets are not inherited by this Worker: use a dedicated OpenAI project key for the consumer, or securely enter the same key from your password manager. `CHAT_IP_SALT` must match Pages Preview. No app secret or verify token is needed on the consumer because the Pages webhook validates them before queueing.

8. After owner approval, set the consumer's `CHAT_ENABLED=true`, `MESSENGER_CHAT_ENABLED=true`, `INQUIRIES_ENABLED=true` and `APPROVED_CHAT_CONSENT_VERSION=2026-10-15-chat-v1`. Set `CHAT_DAILY_AI_CALL_LIMIT=100` and the desired OpenAI model consistently in both runtimes. Its hourly scheduled handler deletes expired operational records. An authorized operator must deploy this **preview consumer** separately before subscribing Meta; no deployment is performed by this change.
9. Set Meta's webhook callback to the **actual Pages preview URL** plus `/api/messenger`. Enter the saved verify token in Meta's verification field. Subscribe to the relevant Page `messages` and `messaging_postbacks` events, including message echoes so human Page replies pause the AI. Confirm the app is subscribed to the intended Page. Avoid configuring a second auto-responder or HubSpot inbox receiver that would compete for the same conversation without a deliberate routing decision.
10. Enable `MESSENGER_CHAT_ENABLED=true` in Pages Preview and make a new Preview deployment. Test only with the permitted test users first. This is not authorization to connect a production Page webhook or send messages to real clients. The reviewable code and tests come first; a live Page routing change needs the owner's explicit go-ahead.

## Acceptance tests before any live rollout

- Visit website Preview. Confirm the unchanged page design and the optional floor/budget form fields. The chat launcher is hidden by default; when enabled but not ready, its panel offers an honest Messenger fallback.
- Start chat: consent is unchecked. Before explicit acceptance there must be **no OpenAI call and no CRM write**. Use the real Turnstile widget; the server checks `chat` action and exact hostname for each website request.
- Say “My name is Cath; email is a controlled test address. I prefer a high floor and PHP 6–8 million total.” Confirm the review includes only the stated facts and retains currency/basis. Omitted project/bedrooms must stay unknown, not default to invented preferences.
- Change the budget, then confirm the newest summary. A stale website review token must be rejected. HubSpot must show `dmci_floor`, `dmci_budget`, chat source and chat-specific consent wording/version/time only after explicit confirmation. Existing unknown preferences must not be cleared.
- Test email-only and phone-only clients with controlled details. Repeated saves should update the contact. Mixed website/Messenger identities are matched by supplied email/phone where possible, not by a model-selected contact ID or guessed Facebook profile. Never join conversations merely because display names match.
- In Messenger, confirm the first response asks for consent without processing the text through OpenAI. Choose **I agree**, provide controlled details, review the summary, then reply **SAVE**. Check confirmed receipt and source in HubSpot. Plain “yes” must not be interpreted as CRM confirmation.
- Request a human or reply manually as the Page. AI replies must pause; future client messages must not cause model calls or automated replies. Website handoff opens the existing Messenger link; it does not falsely claim a human was notified.
- Simulate provider/CRM outages, expired Turnstile, invalid consent, invalid webhook signatures, duplicate events and retry after timeout. No failed/unconfirmed CRM request may show a successful save. Website failures preserve the draft and require a new security token.
- Set the daily call limit to 1 in both runtimes for a controlled test. A second AI call must be rejected before calling OpenAI. Verify the queue retries/dead-letter visibility; restore the intended limit afterward.
- Check storage expiry and cleanup with test records. Verify no request bodies, raw Page IDs for users, tokens or extracted personal details appear in application logs. Monitor queue failures and OpenAI usage before inviting real traffic.

## Operational limits and remaining owner decisions

- Conversation context is usable for 24 hours after activity. Hourly cleanup can leave expired records stored for up to an additional hour, hence the consent's **25-hour** maximum when the cleanup Worker is deployed and healthy. Website-only operation still needs that scheduled cleanup Worker (queues are optional until Messenger); do not enable collection without a functioning cleanup schedule. Queue/DLQ retention is separately fixed at 24 hours. Provider retention is governed by OpenAI's policy, not this application's D1 cleanup. HubSpot retention requires an owner-approved separate policy.
- The default is **100 reserved model calls per UTC day across both channels**, 20 successful model calls per conversation, 2,000 input characters per message, bounded context and 1,200 output tokens per call. Website IPs receive a 30-request/hour limit. Quotas are enforced atomically in D1. Failed attempts still consume the global reservation. These are usage caps, not a guaranteed dollar budget; model prices and tokenization affect cost. OpenAI billing alerts are not treated as an application-enforced spending stop.
- Queue and CRM operations are at-least-once. Cached event responses prevent repeat extraction/CRM processing after a successful local commit. A crash after an external send or CRM write but before its acknowledgment can still cause a duplicate Messenger reply or repeated contact update; no exactly-once promise is made. An event whose response is marked delivered is not resent.
- Out-of-order client messages older than an already processed message are not applied as new facts; the client is asked to restate them. Cloudflare Queues does not guarantee strict ordering. The configured one-message batch and one consumer concurrency reduce contention; session leases prevent overlapping state writes.
- Retries go to the failed queue after three retry attempts. Monitor its depth and inspect/replay only controlled events within the message window; a dead-letter entry does not notify the owner by itself. Consumer exceptions trigger retries, while expired messages are acknowledged without replying. No proactive messages or message tags bypass the configured 24-hour response window.
- A handoff pauses the AI for the lifetime of that context. There is no automatic human-resume control in this version; a fresh website session after expiry can start again with new consent. Messenger Page echoes from this app are ignored; other Page replies pause the AI. Verify echo delivery with the Page's actual inbox/routing setup before live activation.
- Identity/deduplication limitations from HUBSPOT_SETUP.md still apply. The deployment must not infer email/phone/name from Facebook profile data. A supplied email or normalized phone may connect the same client across channels, but this is not verified account linking and must not expose prior CRM values to a visitor.
- Stopping AI replies is not an automatic deletion of already confirmed HubSpot records. Route deletion/withdrawal requests to the owner and document their handling in the privacy policy. The model cannot set, revoke or fabricate consent flags; server actions do that deterministically.
- All activation switches default to false. To pause a test, disable channel switches and redeploy Preview; pause queue delivery if needed. Do not delete queues/databases or modify production resources as a rollback shortcut.

## Validation commands

Node.js **24** is required for the SQLite-backed server tests.

```sh
npm ci
npm test
npm run build
npx wrangler pages functions build functions --outdir .wrangler/functions-build
npx wrangler deploy --dry-run --config workers/wrangler.preview.jsonc --outdir ../.wrangler/messenger-build
```

The Worker command above is **dry-run only**. Automated tests use fake keys, in-memory SQLite and mocked OpenAI/HubSpot/Meta responses. They create no cloud resources and send no live messages.

## Primary references

- [HubSpot service key creation and authentication](https://developers.hubspot.com/docs/apps/developer-platform/build-apps/authentication/account-service-keys)

- [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [OpenAI GPT-5.4 Mini](https://developers.openai.com/api/docs/models/gpt-5.4-mini)
- [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data)
- [Cloudflare Pages bindings and secrets](https://developers.cloudflare.com/pages/functions/bindings/)
- [Cloudflare Queue configuration](https://developers.cloudflare.com/queues/configuration/configure-queues/)
- [Cloudflare queue retries](https://developers.cloudflare.com/queues/configuration/batching-retries/)
- [Meta's Messenger API collection](https://www.postman.com/meta/messenger-platform-api/documentation/iyp204x/messenger-platform-api)
